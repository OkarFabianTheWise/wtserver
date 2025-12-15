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
  - Request body: `{"script": string, "title"?: string, "walletAddress": string}`
  - Asynchronous behavior: Returns immediately with `jobId` and `status: "generating"`. Processing happens in background.
  - Example using `curl`:

```bash
curl -X POST 'http://localhost:3001/api/generate' \
  -H 'Content-Type: application/json' \
  -d '{"script":"console.log(\"hello\")","title":"Hello demo","walletAddress":"abc123"}'
```

- POST `/api/generate/audio`

  - Request body: `{"script": string, "title"?: string, "walletAddress": string}`
  - Asynchronous audio-only generation.

- POST `/api/generate/narrative`

  - Request body: `{"script": string, "title"?: string, "walletAddress": string}`
  - Asynchronous narrative video generation.

- GET `/api/videos/status/:id`
  - Returns JSON with `status`, `ready`, `error`, etc. for polling.
  - Example:

```bash
curl 'http://localhost:3001/api/videos/status/<jobId>'
```

- GET `/api/jobs/events?jobIds=<jobId1>,<jobId2>`

  - Server-Sent Events endpoint for real-time job status updates.

- POST `/api/webhooks/job-update`

  - Internal webhook endpoint for job status and progress updates (secured with HMAC signature).

- Static media: `GET /api/videos/job/:jobId` serves the generated video file directly.

**WebSocket Real-Time Updates**

The server now supports WebSocket connections for real-time progress updates during video/audio generation. Connect to `ws://localhost:3001` (or your server URL) to receive live updates.

**Frontend WebSocket Integration**

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3001');

// Handle connection
ws.onopen = () => {
  console.log('Connected to WebSocket');
  
  // Subscribe to a specific job
  ws.send(JSON.stringify({
    action: 'subscribe',
    jobId: 'your-job-id-here'
  }));
};

// Handle incoming messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'connected':
      console.log('WebSocket connected:', data.message);
      break;
      
    case 'subscribed':
      console.log('Subscribed to job:', data.jobId);
      break;
      
    case 'progress':
      console.log(`Job ${data.jobId}: ${data.progress}% - ${data.message}`);
      // Update UI progress bar
      updateProgress(data.progress, data.status, data.message);
      break;
      
    case 'completed':
      console.log(`Job ${data.jobId} completed!`);
      console.log('Video ID:', data.videoId, 'Duration:', data.duration);
      // Show completion UI
      showCompletion(data.videoId, data.duration);
      break;
      
    case 'error':
      console.error(`Job ${data.jobId} failed:`, data.error);
      // Show error UI
      showError(data.error);
      break;
  }
};

// Handle errors
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

// Handle disconnection
ws.onclose = () => {
  console.log('WebSocket disconnected');
};

// Helper functions
function updateProgress(progress, status, message) {
  // Update your progress bar and status text
  document.getElementById('progress-bar').style.width = progress + '%';
  document.getElementById('status-text').textContent = message;
}

function showCompletion(videoId, duration) {
  // Show success message and video player
  document.getElementById('result').innerHTML = `
    <p>Video generated successfully! Duration: ${duration}s</p>
    <video controls src="/api/videos/job/${videoId}"></video>
  `;
}

function showError(error) {
  // Show error message
  document.getElementById('result').innerHTML = `<p>Error: ${error}</p>`;
}
```

**WebSocket Message Types**

- `connected`: Connection established
- `subscribed`: Successfully subscribed to a job
- `progress`: Generation progress update with percentage, status, and message
- `completed`: Job finished successfully with videoId and duration
- `error`: Job failed with error message

**WebSocket Actions**

Send JSON messages to the server:

- `{"action": "subscribe", "jobId": "job-id"}` - Subscribe to progress updates for a job
- `{"action": "unsubscribe", "jobId": "job-id"}` - Unsubscribe from a job

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

- Asynchronous job processing: The API now uses webhooks for job completion. When a generation request is made:

  1. Job is created in database with status "generating"
  2. Request returns immediately with `jobId`
  3. Background processing generates the content
  4. On completion/failure, webhook is sent to update database
  5. Frontend can poll `/api/videos/status/:id` or use SSE at `/api/jobs/events`

- Webhook security: Webhooks are signed with HMAC-SHA256. Set `WEBHOOK_SECRET` in environment variables.

- Real-time updates: Use Server-Sent Events (SSE) for instant UI updates:
  ```javascript
  const eventSource = new EventSource("/api/jobs/events?jobIds=" + jobId);
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Job update:", data);
  };
  ```

Recommended production improvements:

- Use a proper job queue (Bull, Redis) for better scalability
- Add authentication and rate-limiting
- ✅ WebSocket connections implemented for bidirectional communication
- Add job retry logic and dead letter queues
- Monitor webhook delivery and implement retry mechanisms

**Security & Cost**

- TTS uses the OpenAI API: protect your API key and avoid exposing it to clients.
- Generating videos and calling the TTS API has costs — add usage limits, quotas or billing controls.

**Troubleshooting**

- If ffmpeg fails or you see errors while generating videos, confirm `ffmpeg` is installed and the PATH is correct.
- If TTS fails, ensure `OPENAI_API_KEY` is valid and environment variables are loaded (server reads `.env` by default).
- Check server logs (console output) — `videoGenerator.ts` and `textToSpeech.ts` log progress and errors.

**Where to go next**

- ✅ WebSocket-based progress events implemented for real-time UI updates
- I can convert the synchronous generator into a job queue and make `/api/generate` return immediately with `202` plus a polling-friendly status endpoint.
- I can add SSE/WebSocket-based progress events to show generation progress to the frontend.

If you'd like either of those, tell me which approach you prefer and I will implement it.

---

Generated by repository automation — keep this README updated as code moves between `src/` and `weaveit-generator/`.

**Quick Frontend Example**

This minimal example demonstrates how a frontend can POST the script, use WebSockets for real-time updates, and display the video.

```javascript
// POST the script
const resp = await fetch("http://localhost:3001/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ 
    script: "console.log('hello')", 
    title: "Demo",
    walletAddress: "your-wallet-address"
  }),
});
const { jobId } = await resp.json();

// Connect to WebSocket for real-time updates
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = () => {
  // Subscribe to the job
  ws.send(JSON.stringify({ action: 'subscribe', jobId }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'progress') {
    document.getElementById('status').textContent = `${data.progress}% - ${data.message}`;
  } else if (data.type === 'completed') {
    // Show video
    const videoUrl = `http://localhost:3001/api/videos/job/${data.videoId}`;
    document.querySelector("#player").src = videoUrl;
    document.getElementById('status').textContent = 'Completed!';
  } else if (data.type === 'error') {
    document.getElementById('status').textContent = `Error: ${data.error}`;
  }
};

// Alternative: Poll status (fallback if WebSocket not available)
let ready = false;
const pollStatus = async () => {
  if (ready) return;
  const s = await fetch(`http://localhost:3001/api/videos/status/${jobId}`);
  const data = await s.json();
  document.getElementById('status').textContent = data.status;
  if (data.ready) {
    ready = true;
    const videoUrl = `http://localhost:3001/api/videos/job/${jobId}`;
    document.querySelector("#player").src = videoUrl;
  } else {
    setTimeout(pollStatus, 2000);
  }
};

// Start polling as fallback
pollStatus();
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
