import express from "express";
import path from "path";
import fs from "fs";
import {
  moviesCache,
  moviesIndex,
  playlistCache,
  getMimeType,
  TRANSPARENT_GIF,
  parsePathsEnv,
} from "../state";
import { resolveHome } from "../auth";
import { checkCache } from "../scanner";
import { getSeededShuffle, getScheduledItemAt } from "../../scheduler";
import {
  startOrGetHlsTranscode,
  ensureHlsPlaylistReady,
} from "../../hlsManager";
import { Channel, ChannelGuideItem, Movie } from "../../types";

const router = express.Router();

interface ChannelDir {
  name: string;
  path: string;
  isMusicVideos?: boolean;
}

export function getChannelDirectories(): ChannelDir[] {
  const dirs: ChannelDir[] = [];

  const addChannelDir = (dirPath: string, customName?: string, isMusicVid?: boolean) => {
    if (!dirPath) return;
    const resolvedPath = path.resolve(resolveHome(dirPath));
    if (!fs.existsSync(resolvedPath)) return;

    const isSubfolderOfExisting = dirs.some((d) => {
      const existingResolved = path.resolve(d.path);
      return resolvedPath === existingResolved || resolvedPath.startsWith(existingResolved + path.sep);
    });

    if (isSubfolderOfExisting) {
      return;
    }

    const name = customName || path.basename(resolvedPath) || "Channel";

    dirs.push({
      name,
      path: resolvedPath,
      isMusicVideos: isMusicVid,
    });
  };

  const moviePaths = parsePathsEnv(process.env.MOVIES_PATHS, "");
  const tvPaths = parsePathsEnv(process.env.TV_SHOWS_PATHS, "");
  const otherPaths = parsePathsEnv(process.env.OTHER_VIDEOS_PATHS, "");
  const musicVideoPath = process.env.MUSIC_VIDEOS_PATH;

  moviePaths.forEach((p) => addChannelDir(p));
  tvPaths.forEach((p) => addChannelDir(p));
  otherPaths.forEach((p) => addChannelDir(p));
  if (musicVideoPath) addChannelDir(musicVideoPath, "Music Videos", true);

  const videoContainers = [process.env.VIDEOS_PATH || "", path.join(process.cwd(), "media/Videos")].filter(Boolean);

  videoContainers.forEach((container) => {
    const resolvedContainer = path.resolve(resolveHome(container));
    if (fs.existsSync(resolvedContainer)) {
      const containerAlreadyAdded = dirs.some((d) => {
        const existingResolved = path.resolve(d.path);
        return resolvedContainer === existingResolved || resolvedContainer.startsWith(existingResolved + path.sep);
      });

      if (!containerAlreadyAdded) {
        try {
          const subentries = fs.readdirSync(resolvedContainer, { withFileTypes: true });
          subentries.forEach((entry) => {
            if (entry.isDirectory() && !entry.name.startsWith(".")) {
              const fullPath = path.join(resolvedContainer, entry.name);
              addChannelDir(fullPath);
            }
          });
        } catch (err) {
          console.error(`Error scanning container ${resolvedContainer}:`, err);
        }
      }
    }
  });

  if (dirs.length === 0) {
    videoContainers.forEach((container) => {
      addChannelDir(container, "Main Channel");
    });
  }

  return dirs;
}

let cachedChannelsList: Channel[] | null = null;
let channelsListLastUpdated = 0;

export function getChannelsList(forceRefresh = false): Channel[] {
  if (!forceRefresh && cachedChannelsList && Date.now() - channelsListLastUpdated < 10000) {
    return cachedChannelsList;
  }

  const dirs = getChannelDirectories();
  const channelColors = ["#E11D48", "#2563EB", "#059669", "#D97706", "#7C3AED", "#DB2777", "#0891B2"];

  const result: Channel[] = dirs.map((dir, i) => {
    const id = dir.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    let hasPoster = false;
    let hasFanart = false;
    const exts = [".jpg", ".jpeg", ".png", ".webp"];

    if (fs.existsSync(dir.path)) {
      try {
        const files = fs.readdirSync(dir.path);
        hasPoster = files.some((f) => {
          const ext = path.extname(f).toLowerCase();
          if (!exts.includes(ext)) return false;
          const base = path.basename(f, ext).toLowerCase();
          return base === "poster" || base === "folder";
        });
        hasFanart = files.some((f) => {
          const ext = path.extname(f).toLowerCase();
          if (!exts.includes(ext)) return false;
          const base = path.basename(f, ext).toLowerCase();
          return base === "fanart" || base === "background";
        });
      } catch (err) {
        console.error(`Error checking artwork for channel folder ${dir.path}:`, err);
      }
    }

    return {
      id,
      name: dir.name,
      color: channelColors[i % channelColors.length],
      channelNumber: i + 1,
      sourceFolder: path.resolve(dir.path),
      poster: hasPoster ? `/api/channels/${id}/poster` : null,
      fanart: hasFanart ? `/api/channels/${id}/fanart` : null,
      hasPoster,
      hasFanart,
    };
  });

  cachedChannelsList = result;
  channelsListLastUpdated = Date.now();
  return result;
}

