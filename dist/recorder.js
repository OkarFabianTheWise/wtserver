import puppeteer from 'puppeteer';
import { generateAnimationHTML } from './renderer';
export class VideoRecorder {
    browser = null;
    page = null;
    // STEP 1: Initialize headless browser
    async initialize() {
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
    // STEP 2: Record video using MediaRecorder API
    async recordVideo(script, outputPath, duration = 5000, fps = 30) {
        if (!this.page)
            throw new Error('Browser not initialized');
        // Load animation HTML
        const html = generateAnimationHTML(script, duration);
        await this.page.setContent(html);
        // Wait for page to be ready
        await this.page.waitForFunction(() => window.getCanvasStream !== undefined);
        console.log('Starting video recording...');
        // STEP 3: Record using MediaRecorder API
        const result = await this.page.evaluate(async (recordDuration, recordFps) => {
            try {
                const canvas = document.getElementById('canvas');
                const stream = window.getCanvasStream(recordFps);
                if (!stream) {
                    return { error: 'No canvas stream available' };
                }
                const chunks = [];
                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm',
                    videoBitsPerSecond: 2000000 // 2 Mbps
                });
                return new Promise((resolve) => {
                    let hasData = false;
                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            chunks.push(event.data);
                            hasData = true;
                        }
                    };
                    mediaRecorder.onstop = async () => {
                        if (!hasData) {
                            resolve({ error: 'No video data captured' });
                            return;
                        }
                        const blob = new Blob(chunks, { type: 'video/webm' });
                        const arrayBuffer = await blob.arrayBuffer();
                        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                        resolve({ base64 });
                    };
                    mediaRecorder.onerror = (error) => {
                        resolve({ error: 'MediaRecorder error: ' + String(error) });
                    };
                    // Start recording continuously
                    mediaRecorder.start();
                    // Wait for animation to complete or timeout
                    const checkComplete = () => {
                        if (window.animationComplete) {
                            mediaRecorder.stop();
                            stream.getTracks().forEach((track) => track.stop());
                        }
                        else {
                            setTimeout(checkComplete, 100);
                        }
                    };
                    // Fallback timeout
                    setTimeout(() => {
                        if (mediaRecorder.state !== 'inactive') {
                            mediaRecorder.stop();
                            stream.getTracks().forEach((track) => track.stop());
                        }
                    }, recordDuration);
                    checkComplete();
                });
            }
            catch (err) {
                return { error: 'Exception in evaluate: ' + String(err) };
            }
        }, duration, fps);
        if (result.error) {
            throw new Error(result.error);
        }
        if (!result.base64) {
            throw new Error('No base64 data returned');
        }
        // Convert base64 back to buffer
        const buffer = Buffer.from(result.base64, 'base64');
        console.log(`Video recorded: ${buffer.length} bytes`);
        return buffer;
    }
    // STEP 4: Cleanup
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }
}
//# sourceMappingURL=recorder.js.map