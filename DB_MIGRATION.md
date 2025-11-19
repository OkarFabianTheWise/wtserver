# Database Migration Guide

## Overview

The application has been migrated from file-based storage to PostgreSQL database storage for audio and video files. This eliminates the need for local file storage and improves scalability.

## What Changed

### 1. Database Integration (`src/db.ts`)

Added comprehensive database helper functions:

- **User Management**: `ensureUser()`, `getUserPoints()`
- **Job Management**: `createVideoJob()`, `updateJobStatus()`, `getJobStatus()`
- **Video Storage**: `storeVideo()`, `getVideo()`, `getVideoByJobId()`
- **Cleanup**: `cleanupOldJobs()`, `clearScriptBody()`

### 2. Audio Generation (`src/textToSpeech.ts`)

- Added `generateSpeechBuffer()` - returns audio as Buffer instead of saving to file
- Original `generateSpeech()` kept for backward compatibility

### 3. Video Generation (`src/videoGenerator.ts`)

- Added `generateScrollingScriptVideoBuffer()` - generates video and returns as Buffer
- Uses temporary files internally but cleans them up automatically
- Original `generateScrollingScriptVideo()` kept for backward compatibility

### 4. API Routes

#### Generate Route (`weaveit-generator/generateRoute.ts`)

**BREAKING CHANGE**: Now requires `walletAddress` in request body

**Before:**

```json
POST /api/generate
{
  "script": "...",
  "title": "...",
  "transactionSignature": "..." // optional
}
```

**After:**

```json
POST /api/generate
{
  "script": "...",
  "title": "...",
  "walletAddress": "..." // REQUIRED
}
```

**Response:**

```json
{
  "jobId": "uuid",
  "videoId": "uuid",
  "status": "completed",
  "message": "Educational tutorial video generated successfully"
}
```

#### Status Route (`weaveit-generator/videosStatusRoute.ts`)

**Changed**: Now uses `jobId` instead of file-based checks

```
GET /api/videos/status/:jobId
```

**Response:**

```json
{
  "jobId": "uuid",
  "status": "pending|generating|failed|completed",
  "ready": true,
  "error": null,
  "createdAt": "2025-11-19T...",
  "updatedAt": "2025-11-19T...",
  "videoAvailable": true
}
```

#### Video Retrieval (`src/server.ts`)

**Changed**: Serves videos from database instead of file system

```
GET /api/videos/:jobId
```

Returns video binary data with proper `Content-Type: video/mp4` headers.

### 5. Server Configuration (`src/server.ts`)

- Removed static file serving for `/output` directory
- Added database-backed video streaming endpoint
- Simplified imports (removed unused file system dependencies)

## Migration Steps

### 1. Ensure Database Tables Exist

Run the SQL from `DATABASE.md` if you haven't already:

```sql
CREATE TABLE users (...);
CREATE TABLE video_jobs (...);
CREATE TABLE videos (...);
-- Plus triggers
```

### 2. Update Environment Variables

Make sure `.env` contains:

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
# OR individual connection params:
PGHOST=...
PGDATABASE=...
PGUSER=...
PGPASSWORD=...
PGPORT=5432
PGSSLMODE=require
```

### 3. Update Frontend/Client Code

Change API calls to include `walletAddress`:

**Before:**

```javascript
fetch("/api/generate", {
  method: "POST",
  body: JSON.stringify({
    script: myScript,
    transactionSignature: txSig,
  }),
});
```

**After:**

```javascript
fetch("/api/generate", {
  method: "POST",
  body: JSON.stringify({
    script: myScript,
    walletAddress: userWallet, // REQUIRED
  }),
});
```

### 4. Update Video URL References

**Before:**

```javascript
const videoUrl = `/output/${transactionSignature}.mp4`;
```

**After:**

```javascript
const videoUrl = `/api/videos/${jobId}`;
```

### 5. Clean Up Old Files (Optional)

You can now safely delete the `src/output` directory:

```bash
rm -rf src/output
```

## Database Maintenance

### Clean up old failed jobs

```sql
DELETE FROM video_jobs
WHERE status = 'failed' AND created_at < NOW() - INTERVAL '7 days';
```

Or use the helper function:

```javascript
import { cleanupOldJobs } from "./src/db.ts";
await cleanupOldJobs(7); // Delete jobs older than 7 days
```

### Clear script bodies after completion (saves space)

The system automatically calls `clearScriptBody()` after successful video generation.

To manually clear:

```sql
UPDATE video_jobs SET script_body = NULL WHERE job_id = '<job_id>';
```

## Benefits

1. **No Local Storage**: Videos stored in database, not filesystem
2. **Scalability**: Can easily scale horizontally without shared filesystem
3. **Automatic Cleanup**: Temporary files cleaned up immediately after processing
4. **Job Tracking**: Built-in job status tracking (pending → generating → completed/failed)
5. **User Association**: Videos properly associated with wallet addresses
6. **Error Handling**: Failed jobs tracked with error messages

## Backward Compatibility

Original functions are maintained for backward compatibility:

- `generateSpeech(text, outputPath)` - still works with file paths
- `generateScrollingScriptVideo(script, audioPath, outputPath)` - still works with file paths

New buffer-based functions are used in the API routes for database storage.

## Testing

1. **Test database connection:**

```
GET /api/db/health
```

2. **Test video generation:**

```bash
curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "script": "Test script",
    "walletAddress": "your-wallet-address"
  }'
```

3. **Check job status:**

```
GET /api/videos/status/<jobId>
```

4. **Retrieve video:**

```
GET /api/videos/<jobId>
```

## Troubleshooting

### "Missing walletAddress in request body"

Ensure your client is sending `walletAddress` in the POST request.

### "Job not found"

The jobId might be incorrect or the job was deleted. Check the database:

```sql
SELECT * FROM video_jobs WHERE job_id = '<jobId>';
```

### "Video not found"

Video generation might have failed or is still in progress. Check job status first.

### Database connection errors

Verify `DATABASE_URL` or PostgreSQL connection parameters in `.env`.
