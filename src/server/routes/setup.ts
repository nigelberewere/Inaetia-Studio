import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { execFile } from "child_process";
import {
  moviesCache,
  musicCache,
  getPathsConfig,
  reinitializePathsAndSettings,
  hasMntStorage,
} from "../state";
import {
  isPathSafe,
  sanitizeEnvVal,
  getSessionFromReq,
  sanitizeMovieForClient,
  sanitizeTrackForClient,
} from "../auth";
import { checkCache, triggerScan, getFilesRecursively } from "../scanner";
import { loadProfiles } from "./profiles";

const router = express.Router();

let ffmpegInstalledCached = false;
execFile("ffmpeg", ["-version"], (err) => {
  if (!err) {
    ffmpegInstalledCached = true;
  } else {
    ffmpegInstalledCached = fs.existsSync("/usr/bin/ffmpeg") || fs.existsSync("/usr/local/bin/ffmpeg");
  }
});

export function getServerIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

// GET /api/search?q=query
router.get("/api/search", async (req, res) => {
  try {
    await checkCache();
    const query = ((req.query.q as string) || "").toLowerCase().trim();

    if (!query) {
      return res.json({ movies: [], music: [] });
    }

    const filteredMovies = moviesCache.filter(
      (m) => m.title.toLowerCase().includes(query) || m.filename.toLowerCase().includes(query)
    );

    const filteredMusic = musicCache.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.filename.toLowerCase().includes(query) ||
        t.artist.toLowerCase().includes(query) ||
        t.album.toLowerCase().includes(query)
    );

    res.json({
      movies: filteredMovies.map(sanitizeMovieForClient),
      music: filteredMusic.map(sanitizeTrackForClient),
    });
  } catch (err: any) {
    res.status(500).json({ error: "Search query failed", details: err.message });
  }
});

