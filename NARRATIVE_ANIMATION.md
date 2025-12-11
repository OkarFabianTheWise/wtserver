# Narrative Animation Video Generator

This document describes the new **Narrative Animation Video Generator** feature for weaveit-server.

## Overview

The narrative animation system transforms technical content (code, blockchain concepts, system descriptions) into **short story-driven 2D animations** that illustrate concepts using simple shapes, stick figures, and props.

### Architecture

The system consists of four main components:

1. **Narrative Generator** (`codeAnalyzer.ts` - `generateNarrativeStoryboard()`)

   - Converts technical content into sequential narrative scenes
   - Uses GPT-4 to create descriptive, visual storylines
   - Returns structured scene data with narration and visual elements

2. **Animation Engine** (`narrativeAnimationGenerator.ts`)

   - Renders 2D scenes using Node.js `canvas` library
   - Generates frames from narrative scenes
   - Handles stick figures, shapes, arrows, and props
   - Creates video from frames using FFmpeg

3. **API Route** (`generateNarrativeRoute.ts`)

   - Handles `/api/generate/narrative` POST requests
   - Manages credit deduction and job tracking
   - Orchestrates the generation pipeline

4. **Server Integration** (`server.ts`)
   - Mounts the narrative route alongside existing generators
   - Shares existing video serving and database infrastructure

## API Usage

### Endpoint

**POST** `/api/generate/narrative`

### Request Body

```json
{
  "walletAddress": "0x1234...",
  "script": "Your code or concept description here",
  "title": "Optional video title"
}
```

### Response

```json
{
  "jobId": "job-uuid-here",
  "videoId": "video-uuid-here",
  "status": "completed",
  "sceneCount": 7,
  "creditsDeducted": 3,
  "remainingCredits": 47,
  "message": "Narrative animation video generated successfully"
}
```

### Error Responses

- `400` - Missing script or walletAddress
- `402` - Insufficient credits (requires 3 credits for narrative videos)
- `500` - Generation failed

## Credits

- **Narrative Video**: 3 credits (higher cost reflects AI scene generation + animation rendering)
- Standard Video: 2 credits
- Audio Only: 1 credit

## Visual Elements

The animation engine supports the following visual primitives:

### Stick Figures

Rendered with circle head, line body, and limbs. Customizable color and scale.

```typescript
drawStickFigure(ctx, x, y, color, scale);
```

**Common characters:** Alice, Bob, Person, User, Receiver

### Shapes

- **Rectangles**: For ledgers, books, records
- **Circles**: For coins, objects, focal points
- **Arrows**: For flows, connections, cause-and-effect

### Props

- Ledger (brown rectangle with label)
- Coin (gold circle with shine effect)
- Books, records, data structures

### Text Labels

Scene descriptions and narration appear at the bottom of each frame with automatic word-wrapping.

## Scene Format

Each scene in the storyboard follows this structure:

```typescript
interface NarrativeScene {
  sceneNumber: number; // 1-indexed
  description: string; // Visual setup
  narration: string; // What the narrator says
  visualElements: string[]; // List of elements to render
  duration: number; // Seconds to display
}
```

### Visual Elements Examples

```
[
  "Alice",                    // Stick figure (character 1)
  "Ledger",                   // Brown rectangle (props)
  "Bob",                      // Stick figure (character 2)
  "Connection with arrow",    // Flow indicator
  "Coin"                      // Gold prop
]
```

## Generation Pipeline

1. **Script Input** → Technical content submitted
2. **Credit Check** → Verify user has 3+ credits
3. **Narrative Generation** → GPT-4 creates scene descriptions
4. **Scene Parsing** → Validate and structure scenes
5. **Audio Generation** → Text-to-speech for combined narration
6. **Frame Rendering** → Canvas draws each scene (30fps)
7. **Video Encoding** → FFmpeg creates H.264 MP4
8. **Audio Merge** → Combine video + audio track
9. **Database Storage** → Save video buffer to database
10. **Cleanup** → Remove temporary files

## Code Example

### Basic Usage

