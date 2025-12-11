# Narrative Animation System - Quick Reference

## 🚀 Getting Started

### 1. Generate a Narrative Video

```bash
curl -X POST http://localhost:3001/api/generate/narrative \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890abcdef",
    "script": "function transfer(from, to, amt) { ledger[from] -= amt; ledger[to] += amt; }",
    "title": "Transfer Tutorial"
  }'
```

### 2. Check Job Status

```bash
curl http://localhost:3001/api/videos/status/job-uuid-here
```

### 3. Download Video

```bash
curl http://localhost:3001/api/videos/video-uuid-here \
  --output video.mp4
```

---

## 📋 What You Need

- **OpenAI API Key** (.env: `OPENAI_API_KEY`)
- **Text-to-Speech Service** (configured in `textToSpeech.ts`)
- **FFmpeg installed** (`/usr/bin/ffmpeg`)
- **Canvas library** (in package.json)
- **3 Credits** per narrative video generation

---

## 🎨 Visual Elements

| Element       | Renders As             | Use Case                    |
| ------------- | ---------------------- | --------------------------- |
| `"Alice"`     | Stick figure (blue)    | Characters, entities        |
| `"Bob"`       | Stick figure (orange)  | Second party, receiver      |
| `"Person"`    | Stick figure           | Generic person              |
| `"Ledger"`    | Brown rectangle        | Data storage, records       |
| `"Coin"`      | Gold circle            | Money, assets, transfers    |
| `"Arrow"`     | Blue directional arrow | Flows, connections, actions |
| `"Book"`      | Rectangle              | Knowledge, documentation    |
| `"Container"` | Rectangle              | Generic container           |

---

## 🔧 API Response Format

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "videoId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "status": "completed",
  "sceneCount": 7,
  "creditsDeducted": 3,
  "remainingCredits": 47,
  "message": "Narrative animation video generated successfully"
}
```

---

## ⏱️ Timing

| Phase                | Duration   |
| -------------------- | ---------- |
| Narrative generation | 10-15s     |
| Audio synthesis      | 15-20s     |
| Frame rendering      | 10-30s     |
| Video encoding       | 10-25s     |
| Audio merge          | 5-10s      |
| **Total**            | **45-90s** |

---

## 🛠️ Development

### Add Custom Visual Element

Edit `renderSceneContent()` in `narrativeAnimationGenerator.ts`:

```typescript
if (element_lower.includes("yourElement")) {
  // Your drawing code
  ctx.fillStyle = "#FF0000";
  ctx.fillRect(xPos, centerY, 100, 100);
}
```

### Test Narrative Generation

```typescript
import { generateNarrativeStoryboard } from "./codeAnalyzer";

const scenes = await generateNarrativeStoryboard(`
  function add(a, b) {
    return a + b;
  }
`);

console.log(scenes);
// Returns: [{sceneNumber: 1, description: "...", narration: "...", ...}]
```

### Generate Video Locally

```typescript
import { generateNarrativeVideoBuffer } from "./narrativeAnimationGenerator";
import { generateSpeechBuffer } from "./textToSpeech";
import fs from "fs";

const audioBuffer = await generateSpeechBuffer("narration text");
const videoBuffer = await generateNarrativeVideoBuffer(scenes, audioBuffer);
fs.writeFileSync("output.mp4", videoBuffer);
```

---

## 📊 Costs

- Standard video (scrolling code): 2 credits
- Audio only: 1 credit
- **Narrative video: 3 credits** ← New!

---

## 🐛 Troubleshooting

| Issue                          | Solution                                            |
| ------------------------------ | --------------------------------------------------- |
| "Insufficient credits"         | Purchase more credits or wait for trial reset       |
| "Failed to generate narrative" | Check OpenAI API key, verify GPT-4 access           |
| Empty video file               | Verify FFmpeg is installed at `/usr/bin/ffmpeg`     |
| Scenes don't match content     | Simplify script, use clearer technical descriptions |
| Temp disk full                 | Check `/tmp` disk space, ensure cleanup happens     |

---

## 📚 Files Modified

- ✏️ `src/codeAnalyzer.ts` - Added narrative generation
- ✏️ `src/server.ts` - Added route import
- ✏️ `src/db.ts` - Extended job types
- ✨ `src/narrativeAnimationGenerator.ts` - NEW
- ✨ `src/weaveit-generator/generateNarrativeRoute.ts` - NEW
- 📖 `NARRATIVE_ANIMATION.md` - Complete documentation

---

## 🔗 Full Documentation

See [NARRATIVE_ANIMATION.md](NARRATIVE_ANIMATION.md) for:

- Complete architecture
- All visual elements
- Performance details
- Customization guide
- Future enhancements

---

## ✅ Feature Checklist

- ✅ GPT-4 powered narrative generation
- ✅ 2D canvas animation engine
- ✅ Stick figures and shapes
- ✅ Audio synchronization
- ✅ Buffer-based (serverless compatible)
- ✅ Credit system integration
- ✅ Full error handling
- ✅ Database job tracking
- ✅ TypeScript types
- ✅ Comprehensive documentation

---

**Last Updated**: December 11, 2025
**Status**: Ready for Production
