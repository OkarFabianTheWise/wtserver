# Weaveit Server

This repository contains a backend service that takes a code/script input, generates an AI narration (TTS), converts the script into a tutorial-style scrolling video using FFmpeg and Canvas, and exposes the resulting media for a frontend to display.

This README explains the project structure, how the parts connect, how to run the server, and suggested improvements for production use.

**Repository layout**

- `src/` - Main server code and helpers
  - `server.ts` - Express server. Serves `src/output` statically and mounts the API routes under `/api`.
  - `cli.ts` - Command-line interface for local usage (analyze a file and optionally generate voice/video).
  - `codeAnalyzer.ts` - Uses OpenAI to convert code into segmented narration or tutorial text.
  - `textToSpeech.ts` - Uses OpenAI TTS to generate `.mp3` voiceover files.
  - `videoGenerator.ts` - Creates slides or a scrolling image of the script and uses `ffmpeg` to produce a final `.mp4` synchronized to the audio.
  - `output/` - Output directory for generated `.mp3` and `.mp4` files (served at `/output` by the server).
  - `slides/` - Temporary slide assets used during video generation.
  - `types.ts`, `config.ts`, etc. - small helpers and types.

- `weaveit-generator/` - Canonical API route implementations
  - `generateRoute.ts` - POST `/api/generate` — accepts `{ script, title?, transactionSignature? }`, enhances the script with `codeAnalyzer`, produces audio and video into `src/output`, and returns `{ contentId, videoUrl }` when finished.
  - `videosStatusRoute.ts` - GET `/api/videos/status/:id` — checks whether `/src/output/:id.mp4` or `/src/output/:id.mp3` exists and returns a JSON status.

Notes: small re-export stubs exist in `src/` so existing imports remain compatible while the canonical implementations live under `weaveit-generator/`.

**How the pieces connect**

- Frontend POSTs to `/api/generate` with a JSON body containing the script text.
- `weaveit-generator/generateRoute.ts` receives the request, optionally generates a `contentId`, and:
  1. Calls `enhanceScript` from `src/codeAnalyzer.ts` to produce a narrated explanation (segmented or continuous text).
  2. Calls `generateSpeech` (from `src/textToSpeech.ts`) to produce an `.mp3` voiceover saved to `src/output/<id>.mp3`.
  3. Calls `generateScrollingScriptVideo` (from `src/videoGenerator.ts`) which makes a tall image or slide images, produces a scrolling/cropped video with `ffmpeg`, merges audio, and saves `src/output/<id>.mp4`.
  4. Returns `{ contentId, videoUrl }` when the generation completes successfully.

- The server (`src/server.ts`) serves the generated files at `http://<host>:<port>/output/<id>.mp4` (static) and provides a status endpoint at `/api/videos/status/:id` to allow polling.

**API endpoints**

- POST `/api/generate`
  - Request body: `{"script": string, "title"?: string, "transactionSignature"?: string}`
  - Synchronous behavior: current implementation waits for TTS + FFmpeg to finish and responds with JSON containing `contentId` and `videoUrl`.
  - Example using `curl`:

```bash
curl -X POST 'http://localhost:3001/api/generate' \
  -H 'Content-Type: application/json' \
  -d '{"script":"console.log(\"hello\")","title":"Hello demo"}'
```

- GET `/api/videos/status/:id`
  - Returns JSON with `ready`, `status`, and `contentUrl` pointing to `/output/<id>.mp4` or `/output/<id>.mp3`.
  - Example:

```bash
curl 'http://localhost:3001/api/videos/status/<contentId>'
```

- Static media: `GET /output/<id>.mp4` serves the generated video file directly.

**Local development / prerequisites**

- Node.js (compatible with the `package.json` dev dependencies). Recommended: Node 18+.
- A package manager: `pnpm`, `npm`, or `yarn`.
- `ffmpeg` must be installed and available on `PATH` (the video generator uses `fluent-ffmpeg`).
- An OpenAI API key must be present as `OPENAI_API_KEY` in a `.env` file at the project root.

Install and run locally:

