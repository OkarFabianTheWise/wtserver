import { renderMedia, selectComposition } from '@remotion/renderer';
import { bundle } from '@remotion/bundler';
import path from 'path';
import fs from 'fs';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import { fileURLToPath } from 'url';
import { generateAnimationScript } from './animationScriptGenerator.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Set ffmpeg path if available
const ffmpegPath = "/usr/bin/ffmpeg";
const ffprobePath = "/usr/bin/ffprobe";
if (fs.existsSync(ffmpegPath))
    ffmpeg.setFfmpegPath(ffmpegPath);
if (fs.existsSync(ffprobePath))
    ffmpeg.setFfprobePath(ffprobePath);
export async function generateIllustrationVideoWithRemotion(script, audioBuffer, outputPath) {
    const tempDir = os.tmpdir();
    const tempId = `remotion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const audioPath = path.join(tempDir, `${tempId}.mp3`);
    const videoPath = path.join(tempDir, `${tempId}.mp4`);
    const finalVideoPath = path.join(tempDir, `${tempId}_final.mp4`);
    try {
        // Write audio buffer to temp file
        fs.writeFileSync(audioPath, audioBuffer);
        // Get audio duration
        const audioDuration = await getAudioDuration(audioPath);
        // Generate animation script from the script
        console.log('🎬 Generating animation script from tutorial...');
        const animationScript = await generateAnimationScript(script);
        // Override the total duration to match audio
        animationScript.totalDuration = Math.ceil(audioDuration * 1000); // Convert to milliseconds
        console.log(`📊 Generated animation with ${animationScript.scenes.length} scenes, duration: ${animationScript.totalDuration}ms`);
        // Bundle the Remotion project
        const bundleLocation = await bundle({
            entryPoint: path.join(__dirname, 'remotion', 'index.ts'),
            webpackOverride: (config) => config,
        });
        // Select composition
        const composition = await selectComposition({
            serveUrl: bundleLocation,
            id: 'IllustrationComposition',
            inputProps: {
                animationScript,
            },
        });
        // Update composition duration based on audio
        const updatedComposition = {
            ...composition,
            durationInFrames: Math.ceil(audioDuration * composition.fps),
        };
        // Render video
        await renderMedia({
            composition: updatedComposition,
            serveUrl: bundleLocation,
            codec: 'h264',
            outputLocation: videoPath,
            inputProps: {
                animationScript,
            },
        });
        // Combine video with audio
        await combineVideoWithAudio(videoPath, audioPath, finalVideoPath);
        // Read the final video
        const finalVideoBuffer = fs.readFileSync(finalVideoPath);
        // Clean up temp files
        try {
            fs.unlinkSync(audioPath);
        }
        catch (err) {
            console.error(`Error cleaning up ${audioPath}:`, err);
        }
        try {
            fs.unlinkSync(videoPath);
        }
        catch (err) {
            console.error(`Error cleaning up ${videoPath}:`, err);
        }
        try {
            fs.unlinkSync(finalVideoPath);
        }
        catch (err) {
            console.error(`Error cleaning up ${finalVideoPath}:`, err);
        }
        return finalVideoBuffer;
    }
    catch (error) {
        console.error('❌ Error generating video with Remotion:', error);
        // Clean up temp files on error
        try {
            if (fs.existsSync(audioPath))
                fs.unlinkSync(audioPath);
        }
        catch (err) {
            console.error(`Error cleaning up ${audioPath}:`, err);
        }
        try {
            if (fs.existsSync(videoPath))
                fs.unlinkSync(videoPath);
        }
        catch (err) {
            console.error(`Error cleaning up ${videoPath}:`, err);
        }
        try {
            if (fs.existsSync(finalVideoPath))
                fs.unlinkSync(finalVideoPath);
        }
        catch (err) {
            console.error(`Error cleaning up ${finalVideoPath}:`, err);
        }
        throw error;
    }
}
// Helper function to get audio duration
function getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                console.error('Error getting audio duration:', err);
                // Return default duration if ffprobe fails
                console.log('Using default audio duration of 60 seconds');
                resolve(60);
                return;
            }
            const duration = metadata.format.duration || 60;
            console.log(`🎵 Audio duration detected: ${duration.toFixed(3)}s`);
            resolve(duration);
        });
    });
}
// Helper function to combine video with audio
function combineVideoWithAudio(videoPath, audioPath, outputPath) {
    return new Promise((resolve, reject) => {
        console.log(`🔊 Combining video (${videoPath}) with audio (${audioPath}) to ${outputPath}`);
        // Check if files exist
        if (!fs.existsSync(videoPath)) {
            reject(new Error(`Video file does not exist: ${videoPath}`));
            return;
        }
        if (!fs.existsSync(audioPath)) {
            reject(new Error(`Audio file does not exist: ${audioPath}`));
            return;
        }
        ffmpeg()
            .input(videoPath)
            .input(audioPath)
            .outputOptions([
            '-c:v copy', // Copy video stream without re-encoding
            '-c:a aac', // Encode audio as AAC
            '-b:a 192k', // Higher bitrate for better quality
            '-ac 2', // Stereo
            '-ar 44100', // Sample rate
            '-shortest', // Use shortest input duration
            '-avoid_negative_ts make_zero', // Handle timestamp issues
        ])
            .output(outputPath)
            .on('start', (commandLine) => {
            console.log('🔊 FFmpeg command: ' + commandLine);
        })
            .on('progress', (progress) => {
            console.log('🔊 FFmpeg progress: ' + progress.percent + '% done');
        })
            .on('end', () => {
            console.log('✅ Video and audio combined successfully');
            resolve();
        })
            .on('error', (err) => {
            console.error('❌ Error combining video with audio:', err);
            reject(err);
        })
            .run();
    });
}
//# sourceMappingURL=remotionVideoGenerator.js.map