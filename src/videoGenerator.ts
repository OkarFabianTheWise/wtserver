import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import os, { userInfo } from 'os';
import { CanvasRenderingContext2D, createCanvas } from 'canvas';
import { saveScrollImage, saveScrollVideo } from './db';

const ffmpegPath = "/usr/bin/ffmpeg";
const ffprobePath = "/usr/bin/ffprobe";

if (fs.existsSync(ffmpegPath)) ffmpeg.setFfmpegPath(ffmpegPath);
if (fs.existsSync(ffprobePath)) ffmpeg.setFfprobePath(ffprobePath);

/**
 * Get the duration of the audio with better precision.
 */
function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Error getting audio duration:', err);
        reject(err);
        return;
      }
      const duration = metadata.format.duration || 0;
      console.log(`🎵 Audio duration detected: ${duration.toFixed(3)}s`);
      resolve(duration);
    });
  });
}

// Removed old splitTextIntoSlides function - now handled directly in generateSlides

/**
 * Enhanced text wrapping utility with better handling
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    const width = ctx.measureText(testLine).width;
    
    if (width > maxWidth && line !== '') {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }

  if (line) {
    lines.push(line);
  }
  
  return lines;
}

/**
 * FIXED: Create images (slides) from text that fills the entire slide properly
 */
async function generateSlides(script: string, outputDir: string): Promise<{ slides: string[], weights: number[] }> {
  const { createCanvas } = await import('canvas');
  const slidePaths: string[] = [];
  let allSlides: string[] = [];
  let allWeights: number[] = [];

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Split text into words for better control
  const words = script.split(' ');
  let currentSlideIndex = 0;

  while (words.length > 0) {
    const canvas = createCanvas(1280, 720);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Minimal padding to maximize text area
    const paddingX = 40;
    const paddingY = 40;
    const availableWidth = canvas.width - (2 * paddingX);
    const availableHeight = canvas.height - (2 * paddingY);

    // Start with a reasonable font size
    let fontSize = 28;
    let lineHeight = fontSize * 1.3; // Proper line spacing
    let maxLines = Math.floor(availableHeight / lineHeight);
    
    // Find optimal font size that maximizes text on slide
    while (fontSize >= 18) {
      lineHeight = fontSize * 1.3;
      maxLines = Math.floor(availableHeight / lineHeight);
      
      if (maxLines >= 8) { // Ensure we have enough lines to fill the slide
        break;
      }
      fontSize -= 1;
    }

    ctx.font = `${fontSize}px Arial, sans-serif`;
    
    // Fill the slide with as much text as possible
    const lines: string[] = [];
    let currentLine = '';
    let wordIndex = 0;
    
    // Pack text into lines, filling each line completely
    while (wordIndex < words.length && lines.length < maxLines) {
      const word = words[wordIndex];
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const textWidth = ctx.measureText(testLine).width;
      
      if (textWidth <= availableWidth) {
        currentLine = testLine;
        wordIndex++;
      } else {
        // Current line is full, start new line
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
          wordIndex++;
        } else {
          // Single word is too long, break it or use smaller font
          lines.push(word);
          wordIndex++;
        }
      }
    }
    
    // Add the last line if it has content
    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine);
    }

    // Remove the used words from the array
    const usedWords = lines.join(' ').split(' ').length;
    words.splice(0, Math.min(usedWords, words.length));

    // Draw text starting from top and filling downward
    ctx.fillStyle = '#333333';
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    lines.forEach((line, lineIndex) => {
      const y = paddingY + (lineIndex * lineHeight);
      ctx.fillText(line, paddingX, y);
    });

    // Save the slide
    const slidePath = path.join(outputDir, `slide_${currentSlideIndex}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(slidePath, buffer);
    slidePaths.push(slidePath);

    // Store slide text and calculate weight
    const slideText = lines.join(' ');
    allSlides.push(slideText);
    
    const wordCount = slideText.split(' ').length;
    console.log(`✅ Created slide ${currentSlideIndex + 1} (${wordCount} words, ${fontSize}px font, ${lines.length} lines filled): "${slideText.substring(0, 60)}..."`);
    
    currentSlideIndex++;
  }

  // Calculate weights based on word count (more accurate than character count)
  const totalWords = allSlides.reduce((sum, slide) => sum + slide.split(' ').length, 0);
  allWeights = allSlides.map(slide => slide.split(' ').length / totalWords);

  console.log(`📝 Generated ${allSlides.length} slides, all properly filled with text`);
  
  return { slides: slidePaths, weights: allWeights };
}

/**
 * Turn each slide into a short video clip - FIXED VERSION
 */
function createSlideVideo(slidePath: string, outputPath: string, duration: number): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🎬 Creating video clip: ${path.basename(outputPath)} (${duration.toFixed(3)}s)`);
    
    ffmpeg(slidePath)
      .inputOptions([
        '-loop 1',
        '-framerate 30' // Use standard framerate for input
      ])
      .outputOptions([
        '-c:v libx264',
        `-t ${duration.toFixed(3)}`, // Use precise duration
        '-pix_fmt yuv420p',
        '-r 30', // Output framerate
        '-preset medium', // Better quality
        '-crf 18', // Higher quality
        '-movflags +faststart'
      ])
      .output(outputPath)
      .on('end', () => {
        console.log(`✅ Video clip created: ${path.basename(outputPath)} (${duration.toFixed(3)}s)`);
        resolve();
      })
      .on('error', (err) => {
        console.error(`❌ Error creating video clip ${path.basename(outputPath)}:`, err);
        reject(err);
      })
      .run();
  });
}

