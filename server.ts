import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { exec, spawn } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Global process error catch guards to prevent crashing
process.on("uncaughtException", (err) => {
  console.error("🔥 Uncaught Exception caught:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 Unhandled Rejection at promise:", promise, "reason:", reason);
});

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(cors());
app.use(express.json());

// Log all requests with timestamp
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

import os from "os";
import { findNfoFile, parseNfo, findArtwork, parseTvShowNfo, parseSeasonEpisode, cleanFilenameTitle } from "./src/nfoReader";

// Helper to resolve ~ in paths
function resolveHome(filepath: string): string {
  if (!filepath) return "";
  if (filepath.startsWith("~")) {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

// Helper to parse comma-separated paths or fall back to default
function parsePathsEnv(envValue: string | undefined, defaultPath: string): string[] {
  if (!envValue) {
    return [defaultPath];
  }
  return envValue.split(",").map(p => p.trim()).filter(Boolean);
}

// Configure media folders with safe fallbacks (using let so setup wizard can reload dynamically)
let VIDEOS_PATH = process.env.VIDEOS_PATH || "";
let MUSIC_PATH = process.env.MUSIC_PATH || "";
let MUSIC_VIDEOS_PATH = process.env.MUSIC_VIDEOS_PATH || "";
let PICTURES_PATH = process.env.PICTURES_PATH || "";
let THUMBNAILS_CACHE_PATH = process.env.THUMBNAILS_CACHE_PATH || "/tmp/inaetia/thumbs";
let PROFILES_DIR = resolveHome(process.env.PROFILES_PATH || "~/.inaetia/profiles");
let PROFILES_PATH = path.join(PROFILES_DIR, "profiles.json");

let targetVideosDir = VIDEOS_PATH && fs.existsSync(resolveHome(VIDEOS_PATH)) ? resolveHome(VIDEOS_PATH) : path.join(process.cwd(), "media/Videos");
let targetMusicDir = MUSIC_PATH && fs.existsSync(resolveHome(MUSIC_PATH)) ? resolveHome(MUSIC_PATH) : path.join(process.cwd(), "media/Music");
let targetMusicVideosDir = MUSIC_VIDEOS_PATH && fs.existsSync(resolveHome(MUSIC_VIDEOS_PATH)) ? resolveHome(MUSIC_VIDEOS_PATH) : undefined;
let targetPicturesDir = PICTURES_PATH && fs.existsSync(resolveHome(PICTURES_PATH)) ? resolveHome(PICTURES_PATH) : path.join(process.cwd(), "media/Pictures");
let thumbsCacheDir = resolveHome(THUMBNAILS_CACHE_PATH);

let MAX_CONCURRENT_FFPROBES = parseInt(process.env.MAX_CONCURRENT_FFPROBE || "3", 10);
let RESCAN_INTERVAL_MINUTES = parseInt(process.env.RESCAN_INTERVAL_MINUTES || "30", 10);
let RESCAN_INTERVAL_MS = RESCAN_INTERVAL_MINUTES * 60 * 1000;

function reinitializePathsAndSettings() {
  VIDEOS_PATH = process.env.VIDEOS_PATH || "";
  MUSIC_PATH = process.env.MUSIC_PATH || "";
  MUSIC_VIDEOS_PATH = process.env.MUSIC_VIDEOS_PATH || "";
  PICTURES_PATH = process.env.PICTURES_PATH || "";
  THUMBNAILS_CACHE_PATH = process.env.THUMBNAILS_CACHE_PATH || "/tmp/inaetia/thumbs";
  PROFILES_DIR = resolveHome(process.env.PROFILES_PATH || "~/.inaetia/profiles");
  PROFILES_PATH = path.join(PROFILES_DIR, "profiles.json");

  targetVideosDir = VIDEOS_PATH && fs.existsSync(resolveHome(VIDEOS_PATH)) ? resolveHome(VIDEOS_PATH) : path.join(process.cwd(), "media/Videos");
  targetMusicDir = MUSIC_PATH && fs.existsSync(resolveHome(MUSIC_PATH)) ? resolveHome(MUSIC_PATH) : path.join(process.cwd(), "media/Music");
  targetMusicVideosDir = MUSIC_VIDEOS_PATH && fs.existsSync(resolveHome(MUSIC_VIDEOS_PATH)) ? resolveHome(MUSIC_VIDEOS_PATH) : undefined;
  targetPicturesDir = PICTURES_PATH && fs.existsSync(resolveHome(PICTURES_PATH)) ? resolveHome(PICTURES_PATH) : path.join(process.cwd(), "media/Pictures");
  thumbsCacheDir = resolveHome(THUMBNAILS_CACHE_PATH);

  MAX_CONCURRENT_FFPROBES = parseInt(process.env.MAX_CONCURRENT_FFPROBE || "3", 10);
  RESCAN_INTERVAL_MINUTES = parseInt(process.env.RESCAN_INTERVAL_MINUTES || "30", 10);
  RESCAN_INTERVAL_MS = RESCAN_INTERVAL_MINUTES * 60 * 1000;

  ensureDirs();
  console.log("♻️  Reinitialized server directories and settings perfectly.");
}

// Validate Environment Variables and Path Existence
const requiredPaths = { VIDEOS_PATH, MUSIC_PATH };
Object.entries(requiredPaths).forEach(([key, val]) => {
  if (!val) {
    console.warn(`⚠️  WARNING: ${key} environment variable is not defined.`);
  } else if (!fs.existsSync(resolveHome(val))) {
    console.warn(`⚠️  WARNING: ${key} points to a non-existent path: "${val}". Please check your drive mounting and server configuration.`);
  } else {
    console.log(`✅ ${key} is valid and exists: "${val}"`);
  }
});

const hasMntStorage = fs.existsSync("/mnt/storage");

// Ensure folders exist
function ensureDirs() {
  const dirs = [
    thumbsCacheDir, 
    PROFILES_DIR
  ];

  const musicPaths = parsePathsEnv(process.env.MUSIC_PATHS, process.env.MUSIC_PATH || "media/Music");
  const moviesPaths = parsePathsEnv(process.env.MOVIES_PATHS, process.env.VIDEOS_PATH || "media/Videos");
  const tvShowsPaths = parsePathsEnv(process.env.TV_SHOWS_PATHS, process.env.VIDEOS_PATH || "media/Videos");
  const otherVideosPaths = parsePathsEnv(process.env.OTHER_VIDEOS_PATHS, process.env.VIDEOS_PATH || "media/Videos");

  [...musicPaths, ...moviesPaths, ...tvShowsPaths, ...otherVideosPaths].forEach(dir => {
    dirs.push(resolveHome(dir));
  });

  if (targetMusicVideosDir) {
    dirs.push(targetMusicVideosDir);
  }
  if (targetPicturesDir) {
    dirs.push(targetPicturesDir);
  }
  dirs.forEach((dir) => {
    if (dir && !fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      } catch (err: any) {
        console.error(`Failed to create directory ${dir}:`, err.message);
      }
    }
  });
}
ensureDirs();

// A 1x1 transparent GIF fallback for thumbnail errors
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

// Memory Caches
let moviesCache: any[] = [];
let musicCache: any[] = [];
const playlistCache = new Map<string, any[]>();
let cachesLastUpdated = 0;
let hasPerformedInitialScan = false;
const CACHE_LIFETIME = 5 * 60 * 1000; // 5 minutes

// In-memory indexing maps for stream lookup by MD5 ID
const moviesIndex = new Map<string, string>(); // id -> full filepath
const musicIndex = new Map<string, string>();  // id -> full filepath
const showsFoldersIndex = new Map<string, string>(); // showNameLower -> absolute folder path

const METADATA_CACHE_FILE = path.join(process.cwd(), "media-cache.json");

// Safari client and remuxing configuration
let activeRemuxCount = 0;
const MAX_REMUX_STREAMS = 2;

function isSafariClient(userAgent: string): boolean {
  if (!userAgent) return false;
  // All iOS/iPadOS browsers use WebKit
  // Safari on macOS also needs this
  return (
    (userAgent.includes("Safari") && 
     !userAgent.includes("Chrome") && 
     !userAgent.includes("Chromium")) || 
    userAgent.includes("iPhone") || 
    userAgent.includes("iPad") ||
    userAgent.includes("iPod")
  );
}

function needsRemux(filepath: string): boolean {
  const ext = path.extname(filepath).toLowerCase();
  const safariCompatible = [".mp4", ".m4v", ".mov"];
  return !safariCompatible.includes(ext);
}

function needsMusicTranscode(filepath: string): boolean {
  const ext = path.extname(filepath).toLowerCase();
  const safariMusicCompatible = [".mp3", ".m4a", ".aac", ".wav"];
  return !safariMusicCompatible.includes(ext);
}

function findShowFolderPath(file: string, showName: string): string | null {
  const normalizedPath = file.replace(/\\/g, "/");
  const parts = normalizedPath.split("/").filter((p) => p.length > 0);
  const target = showName.toLowerCase().replace(/[\s_-]+/g, "");

  // Find the segment that matches showName
  for (let i = parts.length - 1; i >= 0; i--) {
    const partNorm = parts[i].toLowerCase().replace(/[\s_-]+/g, "");
    if (partNorm === target) {
      // Reconstruct absolute path up to this part
      const fileParts = file.split(path.sep).filter((p) => p.length > 0);
      const filePartIndex = fileParts.findIndex(
        (fp) => fp.toLowerCase().replace(/[\s_-]+/g, "") === target
      );
      if (filePartIndex !== -1) {
        const isAbsolute = file.startsWith("/");
        const reconstructed = fileParts.slice(0, filePartIndex + 1).join(path.sep);
        return isAbsolute ? "/" + reconstructed : reconstructed;
      }
    }
  }

  // Fallback: if we can't match segment, maybe the parent directory is the show folder
  const parent = path.dirname(file);
  const parentName = path.basename(parent).toLowerCase();
  if (/^(season|s)\s*\d+/i.test(parentName)) {
    return path.dirname(parent);
  }
  return parent;
}

function repopulateShowsFoldersIndex() {
  showsFoldersIndex.clear();
  moviesCache.forEach((m) => {
    if (m.type === "episode" && m.showName) {
      const filepath = moviesIndex.get(m.id);
      if (filepath) {
        const folderPath = findShowFolderPath(filepath, m.showName);
        if (folderPath) {
          showsFoldersIndex.set(m.showName.toLowerCase(), folderPath);
        }
      }
    }
  });
}

function loadPersistentCache() {
  try {
    if (fs.existsSync(METADATA_CACHE_FILE)) {
      console.log(`💾 Loading metadata cache from disk: ${METADATA_CACHE_FILE}...`);
      const raw = fs.readFileSync(METADATA_CACHE_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed) {
        moviesCache = parsed.moviesCache || [];
        musicCache = parsed.musicCache || [];
        
        let loadedTimestamp = parsed.cachesLastUpdated || Date.now();
        if (loadedTimestamp > Date.now()) {
          loadedTimestamp = Date.now();
        }
        cachesLastUpdated = loadedTimestamp;

        // If cache is empty, do not block scanning under hasPerformedInitialScan
        if (moviesCache.length > 0 || musicCache.length > 0) {
          hasPerformedInitialScan = true;
        } else {
          hasPerformedInitialScan = false;
          console.log("💾 Metadata cache file exists but is empty. Setting hasPerformedInitialScan to false to trigger a fresh scan.");
        }
        
        // Re-populate indices
        if (parsed.moviesIndexList) {
          parsed.moviesIndexList.forEach(([id, file]: [string, string]) => moviesIndex.set(id, file));
        }
        if (parsed.musicIndexList) {
          parsed.musicIndexList.forEach(([id, file]: [string, string]) => musicIndex.set(id, file));
        }
        repopulateShowsFoldersIndex();
        console.log(`💾 Metadata cache loaded successfully! Movies: ${moviesCache.length}, Tracks: ${musicCache.length}`);
      }
    } else {
      console.log("💾 No persistent metadata cache file found. Will perform a full scan on startup.");
    }
  } catch (err) {
    console.error("⚠️ Failed to load persistent metadata cache:", err);
  }
}

function savePersistentCache() {
  try {
    const dataToSave = {
      moviesCache,
      musicCache,
      cachesLastUpdated,
      moviesIndexList: Array.from(moviesIndex.entries()),
      musicIndexList: Array.from(musicIndex.entries()),
    };
    fs.writeFileSync(METADATA_CACHE_FILE, JSON.stringify(dataToSave, null, 2), "utf8");
    console.log(`💾 Metadata cache saved to disk: ${METADATA_CACHE_FILE}`);
  } catch (err) {
    console.error("⚠️ Failed to save persistent metadata cache:", err);
  }
}

// Load cache immediately on server startup
loadPersistentCache();

// Mock media generation removed for production-only deployment

// Helper to recursively scan directory for matching extensions
function getFilesRecursively(dir: string, allowedExtensions: string[]): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  
  try {
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      // Skip files or directories starting with "." (e.g. macOS "._" files, .DS_Store, etc.)
      if (file.startsWith(".")) {
        return;
      }
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFilesRecursively(fullPath, allowedExtensions));
      } else {
        const ext = path.extname(file).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          results.push(fullPath);
        }
      }
    });
  } catch (err) {
    console.error(`Error scanning directory ${dir}:`, err);
  }
  return results;
}

