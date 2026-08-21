import path from "path";
import fs from "fs";
import { Movie, Track } from "../types";
import { resolveHome } from "./auth";

export const METADATA_CACHE_FILE = path.join(process.cwd(), "media-cache.json");
export const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

// Memory Caches
export let moviesCache: Movie[] = [];
export let musicCache: Track[] = [];
export const playlistCache = new Map<string, Movie[]>();
export const radioPlaylistCache = new Map<string, Track[]>();
export let cachesLastUpdated = 0;
export let hasPerformedInitialScan = false;
export const CACHE_LIFETIME = 5 * 60 * 1000; // 5 minutes

// In-memory indexing maps for stream lookup by MD5 ID
export const moviesIndex = new Map<string, string>(); // id -> full filepath
export const musicIndex = new Map<string, string>();  // id -> full filepath
export const showsFoldersIndex = new Map<string, string>(); // showNameLower -> absolute folder path

// Parse comma-separated paths or fall back to default
export function parsePathsEnv(envValue: string | undefined, defaultPath: string): string[] {
  if (!envValue) {
    return [defaultPath];
  }
  return envValue.split(",").map((p) => p.trim()).filter(Boolean);
}

export const hasMntStorage = fs.existsSync("/mnt/storage");

// Path configs with defaults
export function getPathsConfig() {
  const PORT = parseInt(process.env.PORT || "3000", 10);
  const VIDEOS_PATH = process.env.VIDEOS_PATH || "";
  const MUSIC_PATH = process.env.MUSIC_PATH || "";
  const MUSIC_VIDEOS_PATH = process.env.MUSIC_VIDEOS_PATH || "";
  const PICTURES_PATH = process.env.PICTURES_PATH || "";
  const THUMBNAILS_CACHE_PATH = process.env.THUMBNAILS_CACHE_PATH || "/tmp/inaetia/thumbs";
  const PROFILES_DIR = resolveHome(process.env.PROFILES_PATH || "~/.inaetia/profiles");
  const PROFILES_PATH = path.join(PROFILES_DIR, "profiles.json");

  const targetVideosDir = VIDEOS_PATH && fs.existsSync(resolveHome(VIDEOS_PATH)) ? resolveHome(VIDEOS_PATH) : path.join(process.cwd(), "media/Videos");
  const targetMusicDir = MUSIC_PATH && fs.existsSync(resolveHome(MUSIC_PATH)) ? resolveHome(MUSIC_PATH) : path.join(process.cwd(), "media/Music");
  const targetMusicVideosDir = MUSIC_VIDEOS_PATH && fs.existsSync(resolveHome(MUSIC_VIDEOS_PATH)) ? resolveHome(MUSIC_VIDEOS_PATH) : undefined;
  const targetPicturesDir = PICTURES_PATH && fs.existsSync(resolveHome(PICTURES_PATH)) ? resolveHome(PICTURES_PATH) : path.join(process.cwd(), "media/Pictures");
  const thumbsCacheDir = resolveHome(THUMBNAILS_CACHE_PATH);

  const MAX_CONCURRENT_FFPROBES = parseInt(process.env.MAX_CONCURRENT_FFPROBE || "3", 10);
  const RESCAN_INTERVAL_MINUTES = parseInt(process.env.RESCAN_INTERVAL_MINUTES || "30", 10);
  const RESCAN_INTERVAL_MS = RESCAN_INTERVAL_MINUTES * 60 * 1000;

  return {
    PORT,
    VIDEOS_PATH,
    MUSIC_PATH,
    MUSIC_VIDEOS_PATH,
    PICTURES_PATH,
    THUMBNAILS_CACHE_PATH,
    PROFILES_DIR,
    PROFILES_PATH,
    targetVideosDir,
    targetMusicDir,
    targetMusicVideosDir,
    targetPicturesDir,
    thumbsCacheDir,
    MAX_CONCURRENT_FFPROBES,
    RESCAN_INTERVAL_MINUTES,
    RESCAN_INTERVAL_MS,
  };
}

export function reinitializePathsAndSettings() {
  ensureDirs();
}

export function ensureDirs() {
  const cfg = getPathsConfig();
  const dirs = [cfg.targetVideosDir, cfg.targetMusicDir, cfg.targetPicturesDir, cfg.thumbsCacheDir, cfg.PROFILES_DIR];
  if (cfg.targetMusicVideosDir) {
    dirs.push(cfg.targetMusicVideosDir);
  }
  dirs.forEach((dir) => {
    if (dir && !fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.warn(`Could not create directory ${dir}:`, err);
      }
    }
  });
}

