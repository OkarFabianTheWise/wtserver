import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import { enhanceScript } from '../codeAnalyzer.js';
import { generateSpeechBuffer } from '../textToSpeech.js';
import { generateScrollingScriptVideoBuffer } from '../videoGenerator.js';
import { createVideoJob, updateJobStatus, storeVideo, deductUserPoints } from '../db.js';

const router = express.Router();

// Environment variables
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'default-webhook-secret';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3001/api/webhooks/job-update';

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
    console.log(`🚀 Starting background processing for job ${jobId}`);

    // Generate speech buffer (no file saving)
    const audioBuffer = await generateSpeechBuffer(explanation);
    console.log(`Generated audio: ${audioBuffer.length} bytes`);

    // Generate video buffer (uses temp files internally but returns buffer)
    const videoBuffer = await generateScrollingScriptVideoBuffer(script, audioBuffer);
    console.log(`Generated video: ${videoBuffer.length} bytes`);

    // Calculate duration from audio buffer (in seconds)
    const durationSec = estimateAudioDuration(audioBuffer);
    console.log(`Estimated duration: ${durationSec} seconds`);

    // Store video in database
    const videoId = await storeVideo(jobId, walletAddress, videoBuffer, durationSec);
    console.log('Stored video in database:', videoId);
    console.log(`📦 Stored buffer size: ${videoBuffer.length} bytes`);
    console.log(`📦 Stored first 20 bytes: ${videoBuffer.slice(0, 20).toString('hex')}`);
    console.log(`📦 Stored is MP4: ${videoBuffer.slice(4, 8).toString() === 'ftyp'}`);

    // Update job status to completed
    await updateJobStatus(jobId, 'completed');

    // Send webhook
    await sendWebhook(jobId, 'completed', videoId, durationSec);

  } catch (error) {
    console.error(`❌ Background processing error for job ${jobId}:`, error);
    
    // Update job status to failed
    await updateJobStatus(jobId, 'failed', String(error));
    
    // Send webhook
    await sendWebhook(jobId, 'failed', undefined, undefined, String(error));
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