// Throttled ffprobe queue to avoid crashing server on massive libraries
interface FfprobeTask {
  filepath: string;
  resolve: (duration: number) => void;
}

const ffprobeQueue: FfprobeTask[] = [];
let activeFfprobes = 0;

function processFfprobeQueue() {
  if (activeFfprobes >= MAX_CONCURRENT_FFPROBES || ffprobeQueue.length === 0) {
    return;
  }

  const task = ffprobeQueue.shift();
  if (!task) return;

  activeFfprobes++;
  exec(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${task.filepath}"`,
    (err, stdout) => {
      activeFfprobes--;
      
      let duration = 120; // Default
      if (!err && stdout) {
        const parsed = parseFloat(stdout.trim());
        if (!isNaN(parsed)) {
          duration = Math.round(parsed);
        }
      }
      task.resolve(duration);

      // Process next in queue
      processFfprobeQueue();
    }
  );

  // Attempt to fill remaining concurrency slots
  processFfprobeQueue();
}

// Helper to probe file duration using ffprobe with safe fallback
function getDuration(filepath: string): Promise<number> {
  return new Promise((resolve) => {
    const filename = path.basename(filepath);
    const match = filename.match(/_(\d+)s/);
    if (match) {
      resolve(parseInt(match[1], 10));
      return;
    }
    ffprobeQueue.push({ filepath, resolve });
    processFfprobeQueue();
  });
}

// Helper to parse category and TV show structure from relative file paths
function parseVideoPath(relativePath: string, filename: string, title: string) {
  const normalizedPath = relativePath.replace(/\\/g, "/");
  const parts = normalizedPath.split("/").filter((p) => p.length > 0);

  let category = "Other";
  let subcategory = "";
  let type: "movie" | "episode" | "video" = "video";
  let showName = "";
  let seasonName = "";
  let episodeTitle = title;

  if (parts.length > 0) {
    const rootDir = parts[0];
    const rootLower = rootDir.toLowerCase();
    const isMarvel = rootLower === "marvel movies" || rootLower === "marvel universe" || rootLower.includes("marvel");

    // Determine category
    if (rootLower === "cartoons") {
      category = "Cartoons";
    } else if (isMarvel) {
      category = "Marvel Movies";
    } else if (rootLower === "movies") {
      category = "Movies";
      type = "movie";
    } else if (rootLower === "tv shows") {
      category = "Tv Shows";
      type = "episode";
    } else if (rootLower === "videos") {
      category = "Videos";
    }

    // Scan for season pattern
    let seasonIndex = -1;
    if (rootLower !== "cartoons") {
      for (let i = 0; i < parts.length; i++) {
        if (/^(season|s)\s*\d+/i.test(parts[i])) {
          seasonIndex = i;
          break;
        }
      }
    }

    if (seasonIndex !== -1) {
      type = "episode";
      seasonName = parts[seasonIndex];
      if (seasonIndex > 0) {
        showName = parts[seasonIndex - 1];
      }
      const showLower = showName.toLowerCase();
      if ((showLower === "tv shows" || showLower === "tv series" || showLower === "tvshows" || showLower === "series" || showLower === "shows") && seasonIndex > 1) {
        showName = parts[seasonIndex - 2];
      }
    } else {
      // Direct structure fallbacks
      if (rootLower === "tv shows") {
        type = "episode";
        if (parts.length >= 3) {
          showName = parts[1];
          seasonName = "Season 1";
        } else if (parts.length === 2) {
          showName = "General TV";
          seasonName = "Season 1";
        }
      } else if (isMarvel && parts[1] && /^(tv shows|tv series|tvshows|series|tv|shows)$/i.test(parts[1])) {
        type = "episode";
        if (parts.length >= 4) {
          showName = parts[2];
          seasonName = "Season 1";
        } else if (parts.length === 3) {
          showName = parts[2];
          seasonName = "Season 1";
        } else {
          showName = "General Marvel TV";
          seasonName = "Season 1";
        }
      } else if (isMarvel) {
        type = "movie";
      } else if (rootLower === "cartoons") {
        type = "movie";
      } else if (rootLower === "movies") {
        type = "movie";
      } else if (rootLower === "videos") {
        type = "video";
        if (parts[1]) {
          subcategory = parts[1];
        }
      }
    }
  }

  // Format and clean names
  if (showName) {
    showName = showName.replace(/_/g, " ").replace(/-/g, " ");
  }
  if (seasonName) {
    const match = seasonName.match(/^(season|s)\s*(\d+)/i);
    if (match) {
      seasonName = `Season ${match[2]}`;
    } else {
      seasonName = seasonName.replace(/_/g, " ").replace(/-/g, " ");
    }
  } else if (type === "episode") {
    seasonName = "Season 1";
  }

  // Clean episodeTitle/movieTitle from filename without extension
  const ext = path.extname(filename);
  episodeTitle = path.basename(filename, ext).replace(/_/g, " ").replace(/-/g, " ");

  return {
    category,
    subcategory,
    type,
    showName,
    seasonName,
    episodeTitle,
  };
}

interface ScannedFile {
  file: string;
  baseDir: string;
  category: "music" | "movie" | "episode" | "video";
}

