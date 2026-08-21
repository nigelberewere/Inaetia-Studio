import express from "express";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import {
  musicCache,
  musicIndex,
  radioPlaylistCache,
  playlistCache,
  getMimeType,
  isSafariClient,
  parsePathsEnv,
} from "../state";
import { resolveHome } from "../auth";
import { checkCache } from "../scanner";
import { getSeededShuffle, getScheduledItemAt } from "../../scheduler";
import { cleanArtistName, cleanTrackTitle } from "../../utils";
import { streamMediaFile } from "./movies";
import { RadioStation, RadioEPGItem, Track } from "../../types";

const router = express.Router();

let lastCheckedUtcDate = new Date().getUTCDate();

export function startMidnightRefreshJob() {
  setInterval(() => {
    const currentUtcDate = new Date().getUTCDate();
    if (currentUtcDate !== lastCheckedUtcDate) {
      console.log("⏰ Midnight UTC reached! Regenerating TV and Radio playlists...");
      playlistCache.clear();
      radioPlaylistCache.clear();
      lastCheckedUtcDate = currentUtcDate;
    }
  }, 60 * 1000);
}

startMidnightRefreshJob();

let activeRadioRemuxCount = 0;
const MAX_REMUX_STREAMS = 2;

function needsMusicTranscode(filepath: string): boolean {
  const ext = path.extname(filepath).toLowerCase();
  const safariMusicCompatible = [".mp3", ".m4a", ".aac", ".wav"];
  return !safariMusicCompatible.includes(ext);
}

export function getStationsList(): RadioStation[] {
  const stations: RadioStation[] = [];

  stations.push({
    id: "inaetiastudios-fm",
    name: "Inaetia Studios FM",
    stationNumber: 1,
    color: "#3B82F6",
    type: "smart",
    trackCount: musicCache.length,
    sourceFolder: undefined,
  });

  const sortedByAdded = [...musicCache].sort((a, b) => {
    const dateA = a.added ? new Date(a.added).getTime() : 0;
    const dateB = b.added ? new Date(b.added).getTime() : 0;
    return dateB - dateA;
  });
  const topHitsCount = Math.max(1, Math.ceil(musicCache.length * 0.2));
  const topHitsTracks = sortedByAdded.slice(0, topHitsCount);
  stations.push({
    id: "top-hits-radio",
    name: "Top Hits Radio",
    stationNumber: 2,
    color: "#EF4444",
    type: "smart",
    trackCount: topHitsTracks.length,
    sourceFolder: undefined,
  });

  const lateNightTracks = musicCache.filter((t) => (t.duration || 120) > 240);
  stations.push({
    id: "late-night-radio",
    name: "Late Night Radio",
    stationNumber: 3,
    color: "#8B5CF6",
    type: "smart",
    trackCount: lateNightTracks.length,
    sourceFolder: undefined,
  });

  stations.push({
    id: "shuffle-party",
    name: "Shuffle Party",
    stationNumber: 4,
    color: "#10B981",
    type: "smart",
    trackCount: musicCache.length,
    sourceFolder: undefined,
  });

  const resolvedMusicPaths = parsePathsEnv(process.env.MUSIC_PATHS, process.env.MUSIC_PATH || "media/Music");
  let folderIdx = 0;
  const folderColors = ["#F59E0B", "#EC4899", "#06B6D4", "#84CC16", "#6366F1", "#14B8A6", "#F97316"];

  resolvedMusicPaths.forEach((musicDir) => {
    const resolved = resolveHome(musicDir);
    if (fs.existsSync(resolved)) {
      try {
        const subfolders = fs
          .readdirSync(resolved, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory() && !dirent.name.startsWith("."))
          .map((dirent) => dirent.name);

        subfolders.forEach((name) => {
          const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          const folderPath = path.resolve(path.join(resolved, name));

          if (stations.some((s) => s.id === id)) return;

          const tracksInFolder = musicCache.filter((t) => {
            const fullPath = musicIndex.get(t.id);
            return fullPath && fullPath.startsWith(folderPath);
          });

          stations.push({
            id,
            name,
            stationNumber: 5 + folderIdx,
            color: folderColors[folderIdx % folderColors.length],
            type: "folder",
            sourceFolder: folderPath,
            trackCount: tracksInFolder.length,
          });
          folderIdx++;
        });
      } catch (err) {
        console.error(`Error scanning music subfolders in ${resolved}:`, err);
      }
    }
  });

  return stations;
}