```typescript
import { generateNarrativeStoryboard } from "./codeAnalyzer";
import { generateNarrativeVideoBuffer } from "./narrativeAnimationGenerator";
import { generateSpeechBuffer } from "./textToSpeech";

// Input code/concept
const code = `
function transfer(from, to, amount) {
  ledger[from] -= amount;
  ledger[to] += amount;
}
`;

// Generate narrative
const scenes = await generateNarrativeStoryboard(code);
// Returns: [{sceneNumber: 1, description: "...", narration: "...", ...}, ...]

// Generate audio from scene narrations
const narration = scenes.map((s) => s.narration).join(" ");
const audioBuffer = await generateSpeechBuffer(narration);

// Generate video
const videoBuffer = await generateNarrativeVideoBuffer(scenes, audioBuffer);
```

## Performance Characteristics

- **Typical Generation Time**: 45-90 seconds

  - Narrative generation: 10-15s
  - Audio synthesis: 15-20s
  - Frame rendering: 10-30s (depends on scene count)
  - Video encoding: 10-25s
  - Audio merge: 5-10s

- **Output Sizes**

  - Typical video: 2-8 MB
  - 7 scenes × ~3 seconds each = ~21 second video

- **Frame Count**
  - 30 fps base framerate
  - ~630 frames for 21-second video
  - Each frame: ~50-100 KB PNG

## Customization

### Adjust Scene Duration

Modify `generateNarrativeStoryboard()` prompt to return longer/shorter durations:

```json
"duration": 5  // Increase from 3 to 5 seconds per scene
```

### Custom Visual Elements

Add new render logic to `renderSceneContent()`:

```typescript
if (element_lower.includes("database")) {
  // Draw cylinder-like shape
  ctx.fillStyle = "#4CAF50";
  ctx.beginPath();
  ctx.ellipse(x, y, 40, 20, 0, 0, Math.PI * 2);
  ctx.fill();
}
```

### Animation Effects

Add simple fade-in/fade-out by adjusting `ctx.globalAlpha`:

```typescript
// Scene already has fade-in in first 5 frames
// Add fade-out in last 5 frames
if (f > numFrames - 5) {
  ctx.globalAlpha = (numFrames - f) / 5;
}
```

## Troubleshooting

### Error: "Failed to generate narrative scenes"

- Check OpenAI API key in `.env`
- Verify GPT-4 access is enabled
- Check script length (should be <2000 tokens)

### Video file is empty or corrupted

- Verify FFmpeg installation: `which ffmpeg` should return `/usr/bin/ffmpeg`
- Check temp directory permissions: `/tmp` must be writable
- Ensure audio buffer was generated successfully

### Scenes don't match the code

- Adjust temperature in `generateNarrativeStoryboard()` (lower = more consistent)
- Provide more context in the script
- Use shorter, clearer code snippets

## Database Schema

The narrative videos use the existing `video_jobs` and `videos` tables with `job_type = 'narrative'`:

```sql
-- Video jobs track generation progress
CREATE TABLE video_jobs (
  job_id UUID PRIMARY KEY,
  wallet_address VARCHAR(255) NOT NULL,
  script_body TEXT NOT NULL,
  title VARCHAR(255),
  job_type VARCHAR(50) DEFAULT 'video',  -- 'video', 'audio', or 'narrative'
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'generating', 'completed', 'failed'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Videos store the actual MP4 data
CREATE TABLE videos (
  video_id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES video_jobs(job_id),
  wallet_address VARCHAR(255) NOT NULL,
  video_data BYTEA NOT NULL,
  duration_sec INTEGER,
  format VARCHAR(20) DEFAULT 'mp4',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Future Enhancements

1. **Animation Sequences**: Add tweening/interpolation between scenes
2. **Audio Synchronization**: Adjust scene duration to match audio pauses
3. **Character Persistence**: Keep characters on screen across scenes
4. **Interactive Elements**: Highlight code while animating
5. **Custom Themes**: User-selectable color schemes
6. **Scene Templates**: Pre-built animation patterns (flowcharts, timelines, etc.)

## Dependencies

- `canvas`: Drawing 2D scenes
- `ffmpeg` / `ffprobe`: Video encoding and audio analysis
- `openai`: GPT-4 for narrative generation
- `text-to-speech` (TTS service): Audio generation

## Performance Tips

1. Keep scripts under 1500 tokens for faster generation
2. Use clear, concise technical descriptions
3. For production, consider caching common narrative patterns
4. Monitor temp disk usage during peak loads

---

For questions or issues, check the [README.md](../README.md) or database logs.
