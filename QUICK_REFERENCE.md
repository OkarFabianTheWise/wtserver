# Quick Reference - Database Storage

## ✅ What's New

**Audio and video files are now stored in PostgreSQL database instead of local filesystem.**

---

## API Changes (Breaking)

### Generate Video

```bash
# OLD (no longer works)
POST /api/generate
{
  "script": "...",
  "transactionSignature": "..."
}

# NEW (required)
POST /api/generate
{
  "script": "...",
  "walletAddress": "your-wallet-address"  # REQUIRED!
}

# Response
{
  "jobId": "uuid",
  "videoId": "uuid",
  "status": "completed"
}
```

### Check Status

```bash
GET /api/videos/status/:jobId

# Response
{
  "jobId": "uuid",
  "status": "completed",
  "ready": true,
  "videoAvailable": true
}
```

### Get Video

```bash
GET /api/videos/:jobId

# Returns: video/mp4 binary stream
```

---

## Database Functions Available

```typescript
// User management
ensureUser(walletAddress)
getUserPoints(walletAddress)

// Job management
createVideoJob(walletAddress, scriptBody)
updateJobStatus(jobId, status, errorMessage?)
getJobStatus(jobId)

// Video storage
storeVideo(jobId, walletAddress, videoData, durationSec?, format?)
getVideo(jobId)
getVideoByJobId(jobId)

// Cleanup
cleanupOldJobs(daysOld)
clearScriptBody(jobId)
```

---

## Job Statuses

- `pending` - Job created
- `generating` - Processing video
- `completed` - Video ready
- `failed` - Error occurred

---

## Frontend Changes Needed

```javascript
// OLD
const response = await fetch("/api/generate", {
  method: "POST",
  body: JSON.stringify({
    script: myScript,
    transactionSignature: txSig,
  }),
});
const videoUrl = `/output/${txSig}.mp4`;

// NEW
const response = await fetch("/api/generate", {
  method: "POST",
  body: JSON.stringify({
    script: myScript,
    walletAddress: userWallet, // REQUIRED!
  }),
});
const { jobId } = await response.json();
const videoUrl = `/api/videos/${jobId}`;
```

---

## Environment Setup

Ensure `.env` has database connection:

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

Or individual params:

```env
PGHOST=your-host
PGDATABASE=weaveit
PGUSER=your-user
PGPASSWORD=your-password
PGPORT=5432
PGSSLMODE=require
```

---

## Files Changed

✅ `src/db.ts` - Database helpers  
✅ `src/textToSpeech.ts` - Buffer support  
✅ `src/videoGenerator.ts` - Buffer support  
✅ `weaveit-generator/generateRoute.ts` - DB integration  
✅ `weaveit-generator/videosStatusRoute.ts` - DB queries  
✅ `src/server.ts` - Video streaming from DB

---

## Benefits

✅ No local file storage  
✅ Horizontal scalability  
✅ Job tracking built-in  
✅ Automatic cleanup  
✅ User association  
✅ Error tracking

---

## See Also

- `DB_MIGRATION.md` - Detailed migration guide
- `IMPLEMENTATION_SUMMARY.md` - Full technical details
- `DATABASE.md` - Database schema

---

**Status**: ✅ Implementation Complete  
**No errors found in TypeScript compilation**
