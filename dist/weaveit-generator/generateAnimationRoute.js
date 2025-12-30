import express from 'express';
import crypto from 'crypto';
import { VideoRecorder } from '../recorder.js';
import { createVideoJob, updateJobStatus, storeVideo, deductUserPoints } from '../db.js';
import { wsManager } from '../websocket.js';
const router = express.Router();
// Environment variables
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'default-webhook-secret';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3001/api/webhooks/job-update';
const VERBOSE_LOGGING = process.env.VERBOSE_LOGGING === 'true';
// Helper function to estimate duration (fixed for animation)
function estimateDuration(script) {
    // Simple estimation: 5 seconds base + 0.1s per word, max 30s
    const wordCount = script.split(' ').length;
    return Math.min(5000 + wordCount * 100, 30000);
}
// Function to send webhook
async function sendWebhook(jobId, status, videoId, duration, error) {
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
        }
        else {
            console.log(`✅ Webhook sent for job ${jobId}: ${status}`);
        }
    }
    catch (err) {
        console.error('Error sending webhook:', err);
    }
}
// Background processing function
async function processAnimationGeneration(jobId, walletAddress, script) {
    const recorder = new VideoRecorder();
    try {
        if (VERBOSE_LOGGING)
            console.log(`🚀 Starting background processing for animation job ${jobId}`);
        // Emit initial progress
        wsManager.emitProgress(jobId, 0, 'generating', 'Starting animation generation...');
        // Initialize recorder
        wsManager.emitProgress(jobId, 5, 'generating', 'Initializing video recorder...');
        await recorder.initialize();
        // Estimate duration
        const duration = estimateDuration(script);
        if (VERBOSE_LOGGING)
            console.log(`📊 Estimated duration: ${duration}ms`);
        // Generate animation video
        wsManager.emitProgress(jobId, 10, 'generating', 'Recording animation...');
        const videoBuffer = await recorder.recordVideo(script, '', duration, 30);
        if (VERBOSE_LOGGING)
            console.log(`Generated animation video: ${videoBuffer.length} bytes`);
        wsManager.emitProgress(jobId, 80, 'generating', 'Animation recording completed');
        // Calculate duration in seconds
        const durationSec = Math.round(duration / 1000);
        wsManager.emitProgress(jobId, 85, 'generating', 'Calculating video duration...');
        // Store video in database
        const videoId = await storeVideo(jobId, walletAddress, videoBuffer, durationSec);
        if (VERBOSE_LOGGING)
            console.log('Stored animation video in database:', videoId);
        wsManager.emitProgress(jobId, 90, 'generating', 'Storing video in database...');
        // Update job status to completed
        await updateJobStatus(jobId, 'completed');
        // Send webhook
        await sendWebhook(jobId, 'completed', videoId, durationSec);
        // Emit completion
        wsManager.emitCompleted(jobId, videoId, durationSec);
    }
    catch (error) {
        if (VERBOSE_LOGGING)
            console.error(`❌ Background processing error for animation job ${jobId}:`, error);
        // Send webhook
        await sendWebhook(jobId, 'failed', undefined, undefined, String(error));
        // Emit error
        wsManager.emitError(jobId, String(error));
    }
    finally {
        await recorder.close();
    }
}
// POST /api/generate/animation
const generateAnimationHandler = async (req, res) => {
    let jobId = null;
    try {
        const { walletAddress, script } = req.body;
        if (!script || typeof script !== 'string' || script.trim() === '') {
            res.status(400).json({ error: 'Missing script in request body' });
            return;
        }
        if (!walletAddress || typeof walletAddress !== 'string') {
            res.status(400).json({ error: 'Missing walletAddress in request body' });
            return;
        }
        if (VERBOSE_LOGGING)
            console.log('weaveit-generator: Processing animation request:', { walletAddress, scriptLength: script.length });
        // Check credit balance (animation costs 2 credits)
        const ANIMATION_COST = 2;
        const newBalance = await deductUserPoints(walletAddress, ANIMATION_COST);
        if (newBalance === null) {
            res.status(402).json({
                error: 'Insufficient credits for animation video generation',
                required: ANIMATION_COST,
                message: 'Please purchase credits or wait for trial replenishment'
            });
            return;
        }
        // Generate title automatically based on script content (simple version)
        const title = script.split(' ').slice(0, 5).join(' ') + '...';
        if (VERBOSE_LOGGING)
            console.log('Generated title:', title);
        // Create job in database with job_type = 'animation'
        jobId = await createVideoJob(walletAddress, script, title, 'animation');
        if (VERBOSE_LOGGING)
            console.log('Created animation job:', jobId);
        // Update status to generating
        await updateJobStatus(jobId, 'generating');
        // Respond immediately with job ID
        res.json({
            jobId,
            status: 'generating',
            title,
            creditsDeducted: ANIMATION_COST,
            remainingCredits: newBalance,
            message: 'Animation video generation started. Check status via polling or webhook.',
        });
        // Process in background
        setImmediate(() => {
            processAnimationGeneration(jobId, walletAddress, script);
        });
    }
    catch (error) {
        if (VERBOSE_LOGGING)
            console.error('weaveit-generator: Animation video generation setup error:', error);
        // Update job status to failed if we have a jobId
        if (jobId) {
            await updateJobStatus(jobId, 'failed', String(error)).catch(console.error);
            await sendWebhook(jobId, 'failed', undefined, undefined, String(error));
        }
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to start animation video generation' });
        }
        return;
    }
};
router.post('/generate/animation', generateAnimationHandler);
export default router;
//# sourceMappingURL=generateAnimationRoute.js.map