import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Use the server's `src/output` directory so static serving matches
const outputDir = path.join(process.cwd(), 'src', 'output');

// GET /api/videos/status/:id
router.get<{ id: string }>('/videos/status/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'No video ID provided' });
      return;
    }

    // Check for both .mp4 and .mp3
    const videoPath = path.join(outputDir, `${id}.mp4`);
    const audioPath = path.join(outputDir, `${id}.mp3`);
    const videoExists = fs.existsSync(videoPath);
    const audioExists = fs.existsSync(audioPath);

    if (!videoExists && !audioExists) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    res.json({
      contentId: id,
      outputType: videoExists ? 'video' : 'audio',
      status: 'completed',
      ready: true,
      contentUrl: videoExists ? `/output/${id}.mp4` : `/output/${id}.mp3`,
    });
  } catch (err) {
    console.error('weaveit-generator: Error in /api/videos/status/:id:', err);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
});

export default router;