export function getShuffledPlaylist(channelId: string, dateStr: string, channelSourceFolder: string): Movie[] {
  const cacheKey = `${channelId}-${dateStr}`;
  if (playlistCache.has(cacheKey)) {
    return playlistCache.get(cacheKey)!;
  }

  const channelVideos = moviesCache.filter((m) => {
    const fullPath = moviesIndex.get(m.id);
    return fullPath && fullPath.startsWith(channelSourceFolder);
  });

  channelVideos.sort((a, b) => a.filepath.localeCompare(b.filepath));

  const seed = `${channelId}-${dateStr}`;
  const shuffled = getSeededShuffle(channelVideos, seed);
  playlistCache.set(cacheKey, shuffled);
  return shuffled;
}

export function getLiveProgramAt(channelId: string, timestamp: number, channelOpt?: Channel) {
  const channel = channelOpt || getChannelsList().find((c) => c.id === channelId);
  if (!channel || !channel.sourceFolder) return null;

  const dateObj = new Date(timestamp);
  const dateStr = `${dateObj.getUTCFullYear()}-${String(dateObj.getUTCMonth() + 1).padStart(2, "0")}-${String(dateObj.getUTCDate()).padStart(2, "0")}`;
  const epoch = Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate());

  const shuffled = getShuffledPlaylist(channelId, dateStr, channel.sourceFolder);
  if (shuffled.length === 0) return null;

  const sched = getScheduledItemAt(shuffled, epoch, timestamp, 120);
  if (!sched) return null;

  return {
    channel,
    currentProgram: sched.item,
    offsetSeconds: sched.offsetSeconds,
    startedAt: sched.startedAt,
    endsAt: sched.endsAt,
    nextProgram: sched.nextItem
      ? {
          id: sched.nextItem.id,
          title: sched.nextItem.title,
          startsAt: sched.endsAt,
        }
      : null,
  };
}

export function getEPGForChannel(channelId: string, startTimestamp: number, hours: number): ChannelGuideItem[] {
  const epg: ChannelGuideItem[] = [];
  const endTimestamp = startTimestamp + hours * 60 * 60 * 1000;
  const channel = getChannelsList().find((c) => c.id === channelId);
  if (!channel) return epg;

  let currentTimestamp = startTimestamp;
  let iterations = 0;
  const maxIterations = 500;

  while (currentTimestamp < endTimestamp && iterations < maxIterations) {
    iterations++;
    const live = getLiveProgramAt(channelId, currentTimestamp, channel);
    if (!live || !live.endsAt) break;

    const programEndsAt = new Date(live.endsAt).getTime();
    if (isNaN(programEndsAt)) break;

    epg.push({
      program: live.currentProgram,
      startTime: live.startedAt,
      endTime: live.endsAt,
    });

    currentTimestamp = Math.max(programEndsAt + 100, currentTimestamp + 1000);
  }

  return epg;
}

// GET /api/channels/:id/poster
router.get("/api/channels/:id/poster", (req, res) => {
  const channelId = req.params.id;
  const channels = getChannelsList();
  const channel = channels.find((c) => c.id === channelId);
  if (!channel || !channel.sourceFolder || !fs.existsSync(channel.sourceFolder)) {
    res.setHeader("Content-Type", "image/gif");
    return res.end(TRANSPARENT_GIF);
  }

  try {
    const files = fs.readdirSync(channel.sourceFolder);
    const exts = [".jpg", ".jpeg", ".png", ".webp"];
    const found = files.find((f) => {
      const ext = path.extname(f).toLowerCase();
      if (!exts.includes(ext)) return false;
      const base = path.basename(f, ext).toLowerCase();
      return base === "poster" || base === "folder";
    });
    if (found) {
      const posterPath = path.join(channel.sourceFolder, found);
      res.setHeader("Content-Type", getMimeType(path.extname(posterPath)));
      return fs.createReadStream(posterPath).pipe(res);
    }
  } catch (err) {
    console.error(`Error streaming channel poster:`, err);
  }

  res.setHeader("Content-Type", "image/gif");
  return res.end(TRANSPARENT_GIF);
});

