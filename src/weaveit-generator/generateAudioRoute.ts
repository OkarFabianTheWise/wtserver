import express from 'express';
import type { Request, Response } from 'express';
import { enhanceScript } from '../codeAnalyzer.js';
import { generateSpeechBuffer } from '../textToSpeech.js';
import { createVideoJob, updateJobStatus, storeAudio, deductUserPoints } from '../db.js';

const router = express.Router();

// Helper function to estimate audio duration from MP3 buffer (in seconds)
function estimateAudioDuration(buffer: Buffer): number {
  // MP3 bitrate estimation: use average bitrate of 128kbps
  const estimatedBitrate = 128000; // bits per second
  const durationSeconds = (buffer.length * 8) / estimatedBitrate;
  return Math.round(durationSeconds);
}

// POST /api/generate/audio
const generateAudioHandler = async (req: Request, res: Response): Promise<void> => {
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

    console.log('weaveit-generator: Processing audio-only request:', { title, walletAddress });

    // Check credit balance before proceeding (audio costs 1 credit)
    const AUDIO_COST = 1;
    const newBalance = await deductUserPoints(walletAddress, AUDIO_COST);
    if (newBalance === null) {
      res.status(402).json({ 
        error: 'Insufficient credits for audio generation',
        required: AUDIO_COST,
        message: 'Please purchase credits or wait for trial replenishment'
      });
      return;
    }

    // Create job in database with job_type = 'audio'
    jobId = await createVideoJob(walletAddress, script, title, 'audio');
    console.log('Created audio job:', jobId);

    // Update status to generating
    await updateJobStatus(jobId, 'generating');

    // Enhance the script for narration
    const explanation = await enhanceScript(script);
    
    // Generate speech buffer (no file saving)
    const audioBuffer = await generateSpeechBuffer(explanation);
    console.log(`Generated audio: ${audioBuffer.length} bytes`);

    // Calculate duration from audio buffer (in seconds)
    const durationSec = estimateAudioDuration(audioBuffer);
    console.log(`Estimated duration: ${durationSec} seconds`);

    // Store audio in database
    const audioId = await storeAudio(jobId, walletAddress, audioBuffer, durationSec);
    console.log('Stored audio in database:', audioId);

    // Update job status to completed
    await updateJobStatus(jobId, 'completed');

    res.json({
      jobId,
      audioId,
      status: 'completed',
      creditsDeducted: AUDIO_COST,
      remainingCredits: newBalance,
      message: 'Audio tutorial generated successfully',
    });
    return;
  } catch (error) {
    console.error('weaveit-generator: Audio generation error:', error);
    
    // Update job status to failed if we have a jobId
    if (jobId) {
      await updateJobStatus(jobId, 'failed', String(error)).catch(console.error);
    }
    
    res.status(500).json({ error: 'Failed to generate audio' });
    return;
  }
};

router.post('/generate/audio', generateAudioHandler);

export default router;