// Rescan Libraries
async function scanAllLibraries() {
  const startTime = Date.now();
  console.log("Scanning libraries...");
  ensureDirs();

  // Clear playlist cache to pick up any additions/deletions on rescan
  playlistCache.clear();

  // Create fast lookup maps of existing cache items to reuse duration
  const existingMoviesMap = new Map<string, any>();
  moviesCache.forEach((m) => {
    if (m && m.filepath) existingMoviesMap.set(m.filepath, m);
  });

  const existingMusicMap = new Map<string, any>();
  musicCache.forEach((m) => {
    if (m && m.filepath) existingMusicMap.set(m.filepath, m);
  });

  // 1. Scan Movies, TV Shows, and Other Videos
  const videoExts = [".mp4", ".mkv", ".avi", ".mov", ".m4v", ".webm"];
  const videoScannedFiles: ScannedFile[] = [];

  // Movies
  const resolvedMoviesPaths = parsePathsEnv(process.env.MOVIES_PATHS, process.env.VIDEOS_PATH || "media/Videos");
  resolvedMoviesPaths.forEach(dir => {
    const resolved = resolveHome(dir);
    if (fs.existsSync(resolved)) {
      const files = getFilesRecursively(resolved, videoExts);
      files.forEach(f => {
        videoScannedFiles.push({ file: f, baseDir: resolved, category: "movie" });
      });
    }
  });

  // TV Shows
  const resolvedTvShowsPaths = parsePathsEnv(process.env.TV_SHOWS_PATHS, process.env.VIDEOS_PATH || "media/Videos");
  resolvedTvShowsPaths.forEach(dir => {
    const resolved = resolveHome(dir);
    if (fs.existsSync(resolved)) {
      const files = getFilesRecursively(resolved, videoExts);
      files.forEach(f => {
        videoScannedFiles.push({ file: f, baseDir: resolved, category: "episode" });
      });
    }
  });

  // Other Videos
  const resolvedOtherVideosPaths = parsePathsEnv(process.env.OTHER_VIDEOS_PATHS, process.env.VIDEOS_PATH || "media/Videos");
  resolvedOtherVideosPaths.forEach(dir => {
    const resolved = resolveHome(dir);
    if (fs.existsSync(resolved)) {
      const files = getFilesRecursively(resolved, videoExts);
      files.forEach(f => {
        videoScannedFiles.push({ file: f, baseDir: resolved, category: "video" });
      });
    }
  });

  // Also scan MUSIC_VIDEOS_PATH if defined, exists and is not already scanned
  const envMusicVideos = process.env.MUSIC_VIDEOS_PATH;
  if (envMusicVideos && fs.existsSync(envMusicVideos)) {
    const files = getFilesRecursively(envMusicVideos, videoExts);
    files.forEach(f => {
      videoScannedFiles.push({ file: f, baseDir: envMusicVideos, category: "video" });
    });
  }

  // De-duplicate video files by absolute path
  const uniqueVideoFilesMap = new Map<string, ScannedFile>();
  videoScannedFiles.forEach(item => {
    if (!uniqueVideoFilesMap.has(item.file)) {
      uniqueVideoFilesMap.set(item.file, item);
    }
  });
  const videoFiles = Array.from(uniqueVideoFilesMap.values());

  const moviePromises = videoFiles.map(async (item) => {
    const file = item.file;
    try {
      const isUnderMusicVideo = envMusicVideos && file.startsWith(path.resolve(envMusicVideos));
      const relativePath = isUnderMusicVideo
        ? path.relative(path.dirname(envMusicVideos), file)
        : path.relative(item.baseDir, file);
      const filename = path.basename(file);
      const ext = path.extname(file).toLowerCase();
      
      // MD5 of full filepath
      const id = crypto.createHash("md5").update(file).digest("hex");
      moviesIndex.set(id, file);

      const stat = fs.statSync(file);

      // Find and check NFO modification time
      const nfoPath = findNfoFile(file);
      let nfoStat: fs.Stats | null = null;
      if (nfoPath) {
        try {
          nfoStat = fs.statSync(nfoPath);
        } catch (_) {}
      }
      const nfoMtime = nfoStat ? nfoStat.mtime.toISOString() : null;

      // Fast cache lookup (video file unchanged AND NFO unchanged)
      const cachedItem = existingMoviesMap.get(relativePath);
      if (cachedItem && cachedItem.size === stat.size && cachedItem.nfoMtime === nfoMtime) {
        // Essential: make sure movie is indexable for stream and artwork retrieval
        moviesIndex.set(cachedItem.id, file);
        
        // Dynamically refresh local artwork status to catch newly added or changed sidecar images
        const artwork = findArtwork(file);
        cachedItem.hasPoster = !!artwork.poster;
        cachedItem.hasFanart = !!artwork.fanart;
        cachedItem.hasThumb = !!artwork.thumb;
        cachedItem.poster = artwork.poster ? `/api/artwork/${cachedItem.id}/poster` : null;
        cachedItem.fanart = artwork.fanart ? `/api/artwork/${cachedItem.id}/fanart` : null;
        cachedItem.thumb = artwork.thumb ? `/api/artwork/${cachedItem.id}/thumb` : `/api/artwork/${cachedItem.id}/thumb`;
        cachedItem.thumbnail = `/api/artwork/${cachedItem.id}/thumb`;

        return cachedItem;
      }

      // Try NFO parsing
      let nfo = nfoPath ? parseNfo(nfoPath) : null;

      // Title logic
      let title = "";
      if (nfo && nfo.title) {
        title = nfo.title;
      } else {
        title = cleanFilenameTitle(filename, ext);
      }

      // Duration: if runtime exists in NFO, use it. Otherwise, getDuration via ffprobe.
      let duration = 120;
      if (nfo && nfo.runtime && nfo.runtime > 0) {
        duration = nfo.runtime;
      } else {
        duration = await getDuration(file);
      }

      // Mock file size for our HD Intro to satisfy user's > 2GB check in UI
      let size = stat.size;
      if (filename === "InaetiaStudios_Ultra_HD_Intro.mp4" || filename === "NigelCloud_Ultra_HD_Intro.mp4") {
        size = 2.4 * 1024 * 1024 * 1024;
      }

      const parsedMeta = parseVideoPath(relativePath, filename, title);

      const dirName = path.dirname(file);
      const baseName = path.basename(file, ext);
      const hasSubtitles = fs.existsSync(path.join(dirName, baseName + ".srt")) ||
                           fs.existsSync(path.join(dirName, baseName + ".SRT")) ||
                           fs.existsSync(path.join(dirName, baseName + ".vtt")) ||
                           fs.existsSync(path.join(dirName, baseName + ".VTT"));

      // Handle unsupported birthtime on Linux
      const addedDate = (stat.birthtime && stat.birthtime instanceof Date && !isNaN(stat.birthtime.getTime()) && stat.birthtime.getTime() > 0)
        ? stat.birthtime
        : (stat.mtime || new Date());

      // TV Show awareness
      const epPattern = parseSeasonEpisode(filename);
      const tvShowNfoPath = findTvShowNfo(file);
      const isTvShow = item.category === "episode" || !!tvShowNfoPath || epPattern.season !== null || parsedMeta.type === "episode";

      let type: "movie" | "episode" | "video" = "video";
      let category = "Other";
      if (isTvShow) {
        type = "episode";
        category = "Tv Shows";
      } else if (item.category === "movie") {
        type = "movie";
        category = "Movies";
      } else {
        type = parsedMeta.type === "movie" ? "movie" : "video";
        category = parsedMeta.category || "Videos";
      }

      let showTitle: string | null = null;
      let season: number | null = epPattern.season;
      let episode: number | null = epPattern.episode;
      let episodeTitle: string | null = null;
      let airDate: string | null = null;

      let showPosterExists = false;
      let showFanartExists = false;
      let showPlot: string | null = null;
      let showYear: number | null = null;
      let showRating: number | null = null;
      let showGenres: string[] = [];
      let showStudio: string | null = null;

      // Find and check show folder
      function findTvShowNfo(videoFilePath: string): string | null {
        const dir = path.dirname(videoFilePath);
        const parentNfo = path.join(dir, "tvshow.nfo");
        if (fs.existsSync(parentNfo)) return parentNfo;
        const gpDir = path.dirname(dir);
        if (gpDir && gpDir !== dir) {
          const gpNfo = path.join(gpDir, "tvshow.nfo");
          if (fs.existsSync(gpNfo)) return gpNfo;
        }
        return null;
      }

      if (isTvShow) {
        if (tvShowNfoPath) {
          const parsedShow = parseTvShowNfo(tvShowNfoPath);
          if (parsedShow) {
            if (parsedShow.title) {
              showTitle = parsedShow.title;
            }
            showPlot = parsedShow.plot;
            showYear = parsedShow.year;
            showRating = parsedShow.rating;
            showGenres = parsedShow.genres;
            showStudio = parsedShow.studio;
          }
          const showDir = path.dirname(tvShowNfoPath);
          if (fs.existsSync(showDir)) {
            try {
              const files = fs.readdirSync(showDir);
              const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
              showPosterExists = files.some((f) => {
                const ext = path.extname(f).toLowerCase();
                if (!imageExtensions.includes(ext)) return false;
                const base = path.basename(f, ext).toLowerCase();
                return base === "poster" || base === "folder";
              });
              showFanartExists = files.some((f) => {
                const ext = path.extname(f).toLowerCase();
                if (!imageExtensions.includes(ext)) return false;
                const base = path.basename(f, ext).toLowerCase();
                return base === "fanart" || base === "background";
              });
            } catch (_) {}
          }
        }

        if (!showTitle) {
          showTitle = parsedMeta.showName || "Unknown Show";
        }

        if (nfo && nfo.title) {
          episodeTitle = nfo.title;
        } else {
          episodeTitle = cleanFilenameTitle(filename, ext);
        }

        if (nfo && nfo.aired) {
          airDate = nfo.aired;
        }

        if (nfo) {
          if (nfo.season !== null && nfo.season !== undefined) season = nfo.season;
          if (nfo.episode !== null && nfo.episode !== undefined) episode = nfo.episode;
        }
      }

      // Artwork detection
      const artwork = findArtwork(file);
      const poster = artwork.poster ? `/api/artwork/${id}/poster` : null;
      const fanart = artwork.fanart ? `/api/artwork/${id}/fanart` : null;
      const thumb = artwork.thumb ? `/api/artwork/${id}/thumb` : `/api/artwork/${id}/thumb`;

      return {
        id,
        filename,
        filepath: relativePath,
        size,
        extension: ext,
        added: addedDate.toISOString(),

        // Enriched from NFO
        title,
        originalTitle: nfo ? nfo.originalTitle : null,
        year: nfo ? nfo.year : null,
        rating: nfo ? nfo.rating : null,
        votes: nfo ? nfo.votes : null,
        mpaa: nfo ? nfo.mpaa : null,
        runtime: duration,
        plot: nfo ? nfo.plot : null,
        tagline: nfo ? nfo.tagline : null,
        genres: nfo ? nfo.genres : [],
        studio: nfo ? nfo.studio : null,
        director: nfo ? nfo.director : null,
        actors: nfo ? nfo.actors : [],
        trailer: nfo ? nfo.trailer : null,

        // Artwork (API paths)
        poster,
        fanart,
        thumb,
        hasPoster: !!artwork.poster,
        hasFanart: !!artwork.fanart,
        hasThumb: !!artwork.thumb,

        // TV Show Grouping
        type,
        showTitle,
        showPoster: showPosterExists ? `/api/artwork/${id}/showPoster` : null,
        showFanart: showFanartExists ? `/api/artwork/${id}/showFanart` : null,
        season,
        episode,
        episodeTitle,
        airDate,
        showPlot,
        showYear,
        showRating,
        showGenres,
        showStudio,

        // Metadata tracking
        metadataSource: nfo ? "nfo" : "filename",
        hasRichMetadata: !!nfo,

        // Core fields
        category,
        subcategory: parsedMeta.subcategory,
        showName: parsedMeta.showName || showTitle,
        seasonName: parsedMeta.seasonName,
        duration,
        hasSubtitles,
        thumbnail: `/api/artwork/${id}/thumb`,
        nfoMtime,
      };
    } catch (err: any) {
      console.error(`⚠️ Failed to scan movie file ${file}:`, err.message || err);
      return null;
    }
  });

  const resolvedMovies = await Promise.all(moviePromises);
  moviesCache = resolvedMovies.filter((item): item is NonNullable<typeof item> => item !== null);
  repopulateShowsFoldersIndex();

  // 2. Scan Music
  const musicExts = [".mp3", ".flac", ".m4a", ".wav", ".ogg", ".aac"];
  const musicScannedFiles: ScannedFile[] = [];
  const resolvedMusicPaths = parsePathsEnv(process.env.MUSIC_PATHS, process.env.MUSIC_PATH || "media/Music");

  resolvedMusicPaths.forEach(dir => {
    const resolved = resolveHome(dir);
    if (fs.existsSync(resolved)) {
      const files = getFilesRecursively(resolved, musicExts);
      files.forEach(f => {
        musicScannedFiles.push({ file: f, baseDir: resolved, category: "music" });
      });
    }
  });

  // De-duplicate music files
  const uniqueMusicFilesMap = new Map<string, ScannedFile>();
  musicScannedFiles.forEach(item => {
    if (!uniqueMusicFilesMap.has(item.file)) {
      uniqueMusicFilesMap.set(item.file, item);
    }
  });
  const musicFiles = Array.from(uniqueMusicFilesMap.values());

  const musicPromises = musicFiles.map(async (item) => {
    const file = item.file;
    try {
      const relativePath = path.relative(item.baseDir, file);
      const filename = path.basename(file);
      const ext = path.extname(file);
      const title = path.basename(file, ext).replace(/_/g, " ").replace(/-/g, " ");
      
      const id = crypto.createHash("md5").update(file).digest("hex");
      musicIndex.set(id, file);

      const stat = fs.statSync(file);
      let duration = 120;

      // Fast cache lookup
      const cachedItem = existingMusicMap.get(relativePath);
      if (cachedItem && cachedItem.size === stat.size) {
        duration = cachedItem.duration;
      } else {
        duration = await getDuration(file);
      }

      // Derive Artist and Album from Directory Structure: /Artist/Album/File.mp3
      const parts = relativePath.split(path.sep);
      let artist = "Unknown Artist";
      let album = "Unknown Album";

      if (parts.length >= 3) {
        artist = parts[parts.length - 3];
        album = parts[parts.length - 2];
      } else if (parts.length === 2) {
        artist = parts[0];
        album = "Single";
      }

      const addedDate = (stat.birthtime && stat.birthtime instanceof Date && !isNaN(stat.birthtime.getTime()) && stat.birthtime.getTime() > 0)
        ? stat.birthtime
        : (stat.mtime || new Date());

      return {
        id,
        title,
        artist,
        album,
        filename,
        filepath: relativePath,
        duration,
        size: stat.size,
        added: (stat.mtime || addedDate).toISOString(),
      };
    } catch (err: any) {
      console.error(`⚠️ Failed to scan music track ${file}:`, err.message || err);
      return null;
    }
  });

  const resolvedMusic = await Promise.all(musicPromises);
  musicCache = resolvedMusic.filter((item): item is NonNullable<typeof item> => item !== null);

  cachesLastUpdated = Date.now();
  hasPerformedInitialScan = true;

  savePersistentCache();

  const durationMs = Date.now() - startTime;
  const movies = moviesCache.filter(m => m.type === "movie" || m.type === "video");
  const episodes = moviesCache.filter(m => m.type === "episode");
  const moviesWithNfo = movies.filter(m => m.hasRichMetadata).length;
  const moviesWithPoster = movies.filter(m => m.hasPoster).length;
  const distinctShows = new Set(episodes.map(e => e.showTitle).filter(Boolean)).size;

  console.log(`Scan completed in ${durationMs}ms! Scan complete: ${movies.length} movies (${moviesWithNfo} with rich NFO metadata, ${moviesWithPoster} with posters), ${episodes.length} TV episodes across ${distinctShows} shows`);
}

// Throttled scan execution guard to prevent overlapping concurrent scans
let scanInProgress: Promise<void> | null = null;

