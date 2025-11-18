# Initialization Checklist

Follow these steps to get the WeaveIt server running locally or on a host.

1. Clone the repository and enter the project folder.

2. Install dependencies (recommended: `pnpm`, fallback: `npm`):

```bash
# with pnpm
pnpm install

# or with npm
npm install
```

3. Install system dependencies:

- FFmpeg (required by `videoGenerator.ts` / `fluent-ffmpeg`):
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt update && sudo apt install ffmpeg -y`
  - Windows (choco): `choco install ffmpeg`

4. Create `.env` from `.env.example` and fill required values:

```bash
cp .env.example .env
# then edit .env and add your OPENAI_API_KEY
```

5. Ensure `.env` is present locally but not committed — `.gitignore` already contains `.env`.

6. Start the dev server:

```bash
pnpm run dev
# or
npx ts-node-esm src/server.ts
```

7. Test the API with curl (sample):

```bash
curl -X POST 'http://localhost:3001/api/generate' \
  -H 'Content-Type: application/json' \
  -d '{"script":"console.log(\"hello\")","title":"Hello demo"}'
```

8. Check generated files in `src/output/` and view via `http://localhost:3001/output/<contentId>.mp4`.

Troubleshooting
- If TTS fails: ensure `OPENAI_API_KEY` is correct and env is loaded.
- If ffmpeg errors: verify `ffmpeg` is installed and available on PATH.