export function getStationTracks(stationId: string): Track[] {
  if (stationId === "inaetiastudios-fm" || stationId === "nigelcloud-fm" || stationId === "shuffle-party") {
    return [...musicCache].sort((a, b) => a.filepath.localeCompare(b.filepath));
  }

  if (stationId === "top-hits-radio") {
    const sortedByAdded = [...musicCache].sort((a, b) => {
      const dateA = a.added ? new Date(a.added).getTime() : 0;
      const dateB = b.added ? new Date(b.added).getTime() : 0;
      return dateB - dateA;
    });
    const topHitsCount = Math.max(1, Math.ceil(musicCache.length * 0.2));
    const topHitsTracks = sortedByAdded.slice(0, topHitsCount);
    return topHitsTracks.sort((a, b) => a.filepath.localeCompare(b.filepath));
  }

  if (stationId === "late-night-radio") {
    const lateNightTracks = musicCache.filter((t) => (t.duration || 120) > 240);
    return lateNightTracks.sort((a, b) => a.filepath.localeCompare(b.filepath));
  }

  const stations = getStationsList();
  const station = stations.find((s) => s.id === stationId);
  if (!station || !station.sourceFolder) return [];

  const tracksInFolder = musicCache.filter((t) => {
    const fullPath = musicIndex.get(t.id);
    return fullPath && fullPath.startsWith(station.sourceFolder!);
  });

  return tracksInFolder.sort((a, b) => a.filepath.localeCompare(b.filepath));
}

export function getShuffledRadioPlaylist(stationId: string, dateStr: string): Track[] {
  const cacheKey = `${stationId}-${dateStr}`;
  if (radioPlaylistCache.has(cacheKey)) {
    return radioPlaylistCache.get(cacheKey)!;
  }

  const tracks = getStationTracks(stationId);
  const seed = `${stationId}-${dateStr}`;
  const shuffled = getSeededShuffle(tracks, seed);
  radioPlaylistCache.set(cacheKey, shuffled);
  return shuffled;
}

export function getLiveRadioTrackAt(stationId: string, timestamp: number) {
  const stations = getStationsList();
  const station = stations.find((s) => s.id === stationId);
  if (!station) return null;

  const dateObj = new Date(timestamp);
  const dateStr = `${dateObj.getUTCFullYear()}-${String(dateObj.getUTCMonth() + 1).padStart(2, "0")}-${String(dateObj.getUTCDate()).padStart(2, "0")}`;
  const epoch = Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate());

  const shuffled = getShuffledRadioPlaylist(stationId, dateStr);
  if (shuffled.length === 0) return null;

  const sched = getScheduledItemAt(shuffled, epoch, timestamp, 120);
  if (!sched) return null;

  const currentTrack = sched.item;
  const nextTrack = sched.nextItem;
  const progress = (currentTrack.duration && currentTrack.duration > 0) ? sched.offsetSeconds / currentTrack.duration : 0;

  return {
    station: {
      ...station,
      nowPlayingArtist: cleanArtistName(currentTrack.artist),
      nowPlayingTitle: cleanTrackTitle(currentTrack.title),
    },
    currentTrack: {
      id: currentTrack.id,
      title: cleanTrackTitle(currentTrack.title),
      artist: cleanArtistName(currentTrack.artist),
      album: currentTrack.album,
      duration: currentTrack.duration,
      filepath: currentTrack.filepath,
    },
    offsetSeconds: sched.offsetSeconds,
    startedAt: sched.startedAt,
    endsAt: sched.endsAt,
    nextTrack: nextTrack
      ? {
          title: cleanTrackTitle(nextTrack.title),
          artist: cleanArtistName(nextTrack.artist),
          startsAt: sched.endsAt,
        }
      : null,
    progress,
  };
}

export function getRadioScheduleForStation(stationId: string, startTimestamp: number, hours: number): RadioEPGItem[] {
  const schedule: RadioEPGItem[] = [];
  const endTimestamp = startTimestamp + hours * 60 * 60 * 1000;

  let currentTimestamp = startTimestamp;
  while (currentTimestamp < endTimestamp) {
    const live = getLiveRadioTrackAt(stationId, currentTimestamp);
    if (!live) break;

    const trackEndsAt = new Date(live.endsAt).getTime();

    schedule.push({
      track: live.currentTrack as any,
      startTime: live.startedAt,
      endTime: live.endsAt,
    });

    currentTimestamp = trackEndsAt + 100;
  }

  return schedule;
}

