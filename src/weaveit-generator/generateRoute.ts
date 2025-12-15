import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import { enhanceScript } from '../codeAnalyzer.js';
import { generateSpeechBuffer } from '../textToSpeech.js';
import { generateScrollingScriptVideoBuffer } from '../videoGenerator.js';
import { createVideoJob, updateJobStatus, storeVideo, deductUserPoints } from '../db.js';
import { wsManager } from '../websocket.js';

const router = express.Router();

// Environment variables
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'default-webhook-secret';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3001/api/webhooks/job-update';
const VERBOSE_LOGGING = process.env.VERBOSE_LOGGING === 'true';

// Helper function to estimate audio duration from MP3 buffer (in seconds)
function estimateAudioDuration(buffer: Buffer): number {
  // MP3 bitrate estimation: use average bitrate of 128kbps
  const estimatedBitrate = 128000; // bits per second
  const durationSeconds = (buffer.length * 8) / estimatedBitrate;
  return Math.round(durationSeconds);
}

// Function to send webhook
async function sendWebhook(jobId: string, status: string, videoId?: string, duration?: number, error?: string) {
  try {
    const payload = {
      jobId,
      status,
      videoId,
      duration,
      error,
      timestamp: new Date().toISOString(),
    };

    const body = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
      },
      body,
    });

    if (!response.ok) {
      console.error(`Webhook failed: ${response.status} ${response.statusText}`);
    } else {
      console.log(`✅ Webhook sent for job ${jobId}: ${status}`);
    }
  } catch (err) {
    console.error('Error sending webhook:', err);
  }
}

// Background processing function
async function processVideoGeneration(jobId: string, walletAddress: string, script: string, explanation: string) {
  try {
    if (VERBOSE_LOGGING) console.log(`🚀 Starting background processing for job ${jobId}`);

    // Emit initial progress
    wsManager.emitProgress(jobId, 0, 'generating', 'Starting video generation...');

    // Generate speech buffer (no file saving)
    wsManager.emitProgress(jobId, 2, 'generating', 'Initializing audio generation...');
    wsManager.emitProgress(jobId, 5, 'generating', 'Generating audio narration...');
    const audioBuffer = await generateSpeechBuffer(explanation);
    if (VERBOSE_LOGGING) console.log(`Generated audio: ${audioBuffer.length} bytes`);
    wsManager.emitProgress(jobId, 10, 'generating', 'Audio narration completed');

    // Generate video buffer (uses temp files internally but returns buffer)
    wsManager.emitProgress(jobId, 15, 'generating', 'Preparing video creation...');
    wsManager.emitProgress(jobId, 20, 'generating', 'Creating video from script...');
    const videoBuffer = await generateScrollingScriptVideoBuffer(script, audioBuffer);
    if (VERBOSE_LOGGING) console.log(`Generated video: ${videoBuffer.length} bytes`);
    wsManager.emitProgress(jobId, 30, 'generating', 'Video creation completed');

    // Calculate duration from audio buffer (in seconds)
    const durationSec = estimateAudioDuration(audioBuffer);
    if (VERBOSE_LOGGING) console.log(`Estimated duration: ${durationSec} seconds`);
    wsManager.emitProgress(jobId, 35, 'generating', 'Calculating video duration...');

    // Store video in database
    const videoId = await storeVideo(jobId, walletAddress, videoBuffer, durationSec);
    if (VERBOSE_LOGGING) console.log('Stored video in database:', videoId);
    wsManager.emitProgress(jobId, 40, 'generating', 'Storing video in database...');

    // Update job status to completed
    await updateJobStatus(jobId, 'completed');

    // Send webhook
    await sendWebhook(jobId, 'completed', videoId, durationSec);

    // Emit completion
    wsManager.emitCompleted(jobId, videoId, durationSec);

  } catch (error) {
    if (VERBOSE_LOGGING) console.error(`❌ Background processing error for job ${jobId}:`, error);

    // Send webhook
    await sendWebhook(jobId, 'failed', undefined, undefined, String(error));

    // Emit error
    wsManager.emitError(jobId, String(error));
  }
}

// POST /api/generate
const generateHandler = async (req: Request, res: Response): Promise<void> => {
  let jobId: string | null = null;

  try {
    let { walletAddress, script, title } = req.body;

    if (!script || typeof script !== 'string' || script.trim() === '') {
      res.status(400).json({ error: 'Missing script in request body' });
      return;
    }

    // Wallet address is required for database storage
    if (!walletAddress || typeof walletAddress !== 'string') {
      res.status(400).json({ error: 'Missing walletAddress in request body' });
      return;
    }

    console.log('weaveit-generator: Processing tutorial request:', { title, walletAddress });

    // Check credit balance before proceeding (video costs 2 credits)
    const VIDEO_COST = 2;
    const newBalance = await deductUserPoints(walletAddress, VIDEO_COST);
    if (newBalance === null) {
      res.status(402).json({
        error: 'Insufficient credits for video generation',
        required: VIDEO_COST,
        message: 'Please purchase credits or wait for trial replenishment'
      });
      return;
    }

    // Create job in database with job_type = 'video'
    jobId = await createVideoJob(walletAddress, script, title, 'video');
    console.log('Created job:', jobId);

    // Update status to generating
    await updateJobStatus(jobId, 'generating');

    // Enhance the script for narration (do this synchronously before responding)
    const explanation = await enhanceScript(script);

    // Respond immediately with job ID
    res.json({
      jobId,
      status: 'generating',
      creditsDeducted: VIDEO_COST,
      remainingCredits: newBalance,
      message: 'Video generation started. Check status via polling or webhook.',
    });

    // Process in background
    setImmediate(() => {
      processVideoGeneration(jobId!, walletAddress, script, explanation);
    });

  } catch (error) {
    console.error('weaveit-generator: Video generation setup error:', error);

    // Update job status to failed if we have a jobId
    if (jobId) {
      await updateJobStatus(jobId, 'failed', String(error)).catch(console.error);
      await sendWebhook(jobId, 'failed', undefined, undefined, String(error));
    }

    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to start video generation' });
    }
    return;
  }
};

router.post('/generate', generateHandler);

export default router;
