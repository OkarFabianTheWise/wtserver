## Architecture Overview

**Backend Stack:**
- Node.js + TypeScript
- Puppeteer (headless browser to render canvas)
- ffmpeg (to convert frames/webm to MP4)

## Step-by-Step Implementation

### 1. Setup Project

```bash
npm install puppeteer ffmpeg-static
npm install --save-dev @types/puppeteer

```

### 2. 

### 3. Core Implementation

**renderer.ts** - Animation Logic
```typescript
// This generates the HTML with canvas animation
export function generateAnimationHTML(duration: number = 5000): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: #000; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="canvas" width="1920" height="1080"></canvas>
  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const duration = ${duration};
    let startTime = null;
    let isComplete = false;

    // STEP 1: Define animation frame drawing
    function drawFrame(time) {
      const progress = Math.min(time / duration, 1);

      // Clear canvas
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw animated circles
      for (let i = 0; i < 8; i++) {
        const offset = (i * Math.PI * 2) / 8;
        const x = canvas.width / 2 + Math.cos(progress * Math.PI * 2 + offset) * 400;
        const y = canvas.height / 2 + Math.sin(progress * Math.PI * 2 + offset) * 400;
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 80);
        gradient.addColorStop(0, \`hsla(\${(i * 45 + progress * 360) % 360}, 70%, 60%, 1)\`);
        gradient.addColorStop(1, \`hsla(\${(i * 45 + progress * 360) % 360}, 70%, 40%, 0)\`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 80, 0, Math.PI * 2);
        ctx.fill();
      }

      // Center rotating shape
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(progress * Math.PI * 4);
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI * 2) / 12;
        const radius = 60 + Math.sin(progress * Math.PI * 8) * 40;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Progress text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(\`\${Math.round(progress * 100)}%\`, canvas.width / 2, canvas.height - 60);

      return progress >= 1;
    }

    // STEP 2: Animation loop with MediaRecorder
    function animate(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      isComplete = drawFrame(elapsed);

      if (!isComplete) {
        requestAnimationFrame(animate);
      } else {
        // Signal completion to Puppeteer
        window.animationComplete = true;
      }
    }

    // Start animation
    requestAnimationFrame(animate);

    // Expose stream for recording
    window.getCanvasStream = function(fps) {
      return canvas.captureStream(fps);
    };
  </script>
</body>
</html>
  `;
}
```

**recorder.ts** - Video Recording Logic
```typescript
import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { generateAnimationHTML } from './renderer';

export class VideoRecorder {
  private browser: Browser | null = null;
  private page: Page | null = null;

  // STEP 1: Initialize headless browser
  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  // STEP 2: Record video using Chrome DevTools Protocol
  async recordVideo(
    outputPath: string,
    duration: number = 5000,
    fps: number = 30
  ): Promise<string> {
    if (!this.page) throw new Error('Browser not initialized');

    // Load animation HTML
    const html = generateAnimationHTML(duration);
    await this.page.setContent(html);

    // Wait for page to be ready
    await this.page.waitForFunction(() => window.getCanvasStream !== undefined);

    console.log('Starting video recording...');

    // STEP 3: Use Chrome DevTools Protocol to record
    const client = await this.page.target().createCDPSession();
    
    // Start screencast (video recording)
    const videoPath = path.join(outputPath, `video-${Date.now()}.webm`);
    const chunks: Buffer[] = [];

    // Listen for screencast frames
    client.on('Page.screencastFrame', async ({ data, sessionId }) => {
      const buffer = Buffer.from(data, 'base64');
      chunks.push(buffer);
      
      // Acknowledge frame
      await client.send('Page.screencastFrameAck', { sessionId });
    });

    // Start screencast
    await client.send('Page.startScreencast', {
      format: 'png',
      quality: 100,
      maxWidth: 1920,
      maxHeight: 1080,
      everyNthFrame: 1
    });

    // Wait for animation to complete
    await this.page.waitForFunction(
      () => window.animationComplete === true,
      { timeout: duration + 5000 }
    );

    // Stop screencast
    await client.send('Page.stopScreencast');

    console.log(`Captured ${chunks.length} frames`);

    // STEP 4: Alternative method - Use MediaRecorder in page context
    const webmBuffer = await this.recordWithMediaRecorder(duration, fps);
    
    // Save the video
    fs.writeFileSync(videoPath, webmBuffer);
    console.log(`Video saved to: ${videoPath}`);

    return videoPath;
  }