// GET /api/status
router.get("/api/status", async (req, res) => {
  try {
    await checkCache();
    const { PORT, VIDEOS_PATH, MUSIC_PATH } = getPathsConfig();

    const storagePath = hasMntStorage ? "/mnt/storage" : ".";

    execFile("df", ["-P", "-k", storagePath], { timeout: 1500, killSignal: "SIGKILL" }, (err, stdout) => {
      let total = 4000 * 1024 * 1024 * 1024;
      let free = 1800 * 1024 * 1024 * 1024;
      let used = total - free;

      if (!err && stdout) {
        const lines = stdout.trim().split("\n");
        if (lines.length >= 2) {
          const parts = lines[1].replace(/\s+/g, " ").split(" ");
          if (parts.length >= 4) {
            const parsedTotal = parseInt(parts[1], 10) * 1024;
            const parsedUsed = parseInt(parts[2], 10) * 1024;
            const parsedFree = parseInt(parts[3], 10) * 1024;
            if (!isNaN(parsedTotal) && !isNaN(parsedUsed) && !isNaN(parsedFree)) {
              total = parsedTotal;
              used = parsedUsed;
              free = parsedFree;
            }
          }
        }
      }

      const platform = process.platform;
      let osName = "Linux";
      if (platform === "darwin") osName = "macOS";
      else if (platform === "win32") osName = "Windows";

      res.json({
        uptime: Math.round(process.uptime()),
        storage: { total, used, free },
        movies: moviesCache.length,
        music: musicCache.length,
        os: osName,
        serverIp: getServerIpAddress(),
        videosPath: VIDEOS_PATH || "media/Videos",
        musicPath: MUSIC_PATH || "media/Music",
        musicPaths: process.env.MUSIC_PATHS || "",
        moviesPaths: process.env.MOVIES_PATHS || "",
        tvShowsPaths: process.env.TV_SHOWS_PATHS || "",
        otherVideosPaths: process.env.OTHER_VIDEOS_PATHS || "",
        appName: process.env.APP_NAME || "Inaetia Studios",
        port: PORT,
      });
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get server status", details: err.message });
  }
});

// POST /api/rescan
router.post("/api/rescan", async (req, res) => {
  try {
    const data = loadProfiles();
    const profiles = data.profiles || [];
    const hasProtectedAdmin = profiles.some((p: any) => p.isAdmin && (p.pin || p.pinHash));
    if (hasProtectedAdmin) {
      const session = getSessionFromReq(req);
      if (!session || !session.isAdmin) {
        return res.status(401).json({ error: "Admin authentication required to trigger rescan" });
      }
    }

    await triggerScan();
    res.json({ success: true, movies: moviesCache.length, music: musicCache.length });
  } catch (err: any) {
    res.status(500).json({ error: "Rescan triggered failure", details: err.message });
  }
});

// POST /api/thumbnails/clear
router.post("/api/thumbnails/clear", async (req, res) => {
  try {
    const data = loadProfiles();
    const profiles = data.profiles || [];
    const hasProtectedAdmin = profiles.some((p: any) => p.isAdmin && (p.pin || p.pinHash));
    if (hasProtectedAdmin) {
      const session = getSessionFromReq(req);
      if (!session || !session.isAdmin) {
        return res.status(401).json({ error: "Admin authentication required to clear cache" });
      }
    }

    const { thumbsCacheDir } = getPathsConfig();
    if (fs.existsSync(thumbsCacheDir)) {
      const files = fs.readdirSync(thumbsCacheDir);
      for (const file of files) {
        const fullPath = path.join(thumbsCacheDir, file);
        if (fs.statSync(fullPath).isFile()) {
          fs.unlinkSync(fullPath);
        }
      }
      console.log("[Thumbnails] Thumbnail cache cleared successfully by user request.");
    }
    res.json({ success: true, message: "Thumbnail cache cleared successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to clear thumbnail cache", details: err.message });
  }
});

// GET /api/setup/status
router.get("/api/setup/status", (req, res) => {
  const setupComplete = process.env.SETUP_COMPLETE === "true";

  const platform = process.platform;
  let osName = "Unknown";
  if (platform === "linux") osName = "Linux";
  else if (platform === "darwin") osName = "macOS";
  else if (platform === "win32") osName = "Windows";

  res.json({
    setupComplete,
    os: osName,
    nodeVersion: process.version,
    ffmpegDetected: ffmpegInstalledCached,
    themeColor: process.env.THEME_COLOR || "#F5A623",
    appName: process.env.APP_NAME || "Inaetia Studios",
    videosPath: process.env.VIDEOS_PATH || "",
    musicPath: process.env.MUSIC_PATH || "",
    musicVideosPath: process.env.MUSIC_VIDEOS_PATH || "",
    musicPaths: process.env.MUSIC_PATHS || "",
    moviesPaths: process.env.MOVIES_PATHS || "",
    tvShowsPaths: process.env.TV_SHOWS_PATHS || "",
    otherVideosPaths: process.env.OTHER_VIDEOS_PATHS || "",
    serverIp: getServerIpAddress(),
  });
});

// POST /api/setup/validate-path
router.post("/api/setup/validate-path", (req, res) => {
  const { path: rawPath, type } = req.body;
  if (!rawPath) {
    return res.status(400).json({ error: "Path is required" });
  }

  const check = isPathSafe(rawPath);
  if (!check.safe) {
    return res.status(400).json({ error: check.reason || "Invalid or restricted path", exists: false, fileCount: 0 });
  }

  const resolvedPath = check.resolvedPath;
  if (!fs.existsSync(resolvedPath)) {
    return res.json({ exists: false, fileCount: 0 });
  }

  try {
    const stat = fs.statSync(resolvedPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: "Specified path is not a directory", exists: false, fileCount: 0 });
    }
  } catch (e: any) {
    return res.status(400).json({ error: "Unable to inspect directory", exists: false, fileCount: 0 });
  }

  const allowedExts =
    type === "music"
      ? [".mp3", ".flac", ".m4a", ".wav", ".ogg", ".aac"]
      : [".mp4", ".mkv", ".avi", ".mov", ".m4v", ".webm"];

  const files = getFilesRecursively(resolvedPath, allowedExts);
  res.json({ exists: true, fileCount: files.length });
});