// GET /api/radio/stations
router.get("/api/radio/stations", async (req, res) => {
  try {
    await checkCache();
    const stations = getStationsList();
    const nowTimestamp = Date.now();
    const stationsWithLive = stations.map((s) => {
      const live = getLiveRadioTrackAt(s.id, nowTimestamp);
      return {
        ...s,
        currentTrack: live ? live.currentTrack : null,
        nowPlayingArtist: live ? live.currentTrack.artist : "Unknown Artist",
        nowPlayingTitle: live ? live.currentTrack.title : "Unknown Title",
      };
    });
    res.json(stationsWithLive);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load radio stations", details: err.message });
  }
});

// GET /api/radio/stations/:id/now
router.get("/api/radio/stations/:id/now", async (req, res) => {
  try {
    await checkCache();
    const live = getLiveRadioTrackAt(req.params.id, Date.now());
    if (!live) {
      return res.status(404).json({ error: `Radio station with id ${req.params.id} not found or has no content` });
    }
    res.json(live);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get live radio track info", details: err.message });
  }
});

// GET /api/radio/stations/:id/schedule
router.get("/api/radio/stations/:id/schedule", async (req, res) => {
  try {
    await checkCache();
    const hours = parseInt((req.query.hours as string) || "3", 10);
    const schedule = getRadioScheduleForStation(req.params.id, Date.now(), hours);
    res.json(schedule);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch station schedule", details: err.message });
  }
});

// GET /api/radio/stations/schedule/all
router.get("/api/radio/stations/schedule/all", async (req, res) => {
  try {
    await checkCache();
    const hours = parseInt((req.query.hours as string) || "3", 10);
    const stations = getStationsList();
    const nowTimestamp = Date.now();
    const allSchedule: Record<string, any> = {};
    for (const s of stations) {
      allSchedule[s.id] = getRadioScheduleForStation(s.id, nowTimestamp, hours);
    }
    res.json(allSchedule);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch all radio schedule guides", details: err.message });
  }
});

// GET /api/radio/stations/:id/stream
router.get("/api/radio/stations/:id/stream", async (req, res) => {
  try {
    await checkCache();
    const stationId = req.params.id;
    const live = getLiveRadioTrackAt(stationId, Date.now());
    if (!live || !live.currentTrack) {
      return res.status(404).json({ error: "No active radio track on this station right now" });
    }

    const filepath = musicIndex.get(live.currentTrack.id);
    if (!filepath) {
      return res.status(404).json({ error: "Source file not found for the active radio track" });
    }

    const userAgent = req.headers["user-agent"] || "";

    if (isSafariClient(userAgent) && needsMusicTranscode(filepath)) {
      console.log(`[REMUX/TRANSCODE] Live Radio Safari client, transcoding ${path.basename(filepath)} to AAC`);
      console.log(`[REMUX] Active streams: ${activeRadioRemuxCount}/${MAX_REMUX_STREAMS}`);

      if (activeRadioRemuxCount >= MAX_REMUX_STREAMS) {
        return res.status(503).json({
          error: "Server busy, too many streams active. Try again shortly.",
        });
      }

      res.setHeader("Content-Type", "audio/aac");
      res.setHeader("Transfer-Encoding", "chunked");

      activeRadioRemuxCount++;

      const startSeconds = Math.max(0, Math.floor(live.offsetSeconds || 0));
      const ffmpegArgs: string[] = [];
      if (startSeconds > 0) {
        ffmpegArgs.push("-ss", startSeconds.toString());
      }
      ffmpegArgs.push("-i", filepath, "-c:a", "aac", "-b:a", "256k", "-f", "adts", "pipe:1");

      const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);
      ffmpegProcess.stdout.pipe(res);

      let countDecremented = false;
      const decrementCount = () => {
        if (!countDecremented) {
          activeRadioRemuxCount = Math.max(0, activeRadioRemuxCount - 1);
          countDecremented = true;
          console.log(`[REMUX] Radio transcode closed. Active streams: ${activeRadioRemuxCount}/${MAX_REMUX_STREAMS}`);
        }
      };

      ffmpegProcess.on("close", decrementCount);
      ffmpegProcess.on("error", (err) => {
        console.error("ffmpeg radio transcode error:", err);
        decrementCount();
        if (!res.headersSent) {
          res.status(500).json({ error: "Radio Transcode failed" });
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
  } catch (err: any) {
    res.status(500).json({ error: "Failed to stream radio track", details: err.message });
  }
});

export default router;
