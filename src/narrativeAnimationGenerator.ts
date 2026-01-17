import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import { createCanvas, CanvasRenderingContext2D } from 'canvas';
import type { NarrativeScene } from './codeAnalyzer';

const ffmpegPath = '/usr/bin/ffmpeg';
const ffprobePath = '/usr/bin/ffprobe';

if (fs.existsSync(ffmpegPath)) ffmpeg.setFfmpegPath(ffmpegPath);
if (fs.existsSync(ffprobePath)) ffmpeg.setFfprobePath(ffprobePath);

/**
 * Helper to draw a stick figure at given position
 */
function drawStickFigure(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string = '#000',
  scale: number = 1
) {
  const headRadius = 25 * scale;
  const bodyLength = 50 * scale;
  const limbLength = 35 * scale;
  const lineWidth = 3 * scale;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;

  // Head (circle)
  ctx.beginPath();
  ctx.arc(x, y, headRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Body (vertical line)
  ctx.beginPath();
  ctx.moveTo(x, y + headRadius);
  ctx.lineTo(x, y + headRadius + bodyLength);
  ctx.stroke();

  // Left arm
  ctx.beginPath();
  ctx.moveTo(x, y + headRadius + 15 * scale);
  ctx.lineTo(x - limbLength, y + headRadius + 15 * scale);
  ctx.stroke();

  // Right arm
  ctx.beginPath();
  ctx.moveTo(x, y + headRadius + 15 * scale);
  ctx.lineTo(x + limbLength, y + headRadius + 15 * scale);
  ctx.stroke();

  // Left leg
  ctx.beginPath();
  ctx.moveTo(x, y + headRadius + bodyLength);
  ctx.lineTo(x - limbLength / 1.5, y + headRadius + bodyLength + limbLength);
  ctx.stroke();

  // Right leg
  ctx.beginPath();
  ctx.moveTo(x, y + headRadius + bodyLength);
  ctx.lineTo(x + limbLength / 1.5, y + headRadius + bodyLength + limbLength);
  ctx.stroke();
}

/**
 * Helper to draw a simple rectangle (ledger, book, etc)
 */
function drawRectangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: string,
  label: string = '',
  fontSize: number = 16
) {
  ctx.fillStyle = fillColor;
  ctx.fillRect(x, y, width, height);

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  if (label) {
    ctx.fillStyle = '#000';
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + width / 2, y + height / 2);
  }
}

/**
 * Helper to draw an arrow between two points
 */
function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string = '#0066cc',
  width: number = 3,
  progress?: number // 0..1 optional moving head progress
) {
  const headlen = 18;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  // Draw base (faint) full connection for context
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.restore();

  // If progress provided, draw moving segment and head
  const endX = typeof progress === 'number' ? fromX + (toX - fromX) * Math.min(Math.max(progress, 0), 1) : toX;
  const endY = typeof progress === 'number' ? fromY + (toY - fromY) * Math.min(Math.max(progress, 0), 1) : toY;

  // Draw moving line
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Draw arrowhead at end
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

/**
 * Helper to draw a simple coin/circle object
 */
function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number = 20,
  color: string = '#FFD700'
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#DAA520';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Add some shine
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(x - radius / 3, y - radius / 3, radius / 3, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Parse visual elements from scene description and render them
 */
function renderSceneContent(
  ctx: CanvasRenderingContext2D,
  scene: NarrativeScene,
  canvasWidth: number,
  canvasHeight: number,
  frameProgress: number = 1 // 0..1 within scene for simple animation
) {
  const elements = scene.visualElements || [];

  // Clear background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw border
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

  // Pre-define common anchor positions to avoid off-canvas placement
  const leftX = Math.round(canvasWidth * 0.18);
  const centerX = Math.round(canvasWidth * 0.5);
  const rightX = Math.round(canvasWidth * 0.82);
  const centerY = Math.round(canvasHeight * 0.45);

  // Keep track if we drew primary actors to draw connecting arrows
  let drewLeft = false;
  let drewRight = false;

  elements.forEach((element) => {
    const element_lower = element.toLowerCase();

    // small vertical bobbing for life-like motion
    const bob = Math.sin(frameProgress * Math.PI * 2) * 6;

    if (element_lower.includes('alice') || element_lower.includes('person') || element_lower.includes('user')) {
      drawStickFigure(ctx, leftX, centerY + bob, '#0066cc');
      drewLeft = true;
    }
    if (element_lower.includes('bob') || element_lower.includes('receiver')) {
      drawStickFigure(ctx, rightX, centerY + bob, '#ff6600');
      drewRight = true;
    }
    if (element_lower.includes('ledger') || element_lower.includes('book') || element_lower.includes('record')) {
      drawRectangle(ctx, centerX - 60, centerY - 40, 120, 80, '#8B4513', 'Ledger', 14);
    }
    if (element_lower.includes('coin') || element_lower.includes('money') || element_lower.includes('fund')) {
      // coin gently floats up/down
      const coinY = centerY + 80 + Math.cos(frameProgress * Math.PI * 2) * 8;
      drawCoin(ctx, centerX + 160, coinY, 25, '#FFD700');
    }
    if (element_lower.includes('arrow') || element_lower.includes('connection') || element_lower.includes('flow')) {
      // draw animated arrow from left to right (if both present) or from left to center
      const fromX = drewLeft ? leftX + 40 : centerX - 160;
      const toX = drewRight ? rightX - 40 : centerX + 40;
      const fromY = centerY;
      const toY = centerY;
      drawArrow(ctx, fromX, fromY, toX, toY, '#0066cc', 3, frameProgress);
    }
  });

  // Add subtle drop shadow line under characters for depth
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, centerY + 140);
  ctx.lineTo(canvasWidth, centerY + 140);
  ctx.stroke();

  // Add scene narration text at the bottom with background for readability
  ctx.fillStyle = '#222';
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  // Word wrap the narration
  const maxWidth = canvasWidth - 120;
  const words = (scene.narration || '').split(' ');
  let line = '';
  const lines: string[] = [];

  words.forEach((word) => {
    const testLine = line + (line ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });
  if (line) lines.push(line);

  // Draw translucent background box behind subtitles
  const lineHeight = 24;
  const boxHeight = lines.length * lineHeight + 20;
  const boxY = canvasHeight - boxHeight - 10;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  const boxX = 40;
  ctx.fillRect(boxX, boxY, canvasWidth - boxX * 2, boxHeight);

  ctx.fillStyle = '#fff';
  let textY = canvasHeight - 20;
  for (let i = lines.length - 1; i >= 0; i--) {
    ctx.fillText(lines[i], canvasWidth / 2, textY);
    textY -= lineHeight;
  }

  // Add scene number in top-left
  ctx.fillStyle = '#999';
  ctx.font = '14px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Scene ${scene.sceneNumber}`, 20, 30);
}

/**
 * Generate frames for a single scene (with multiple frames for smooth playback)
 */
async function generateSceneFrames(
  scene: NarrativeScene,
  outputDir: string,
  startFrameIndex: number,
  canvasWidth: number = 1280,
  canvasHeight: number = 720,
  frameRate: number = 30
): Promise<number> {
  const numFrames = Math.ceil(scene.duration * frameRate);

  for (let f = 0; f < numFrames; f++) {
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Apply fade-in effect for first few frames
    if (f < 5) {
      ctx.globalAlpha = f / 5;
    } else {
      ctx.globalAlpha = 1;
    }

    // Pass normalized progress to renderer for simple motion
    const progress = numFrames > 0 ? f / Math.max(1, numFrames - 1) : 0;
    renderSceneContent(ctx, scene, canvasWidth, canvasHeight, progress);

    const frameIndex = startFrameIndex + f;
    const framePath = path.join(outputDir, `frame_${frameIndex.toString().padStart(6, '0')}.png`);
    fs.writeFileSync(framePath, canvas.toBuffer('image/png'));
  }

  return startFrameIndex + numFrames;
}

/**
 * Get audio duration from MP3 buffer
 */
function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);
      const duration = metadata.format.duration || 0;
      resolve(duration);
    });
  });
}