// POST /api/setup/submit
router.post("/api/setup/submit", async (req, res) => {
  const {
    videosPath,
    musicPath,
    musicVideosPath,
    musicPaths,
    moviesPaths,
    tvShowsPaths,
    otherVideosPaths,
    performanceProfile,
    themeColor,
    appName,
  } = req.body;

  const rawMusicPaths = Array.isArray(musicPaths) ? musicPaths : musicPath ? [musicPath] : ["media/Music"];
  const rawMoviesPaths = Array.isArray(moviesPaths) ? moviesPaths : videosPath ? [videosPath] : ["media/Videos"];
  const rawTvShowsPaths = Array.isArray(tvShowsPaths) ? tvShowsPaths : videosPath ? [videosPath] : ["media/Videos"];
  const rawOtherVideosPaths = Array.isArray(otherVideosPaths) ? otherVideosPaths : videosPath ? [videosPath] : ["media/Videos"];

  const pathsToCheck = [...rawMusicPaths, ...rawMoviesPaths, ...rawTvShowsPaths, ...rawOtherVideosPaths];
  if (musicVideosPath) pathsToCheck.push(musicVideosPath);

  for (const p of pathsToCheck) {
    if (p) {
      const check = isPathSafe(p);
      if (!check.safe) {
        return res.status(400).json({ error: `Path "${p}" is unsafe: ${check.reason}` });
      }
    }
  }

  const musicPathsArr = rawMusicPaths.map((p) => sanitizeEnvVal(p));
  const moviesPathsArr = rawMoviesPaths.map((p) => sanitizeEnvVal(p));
  const tvShowsPathsArr = rawTvShowsPaths.map((p) => sanitizeEnvVal(p));
  const otherVideosPathsArr = rawOtherVideosPaths.map((p) => sanitizeEnvVal(p));

  const musicPathsStr = musicPathsArr.join(",");
  const moviesPathsStr = moviesPathsArr.join(",");
  const tvShowsPathsStr = tvShowsPathsArr.join(",");
  const otherVideosPathsStr = otherVideosPathsArr.join(",");

  const finalVideosPath = moviesPathsArr[0] || otherVideosPathsArr[0] || "media/Videos";
  const finalMusicPath = musicPathsArr[0] || "media/Music";
  const cleanAppName = sanitizeEnvVal(appName || "Inaetia Studios");
  const cleanThemeColor = /^#[0-9A-Fa-f]{6}$/.test(themeColor) ? themeColor : "#F5A623";

  let maxConcurrentFfprobe = 5;
  let rescanInterval = 30;
  if (performanceProfile === "low") {
    maxConcurrentFfprobe = 2;
    rescanInterval = 60;
  } else if (performanceProfile === "mid") {
    maxConcurrentFfprobe = 5;
    rescanInterval = 30;
  } else if (performanceProfile === "high") {
    maxConcurrentFfprobe = 10;
    rescanInterval = 15;
  }

  const envContent = `# Inaetia Studios - Self-Hosted Media Server Configuration
SETUP_COMPLETE=true
APP_NAME="${cleanAppName}"
PORT=${process.env.PORT || 3000}
HOST=${process.env.HOST || "0.0.0.0"}
VIDEOS_PATH="${finalVideosPath}"
MUSIC_PATH="${finalMusicPath}"
MUSIC_VIDEOS_PATH="${sanitizeEnvVal(musicVideosPath || "")}"
MUSIC_PATHS="${musicPathsStr}"
MOVIES_PATHS="${moviesPathsStr}"
TV_SHOWS_PATHS="${tvShowsPathsStr}"
OTHER_VIDEOS_PATHS="${otherVideosPathsStr}"
THUMBNAILS_CACHE_PATH="/tmp/inaetia/thumbs"
PROFILES_PATH="~/.inaetia/profiles"
MAX_CONCURRENT_FFPROBE=${maxConcurrentFfprobe}
RESCAN_INTERVAL_MINUTES=${rescanInterval}
ENABLE_LIVE_TV=true
ENABLE_RADIO=true
ENABLE_SAFARI_REMUX=true
THEME_COLOR="${cleanThemeColor}"
SERVER_IP="${getServerIpAddress()}"
`;

  try {
    fs.writeFileSync(path.join(process.cwd(), ".env"), envContent, "utf-8");
    console.log("[Setup] Environment file (.env) written securely.");

    process.env.SETUP_COMPLETE = "true";
    process.env.APP_NAME = cleanAppName;
    process.env.VIDEOS_PATH = finalVideosPath;
    process.env.MUSIC_PATH = finalMusicPath;
    process.env.MUSIC_VIDEOS_PATH = sanitizeEnvVal(musicVideosPath || "");
    process.env.MUSIC_PATHS = musicPathsStr;
    process.env.MOVIES_PATHS = moviesPathsStr;
    process.env.TV_SHOWS_PATHS = tvShowsPathsStr;
    process.env.OTHER_VIDEOS_PATHS = otherVideosPathsStr;
    process.env.THUMBNAILS_CACHE_PATH = "/tmp/inaetia/thumbs";
    process.env.PROFILES_PATH = "~/.inaetia/profiles";
    process.env.MAX_CONCURRENT_FFPROBE = maxConcurrentFfprobe.toString();
    process.env.RESCAN_INTERVAL_MINUTES = rescanInterval.toString();
    process.env.THEME_COLOR = cleanThemeColor;

    reinitializePathsAndSettings();

    try {
      await triggerScan();
    } catch (scanErr) {
      console.error("Initial scan during setup failed:", scanErr);
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("Failed to write setup config:", err);
    res.status(500).json({ error: "Failed to save configuration", details: err.message });
  }
});

// POST /api/settings/save-directories
router.post("/api/settings/save-directories", async (req, res) => {
  const data = loadProfiles();
  const profiles = data.profiles || [];
  const hasProtectedAdmin = profiles.some((p: any) => p.isAdmin && (p.pin || p.pinHash));
  if (hasProtectedAdmin) {
    const session = getSessionFromReq(req);
    if (!session || !session.isAdmin) {
      return res.status(401).json({ error: "Admin authentication required to change library directories" });
    }
  }

  const { musicPaths, moviesPaths, tvShowsPaths, otherVideosPaths } = req.body;

  if (!musicPaths || !moviesPaths || !tvShowsPaths || !otherVideosPaths) {
    return res.status(400).json({ error: "All directory path arrays are required" });
  }

  const rawMusic = Array.isArray(musicPaths) ? musicPaths : [musicPaths];
  const rawMovies = Array.isArray(moviesPaths) ? moviesPaths : [moviesPaths];
  const rawTvShows = Array.isArray(tvShowsPaths) ? tvShowsPaths : [tvShowsPaths];
  const rawOtherVideos = Array.isArray(otherVideosPaths) ? otherVideosPaths : [otherVideosPaths];

  const allPaths = [...rawMusic, ...rawMovies, ...rawTvShows, ...rawOtherVideos];
  for (const p of allPaths) {
    if (p) {
      const check = isPathSafe(p);
      if (!check.safe) {
        return res.status(400).json({ error: `Path "${p}" is unsafe: ${check.reason}` });
      }
    }
  }

  const musicPathsArr = rawMusic.map((p) => sanitizeEnvVal(p));
  const moviesPathsArr = rawMovies.map((p) => sanitizeEnvVal(p));
  const tvShowsPathsArr = rawTvShows.map((p) => sanitizeEnvVal(p));
  const otherVideosPathsArr = rawOtherVideos.map((p) => sanitizeEnvVal(p));

  const musicPathsStr = musicPathsArr.join(",");
  const moviesPathsStr = moviesPathsArr.join(",");
  const tvShowsPathsStr = tvShowsPathsArr.join(",");
  const otherVideosPathsStr = otherVideosPathsArr.join(",");

  try {
    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }

    const updateEnvVar = (content: string, key: string, value: string): string => {
      if (!/^[A-Z0-9_]+$/.test(key)) {
        throw new Error("Invalid env key name");
      }
      const cleanVal = sanitizeEnvVal(value);
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(content)) {
        return content.replace(regex, `${key}="${cleanVal}"`);
      } else {
        return content + `\n${key}="${cleanVal}"`;
      }
    };

    let updatedEnv = envContent;
    updatedEnv = updateEnvVar(updatedEnv, "MUSIC_PATHS", musicPathsStr);
    updatedEnv = updateEnvVar(updatedEnv, "MOVIES_PATHS", moviesPathsStr);
    updatedEnv = updateEnvVar(updatedEnv, "TV_SHOWS_PATHS", tvShowsPathsStr);
    updatedEnv = updateEnvVar(updatedEnv, "OTHER_VIDEOS_PATHS", otherVideosPathsStr);

    if (musicPathsArr.length > 0) {
      updatedEnv = updateEnvVar(updatedEnv, "MUSIC_PATH", musicPathsArr[0]);
    }
    if (moviesPathsArr.length > 0) {
      updatedEnv = updateEnvVar(updatedEnv, "VIDEOS_PATH", moviesPathsArr[0]);
    } else if (otherVideosPathsArr.length > 0) {
      updatedEnv = updateEnvVar(updatedEnv, "VIDEOS_PATH", otherVideosPathsArr[0]);
    }

    fs.writeFileSync(envPath, updatedEnv, "utf-8");

    process.env.MUSIC_PATHS = musicPathsStr;
    process.env.MOVIES_PATHS = moviesPathsStr;
    process.env.TV_SHOWS_PATHS = tvShowsPathsStr;
    process.env.OTHER_VIDEOS_PATHS = otherVideosPathsStr;
    if (musicPathsArr.length > 0) {
      process.env.MUSIC_PATH = musicPathsArr[0];
    }
    if (moviesPathsArr.length > 0) {
      process.env.VIDEOS_PATH = moviesPathsArr[0];
    } else if (otherVideosPathsArr.length > 0) {
      process.env.VIDEOS_PATH = otherVideosPathsArr[0];
    }

    reinitializePathsAndSettings();

    triggerScan().catch(console.error);

    res.json({ success: true });
  } catch (err: any) {
    console.error("Failed to save directories settings:", err);
    res.status(500).json({ error: "Failed to save configuration", details: err.message });
  }
});

export default router;