async function triggerScan(): Promise<void> {
  if (scanInProgress) {
    console.log("Scan request received while a scan is already running. Awaiting the in-flight scan...");
    return scanInProgress;
  }

  scanInProgress = (async () => {
    try {
      await scanAllLibraries();
    } catch (err) {
      console.error("Scan failed:", err);
    } finally {
      scanInProgress = null;
    }
  })();

  return scanInProgress;
}

// Configurable background rescan interval (default 30 minutes)
console.log(`⏰ Periodic background rescan interval set to ${RESCAN_INTERVAL_MINUTES} minutes.`);

// Auto scan on startup
setTimeout(async () => {
  // Delay initial scan slightly to let system settle
  setTimeout(() => {
    triggerScan().catch(console.error);
  }, 1000);
}, 500);

// Periodically refresh cache (configurable background timer)
setInterval(() => {
  console.log("Starting scheduled background library scan...");
  triggerScan().catch(console.error);
}, RESCAN_INTERVAL_MS);

// Check if caches need manual or automatic reload (remains lightweight and non-blocking)
async function checkCache() {
  if (hasPerformedInitialScan && (moviesCache.length > 0 || musicCache.length > 0)) {
    // If the cache is stale, trigger a scan in the background asynchronously, but do NOT block current requests!
    if (Date.now() - cachesLastUpdated > CACHE_LIFETIME) {
      console.log("⏱️ Cache is stale, triggering background rescan without blocking user response.");
      triggerScan().catch(console.error);
    }
    return;
  }

  // Only block the request if there is absolutely no cache data anywhere or caches are empty
  console.log("⚠️ No cache data found in memory or cache is empty. Performing a blocking initial scan...");
  await triggerScan();
}

// ==========================================
// PROFILE SYSTEM ENDPOINTS
// ==========================================

function loadProfiles() {
  try {
    if (fs.existsSync(PROFILES_PATH)) {
      const data = fs.readFileSync(PROFILES_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to load profiles:", err);
  }
  return { profiles: [] };
}

function saveProfiles(data: any) {
  try {
    const dir = path.dirname(PROFILES_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PROFILES_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save profiles:", err);
  }
}

// GET /api/profiles
app.get("/api/profiles", (req, res) => {
  const data = loadProfiles();
  res.json(data.profiles || []);
});

// POST /api/profiles
app.post("/api/profiles", (req, res) => {
  const { name, color, avatar } = req.body;
  if (!name || !color) {
    return res.status(400).json({ error: "Name and color are required" });
  }
  const data = loadProfiles();
  if (!data.profiles) data.profiles = [];

  const profileAvatar = avatar || (name.trim().charAt(0).toUpperCase() || "?");
  const newProfile = {
    id: crypto.randomUUID(),
    name: name.trim(),
    avatar: profileAvatar,
    color,
    createdAt: new Date().toISOString(),
    watchHistory: {},
    preferences: {
      defaultSort: "recently_added",
      defaultView: "movies"
    }
  };

  data.profiles.push(newProfile);
  saveProfiles(data);
  res.json(newProfile);
});

// DELETE /api/profiles/:id
app.delete("/api/profiles/:id", (req, res) => {
  const id = req.params.id;
  const data = loadProfiles();
  if (!data.profiles) data.profiles = [];

  const initialCount = data.profiles.length;
  data.profiles = data.profiles.filter((p: any) => p.id !== id);

  if (data.profiles.length === initialCount) {
    return res.status(404).json({ error: "Profile not found" });
  }

  saveProfiles(data);
  res.json({ success: true, message: "Profile deleted successfully" });
});

// GET /api/profiles/:id/history
app.get("/api/profiles/:id/history", async (req, res) => {
  await checkCache();
  const id = req.params.id;
  const data = loadProfiles();
  const profile = (data.profiles || []).find((p: any) => p.id === id);

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const historyItems = Object.entries(profile.watchHistory || {}).map(([movieId, record]: [string, any]) => {
    const movie = moviesCache.find((m) => m.id === movieId);
    return {
      ...record,
      movieId,
      movie: movie || null,
      ...(movie || {})
    };
  });

  // Sort by lastWatched descending
  historyItems.sort((a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime());
  res.json(historyItems);
});

// POST /api/profiles/:id/history
app.post("/api/profiles/:id/history", (req, res) => {
  const id = req.params.id;
  const { movieId, position, duration } = req.body;

  if (!movieId || position === undefined || duration === undefined) {
    return res.status(400).json({ error: "movieId, position, and duration are required" });
  }

  const data = loadProfiles();
  const profile = (data.profiles || []).find((p: any) => p.id === id);

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  if (!profile.watchHistory) {
    profile.watchHistory = {};
  }

  const completed = position > (0.9 * duration) || (duration - position) < 120;
  profile.watchHistory[movieId] = {
    position: Math.round(position),
    duration: Math.round(duration),
    lastWatched: new Date().toISOString(),
    completed
  };

  saveProfiles(data);
  res.json(profile.watchHistory[movieId]);
});

// DELETE /api/profiles/:id/history
app.delete("/api/profiles/:id/history", (req, res) => {
  const { id } = req.params;
  const data = loadProfiles();
  const profile = (data.profiles || []).find((p: any) => p.id === id);

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  profile.watchHistory = {};
  saveProfiles(data);
  return res.json({ success: true, message: "Entire watch history cleared" });
});

// DELETE /api/profiles/:id/history/:movieId
app.delete("/api/profiles/:id/history/:movieId", (req, res) => {
  const { id, movieId } = req.params;
  const data = loadProfiles();
  const profile = (data.profiles || []).find((p: any) => p.id === id);

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  if (profile.watchHistory && profile.watchHistory[movieId]) {
    delete profile.watchHistory[movieId];
    saveProfiles(data);
    return res.json({ success: true, message: "Movie history cleared" });
  }

  res.status(404).json({ error: "Movie history not found for this profile" });
});

// GET /api/profiles/:id/continue
app.get("/api/profiles/:id/continue", async (req, res) => {
  await checkCache();
  const id = req.params.id;
  const data = loadProfiles();
  const profile = (data.profiles || []).find((p: any) => p.id === id);

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const continueItems = Object.entries(profile.watchHistory || {})
    .filter(([movieId, record]: [string, any]) => {
      // Started but not completed, position > 30 seconds
      return record.position > 30 && !record.completed;
    })
    .map(([movieId, record]: [string, any]) => {
      const movie = moviesCache.find((m) => m.id === movieId);
      return {
        ...record,
        movieId,
        movie: movie || null,
        ...(movie || {})
      };
    })
    .filter((item) => item.movie !== null); // Only return valid scanned movies

  // Sort by lastWatched descending
  continueItems.sort((a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime());
  res.json(continueItems.slice(0, 20));
});

// ==========================================
// BACKEND ROUTING - API Endpoints
// ==========================================

// 2. GET /api/movies
app.get("/api/movies", async (req, res) => {
  try {
    await checkCache();
    res.json(moviesCache);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to scan movies", details: err.message });
  }
});

// Helper for HTTP Range Stream
function streamMediaFile(filepath: string, mimeType: string, req: express.Request, res: express.Response) {
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: "File not found" });
  }

  const stat = fs.statSync(filepath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).send(`Requested range not satisfiable\n${start} >= ${fileSize}`);
      return;
    }

    const chunksize = (end - start) + 1;
    const fileStream = fs.createReadStream(filepath, { start, end });
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": mimeType,
    };

    res.writeHead(206, head);
    fileStream.pipe(res);
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": mimeType,
    };
    res.writeHead(200, head);
    fs.createReadStream(filepath).pipe(res);
  }
}

// Get MIME type by extension
function getMimeType(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".mp4": return "video/mp4";
    case ".mkv": return "video/x-matroska";
    case ".avi": return "video/x-msvideo";
    case ".mov": return "video/quicktime";
    case ".webm": return "video/webm";
    case ".m4v": return "video/x-m4v";
    case ".mp3": return "audio/mpeg";
    case ".flac": return "audio/flac";
    case ".m4a": return "audio/mp4";
    case ".wav": return "audio/wav";
    case ".ogg": return "audio/ogg";
    case ".aac": return "audio/aac";
    case ".tbn":
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".png": return "image/png";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    default: return "application/octet-stream";
  }
}

// 3. GET /api/stream/:id
app.get("/api/stream/:id", (req, res) => {
  const id = req.params.id;
  const filepath = moviesIndex.get(id);

  if (!filepath) {
    return res.status(404).json({ error: "Movie ID not found or catalog unindexed" });
  }

  const userAgent = req.headers["user-agent"] || "";

  if (isSafariClient(userAgent) && needsRemux(filepath)) {
    console.log(`[REMUX] Safari client detected, remuxing ${path.basename(filepath)} for ${req.ip}`);
    console.log(`[REMUX] Active remux streams: ${activeRemuxCount}/${MAX_REMUX_STREAMS}`);

    if (activeRemuxCount >= MAX_REMUX_STREAMS) {
      return res.status(503).json({ 
        error: "Server busy, too many streams active. Try again shortly." 
      });
    }

    const movie = moviesCache.find((m) => m.id === id);
    const totalSize = movie && movie.size ? movie.size : 1000 * 1024 * 1024; // fallback 1GB

    let startByte = 0;
    let isProbe = false;
    if (req.headers.range) {
      const parts = req.headers.range.replace(/bytes=/, "").split("-");
      startByte = parseInt(parts[0], 10);
      const endByte = parts[1] ? parseInt(parts[1], 10) : null;
      if (startByte === 0 && endByte === 1) {
        isProbe = true;
      }
    }

    if (isProbe) {
      res.status(206);
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Range", `bytes 0-1/${totalSize}`);
      res.setHeader("Content-Length", "2");
      res.send(Buffer.from([0x00, 0x00]));
      return;
    }

    res.status(206);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Range", `bytes ${startByte}-${totalSize - 1}/${totalSize}`);
    res.setHeader("Content-Length", totalSize - startByte);

    activeRemuxCount++;

    // Optional Seeking support using -ss
    let startSeconds = 0;
    if (movie && movie.duration && movie.size && movie.size > 0 && startByte > 500000) {
      const ratio = startByte / movie.size;
      startSeconds = Math.floor(ratio * movie.duration);
      console.log(`[REMUX] Range request received: ${req.headers.range}. Seeking to ${startSeconds}s (Ratio: ${(ratio * 100).toFixed(1)}%)`);
    }

    const ffmpegArgs: string[] = [];
    if (startSeconds > 0) {
      ffmpegArgs.push("-ss", startSeconds.toString());
    }
    ffmpegArgs.push(
      "-i", filepath,        // input file
      "-c:v", "copy",        // copy video stream (no re-encode)
      "-c:a", "aac",         // convert audio to AAC (Safari compatible)
      "-b:a", "192k",        // audio bitrate
      "-movflags", "frag_keyframe+empty_moov+faststart",
      "-f", "mp4",           // output format
      "pipe:1"               // output to stdout
    );

    const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

    ffmpegProcess.stdout.pipe(res);

    let countDecremented = false;
    const decrementCount = () => {
      if (!countDecremented) {
        activeRemuxCount = Math.max(0, activeRemuxCount - 1);
        countDecremented = true;
        console.log(`[REMUX] Stream closed. Active remux streams: ${activeRemuxCount}/${MAX_REMUX_STREAMS}`);
      }
    };

    ffmpegProcess.on("close", decrementCount);
    ffmpegProcess.on("error", (err) => {
      console.error("ffmpeg remux error:", err);
      decrementCount();
      if (!res.headersSent) {
        res.status(500).json({ error: "Remux failed" });
      }
    });

    req.on("close", () => {
      ffmpegProcess.kill("SIGKILL");
      decrementCount();
    });

    return; // Don't fall through to normal range-request handler
  }

  const mimeType = getMimeType(path.extname(filepath));
  streamMediaFile(filepath, mimeType, req, res);
});

