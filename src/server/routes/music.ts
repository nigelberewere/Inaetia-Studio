import express from "express";
import path from "path";
import { spawn } from "child_process";
import { musicCache, musicIndex, getMimeType, isSafariClient } from "../state";
import { sanitizeTrackForClient } from "../auth";
import { checkCache } from "../scanner";
import { streamMediaFile } from "./movies";

const router = express.Router();

let activeMusicRemuxCount = 0;
const MAX_REMUX_STREAMS = 2;

function needsMusicTranscode(filepath: string): boolean {
  const ext = path.extname(filepath).toLowerCase();
  const safariMusicCompatible = [".mp3", ".m4a", ".aac", ".wav"];
  return !safariMusicCompatible.includes(ext);
}

// GET /api/music
router.get("/api/music", async (req, res) => {
  try {
    await checkCache();
    const safeMusic = musicCache.map(sanitizeTrackForClient);
    res.json(safeMusic);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to scan music", details: err.message });
  }
});

// GET /api/music/stream/:id
router.get("/api/music/stream/:id", (req, res) => {
  const id = req.params.id;
  const filepath = musicIndex.get(id);

  if (!filepath) {
    return res.status(404).json({ error: "Audio track ID not found" });
  }

  const userAgent = req.headers["user-agent"] || "";

  if (isSafariClient(userAgent) && needsMusicTranscode(filepath)) {
    console.log(`[REMUX/TRANSCODE] Safari Music client, transcoding ${path.basename(filepath)} to AAC`);
    console.log(`[REMUX] Active streams: ${activeMusicRemuxCount}/${MAX_REMUX_STREAMS}`);

    if (activeMusicRemuxCount >= MAX_REMUX_STREAMS) {
      return res.status(503).json({
        error: "Server busy, too many streams active. Try again shortly.",
      });
    }

    res.setHeader("Content-Type", "audio/aac");
    res.setHeader("Transfer-Encoding", "chunked");

    activeMusicRemuxCount++;

    const ffmpegArgs = [
      "-i", filepath,
      "-c:a", "aac",
      "-b:a", "256k",
      "-f", "adts",
      "pipe:1",
    ];

    const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);
    ffmpegProcess.stdout.pipe(res);

    let countDecremented = false;
    const decrementCount = () => {
      if (!countDecremented) {
        activeMusicRemuxCount = Math.max(0, activeMusicRemuxCount - 1);
        countDecremented = true;
        console.log(`[REMUX] Music transcode closed. Active streams: ${activeMusicRemuxCount}/${MAX_REMUX_STREAMS}`);
      }
    };

    ffmpegProcess.on("close", decrementCount);
    ffmpegProcess.on("error", (err) => {
      console.error("ffmpeg music transcode error:", err);
      decrementCount();
      if (!res.headersSent) {
        res.status(500).json({ error: "Transcode failed" });
      }
    });

    req.on("close", () => {
      ffmpegProcess.kill("SIGKILL");
      decrementCount();
    });

    return;
  }

  const mimeType = getMimeType(path.extname(filepath));
  streamMediaFile(filepath, mimeType, req, res);
});

export default router;