export function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    ".mp4": "video/mp4",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".m4v": "video/mp4",
    ".webm": "video/webm",
    ".ts": "video/mp2t",
    ".mp3": "audio/mpeg",
    ".flac": "audio/flac",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".vtt": "text/vtt",
    ".srt": "text/plain",
  };
  return mimeTypes[ext.toLowerCase()] || "application/octet-stream";
}

export function isSafariClient(userAgent: string): boolean {
  if (!userAgent) return false;
  return (
    (userAgent.includes("Safari") &&
      !userAgent.includes("Chrome") &&
      !userAgent.includes("Chromium")) ||
    userAgent.includes("iPhone") ||
    userAgent.includes("iPad") ||
    userAgent.includes("iPod")
  );
}

export function repopulateShowsFoldersIndex() {
  showsFoldersIndex.clear();
  moviesCache.forEach((m) => {
    if (m.type === "episode" && m.showName) {
      const showKey = m.showName.toLowerCase().replace(/[\s_-]+/g, "");
      const fullPath = moviesIndex.get(m.id);
      if (fullPath && !showsFoldersIndex.has(showKey)) {
        const folder = findShowFolderPath(fullPath, m.showName);
        if (folder) {
          showsFoldersIndex.set(showKey, folder);
        }
      }
    }
  });
}

export function findShowFolderPath(file: string, showName: string): string | null {
  const normalizedPath = file.replace(/\\/g, "/");
  const parts = normalizedPath.split("/").filter((p) => p.length > 0);
  const target = showName.toLowerCase().replace(/[\s_-]+/g, "");

  for (let i = parts.length - 1; i >= 0; i--) {
    const partNorm = parts[i].toLowerCase().replace(/[\s_-]+/g, "");
    if (partNorm === target) {
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

  const parent = path.dirname(file);
  const parentName = path.basename(parent).toLowerCase();
  if (/^(season|s)\s*\d+/i.test(parentName)) {
    return path.dirname(parent);
  }
  return parent;
}

export function setMoviesCache(movies: Movie[]) {
  moviesCache = movies;
}

export function setMusicCache(music: Track[]) {
  musicCache = music;
}

export function setCachesLastUpdated(time: number) {
  cachesLastUpdated = time;
}

export function setHasPerformedInitialScan(val: boolean) {
  hasPerformedInitialScan = val;
}

export function loadPersistentCache() {
  try {
    if (fs.existsSync(METADATA_CACHE_FILE)) {
      const data = fs.readFileSync(METADATA_CACHE_FILE, "utf8");
      if (data && data.trim().length > 0) {
        const parsed = JSON.parse(data);
        moviesCache = parsed.moviesCache || [];
        musicCache = parsed.musicCache || [];
        cachesLastUpdated = parsed.cachesLastUpdated || 0;

        if (moviesCache.length > 0 || musicCache.length > 0) {
          hasPerformedInitialScan = true;
        }

        if (parsed.moviesIndexList) {
          moviesIndex.clear();
          parsed.moviesIndexList.forEach(([id, file]: [string, string]) => {
            if (fs.existsSync(file)) {
              moviesIndex.set(id, file);
            }
          });
        }
        if (parsed.musicIndexList) {
          musicIndex.clear();
          parsed.musicIndexList.forEach(([id, file]: [string, string]) => {
            if (fs.existsSync(file)) {
              musicIndex.set(id, file);
            }
          });
        }
        repopulateShowsFoldersIndex();
        console.log(`[Cache] Metadata cache loaded successfully: Movies: ${moviesCache.length}, Tracks: ${musicCache.length}`);
      }
    }
  } catch (err) {
    console.error("[Cache] Failed to load persistent metadata cache:", err);
  }
}

export function savePersistentCache() {
  try {
    const dataToSave = {
      moviesCache,
      musicCache,
      cachesLastUpdated,
      moviesIndexList: Array.from(moviesIndex.entries()),
      musicIndexList: Array.from(musicIndex.entries()),
    };
    fs.writeFileSync(METADATA_CACHE_FILE, JSON.stringify(dataToSave, null, 2), "utf8");
    console.log(`[Cache] Metadata cache saved to disk: ${METADATA_CACHE_FILE}`);
  } catch (err) {
    console.error("[Cache] Failed to save persistent metadata cache:", err);
  }
}