```bash
# install
pnpm install

# start dev server (uses ts-node / ESM)
pnpm run dev

# or
npx ts-node-esm src/server.ts
```

**CLI**

There is a small CLI for local testing:

```bash
# Analyze a file and optionally create voice/video
npx ts-node src/cli.ts analyze -f path/to/script.ts --voice --video
```

**Behavioral notes & production recommendations**

- Synchronous vs asynchronous: The current `POST /api/generate` implementation runs TTS and FFmpeg inside the request handler and only responds when finished. This is simple but not ideal for production because:
  - Requests may take a long time (tens of seconds to minutes) which can lead to client or proxy timeouts.
  - It blocks server resources.

Recommended production improvements:
  - Convert generation into an asynchronous job: return `202 Accepted` with a `contentId`, enqueue a job (Redis/Bull, RabbitMQ, or a simple worker process), and let the frontend poll `/api/videos/status/:id`.
  - Provide progress updates via Server-Sent Events (SSE) or WebSockets if you want real-time progress in the frontend.
  - Add authentication and rate-limiting to protect the TTS / OpenAI usage.
  - Add strict request size limits (body parser limits) and input validation.
  - Persist metadata about jobs (timestamps, user, size) to a lightweight DB if auditing is needed.

**Security & Cost**

- TTS uses the OpenAI API: protect your API key and avoid exposing it to clients.
- Generating videos and calling the TTS API has costs — add usage limits, quotas or billing controls.

**Troubleshooting**

- If ffmpeg fails or you see errors while generating videos, confirm `ffmpeg` is installed and the PATH is correct.
- If TTS fails, ensure `OPENAI_API_KEY` is valid and environment variables are loaded (server reads `.env` by default).
- Check server logs (console output) — `videoGenerator.ts` and `textToSpeech.ts` log progress and errors.

**Where to go next**

- I can convert the synchronous generator into a job queue and make `/api/generate` return immediately with `202` plus a polling-friendly status endpoint.
- I can add SSE/WebSocket-based progress events to show generation progress to the frontend.

If you'd like either of those, tell me which approach you prefer and I will implement it.

---
Generated by repository automation — keep this README updated as code moves between `src/` and `weaveit-generator/`.

**Quick Frontend Example**

This minimal example demonstrates how a frontend can POST the script, poll for readiness, and then display the video.

```javascript
// POST the script
const resp = await fetch('http://localhost:3001/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ script: "console.log('hello')", title: 'Demo' })
});
const { contentId } = await resp.json();

// Poll status
let ready = false;
while (!ready) {
  await new Promise(r => setTimeout(r, 2000));
  const s = await fetch(`http://localhost:3001/api/videos/status/${contentId}`);
  const data = await s.json();
  if (data.ready) ready = true;
}

// Show video
const videoUrl = `http://localhost:3001/output/${contentId}.mp4`;
document.querySelector('#player').src = videoUrl;
```

**Environment variables**

- `.env` at project root should include:
  - `OPENAI_API_KEY` — required for TTS and code analysis.

**Important runtime details**

- Default server port: `3001` (see `src/server.ts`).
- Generated media is written to `src/output/` and served statically at `/output`.
- Video generation is CPU- and IO-heavy. Ensure adequate disk and CPU resources on the host.

**npm / Scripts**

- `pnpm run dev` — run `ts-node-esm src/server.ts` (development)
- `pnpm run build` — compile TypeScript (`tsc`)
- `pnpm run start` — run compiled server (`node dist/server.js`)

**Extra notes**

- File retention: generated media remains in `src/output` until you remove it. Add a retention policy or cleanup job for production.
- Concurrency: if many users submit jobs simultaneously, convert generation to background jobs to avoid exhausting resources.

---
If you'd like I can also:
- Convert `/api/generate` to enqueue background jobs and return `202 Accepted` immediately.
- Add SSE or WebSocket progress events so the frontend receives real-time logs/progress.
- Create a sample HTML/JS frontend that uploads scripts and displays status/video.

Tell me which of those you prefer and I will implement it.
