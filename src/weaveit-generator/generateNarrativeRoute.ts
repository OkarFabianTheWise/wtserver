import express from 'express';
import type { Request, Response } from 'express';
import { generateNarrativeStoryboard } from '../codeAnalyzer.js';
import { generateSpeechBuffer } from '../textToSpeech.js';
import { generateNarrativeVideoBuffer } from '../narrativeAnimationGenerator.js';
import { createVideoJob, updateJobStatus, storeVideo, deductUserPoints } from '../db.js';

const router = express.Router();

// Helper function to estimate audio duration from MP3 buffer (in seconds)
function estimateAudioDuration(buffer: Buffer): number {
  // MP3 bitrate estimation: use average bitrate of 128kbps
  const estimatedBitrate = 128000; // bits per second
  const durationSeconds = (buffer.length * 8) / estimatedBitrate;
  return Math.round(durationSeconds);
}

// POST /api/generate/narrative
const generateNarrativeHandler = async (req: Request, res: Response): Promise<void> => {
  let jobId: string | null = null;

  try {
    const { walletAddress, script, title } = req.body;

    if (!script || typeof script !== 'string' || script.trim() === '') {
      res.status(400).json({ error: 'Missing script in request body' });
      return;
    }

    if (!walletAddress || typeof walletAddress !== 'string') {
      res.status(400).json({ error: 'Missing walletAddress in request body' });
      return;
    }

    console.log('weaveit-generator: Processing narrative animation request:', { title, walletAddress });

    // Check credit balance (narrative video costs 3 credits - more than simple video)
    const NARRATIVE_COST = 3;
    const newBalance = await deductUserPoints(walletAddress, NARRATIVE_COST);
    if (newBalance === null) {
      res.status(402).json({
        error: 'Insufficient credits for narrative video generation',
        required: NARRATIVE_COST,
        message: 'Please purchase credits or wait for trial replenishment'
      });
      return;
    }

    // Create job in database with job_type = 'narrative'
    jobId = await createVideoJob(walletAddress, script, title, 'narrative');
    console.log('Created narrative job:', jobId);

    // Update status to generating
    await updateJobStatus(jobId, 'generating');

    // Generate narrative storyboard scenes
    console.log('📖 Generating narrative storyboard...');
    const scenes = await generateNarrativeStoryboard(script);

    if (!scenes || scenes.length === 0) {
      throw new Error('Failed to generate narrative scenes');
    }

    console.log(`✅ Generated ${scenes.length} narrative scenes`);

    // Calculate total narration duration from scenes
    const totalSceneDuration = scenes.reduce((sum, scene) => sum + (scene.duration || 3), 0);
    console.log(`📊 Total scene duration: ${totalSceneDuration}s`);

    // Generate narration text by combining all scene narrations
    const narrationText = scenes.map((s) => s.narration).join(' ');

    // Generate speech from combined narration
    console.log('🎙️  Generating audio narration...');
    const audioBuffer = await generateSpeechBuffer(narrationText);
    console.log(`Generated audio: ${audioBuffer.length} bytes`);

    // Generate narrative video buffer
    console.log('🎨 Generating narrative animation video...');
    const videoBuffer = await generateNarrativeVideoBuffer(scenes, audioBuffer);
    console.log(`Generated narrative video: ${videoBuffer.length} bytes`);

    // Calculate duration from audio buffer
    const durationSec = estimateAudioDuration(audioBuffer);
    console.log(`⏱️  Estimated duration: ${durationSec} seconds`);

    // Store video in database
    const videoId = await storeVideo(jobId, walletAddress, videoBuffer, durationSec);
    console.log('Stored narrative video in database:', videoId);

    // Update job status to completed
    await updateJobStatus(jobId, 'completed');

    res.json({
      jobId,
      videoId,
      status: 'completed',
      sceneCount: scenes.length,
      creditsDeducted: NARRATIVE_COST,
      remainingCredits: newBalance,
      message: 'Narrative animation video generated successfully',
    });
    return;
  } catch (error) {
    console.error('weaveit-generator: Narrative video generation error:', error);

    // Update job status to failed if we have a jobId
    if (jobId) {
      await updateJobStatus(jobId, 'failed', String(error)).catch(console.error);
    }

    res.status(500).json({ error: 'Failed to generate narrative video', details: String(error) });
    return;
  }
};

router.post('/generate/narrative', generateNarrativeHandler);

export default router;