/**
 * FIXED: Concatenate slide video clips with precise timing
 */
function concatSlideVideos(videoPaths: string[], outputPath: string): Promise<void> {
  const videoDir = path.dirname(videoPaths[0]);
  const concatListPath = path.join(videoDir, 'file_list.txt');
  
  // Use relative paths for concat (more reliable)
  const fileList = videoPaths.map(p => `file '${path.basename(p)}'`).join('\n');
  fs.writeFileSync(concatListPath, fileList);

  console.log(`🔗 Concatenating ${videoPaths.length} video clips...`);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatListPath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions([
        '-c:v libx264', // Re-encode for consistency
        '-c:a copy', // Copy audio if any
        '-pix_fmt yuv420p',
        '-r 30',
        '-preset medium',
        '-crf 18',
        '-movflags +faststart',
        '-avoid_negative_ts make_zero'
      ])
      .output(outputPath)
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`⏳ Concatenation progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`✅ Video concatenation completed: ${path.basename(outputPath)}`);
        // Clean up the file list
        if (fs.existsSync(concatListPath)) {
          fs.unlinkSync(concatListPath);
        }
        resolve();
      })
      .on('error', (err) => {
        console.error(`❌ Error concatenating videos:`, err);
        // Clean up the file list on error
        if (fs.existsSync(concatListPath)) {
          fs.unlinkSync(concatListPath);
        }
        reject(err);
      })
      .run();
  });
}

/**
 * FIXED: Merge final video with audio ensuring perfect sync with proper delay handling
 */
function mergeWithAudio(videoPath: string, audioPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🎵 Merging video with audio with proper sync...`);
    
    // First, get both durations to ensure they match
    Promise.all([
      getVideoDuration(videoPath),
      getAudioDuration(audioPath)
    ]).then(([videoDuration, audioDuration]) => {
      console.log(`📹 Video duration: ${videoDuration.toFixed(3)}s`);
      console.log(`🎵 Audio duration: ${audioDuration.toFixed(3)}s`);
      
      ffmpeg()
        .addInput(videoPath)
        .inputOptions(['-itsoffset', '0.1']) // Apply offset to video input
        .addInput(audioPath)
        .outputOptions([
          '-c:v copy', // Copy video stream
          '-c:a aac',
          '-b:a 192k',
          '-shortest', // Use shortest input (should be audio)
          '-avoid_negative_ts make_zero',
          '-movflags +faststart',
          '-map 0:v:0', // Video from first input
          '-map 1:a:0', // Audio from second input
          '-vsync cfr', // Constant frame rate
          '-async 1' // Audio sync
        ])
        .output(outputPath)
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`⏳ Audio merge progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log(`✅ Audio merge completed: ${path.basename(outputPath)}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`❌ Error merging audio:`, err);
          reject(err);
        })
        .run();
    }).catch(reject);
  });
}