/**
 * Generate an animation video from narrative scenes
 */
export async function generateNarrativeVideo(
  scenes: NarrativeScene[],
  audioPath: string,
  outputPath: string
): Promise<void> {
  const tempDir = path.join(os.tmpdir(), `narrative-${Date.now()}`);
  const frameDir = path.join(tempDir, 'frames');

  if (!fs.existsSync(frameDir)) {
    fs.mkdirSync(frameDir, { recursive: true });
  }

  try {
    // console.log('🎨 Generating narrative animation frames...');

    // Generate frames for all scenes
    let frameIndex = 0;
    for (const scene of scenes) {
      frameIndex = await generateSceneFrames(scene, frameDir, frameIndex);
    }

    // console.log(`✅ Generated ${frameIndex} frames from ${scenes.length} scenes`);

    // Get audio duration
    const audioDuration = await getAudioDuration(audioPath);
    // console.log(`⏱️  Audio duration: ${audioDuration.toFixed(2)}s`);

    // Create video from frames
    // console.log('🎬 Creating video from frames...');
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(path.join(frameDir, 'frame_%06d.png'))
        .inputOptions(['-framerate 30'])
        .outputOptions([
          '-c:v libx264',
          '-pix_fmt yuv420p',
          '-r 30',
          '-preset fast',
          '-crf 23',
          '-movflags +faststart',
          '-y'
        ])
        .output(outputPath.replace(/\.mp4$/, '_video.mp4'))
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    const videoPath = outputPath.replace(/\.mp4$/, '_video.mp4');
    // console.log('🎵 Merging with audio...');

    // Merge video with audio
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .outputOptions([
          '-c:v copy',
          '-c:a aac',
          '-b:a 128k',
          '-shortest',
          '-movflags +faststart',
          '-y'
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    // console.log(`✅ Narrative animation video created: ${outputPath}`);

    // Cleanup temp files
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
  } finally {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

/**
 * Generate narrative video from buffer (for serverless/Heroku)
 */
export async function generateNarrativeVideoBuffer(
  scenes: NarrativeScene[],
  audioBuffer: Buffer
): Promise<Buffer> {
  const tempDir = path.join(os.tmpdir(), `narrative-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const audioPath = path.join(tempDir, 'audio.mp3');
  const videoPath = path.join(tempDir, 'output.mp4');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  fs.writeFileSync(audioPath, audioBuffer);

  await generateNarrativeVideo(scenes, audioPath, videoPath);

  const videoBuffer = fs.readFileSync(videoPath);

  // Cleanup
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  return videoBuffer;
}
