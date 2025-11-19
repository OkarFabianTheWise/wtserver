import express from 'express';
import type { Request, Response } from 'express';
import { enhanceScript } from '../src/codeAnalyzer';
import { generateSpeechBuffer } from '../src/textToSpeech';
import { generateScrollingScriptVideoBuffer } from '../src/videoGenerator';
import { createVideoJob, updateJobStatus, storeVideo } from '../src/db';

const router = express.Router();

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

    // Create job in database
    jobId = await createVideoJob(walletAddress, script);
    console.log('Created job:', jobId);

    // Update status to generating
    await updateJobStatus(jobId, 'generating');

    // Enhance the script for narration
    const explanation = await enhanceScript(script);
    
    // Generate speech buffer (no file saving)
    const audioBuffer = await generateSpeechBuffer(explanation);
    console.log(`Generated audio: ${audioBuffer.length} bytes`);

    // Generate video buffer (uses temp files internally but returns buffer)
    const videoBuffer = await generateScrollingScriptVideoBuffer(script, audioBuffer);
    console.log(`Generated video: ${videoBuffer.length} bytes`);

    // Store video in database
    const videoId = await storeVideo(jobId, walletAddress, videoBuffer);
    console.log('Stored video in database:', videoId);

    // Update job status to completed
    await updateJobStatus(jobId, 'completed');

    res.json({
      jobId,
      videoId,
      status: 'completed',
      message: 'Educational tutorial video generated successfully',
    });
    return;
  } catch (error) {
    console.error('weaveit-generator: Video generation error:', error);
    
    // Update job status to failed if we have a jobId
    if (jobId) {
      await updateJobStatus(jobId, 'failed', String(error)).catch(console.error);
    }
    
    res.status(500).json({ error: 'Failed to generate video' });
    return;
  }
};

router.post('/generate', generateHandler);

export default router;