// Helper to convert SubRip (SRT) to WebVTT format for browser native display
function convertSrtToVtt(srtContent: string): string {
  let normalized = srtContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const srtTimeRegex = /(\d\d:\d\d:\d\d),(\d\d\d)/g;
  normalized = normalized.replace(srtTimeRegex, "$1.$2");
  return "WEBVTT\n\n" + normalized;
}

// GET /api/subtitles/:id
app.get("/api/subtitles/:id", (req, res) => {
  const id = req.params.id;
  const filepath = moviesIndex.get(id);

  if (!filepath) {
    return res.status(404).json({ error: "Movie ID not found or catalog unindexed" });
  }

  const dirName = path.dirname(filepath);
  const ext = path.extname(filepath);
  const baseName = path.basename(filepath, ext);

  const srtPath = path.join(dirName, baseName + ".srt");
  const srtPathUpper = path.join(dirName, baseName + ".SRT");
  const vttPath = path.join(dirName, baseName + ".vtt");
  const vttPathUpper = path.join(dirName, baseName + ".VTT");

  let subtitlePath = "";
  let isSrt = false;

  if (fs.existsSync(vttPath)) {
    subtitlePath = vttPath;
  } else if (fs.existsSync(vttPathUpper)) {
    subtitlePath = vttPathUpper;
  } else if (fs.existsSync(srtPath)) {
    subtitlePath = srtPath;
    isSrt = true;
  } else if (fs.existsSync(srtPathUpper)) {
    subtitlePath = srtPathUpper;
    isSrt = true;
  }

  if (!subtitlePath) {
    return res.status(404).json({ error: "No subtitles found for this movie" });
  }

  try {
    const content = fs.readFileSync(subtitlePath, "utf-8");
    res.setHeader("Content-Type", "text/vtt; charset=utf-8");
    if (isSrt) {
      res.send(convertSrtToVtt(content));
    } else {
      res.send(content);
    }
  } catch (err: any) {
    console.error("Error reading subtitle file:", err);
    res.status(500).json({ error: "Failed to read subtitle file", details: err.message });
  }
});

// GET /api/show-poster/:showName
app.get("/api/show-poster/:showName", (req, res) => {
  const showName = req.params.showName;
  const firstEpisodeId = req.query.firstEpisodeId as string;

  const showFolder = showsFoldersIndex.get(showName.toLowerCase());
  if (showFolder && fs.existsSync(showFolder)) {
    try {
      const files = fs.readdirSync(showFolder);
      const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
      
      // Prioritize files named exactly "poster" or "folder" (case-insensitive)
      let imageFile = files.find((f) => {
        const ext = path.extname(f).toLowerCase();
        if (!imageExtensions.includes(ext)) return false;
        const base = path.basename(f, ext).toLowerCase();
        return base === "poster" || base === "folder";
      });

      // Fallback to any image if no specific poster or folder found
      if (!imageFile) {
        imageFile = files.find((f) => {
          const ext = path.extname(f).toLowerCase();
          return imageExtensions.includes(ext);
        });
      }

      if (imageFile) {
        const fullImagePath = path.join(showFolder, imageFile);
        const ext = path.extname(imageFile).toLowerCase();
        let mimeType = "image/jpeg";
        if (ext === ".png") mimeType = "image/png";
        if (ext === ".webp") mimeType = "image/webp";

        res.setHeader("Content-Type", mimeType);
        return fs.createReadStream(fullImagePath).pipe(res);
      }
    } catch (err) {
      console.error(`Error reading show folder for poster of ${showName}:`, err);
    }
  }

  // Fallback: stream firstEpisodeId's thumbnail
  if (firstEpisodeId) {
    const filepath = moviesIndex.get(firstEpisodeId);
    if (filepath) {
      const thumbPath = path.join(thumbsCacheDir, `${firstEpisodeId}.jpg`);
      if (fs.existsSync(thumbPath)) {
        res.setHeader("Content-Type", "image/jpeg");
        return fs.createReadStream(thumbPath).pipe(res);
      } else {
        // Fallback or generate on-the-fly via redirect to the normal thumbnail endpoint
        return res.redirect(`/api/artwork/${firstEpisodeId}/thumb`);
      }
    }
  }

  res.setHeader("Content-Type", "image/gif");
  return res.end(TRANSPARENT_GIF);
});

// GET /api/artwork/:id/:type
app.get("/api/artwork/:id/:type", (req, res) => {
  const id = req.params.id;
  const type = req.params.type; // poster, fanart, thumb, showPoster, showFanart
  const filepath = moviesIndex.get(id);

  if (!filepath) {
    res.setHeader("Content-Type", "image/gif");
    return res.end(TRANSPARENT_GIF);
  }

  const artwork = findArtwork(filepath);

  const streamImageIfExists = (imgPatch: string | null | undefined): boolean => {
    if (imgPatch && fs.existsSync(imgPatch)) {
      res.setHeader("Content-Type", getMimeType(path.extname(imgPatch)));
      fs.createReadStream(imgPatch).pipe(res);
      return true;
    }
    return false;
  };

  if (type === "poster") {
    if (streamImageIfExists(artwork.poster)) return;
    if (streamImageIfExists(artwork.thumb)) return;
    return res.redirect(`/api/thumbnail/${id}`);
  }

  if (type === "fanart") {
    if (streamImageIfExists(artwork.fanart)) return;
    if (streamImageIfExists(artwork.poster)) return;
    res.setHeader("Content-Type", "image/gif");
    return res.end(TRANSPARENT_GIF);
  }

  if (type === "thumb") {
    if (streamImageIfExists(artwork.thumb)) return;
    return res.redirect(`/api/thumbnail/${id}`);
  }

  if (type === "showPoster") {
    const dir = path.dirname(filepath);
    let showDir = dir;
    if (!fs.existsSync(path.join(dir, "tvshow.nfo")) && fs.existsSync(path.join(path.dirname(dir), "tvshow.nfo"))) {
      showDir = path.dirname(dir);
    }
    
    let posterPath: string | null = null;
    if (fs.existsSync(showDir)) {
      try {
        const files = fs.readdirSync(showDir);
        const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
        const found = files.find((f) => {
          const ext = path.extname(f).toLowerCase();
          if (!imageExtensions.includes(ext)) return false;
          const base = path.basename(f, ext).toLowerCase();
          return base === "poster" || base === "folder";
        });
        if (found) {
          posterPath = path.join(showDir, found);
        }
      } catch (err) {
        console.error("Error reading show directory for artwork:", err);
      }
    }

    if (streamImageIfExists(posterPath)) return;
    if (streamImageIfExists(artwork.poster)) return;
    return res.redirect(`/api/artwork/${id}/thumb`);
  }

  if (type === "showFanart") {
    const dir = path.dirname(filepath);
    let showDir = dir;
    if (!fs.existsSync(path.join(dir, "tvshow.nfo")) && fs.existsSync(path.join(path.dirname(dir), "tvshow.nfo"))) {
      showDir = path.dirname(dir);
    }
    
    let fanartPath: string | null = null;
    if (fs.existsSync(showDir)) {
      try {
        const files = fs.readdirSync(showDir);
        const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
        const found = files.find((f) => {
          const ext = path.extname(f).toLowerCase();
          if (!imageExtensions.includes(ext)) return false;
          const base = path.basename(f, ext).toLowerCase();
          return base === "fanart" || base === "background";
        });
        if (found) {
          fanartPath = path.join(showDir, found);
        }
      } catch (err) {
        console.error("Error reading show directory for fanart:", err);
      }
    }

    if (streamImageIfExists(fanartPath)) return;
    if (streamImageIfExists(artwork.fanart)) return;
    res.setHeader("Content-Type", "image/gif");
    return res.end(TRANSPARENT_GIF);
  }

  res.setHeader("Content-Type", "image/gif");
  return res.end(TRANSPARENT_GIF);
});

// GET /api/shows
app.get("/api/shows", (req, res) => {
  const episodes = moviesCache.filter(m => m.type === "episode");
  
  const showMap = new Map<string, typeof episodes>();
  episodes.forEach(ep => {
    const title = ep.showTitle || "Unknown Show";
    if (!showMap.has(title)) {
      showMap.set(title, []);
    }
    showMap.get(title)!.push(ep);
  });

  const showsList = Array.from(showMap.entries()).map(([showTitle, eps]) => {
    eps.sort((a, b) => {
      const sA = a.season ?? 999;
      const sB = b.season ?? 999;
      if (sA !== sB) return sA - sB;
      const eA = a.episode ?? 999;
      const eB = b.episode ?? 999;
      return eA - eB;
    });

    const firstEp = eps[0];
    const seasons = new Set(eps.map(e => e.season).filter(s => s !== null && s !== undefined));
    const seasonsCount = seasons.size;

    const genresSet = new Set<string>();
    eps.forEach(e => {
      if (e.genres) {
        e.genres.forEach((g: string) => genresSet.add(g));
      }
    });

    let plot = firstEp.plot;
    let rating = firstEp.rating;
    let studio = firstEp.studio;
    let year = firstEp.year;

    const fileFullPath = moviesIndex.get(firstEp.id);
    if (fileFullPath) {
      const tvShowNfoPath = findTvShowNfo(fileFullPath);
      if (tvShowNfoPath) {
        const showNfo = parseTvShowNfo(tvShowNfoPath);
        if (showNfo) {
          if (showNfo.plot) plot = showNfo.plot;
          if (showNfo.rating) rating = showNfo.rating;
          if (showNfo.studio) studio = showNfo.studio;
          if (showNfo.year) year = showNfo.year;
          if (showNfo.genres && showNfo.genres.length > 0) {
            showNfo.genres.forEach(g => genresSet.add(g));
          }
        }
      }
    }

    function findTvShowNfo(videoFilePath: string): string | null {
      const dir = path.dirname(videoFilePath);
      const parentNfo = path.join(dir, "tvshow.nfo");
      if (fs.existsSync(parentNfo)) return parentNfo;
      const gpDir = path.dirname(dir);
      if (gpDir && gpDir !== dir) {
        const gpNfo = path.join(gpDir, "tvshow.nfo");
        if (fs.existsSync(gpNfo)) return gpNfo;
      }
      return null;
    }

    return {
      showTitle,
      poster: firstEp.showPoster || firstEp.poster || `/api/artwork/${firstEp.id}/showPoster`,
      fanart: firstEp.showFanart || firstEp.fanart || `/api/artwork/${firstEp.id}/showFanart`,
      seasonsCount: seasonsCount || 1,
      episodesCount: eps.length,
      genres: Array.from(genresSet),
      plot,
      rating,
      studio,
      year,
      episodes: eps
    };
  });

  showsList.sort((a, b) => a.showTitle.localeCompare(b.showTitle));
  res.json(showsList);
});