// GET /api/channels/:id/fanart
router.get("/api/channels/:id/fanart", (req, res) => {
  const channelId = req.params.id;
  const channels = getChannelsList();
  const channel = channels.find((c) => c.id === channelId);
  if (!channel || !channel.sourceFolder || !fs.existsSync(channel.sourceFolder)) {
    res.setHeader("Content-Type", "image/gif");
    return res.end(TRANSPARENT_GIF);
  }

  try {
    const files = fs.readdirSync(channel.sourceFolder);
    const exts = [".jpg", ".jpeg", ".png", ".webp"];
    const found = files.find((f) => {
      const ext = path.extname(f).toLowerCase();
      if (!exts.includes(ext)) return false;
      const base = path.basename(f, ext).toLowerCase();
      return base === "fanart" || base === "background";
    });
    if (found) {
      const fanartPath = path.join(channel.sourceFolder, found);
      res.setHeader("Content-Type", getMimeType(path.extname(fanartPath)));
      return fs.createReadStream(fanartPath).pipe(res);
    }
  } catch (err) {
    console.error(`Error streaming channel fanart:`, err);
  }

  res.setHeader("Content-Type", "image/gif");
  return res.end(TRANSPARENT_GIF);
});

// GET /api/channels
router.get("/api/channels", async (req, res) => {
  try {
    await checkCache();
    const channels = getChannelsList();
    const nowTimestamp = Date.now();
    const channelsWithLive = channels.map((c) => {
      const live = getLiveProgramAt(c.id, nowTimestamp);
      return {
        ...c,
        currentProgram: live
          ? {
              id: live.currentProgram.id,
              title: live.currentProgram.title,
              filename: live.currentProgram.filename,
              duration: live.currentProgram.duration,
              startedAt: live.startedAt,
              endsAt: live.endsAt,
              offsetSeconds: live.offsetSeconds,
              poster: live.currentProgram.poster || `/api/artwork/${live.currentProgram.id}/poster`,
              fanart: live.currentProgram.fanart || `/api/artwork/${live.currentProgram.id}/fanart`,
              thumbnail: live.currentProgram.thumbnail || `/api/thumbnail/${live.currentProgram.id}`,
            }
          : null,
      };
    });
    res.json(channelsWithLive);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load channels", details: err.message });
  }
});

// GET /api/channels/:id/now
router.get("/api/channels/:id/now", async (req, res) => {
  try {
    await checkCache();
    const live = getLiveProgramAt(req.params.id, Date.now());
    if (!live) {
      return res.status(404).json({ error: `Channel with id ${req.params.id} not found or has no content` });
    }
    res.json(live);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get live program info", details: err.message });
  }
});

// GET /api/channels/:id/epg
router.get("/api/channels/:id/epg", async (req, res) => {
  try {
    await checkCache();
    const hours = parseInt((req.query.hours as string) || "6", 10);
    const epg = getEPGForChannel(req.params.id, Date.now(), hours);
    res.json(epg);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch channel EPG", details: err.message });
  }
});

// GET /api/channels/epg/all
router.get("/api/channels/epg/all", async (req, res) => {
  try {
    await checkCache();
    const hours = parseInt((req.query.hours as string) || "6", 10);
    const channels = getChannelsList();
    const nowTimestamp = Date.now();
    const allEpg: Record<string, any> = {};
    for (const c of channels) {
      allEpg[c.id] = getEPGForChannel(c.id, nowTimestamp, hours);
    }
    res.json(allEpg);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch all EPG guides", details: err.message });
  }
});

// GET /api/channels/:id/stream
router.get("/api/channels/:id/stream", async (req, res) => {
  try {
    await checkCache();
    const channelId = req.params.id;
    const live = getLiveProgramAt(channelId, Date.now());
    if (!live || !live.currentProgram) {
      return res.status(404).json({ error: "No active broadcast on this channel right now" });
    }

    const filepath = moviesIndex.get(live.currentProgram.id);
    if (!filepath) {
      return res.status(404).json({ error: "Source file not found for the active broadcast" });
    }

    const startSeconds = Math.max(0, Math.floor(live.offsetSeconds || 0));
    const mediaId = live.currentProgram.id;

    console.log(`[HLS Live TV] Broadcasting channel ${channelId} (${live.currentProgram.title}) starting at ${startSeconds}s`);

    await startOrGetHlsTranscode(mediaId, filepath, { seekOffset: startSeconds });
    const ready = await ensureHlsPlaylistReady(mediaId, 10000);

    if (ready) {
      res.redirect(`/api/hls/${mediaId}/index.m3u8`);
    } else {
      res.status(500).json({ error: "Failed to initialize Live TV stream" });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Failed to stream live program", details: err.message });
  }
});

export default router;
