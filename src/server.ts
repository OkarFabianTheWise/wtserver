import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import videosStatusRoute from '../weaveit-generator/videosStatusRoute';
import generateRoute from '../weaveit-generator/generateRoute';
import { testConnection, getVideoByJobId, getVideoByVideoId } from './db';

// Load environment variables from root .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Mount API routers under `/api` so frontend can call `/api/generate` and `/api/videos/status/:id`
app.use('/api', videosStatusRoute);
app.use('/api', generateRoute);

// Video serving endpoint - serves video data from database by job ID
app.get('/api/videos/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const videoBuffer = await getVideoByJobId(jobId);

    if (!videoBuffer) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    // Set proper headers for video streaming
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', videoBuffer.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.send(videoBuffer);
  } catch (err) {
    console.error('Error serving video:', err);
    res.status(500).json({ error: 'Failed to retrieve video' });
  }
});

// Video serving endpoint - serves video data from database by video ID
app.get('/api/videos/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    const videoBuffer = await getVideoByVideoId(videoId);

    if (!videoBuffer) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    // Set proper headers for video streaming
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', videoBuffer.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.send(videoBuffer);
  } catch (err) {
    console.error('Error serving video:', err);
    res.status(500).json({ error: 'Failed to retrieve video' });
  }
});

// DB health endpoint
app.get('/api/db/health', async (_req, res) => {
  try {
    await testConnection();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Fallback 404 handler (always JSON)
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