/**
 * Get video duration helper function
 */
function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Error getting video duration:', err);
        reject(err);
        return;
      }
      const duration = metadata.format.duration || 0;
      resolve(duration);
    });
  });
}

/**
 * FIXED: Main function with better synchronization logic
 */
export async function generateVideo(tutorialText: string, audioPath: string, finalOutputPath: string): Promise<void> {
  const outputDir = path.join(__dirname, 'slides');
  const tempClipsDir = path.join(outputDir, 'clips');
  const ttsPath = path.join(outputDir, 'narration.mp3');

  if (!fs.existsSync(tempClipsDir)) {
    fs.mkdirSync(tempClipsDir, { recursive: true });
  }

  try {
    console.log('🚀 Starting video generation...');
    
    // Copy audio file
    fs.copyFileSync(audioPath, ttsPath);
    console.log('📋 Audio file copied');

    // Get actual audio duration FIRST
    const actualAudioDuration = await getAudioDuration(ttsPath);
    console.log(`⏱️  Actual audio duration: ${actualAudioDuration.toFixed(3)}s`);

    // Generate slides with weights
    const { slides, weights } = await generateSlides(tutorialText, outputDir);
    console.log(`📊 Generated ${slides.length} slides`);

    // Calculate precise durations based on actual audio length with extra buffer
    const slideDurations = weights.map(weight => {
      const baseDuration = weight * actualAudioDuration;
      // Add 30% buffer to each slide to slow down transitions more
      const bufferedDuration = baseDuration * 1.3;
      return bufferedDuration;
    });
    
    // Since we added buffers, we need to normalize to fit actual audio duration
    const totalBufferedDuration = slideDurations.reduce((sum, duration) => sum + duration, 0);
    const scaleFactor = actualAudioDuration / totalBufferedDuration;
    const finalSlideDurations = slideDurations.map(duration => duration * scaleFactor);
    
    // Verify total duration matches
    const totalCalculatedDuration = finalSlideDurations.reduce((sum, duration) => sum + duration, 0);
    console.log(`🧮 Calculated total duration: ${totalCalculatedDuration.toFixed(3)}s`);
    console.log(`🎵 Actual audio duration: ${actualAudioDuration.toFixed(3)}s`);
    console.log(`📏 Duration difference: ${Math.abs(totalCalculatedDuration - actualAudioDuration).toFixed(3)}s`);
    
    console.log('⏱️  Slide durations (with 30% buffer):');
    finalSlideDurations.forEach((duration, i) => {
      console.log(`   Slide ${i + 1}: ${duration.toFixed(3)}s (${(weights[i] * 100).toFixed(1)}% base + buffer)`);
    });

    // Create video clips for each slide with buffered durations
    const videoClips: string[] = [];
    for (let i = 0; i < slides.length; i++) {
      const videoClipPath = path.join(tempClipsDir, `clip_${i}.mp4`);
      await createSlideVideo(slides[i], videoClipPath, finalSlideDurations[i]);
      videoClips.push(videoClipPath);
    }

    // Concatenate all video clips
    const concatVideoPath = path.join(outputDir, 'combined.mp4');
    await concatSlideVideos(videoClips, concatVideoPath);

    // Verify concatenated video duration
    const finalVideoDuration = await getVideoDuration(concatVideoPath);
    console.log(`📹 Final video duration: ${finalVideoDuration.toFixed(3)}s`);
    
    // Merge with audio
    await mergeWithAudio(concatVideoPath, ttsPath, finalOutputPath);
    console.log(`✅ Final tutorial video saved to: ${finalOutputPath}`);

    // Cleanup temporary files
    const filesToCleanup = [
      ...slides,
      ...videoClips,
      concatVideoPath,
      ttsPath
    ];

    filesToCleanup.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });

    if (fs.existsSync(tempClipsDir)) {
      fs.rmdirSync(tempClipsDir);
    }
    
    console.log('🧹 Cleaned up temporary files.');
    console.log('🎉 Video generation completed successfully!');

  } catch (err) {
    console.error('❌ Error generating video:', err);
    
    // Cleanup on error
    try {
      if (fs.existsSync(tempClipsDir)) {
        fs.readdirSync(tempClipsDir).forEach(file => {
          fs.unlinkSync(path.join(tempClipsDir, file));
        });
        fs.rmdirSync(tempClipsDir);
      }
    } catch (cleanupErr) {
      console.error('Error during cleanup:', cleanupErr);
    }
    
    throw err;
  }
}


