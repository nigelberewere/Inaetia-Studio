import express from "express";
import path from "path";
import fs from "fs";
import { moviesIndex } from "../state";
import {
  startOrGetHlsTranscode,
  ensureHlsPlaylistReady,
  getHlsProgress,
  stopHlsTranscode,
  getActiveTranscodes,
  HLS_CACHE_ROOT,
} from "../../hlsManager";

const router = express.Router();

// GET /api/hls/:id/index.m3u8
router.get("/api/hls/:id/index.m3u8", async (req, res) => {
  const id = req.params.id;
  const filepath = moviesIndex.get(id);

  if (!filepath) {
    return res.status(404).json({ error: "Movie ID not found or catalog unindexed" });
  }

  const ss = req.query.ss ? parseFloat(req.query.ss as string) : 0;

  try {
    await startOrGetHlsTranscode(id, filepath, { seekOffset: ss });
    const ready = await ensureHlsPlaylistReady(id, 10000);

    if (!ready) {
      return res.status(500).json({ error: "HLS playlist initialization timed out" });
    }

    const playlistPath = path.join(HLS_CACHE_ROOT, id, "index.m3u8");
    if (!fs.existsSync(playlistPath)) {
      return res.status(404).json({ error: "Playlist file not found" });
    }

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Access-Control-Allow-Origin", "*");

    fs.createReadStream(playlistPath).pipe(res);
  } catch (err: any) {
    console.error(`[HLS Route Error] Failed to serve playlist for ${id}:`, err);
    res.status(500).json({ error: "Failed to generate HLS playlist", details: err.message });
  }
});

// GET /api/hls/:id/:segment
router.get("/api/hls/:id/:segment", (req, res) => {
  const { id, segment } = req.params;

  if (segment.includes("..") || segment.includes("/") || segment.includes("\\")) {
    return res.status(400).json({ error: "Invalid segment name" });
  }

  const segmentPath = path.join(HLS_CACHE_ROOT, id, segment);

  if (!fs.existsSync(segmentPath)) {
    return res.status(404).json({ error: "HLS segment not found" });
  }

  res.setHeader("Content-Type", "video/mp2t");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.setHeader("Access-Control-Allow-Origin", "*");

  fs.createReadStream(segmentPath).pipe(res);
});

// GET /api/hls/:id/progress
router.get("/api/hls/:id/progress", (req, res) => {
  const id = req.params.id;
  const progress = getHlsProgress(id);
  res.json(progress);
});

// POST /api/hls/:id/stop
router.post("/api/hls/:id/stop", (req, res) => {
  const id = req.params.id;
  stopHlsTranscode(id);
  res.json({ success: true, message: `HLS transcode stopped for ${id}` });
});

// GET /api/hls/active
router.get("/api/hls/active", (req, res) => {
  res.json(getActiveTranscodes());
});

export default router;