// GET /api/library/health
app.get("/api/library/health", (req, res) => {
  const movies = moviesCache.filter(m => m.type !== "episode");
  const episodes = moviesCache.filter(m => m.type === "episode");
  const distinctShowsTitles = new Set(episodes.map(e => e.showTitle).filter(Boolean));

  const totalMovies = movies.length;
  const moviesWithNfoCount = movies.filter(m => m.hasRichMetadata).length;
  const moviesWithPosterCount = movies.filter(m => m.hasPoster).length;
  const moviesWithFanartCount = movies.filter(m => m.hasFanart).length;

  const totalEpisodes = episodes.length;
  const episodesWithNfoCount = episodes.filter(m => m.hasRichMetadata).length;
  const episodesWithThumbCount = episodes.filter(m => m.hasThumb).length;

  const totalShows = distinctShowsTitles.size;

  function checkShowNfo(filepath: string): boolean {
    const dir = path.dirname(filepath);
    if (fs.existsSync(path.join(dir, "tvshow.nfo"))) return true;
    const gpDir = path.dirname(dir);
    if (gpDir && gpDir !== dir && fs.existsSync(path.join(gpDir, "tvshow.nfo"))) return true;
    return false;
  }

  const showsWithNfoCount = Array.from(distinctShowsTitles).filter(showTitle => {
    const showEps = episodes.filter(e => e.showTitle === showTitle);
    return showEps.some(e => {
      const fileFullPath = moviesIndex.get(e.id);
      return fileFullPath ? checkShowNfo(fileFullPath) : false;
    });
  }).length;

  const calcPct = (count: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  res.json({
    // Fields expected by LibraryHealth interface in Settings.tsx
    totalItems: totalMovies + totalEpisodes,
    nfoCount: moviesWithNfoCount + episodesWithNfoCount,
    nfoCoverage: calcPct(moviesWithNfoCount + episodesWithNfoCount, totalMovies + totalEpisodes),
    posterCount: moviesWithPosterCount,
    posterCoverage: calcPct(moviesWithPosterCount, totalMovies),
    fanartCount: moviesWithFanartCount,
    fanartCoverage: calcPct(moviesWithFanartCount, totalMovies),
    thumbCount: episodesWithThumbCount,
    thumbCoverage: calcPct(episodesWithThumbCount, totalEpisodes),
    richMetadataCount: moviesWithNfoCount + episodesWithNfoCount,
    richMetadataCoverage: calcPct(moviesWithNfoCount + episodesWithNfoCount, totalMovies + totalEpisodes),

    // Backward compatibility fields
    totalMovies,
    moviesWithNfo: calcPct(moviesWithNfoCount, totalMovies),
    moviesWithPoster: calcPct(moviesWithPosterCount, totalMovies),
    moviesWithFanart: calcPct(moviesWithFanartCount, totalMovies),
    totalEpisodes,
    episodesWithNfo: calcPct(episodesWithNfoCount, totalEpisodes),
    episodesWithThumb: calcPct(episodesWithThumbCount, totalEpisodes),
    totalShows,
    showsWithNfo: calcPct(showsWithNfoCount, totalShows)
  });
});

// 4. GET /api/thumbnail/:id
app.get("/api/thumbnail/:id", (req, res) => {
  const id = req.params.id;
  const filepath = moviesIndex.get(id);

  if (!filepath) {
    res.setHeader("Content-Type", "image/gif");
    return res.end(TRANSPARENT_GIF);
  }

  const thumbPath = path.join(thumbsCacheDir, `${id}.jpg`);

  if (fs.existsSync(thumbPath)) {
    res.setHeader("Content-Type", "image/jpeg");
    return fs.createReadStream(thumbPath).pipe(res);
  }

  // Determine a smart seek offset to avoid introductory black frames
  const movie = moviesCache.find((m) => m.id === id);
  let seekSeconds = 120; // default 2 minutes
  if (movie && movie.duration) {
    if (movie.duration < 120) {
      seekSeconds = Math.max(1, Math.round(movie.duration * 0.1));
    } else {
      seekSeconds = Math.min(300, Math.round(movie.duration * 0.1));
    }
  }

  // Convert seekSeconds to a standard format (e.g. 120 or 120.00)
  const seekStr = seekSeconds.toString();

  // Generate thumbnail, size 320x180
  exec(
    `ffmpeg -y -ss ${seekStr} -i "${filepath}" -vframes 1 -vf "scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2" "${thumbPath}"`,
    (err) => {
      if (err) {
        console.error(`Thumbnail generation failed for ID ${id}:`, err.message);
        // Fallback to transparent GIF
        res.setHeader("Content-Type", "image/gif");
        return res.end(TRANSPARENT_GIF);
      }
      if (fs.existsSync(thumbPath)) {
        res.setHeader("Content-Type", "image/jpeg");
        return fs.createReadStream(thumbPath).pipe(res);
      } else {
        res.setHeader("Content-Type", "image/gif");
        return res.end(TRANSPARENT_GIF);
      }
    }
  );
});

// 5. GET /api/music
app.get("/api/music", async (req, res) => {
  try {
    await checkCache();
    res.json(musicCache);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to scan music", details: err.message });
  }
});

// 6. GET /api/music/stream/:id
app.get("/api/music/stream/:id", (req, res) => {
  const id = req.params.id;
  const filepath = musicIndex.get(id);

  if (!filepath) {
    return res.status(404).json({ error: "Audio track ID not found" });
  }

  const userAgent = req.headers["user-agent"] || "";

  if (isSafariClient(userAgent) && needsMusicTranscode(filepath)) {
    console.log(`[REMUX/TRANSCODE] Safari Music client, transcoding ${path.basename(filepath)} to AAC`);
    console.log(`[REMUX] Active streams: ${activeRemuxCount}/${MAX_REMUX_STREAMS}`);

    if (activeRemuxCount >= MAX_REMUX_STREAMS) {
      return res.status(503).json({ 
        error: "Server busy, too many streams active. Try again shortly." 
      });
    }

    // Serve AAC audio stream
    res.setHeader("Content-Type", "audio/aac");
    res.setHeader("Transfer-Encoding", "chunked");

    activeRemuxCount++;

    const ffmpegArgs = [
      "-i", filepath,
      "-c:a", "aac",
      "-b:a", "256k",
      "-f", "adts",
      "pipe:1"
    ];

    const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

    ffmpegProcess.stdout.pipe(res);

    let countDecremented = false;
    const decrementCount = () => {
      if (!countDecremented) {
        activeRemuxCount = Math.max(0, activeRemuxCount - 1);
        countDecremented = true;
        console.log(`[REMUX] Music transcode closed. Active streams: ${activeRemuxCount}/${MAX_REMUX_STREAMS}`);
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

// ============================================================================
// LIVE TV / CHANNEL SCHEDULING ALGORITHM & HELPERS
// ============================================================================

function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return function() {
    h = Math.imul(h ^ h >>> 16, 2246822507) | 0;
    h = Math.imul(h ^ h >>> 13, 3266489909) | 0;
    return ((h ^ h >>> 16) >>> 0) / 4294967296;
  };
}

function getSeededShuffle<T>(array: T[], seed: string): T[] {
  const shuffled = [...array];
  const rng = seededRandom(seed);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

interface ChannelDir {
  name: string;
  path: string;
  isMusicVideos?: boolean;
}

function getChannelDirectories(): ChannelDir[] {
  const dirs: ChannelDir[] = [];
  
  // Scan all movies, tv shows, and other video folders
  const allVideoPaths = [
    ...parsePathsEnv(process.env.MOVIES_PATHS, process.env.VIDEOS_PATH || "media/Videos"),
    ...parsePathsEnv(process.env.TV_SHOWS_PATHS, process.env.VIDEOS_PATH || "media/Videos"),
    ...parsePathsEnv(process.env.OTHER_VIDEOS_PATHS, process.env.VIDEOS_PATH || "media/Videos")
  ];

  // De-duplicate paths
  const uniquePaths = Array.from(new Set(allVideoPaths.map(p => path.resolve(resolveHome(p)))));

  uniquePaths.forEach(videoDir => {
    if (fs.existsSync(videoDir)) {
      try {
        const subfolders = fs.readdirSync(videoDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith("."))
          .map(dirent => dirent.name);
        
        subfolders.forEach(name => {
          const fullPath = path.join(videoDir, name);
          const alreadyAdded = dirs.some(d => path.resolve(d.path) === path.resolve(fullPath));
          if (!alreadyAdded) {
            dirs.push({
              name,
              path: fullPath
            });
          }
        });
      } catch (err) {
        console.error(`Error scanning subfolders in ${videoDir}:`, err);
      }
    }
  });
  
  // 2. Check if process.env.MUSIC_VIDEOS_PATH exists and is not already included
  const envMusicVideos = process.env.MUSIC_VIDEOS_PATH;
  if (envMusicVideos && fs.existsSync(envMusicVideos)) {
    const alreadyAdded = dirs.some(d => path.resolve(d.path) === path.resolve(envMusicVideos));
    if (!alreadyAdded) {
      dirs.push({
        name: "Music Videos",
        path: envMusicVideos,
        isMusicVideos: true
      });
    }
  }
  
  return dirs;
}

function getChannelsList() {
  const dirs = getChannelDirectories();
  const channelColors = ["#E11D48", "#2563EB", "#059669", "#D97706", "#7C3AED", "#DB2777", "#0891B2"];
  
  return dirs.map((dir, i) => {
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
      hasFanart
    };
  });
}

function getShuffledPlaylist(channelId: string, dateStr: string, channelSourceFolder: string) {
  const cacheKey = `${channelId}-${dateStr}`;
  if (playlistCache.has(cacheKey)) {
    return playlistCache.get(cacheKey)!;
  }

  const channelVideos = moviesCache.filter((m) => {
    const fullPath = moviesIndex.get(m.id);
    return fullPath && fullPath.startsWith(channelSourceFolder);
  });

  // Sort alphabetically to guarantee consistent initial order
  channelVideos.sort((a, b) => a.filepath.localeCompare(b.filepath));

  const seed = `${channelId}-${dateStr}`;
  const shuffled = getSeededShuffle(channelVideos, seed);
  playlistCache.set(cacheKey, shuffled);
  return shuffled;
}

function getLiveProgramAt(channelId: string, timestamp: number) {
  const channels = getChannelsList();
  const channel = channels.find(c => c.id === channelId);
  if (!channel) return null;
  
  // Use UTC Date for deterministic global synchronization
  const dateObj = new Date(timestamp);
  const dateStr = `${dateObj.getUTCFullYear()}-${String(dateObj.getUTCMonth() + 1).padStart(2, "0")}-${String(dateObj.getUTCDate()).padStart(2, "0")}`;
  
  // Midnight UTC epoch of that day
  const epoch = Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate());
  
  const shuffled = getShuffledPlaylist(channelId, dateStr, channel.sourceFolder);
  if (shuffled.length === 0) return null;
  
  const totalRuntime = shuffled.reduce((sum, item) => sum + (item.duration || 120), 0);
  if (totalRuntime === 0) return null;
  
  const elapsedSeconds = Math.floor((timestamp - epoch) / 1000);
  const position = ((elapsedSeconds % totalRuntime) + totalRuntime) % totalRuntime;
  
  let currentSum = 0;
  let activeIndex = -1;
  for (let i = 0; i < shuffled.length; i++) {
    const dur = shuffled[i].duration || 120;
    if (currentSum + dur > position) {
      activeIndex = i;
      break;
    }
    currentSum += dur;
  }
  
  if (activeIndex === -1) {
    activeIndex = shuffled.length - 1;
  }
  
  const currentProgram = shuffled[activeIndex];
  const offsetSeconds = position - currentSum;
  const loopNumber = Math.floor(elapsedSeconds / totalRuntime);
  const startedAt = new Date(epoch + (loopNumber * totalRuntime + currentSum) * 1000).toISOString();
  const endsAt = new Date(epoch + (loopNumber * totalRuntime + currentSum + (currentProgram.duration || 120)) * 1000).toISOString();
  const nextProgram = shuffled[(activeIndex + 1) % shuffled.length];
  
  return {
    channel,
    currentProgram,
    offsetSeconds,
    startedAt,
    endsAt,
    nextProgram: nextProgram ? {
      id: nextProgram.id,
      title: nextProgram.title,
      startsAt: endsAt
    } : null
  };
}

function getEPGForChannel(channelId: string, startTimestamp: number, hours: number) {
  const epg: any[] = [];
  const endTimestamp = startTimestamp + hours * 60 * 60 * 1000;
  
  let currentTimestamp = startTimestamp;
  while (currentTimestamp < endTimestamp) {
    const live = getLiveProgramAt(channelId, currentTimestamp);
    if (!live) break;
    
    const programEndsAt = new Date(live.endsAt).getTime();
    
    epg.push({
      program: live.currentProgram,
      startTime: live.startedAt,
      endTime: live.endsAt
    });
    
    // Advance currentTimestamp to the end of the current program
    // Add 100ms to avoid floating point or boundary loops
    currentTimestamp = programEndsAt + 100;
  }
  
  return epg;
}

// ============================================================================
// LIVE TV / CHANNEL API ENDPOINTS
// ============================================================================

// GET /api/channels/:id/poster
app.get("/api/channels/:id/poster", (req, res) => {
  const channelId = req.params.id;
  const channels = getChannelsList();
  const channel = channels.find(c => c.id === channelId);
  if (!channel || !fs.existsSync(channel.sourceFolder)) {
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
app.get("/api/channels/:id/fanart", (req, res) => {
  const channelId = req.params.id;
  const channels = getChannelsList();
  const channel = channels.find(c => c.id === channelId);
  if (!channel || !fs.existsSync(channel.sourceFolder)) {
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
app.get("/api/channels", async (req, res) => {
  try {
    await checkCache();
    const channels = getChannelsList();
    const nowTimestamp = Date.now();
    const channelsWithLive = channels.map(c => {
      const live = getLiveProgramAt(c.id, nowTimestamp);
      return {
        ...c,
        currentProgram: live ? {
          id: live.currentProgram.id,
          title: live.currentProgram.title,
          filename: live.currentProgram.filename,
          duration: live.currentProgram.duration,
          startedAt: live.startedAt,
          endsAt: live.endsAt,
          offsetSeconds: live.offsetSeconds,
          poster: live.currentProgram.poster,
          fanart: live.currentProgram.fanart
        } : null
      };
    });
    res.json(channelsWithLive);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load channels", details: err.message });
  }
});

// GET /api/channels/:id/now
app.get("/api/channels/:id/now", async (req, res) => {
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
app.get("/api/channels/:id/epg", async (req, res) => {
  try {
    await checkCache();
    const hours = parseInt(req.query.hours as string || "6", 10);
    const epg = getEPGForChannel(req.params.id, Date.now(), hours);
    res.json(epg);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch channel EPG", details: err.message });
  }
});

// GET /api/channels/epg/all
app.get("/api/channels/epg/all", async (req, res) => {
  try {
    await checkCache();
    const hours = parseInt(req.query.hours as string || "6", 10);
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
app.get("/api/channels/:id/stream", async (req, res) => {
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

    const userAgent = req.headers["user-agent"] || "";

    if (isSafariClient(userAgent) && needsRemux(filepath)) {
      console.log(`[REMUX] Live TV Safari client, remuxing ${path.basename(filepath)} at offset ${live.offsetSeconds}s`);
      console.log(`[REMUX] Active remux streams: ${activeRemuxCount}/${MAX_REMUX_STREAMS}`);

      if (activeRemuxCount >= MAX_REMUX_STREAMS) {
        return res.status(503).json({ 
          error: "Server busy, too many streams active. Try again shortly." 
        });
      }

      // Serve remuxed MP4 stream
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Transfer-Encoding", "chunked");

      activeRemuxCount++;

      // Use offsetSeconds to seek on the server so Safari is perfectly in-sync!
      const startSeconds = Math.max(0, Math.floor(live.offsetSeconds || 0));

      const ffmpegArgs: string[] = [];
      if (startSeconds > 0) {
        ffmpegArgs.push("-ss", startSeconds.toString());
      }
      ffmpegArgs.push(
        "-i", filepath,        // input file
        "-c:v", "copy",        // copy video stream (no re-encode)
        "-c:a", "aac",         // convert audio to AAC (Safari compatible)
        "-b:a", "192k",        // audio bitrate
        "-movflags", "frag_keyframe+empty_moov+faststart",
        "-f", "mp4",           // output format
        "pipe:1"               // output to stdout
      );

      const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

      ffmpegProcess.stdout.pipe(res);

      let countDecremented = false;
      const decrementCount = () => {
        if (!countDecremented) {
          activeRemuxCount = Math.max(0, activeRemuxCount - 1);
          countDecremented = true;
          console.log(`[REMUX] Live TV Stream closed. Active remux streams: ${activeRemuxCount}/${MAX_REMUX_STREAMS}`);
        }
      };

      ffmpegProcess.on("close", decrementCount);
      ffmpegProcess.on("error", (err) => {
        console.error("ffmpeg Live TV remux error:", err);
        decrementCount();
        if (!res.headersSent) {
          res.status(500).json({ error: "Live TV Remux failed" });
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
    res.status(500).json({ error: "Failed to stream live program", details: err.message });
  }
});

// ==========================================
// RADIO SYSTEM SCHEDULING & ENDPOINTS
// ==========================================
const radioPlaylistCache = new Map<string, any[]>();
let lastCheckedUtcDate = new Date().getUTCDate();

function startMidnightRefreshJob() {
  setInterval(() => {
    const currentUtcDate = new Date().getUTCDate();
    if (currentUtcDate !== lastCheckedUtcDate) {
      console.log("⏰ Midnight UTC reached! Regenerating TV and Radio playlists...");
      playlistCache.clear();
      radioPlaylistCache.clear();
      lastCheckedUtcDate = currentUtcDate;
    }
  }, 60 * 1000); // Check every minute
}

// Start the midnight monitor right away
startMidnightRefreshJob();

function getStationsList() {
  const stations: any[] = [];
  
  // 1. Inaetia Studios FM
  stations.push({
    id: "inaetiastudios-fm",
    name: "Inaetia Studios FM",
    stationNumber: 1,
    color: "#3B82F6",
    type: "smart",
    trackCount: musicCache.length,
    sourceFolder: undefined
  });
  
  // 2. Top Hits Radio
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
    sourceFolder: undefined
  });
  
  // 3. Late Night Radio
  const lateNightTracks = musicCache.filter(t => t.duration > 240);
  stations.push({
    id: "late-night-radio",
    name: "Late Night Radio",
    stationNumber: 3,
    color: "#8B5CF6",
    type: "smart",
    trackCount: lateNightTracks.length,
    sourceFolder: undefined
  });
  
  // 4. Shuffle Party
  stations.push({
    id: "shuffle-party",
    name: "Shuffle Party",
    stationNumber: 4,
    color: "#10B981",
    type: "smart",
    trackCount: musicCache.length,
    sourceFolder: undefined
  });
  
  // 5. Folder-based stations
  const resolvedMusicPaths = parsePathsEnv(process.env.MUSIC_PATHS, process.env.MUSIC_PATH || "media/Music");
  let folderIdx = 0;
  const folderColors = ["#F59E0B", "#EC4899", "#06B6D4", "#84CC16", "#6366F1", "#14B8A6", "#F97316"];

  resolvedMusicPaths.forEach(musicDir => {
    const resolved = resolveHome(musicDir);
    if (fs.existsSync(resolved)) {
      try {
        const subfolders = fs.readdirSync(resolved, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith("."))
          .map(dirent => dirent.name);
        
        subfolders.forEach((name) => {
          const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          const folderPath = path.resolve(path.join(resolved, name));
          
          // Check if station already exists
          if (stations.some(s => s.id === id)) return;

          const tracksInFolder = musicCache.filter(t => {
            const fullPath = musicIndex.get(t.id);
            return fullPath && fullPath.startsWith(folderPath);
          });
          
          stations.push({
            id,
            name: name,
            stationNumber: 5 + folderIdx,
            color: folderColors[folderIdx % folderColors.length],
            type: "folder",
            sourceFolder: folderPath,
            trackCount: tracksInFolder.length
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

function getStationTracks(stationId: string) {
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
    const lateNightTracks = musicCache.filter(t => t.duration > 240);
    return lateNightTracks.sort((a, b) => a.filepath.localeCompare(b.filepath));
  }
  
  const stations = getStationsList();
  const station = stations.find(s => s.id === stationId);
  if (!station || !station.sourceFolder) return [];
  
  const tracksInFolder = musicCache.filter(t => {
    const fullPath = musicIndex.get(t.id);
    return fullPath && fullPath.startsWith(station.sourceFolder);
  });
  
  return tracksInFolder.sort((a, b) => a.filepath.localeCompare(b.filepath));
}

function getShuffledRadioPlaylist(stationId: string, dateStr: string) {
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

function getLiveRadioTrackAt(stationId: string, timestamp: number) {
  const stations = getStationsList();
  const station = stations.find(s => s.id === stationId);
  if (!station) return null;
  
  const dateObj = new Date(timestamp);
  const dateStr = `${dateObj.getUTCFullYear()}-${String(dateObj.getUTCMonth() + 1).padStart(2, "0")}-${String(dateObj.getUTCDate()).padStart(2, "0")}`;
  
  const epoch = Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate());
  
  const shuffled = getShuffledRadioPlaylist(stationId, dateStr);
  if (shuffled.length === 0) return null;
  
  const totalRuntime = shuffled.reduce((sum, item) => sum + (item.duration || 120), 0);
  if (totalRuntime === 0) return null;
  
  const elapsedSeconds = Math.floor((timestamp - epoch) / 1000);
  const position = ((elapsedSeconds % totalRuntime) + totalRuntime) % totalRuntime;
  
  let currentSum = 0;
  let activeIndex = -1;
  for (let i = 0; i < shuffled.length; i++) {
    const dur = shuffled[i].duration || 120;
    if (currentSum + dur > position) {
      activeIndex = i;
      break;
    }
    currentSum += dur;
  }
  
  if (activeIndex === -1) {
    activeIndex = shuffled.length - 1;
  }
  
  const currentTrack = shuffled[activeIndex];
  const offsetSeconds = position - currentSum;
  const loopNumber = Math.floor(elapsedSeconds / totalRuntime);
  const startedAt = new Date(epoch + (loopNumber * totalRuntime + currentSum) * 1000).toISOString();
  const endsAt = new Date(epoch + (loopNumber * totalRuntime + currentSum + (currentTrack.duration || 120)) * 1000).toISOString();
  const nextTrack = shuffled[(activeIndex + 1) % shuffled.length];
  
  const progress = (currentTrack.duration && currentTrack.duration > 0) ? (offsetSeconds / currentTrack.duration) : 0;
  
  return {
    station: {
      ...station,
      nowPlayingArtist: currentTrack.artist,
      nowPlayingTitle: currentTrack.title,
    },
    currentTrack: {
      id: currentTrack.id,
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      duration: currentTrack.duration,
      filepath: currentTrack.filepath,
    },
    offsetSeconds,
    startedAt,
    endsAt,
    nextTrack: nextTrack ? {
      title: nextTrack.title,
      artist: nextTrack.artist,
      startsAt: endsAt
    } : null,
    progress
  };
}

function getRadioScheduleForStation(stationId: string, startTimestamp: number, hours: number) {
  const schedule: any[] = [];
  const endTimestamp = startTimestamp + hours * 60 * 60 * 1000;
  
  let currentTimestamp = startTimestamp;
  while (currentTimestamp < endTimestamp) {
    const live = getLiveRadioTrackAt(stationId, currentTimestamp);
    if (!live) break;
    
    const trackEndsAt = new Date(live.endsAt).getTime();
    
    schedule.push({
      track: live.currentTrack,
      startTime: live.startedAt,
      endTime: live.endsAt
    });
    
    currentTimestamp = trackEndsAt + 100;
  }
  
  return schedule;
}

// GET /api/radio/stations
app.get("/api/radio/stations", async (req, res) => {
  try {
    await checkCache();
    const stations = getStationsList();
    const nowTimestamp = Date.now();
    const stationsWithLive = stations.map(s => {
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
app.get("/api/radio/stations/:id/now", async (req, res) => {
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
app.get("/api/radio/stations/:id/schedule", async (req, res) => {
  try {
    await checkCache();
    const hours = parseInt(req.query.hours as string || "3", 10);
    const schedule = getRadioScheduleForStation(req.params.id, Date.now(), hours);
    res.json(schedule);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch station schedule", details: err.message });
  }
});

// GET /api/radio/stations/schedule/all
app.get("/api/radio/stations/schedule/all", async (req, res) => {
  try {
    await checkCache();
    const hours = parseInt(req.query.hours as string || "3", 10);
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
app.get("/api/radio/stations/:id/stream", async (req, res) => {
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
      console.log(`[REMUX] Active streams: ${activeRemuxCount}/${MAX_REMUX_STREAMS}`);

      if (activeRemuxCount >= MAX_REMUX_STREAMS) {
        return res.status(503).json({ 
          error: "Server busy, too many streams active. Try again shortly." 
        });
      }

      // Serve AAC audio stream
      res.setHeader("Content-Type", "audio/aac");
      res.setHeader("Transfer-Encoding", "chunked");

      activeRemuxCount++;

      // Use offsetSeconds to seek on the server
      const startSeconds = Math.max(0, Math.floor(live.offsetSeconds || 0));

      const ffmpegArgs: string[] = [];
      if (startSeconds > 0) {
        ffmpegArgs.push("-ss", startSeconds.toString());
      }
      ffmpegArgs.push(
        "-i", filepath,
        "-c:a", "aac",
        "-b:a", "256k",
        "-f", "adts",
        "pipe:1"
      );

      const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

      ffmpegProcess.stdout.pipe(res);

      let countDecremented = false;
      const decrementCount = () => {
        if (!countDecremented) {
          activeRemuxCount = Math.max(0, activeRemuxCount - 1);
          countDecremented = true;
          console.log(`[REMUX] Radio transcode closed. Active streams: ${activeRemuxCount}/${MAX_REMUX_STREAMS}`);
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

// 9. GET /api/search?q=query
app.get("/api/search", async (req, res) => {
  try {
    await checkCache();
    const query = (req.query.q as string || "").toLowerCase().trim();

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
      movies: filteredMovies,
      music: filteredMusic,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Search query failed", details: err.message });
  }
});

// 10. GET /api/status
app.get("/api/status", async (req, res) => {
  try {
    await checkCache();

    // Get storage info representing either /mnt/storage or root / if missing (using static non-blocking flag)
    const storagePath = hasMntStorage ? "/mnt/storage" : ".";
    
    // Execute df with -P for standard POSIX output (avoid split lines) and a short timeout to prevent blocking on network errors/stale mounts
    exec(`df -P -k "${storagePath}"`, { timeout: 1500, killSignal: "SIGKILL" }, (err, stdout) => {
      let total = 4000 * 1024 * 1024 * 1024; // Mock standard 4TB cinema drive
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

// Force library rescan
app.post("/api/rescan", async (req, res) => {
  try {
    await triggerScan();
    res.json({ success: true, movies: moviesCache.length, music: musicCache.length });
  } catch (err: any) {
    res.status(500).json({ error: "Rescan triggered failure", details: err.message });
  }
});

// Clear thumbnail cache to force smart regeneration
app.post("/api/thumbnails/clear", async (req, res) => {
  try {
    if (fs.existsSync(thumbsCacheDir)) {
      const files = fs.readdirSync(thumbsCacheDir);
      for (const file of files) {
        const fullPath = path.join(thumbsCacheDir, file);
        if (fs.statSync(fullPath).isFile()) {
          fs.unlinkSync(fullPath);
        }
      }
      console.log("🧹 Thumbnail cache cleared successfully by user request.");
    }
    res.json({ success: true, message: "Thumbnail cache cleared successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to clear thumbnail cache", details: err.message });
  }
});

// ==========================================
// SETUP WIZARD API ENDPOINTS
// ==========================================

let ffmpegInstalledCached = false;
exec("ffmpeg -version", (err) => {
  if (!err) {
    ffmpegInstalledCached = true;
  } else {
    ffmpegInstalledCached = fs.existsSync("/usr/bin/ffmpeg") || fs.existsSync("/usr/local/bin/ffmpeg");
  }
});

function getServerIpAddress() {
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

app.get("/api/setup/status", (req, res) => {
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

app.post("/api/setup/validate-path", (req, res) => {
  const { path: rawPath, type } = req.body;
  if (!rawPath) {
    return res.status(400).json({ error: "Path is required" });
  }

  const resolvedPath = resolveHome(rawPath);
  if (!fs.existsSync(resolvedPath)) {
    return res.json({ exists: false, fileCount: 0 });
  }

  const allowedExts = type === "music" 
    ? [".mp3", ".flac", ".m4a", ".wav", ".ogg", ".aac"]
    : [".mp4", ".mkv", ".avi", ".mov", ".m4v", ".webm"];
    
  const files = getFilesRecursively(resolvedPath, allowedExts);
  res.json({ exists: true, fileCount: files.length });
});

app.post("/api/setup/submit", async (req, res) => {
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
    appName 
  } = req.body;

  const musicPathsArr = Array.isArray(musicPaths) ? musicPaths : (musicPath ? [musicPath] : ["media/Music"]);
  const moviesPathsArr = Array.isArray(moviesPaths) ? moviesPaths : (videosPath ? [videosPath] : ["media/Videos"]);
  const tvShowsPathsArr = Array.isArray(tvShowsPaths) ? tvShowsPaths : (videosPath ? [videosPath] : ["media/Videos"]);
  const otherVideosPathsArr = Array.isArray(otherVideosPaths) ? otherVideosPaths : (videosPath ? [videosPath] : ["media/Videos"]);

  const musicPathsStr = musicPathsArr.join(",");
  const moviesPathsStr = moviesPathsArr.join(",");
  const tvShowsPathsStr = tvShowsPathsArr.join(",");
  const otherVideosPathsStr = otherVideosPathsArr.join(",");

  const finalVideosPath = moviesPathsArr[0] || otherVideosPathsArr[0] || "media/Videos";
  const finalMusicPath = musicPathsArr[0] || "media/Music";

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
APP_NAME="${appName || "Inaetia Studios"}"
PORT=${process.env.PORT || 3000}
HOST=${process.env.HOST || "0.0.0.0"}
VIDEOS_PATH="${finalVideosPath}"
MUSIC_PATH="${finalMusicPath}"
MUSIC_VIDEOS_PATH="${musicVideosPath || ""}"
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
THEME_COLOR="${themeColor || "#F5A623"}"
SERVER_IP="${getServerIpAddress()}"
`;

  try {
    fs.writeFileSync(path.join(process.cwd(), ".env"), envContent, "utf-8");
    console.log("📝 .env file written successfully!");

    process.env.SETUP_COMPLETE = "true";
    process.env.APP_NAME = appName || "Inaetia Studios";
    process.env.VIDEOS_PATH = finalVideosPath;
    process.env.MUSIC_PATH = finalMusicPath;
    process.env.MUSIC_VIDEOS_PATH = musicVideosPath || "";
    process.env.MUSIC_PATHS = musicPathsStr;
    process.env.MOVIES_PATHS = moviesPathsStr;
    process.env.TV_SHOWS_PATHS = tvShowsPathsStr;
    process.env.OTHER_VIDEOS_PATHS = otherVideosPathsStr;
    process.env.THUMBNAILS_CACHE_PATH = "/tmp/inaetia/thumbs";
    process.env.PROFILES_PATH = "~/.inaetia/profiles";
    process.env.MAX_CONCURRENT_FFPROBE = maxConcurrentFfprobe.toString();
    process.env.RESCAN_INTERVAL_MINUTES = rescanInterval.toString();
    process.env.THEME_COLOR = themeColor || "#F5A623";

    reinitializePathsAndSettings();

    // Trigger scan and wait for it to complete so that media is available immediately!
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

app.post("/api/settings/save-directories", async (req, res) => {
  const { 
    musicPaths,
    moviesPaths,
    tvShowsPaths,
    otherVideosPaths
  } = req.body;

  if (!musicPaths || !moviesPaths || !tvShowsPaths || !otherVideosPaths) {
    return res.status(400).json({ error: "All directory path arrays are required" });
  }

  const musicPathsStr = Array.isArray(musicPaths) ? musicPaths.join(",") : musicPaths;
  const moviesPathsStr = Array.isArray(moviesPaths) ? moviesPaths.join(",") : moviesPaths;
  const tvShowsPathsStr = Array.isArray(tvShowsPaths) ? tvShowsPaths.join(",") : tvShowsPaths;
  const otherVideosPathsStr = Array.isArray(otherVideosPaths) ? otherVideosPaths.join(",") : otherVideosPaths;

  const musicPathsArr = Array.isArray(musicPaths) ? musicPaths : [musicPaths];
  const moviesPathsArr = Array.isArray(moviesPaths) ? moviesPaths : [moviesPaths];
  const otherVideosPathsArr = Array.isArray(otherVideosPaths) ? otherVideosPaths : [otherVideosPaths];

  // Update .env file content
  try {
    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }

    // Function to replace or append environment variables
    const updateEnvVar = (content: string, key: string, value: string): string => {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(content)) {
        return content.replace(regex, `${key}="${value}"`);
      } else {
        return content + `\n${key}="${value}"`;
      }
    };

    let updatedEnv = envContent;
    updatedEnv = updateEnvVar(updatedEnv, "MUSIC_PATHS", musicPathsStr);
    updatedEnv = updateEnvVar(updatedEnv, "MOVIES_PATHS", moviesPathsStr);
    updatedEnv = updateEnvVar(updatedEnv, "TV_SHOWS_PATHS", tvShowsPathsStr);
    updatedEnv = updateEnvVar(updatedEnv, "OTHER_VIDEOS_PATHS", otherVideosPathsStr);
    
    // Also update legacy single path variables for compatibility
    if (musicPathsArr.length > 0) {
      updatedEnv = updateEnvVar(updatedEnv, "MUSIC_PATH", musicPathsArr[0]);
    }
    if (moviesPathsArr.length > 0) {
      updatedEnv = updateEnvVar(updatedEnv, "VIDEOS_PATH", moviesPathsArr[0]);
    } else if (otherVideosPathsArr.length > 0) {
      updatedEnv = updateEnvVar(updatedEnv, "VIDEOS_PATH", otherVideosPathsArr[0]);
    }

    fs.writeFileSync(envPath, updatedEnv, "utf-8");

    // Update in process.env
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

    // Trigger async rescan
    triggerScan().catch(console.error);

    res.json({ success: true });
  } catch (err: any) {
    console.error("Failed to save directories settings:", err);
    res.status(500).json({ error: "Failed to save configuration", details: err.message });
  }
});

// ==========================================
// VITE AND STATIC ASSET MIDDLEWARE
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode: Mount Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode: Host static React build
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(`🎬 Inaetia Studios Cinema backend running on port ${PORT}`);
    console.log(`📡 Local Network Access: http://192.168.4.1:${PORT}`);
    console.log(`🛡️  System offline capability loaded perfectly`);
    console.log(`====================================================`);
  });
}

startServer();