/**
 * Generate scrolling script video and return as buffer (for database storage)
 * Uses OS temp directory for ffmpeg processing, then cleans up automatically
 * Ephemeral-compatible: uses ephemeral /tmp directory with immediate cleanup
 */
export async function generateScrollingScriptVideo(
  script: string,
  audioBuffer: Buffer,
  jobId: string
): Promise<Buffer> {
  const width = 1280;
  const height = 720;
  const paddingX = 80;
  const paddingY = 60;
  const fontSize = 28;
  const lineSpacing = 1.8;
  const fontFamily = "Arial, sans-serif";
  const textColor = "#222";
  const bgColor = "#fff";

  try {
    // ========== 1. CANVAS TEXT WRAPPING + DRAWING ==========
    const dummy = createCanvas(width, height);
    const ctx = dummy.getContext("2d");
    ctx.font = `${fontSize}px ${fontFamily}`;

    const paragraphs = script.split(/\n\s*\n/);
    const wrappedLines: string[] = [];
    const sections: { startLine: number; endLine: number; complexity: number }[] = [];

    let currentLine = 0;
    paragraphs.forEach((paragraph, pIndex) => {
      const sectionStart = currentLine;
      if (pIndex > 0) {
        wrappedLines.push("");
        currentLine++;
      }

      const lines = paragraph.split("\n");
      let complexityScore = 0;

      lines.forEach((line) => {
        if (line.trim() === "") {
          wrappedLines.push("");
          currentLine++;
          return;
        }

        const words = line.split(" ");
        const avgWordLength =
          words.reduce((sum, w) => sum + w.length, 0) / words.length;

        const hasCode = /[(){}\[\]<>]/.test(line);
        const hasTech =
          /\b(function|class|const|let|var|import|export|async|await)\b/.test(
            line
          );

        const lineComplexity =
          avgWordLength * (hasCode ? 1.5 : 1) * (hasTech ? 1.3 : 1);
        complexityScore += lineComplexity;

        let buf = "";
        words.forEach((w) => {
          const test = buf ? buf + " " + w : w;
          if (ctx.measureText(test).width <= width - paddingX * 2) {
            buf = test;
          } else {
            wrappedLines.push(buf);
            currentLine++;
            buf = w;
          }
        });

        wrappedLines.push(buf);
        currentLine++;
      });

      sections.push({
        startLine: sectionStart,
        endLine: currentLine - 1,
        complexity: complexityScore,
      });

      if (pIndex < paragraphs.length - 1) {
        wrappedLines.push("");
        currentLine++;
      }
    });

    const lineHeight = fontSize * lineSpacing;
    const totalHeight =
      wrappedLines.length * lineHeight + paddingY * 2 + height;

    // ========== 2. DRAW CANVAS ==========
    const canvas = createCanvas(width, totalHeight);
    const scrollCtx = canvas.getContext("2d");

    scrollCtx.fillStyle = bgColor;
    scrollCtx.fillRect(0, 0, width, totalHeight);

    scrollCtx.font = `${fontSize}px ${fontFamily}`;
    scrollCtx.fillStyle = textColor;
    scrollCtx.textBaseline = "top";

    wrappedLines.forEach((line, i) => {
      if (line.trim() !== "") {
        scrollCtx.fillText(line, paddingX, paddingY + i * lineHeight);
      }
    });

    // ========== 3. IMAGE AS BUFFER (NO DISK) ==========
    const imageBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = canvas.createPNGStream();

      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });

    // Save image to database
    await saveScrollImage(jobId, imageBuffer);

    // ========== 4. CREATE TEMP FILES (Render-safe) ==========
    const tmpImage = `/tmp/${jobId}-scroll.png`;
    const tmpAudio = `/tmp/${jobId}-audio.wav`;
    const tmpVideo = `/tmp/${jobId}-video.mp4`;
    const tmpFinal = `/tmp/${jobId}-final.mp4`;

    fs.writeFileSync(tmpImage, imageBuffer);
    fs.writeFileSync(tmpAudio, audioBuffer);

    const duration = await getAudioDuration(tmpAudio);

    // Build scroll expression
    const totalComplexity = sections.reduce(
      (s, sec) => s + sec.complexity,
      0
    );

    const initialDelay = 6;
    const speedFactor = 0.7;
    const availableDuration = duration - initialDelay;

    const generateScrollExpression = () => {
      let expr = `if(lt(t,${initialDelay}),${paddingY},`;
      let t = initialDelay;

      sections.forEach((sec) => {
        const secDur =
          (sec.complexity / totalComplexity) * availableDuration;
        const start = sec.startLine * lineHeight + paddingY;
        const end = (sec.endLine + 1) * lineHeight + paddingY;
        const height = end - start;
        const formula = `${start}+((t-${t})/${secDur / speedFactor})*${height}`;

        expr += `if(lt(t,${t + secDur}),${formula},`;
        t += secDur;
      });

      expr += `${totalHeight - height}` + ")".repeat(sections.length);
      return expr;
    };

    // ========== 5. CREATE SCROLL VIDEO ==========
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(tmpImage)
        .inputOptions(["-framerate 30", "-loop 1"])
        .videoFilters([
          {
            filter: "crop",
            options: {
              w: width,
              h: height,
              x: 0,
              y: generateScrollExpression(),
            },
          },
        ])
        .outputOptions([
          "-c:v libx264",
          "-pix_fmt yuv420p",
          "-preset ultrafast",
          "-r 30",
          `-t ${duration}`,
          "-y",
        ])
        .save(tmpVideo)
        .on("end", () => resolve())
        .on("error", (err) => reject(err));
    });

    // ========== 6. MERGE AUDIO ==========
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(tmpVideo)
        .input(tmpAudio)
        .outputOptions([
          "-c:v copy",
          "-c:a aac",
          "-b:a 192k",
          "-shortest",
          "-movflags +faststart",
          "-y",
        ])
        .save(tmpFinal)
        .on("end", () => resolve())
        .on("error", (err) => reject(err));
    });

    // ========== 7. RETURN FINAL VIDEO BUFFER ==========
    const finalVideoBuffer = fs.readFileSync(tmpFinal);
    await saveScrollVideo(jobId, finalVideoBuffer);

    // Cleanup
    fs.rmSync(tmpImage, { force: true });
    fs.rmSync(tmpAudio, { force: true });
    fs.rmSync(tmpVideo, { force: true });
    fs.rmSync(tmpFinal, { force: true });

    return finalVideoBuffer;
  } catch (err) {
    console.error("❌ Error in generateScrollingScriptVideo:", err);
    throw err;
  }
}