  // STEP 5: Record using MediaRecorder API (better quality)
  private async recordWithMediaRecorder(
    duration: number,
    fps: number
  ): Promise<Buffer> {
    if (!this.page) throw new Error('Browser not initialized');

    // Inject recording script into page
    const videoData = await this.page.evaluate(async (recordDuration, recordFps) => {
      return new Promise<string>((resolve, reject) => {
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        const stream = (window as any).getCanvasStream(recordFps);

        const chunks: Blob[] = [];
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 5000000 // 5 Mbps
        });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = btoa(
            String.fromCharCode(...new Uint8Array(arrayBuffer))
          );
          resolve(base64);
        };

        mediaRecorder.onerror = (error) => {
          reject(error);
        };

        mediaRecorder.start(100);

        // Stop recording after duration
        setTimeout(() => {
          mediaRecorder.stop();
          stream.getTracks().forEach((track: any) => track.stop());
        }, recordDuration);
      });
    }, duration, fps);

    // Convert base64 back to buffer
    return Buffer.from(videoData, 'base64');
  }

  // STEP 6: Convert WebM to MP4 using ffmpeg
  async convertToMP4(webmPath: string): Promise<string> {
    const ffmpeg = require('ffmpeg-static');
    const { execSync } = require('child_process');

    const mp4Path = webmPath.replace('.webm', '.mp4');

    console.log('Converting to MP4...');

    execSync(
      `${ffmpeg} -i "${webmPath}" -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p "${mp4Path}"`,
      { stdio: 'inherit' }
    );

    console.log(`MP4 saved to: ${mp4Path}`);

    // Optional: delete webm file
    fs.unlinkSync(webmPath);

    return mp4Path;
  }

  // STEP 7: Cleanup
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

// Type declarations for window
declare global {
  interface Window {
    animationComplete?: boolean;
    getCanvasStream?: (fps: number) => MediaStream;
  }
}
```

**server.ts** - API Endpoint
```typescript
import express from 'express';
import path from 'path';
import { VideoRecorder } from './recorder';

const app = express();
app.use(express.json());

const OUTPUT_DIR = path.join(__dirname, '../output');

// Ensure output directory exists
import fs from 'fs';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// STEP 1: API endpoint to generate video
app.post('/api/generate-video', async (req, res) => {
  const { duration = 5000, fps = 30, format = 'mp4' } = req.body;

  console.log(`Generating video: ${duration}ms @ ${fps}fps`);

  const recorder = new VideoRecorder();

  try {
    // Initialize browser
    await recorder.initialize();

    // Record video
    const webmPath = await recorder.recordVideo(OUTPUT_DIR, duration, fps);

    let finalPath = webmPath;

    // Convert to MP4 if requested
    if (format === 'mp4') {
      finalPath = await recorder.convertToMP4(webmPath);
    }

    // Return video file
    res.json({
      success: true,
      videoPath: finalPath,
      downloadUrl: `/download/${path.basename(finalPath)}`
    });

  } catch (error) {
    console.error('Error generating video:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await recorder.close();
  }
});

// STEP 2: Download endpoint
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(OUTPUT_DIR, filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filepath);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Generate video: POST http://localhost:${PORT}/api/generate-video`);
});
```

### 4. Usage Examples

**example.ts** - Standalone usage
```typescript
import { VideoRecorder } from './recorder';
import path from 'path';

async function generateVideo() {
  const recorder = new VideoRecorder();

  try {
    await recorder.initialize();

    const outputDir = path.join(__dirname, '../output');
    const webmPath = await recorder.recordVideo(outputDir, 5000, 30);
    
    // Convert to MP4
    const mp4Path = await recorder.convertToMP4(webmPath);

    console.log('Video generated successfully:', mp4Path);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await recorder.close();
  }
}

generateVideo();
```

### 5. Package.json Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "ts-node src/server.ts",
    "generate": "ts-node src/example.ts"
  }
}
```

### 6. Test the API

```bash
# Start server
npm run dev

# Generate video
curl -X POST http://localhost:3000/api/generate-video \
  -H "Content-Type: application/json" \
  -d '{"duration": 5000, "fps": 30, "format": "mp4"}'

# Download
curl -O http://localhost:3000/download/video-1234567890.mp4
```

## Key Points

1. **Puppeteer** runs a headless Chrome that renders your canvas animation
2. **MediaRecorder API** captures the canvas stream as WebM
3. **ffmpeg** converts WebM to MP4 (better compatibility)
4. **100% backend** - no frontend needed

For your use case (article → AI script → video):
- Replace `generateAnimationHTML()` with dynamic content based on AI script
- Adjust animation logic based on the article context
- Scale duration and complexity as needed
