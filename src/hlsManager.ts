import fs from "fs";
import path from "path";
import os from "os";
import { execFile, spawn, ChildProcess } from "child_process";

// Helper to resolve ~ in paths
function resolveHome(filepath: string): string {
  if (!filepath) return "";
  if (filepath.startsWith("~")) {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

// Configurable constants for HLS Caching
const DEFAULT_CACHE_DIR = fs.existsSync("/mnt/storage")
  ? "/mnt/storage/.inaetia/hls-cache"
  : path.join(os.tmpdir(), "inaetia-hls-cache");

export const HLS_CACHE_ROOT = resolveHome(process.env.HLS_CACHE_DIR || DEFAULT_CACHE_DIR);
export const HLS_SEGMENT_DURATION = 4; // 4 second HLS segments

// Configurable maximum cache size in bytes (default 50 GB)
export const HLS_MAX_CACHE_SIZE_BYTES = parseInt(
  process.env.HLS_MAX_CACHE_GB || "50",
  10
) * 1024 * 1024 * 1024;

// Eviction check interval (default 15 minutes)
export const HLS_EVICTION_INTERVAL_MS = 15 * 60 * 1000;

// Maximum concurrent video transcoding processes (defaults to 2 for low-power boxes/Raspberry Pi)
export const MAX_CONCURRENT_HLS_TRANSCODES = parseInt(
  process.env.MAX_CONCURRENT_HLS_TRANSCODES || "2",
  10
);

// Idle transcode inactivity timeout (60 seconds without segment/playlist requests)
export const HLS_TRANSCODE_INACTIVITY_MS = parseInt(
  process.env.HLS_TRANSCODE_INACTIVITY_MS || "60000",
  10
);

export interface ProbeResult {
  videoCodec: string;
  audioCodec: string;
  audioChannels: number;
  duration: number;
  width?: number;
  height?: number;
}

export interface HlsDecision {
  fileId: string;
  filepath: string;
  videoCodec: string;
  audioCodec: string;
  audioChannels: number;
  videoCopy: boolean;
  audioCopy: boolean;
  tagHvc1: boolean;
  reencodeRequired: boolean;
}

export interface TranscodeJob {
  fileId: string;
  filepath: string;
  process: ChildProcess | null;
  status: "starting" | "transcoding" | "completed" | "error";
  lastAccessed: number;
  startTime: number;
  seekOffset: number;
  error: string | null;
  decision?: HlsDecision;
}

// Active jobs and probe cache in memory
const activeJobs = new Map<string, TranscodeJob>();
const probeCache = new Map<string, ProbeResult>();

export function getActiveTranscodes(): TranscodeJob[] {
  const active: TranscodeJob[] = [];
  for (const job of activeJobs.values()) {
    if (job.status === "transcoding" && job.process) {
      active.push(job);
    }
  }
  return active;
}

// Ensure cache root directory exists
function ensureHlsCacheDir(fileId?: string): string {
  const targetDir = fileId ? path.join(HLS_CACHE_ROOT, fileId) : HLS_CACHE_ROOT;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
}

ensureHlsCacheDir();

// ==========================================
// PHASE 1: Codec Probing & Transcode Decision
// ==========================================

/**
 * Runs ffprobe on a media file once and caches the result.
 */
export async function probeMediaFile(fileId: string, filepath: string): Promise<ProbeResult> {
  // Check memory cache
  if (probeCache.has(fileId)) {
    return probeCache.get(fileId)!;
  }

  // Check disk cache in file's HLS directory
  const fileCacheDir = path.join(HLS_CACHE_ROOT, fileId);
  const probeCachePath = path.join(fileCacheDir, "probe.json");
  if (fs.existsSync(probeCachePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(probeCachePath, "utf-8"));
      if (data && data.videoCodec) {
        probeCache.set(fileId, data);
        return data;
      }
    } catch (_) {}
  }

  return new Promise((resolve) => {
    execFile(
      "ffprobe",
      ["-v", "error", "-show_format", "-show_streams", "-of", "json", filepath],
      (err, stdout) => {
        let videoCodec = "unknown";
      let audioCodec = "unknown";
      let audioChannels = 2;
      let duration = 0;
      let width = 0;
      let height = 0;

      if (!err && stdout) {
        try {
          const parsed = JSON.parse(stdout);
          if (parsed.streams) {
            const vStream = parsed.streams.find((s: any) => s.codec_type === "video");
            if (vStream) {
              videoCodec = (vStream.codec_name || "").toLowerCase();
              width = vStream.width || 0;
              height = vStream.height || 0;
            }

            const aStream = parsed.streams.find((s: any) => s.codec_type === "audio");
            if (aStream) {
              audioCodec = (aStream.codec_name || "").toLowerCase();
              audioChannels = aStream.channels || 2;
            }
          }

          if (parsed.format && parsed.format.duration) {
            duration = parseFloat(parsed.format.duration) || 0;
          }
        } catch (e) {
          console.error(`[HLS Probe] Error parsing ffprobe JSON for ${fileId}:`, e);
        }
      }

      const result: ProbeResult = {
        videoCodec,
        audioCodec,
        audioChannels,
        duration,
        width,
        height,
      };

      probeCache.set(fileId, result);

      // Save probe result to file cache dir if created
      try {
        ensureHlsCacheDir(fileId);
        fs.writeFileSync(probeCachePath, JSON.stringify(result, null, 2), "utf-8");
      } catch (_) {}

      resolve(result);
    });
  });
}

/**
 * Given probe results, decides the exact FFmpeg transcode flags.
 */
export function getHlsTranscodeDecision(
  fileId: string,
  filepath: string,
  probe: ProbeResult
): HlsDecision {
  const vCodec = probe.videoCodec.toLowerCase();
  const aCodec = probe.audioCodec.toLowerCase();

  // Video decision:
  // H.264 -> stream copy
  // HEVC/H.265 -> stream copy but add -tag:v hvc1 for Safari/HLS compatibility
  // Anything else (VP9, MPEG-4, AV1, VC1) -> re-encode to H.264
  let videoCopy = false;
  let tagHvc1 = false;

  if (vCodec === "h264" || vCodec === "avc" || vCodec === "avc1") {
    videoCopy = true;
  } else if (vCodec === "hevc" || vCodec === "h265") {
    videoCopy = true;
    tagHvc1 = true;
  }

  // Audio decision:
  // AAC -> stream copy
  // Anything else (AC3, E-AC3, DTS, TrueHD, Vorbis, Opus, MP3, FLAC) -> re-encode to AAC
  let audioCopy = false;
  if (aCodec === "aac") {
    audioCopy = true;
  }

  const reencodeRequired = !videoCopy || !audioCopy;

  if (reencodeRequired) {
    console.log(
      `[HLS Decision] [Transcode] File ${fileId} (${path.basename(filepath)}) REQUIRES RE-ENCODING (Heavy CPU): ` +
        `Video: ${probe.videoCodec} -> ${videoCopy ? "COPY" : "x264"}, ` +
        `Audio: ${probe.audioCodec} -> ${audioCopy ? "COPY" : "AAC stereo"}`
    );
  } else {
    console.log(
      `[HLS Decision] [Remux] File ${fileId} (${path.basename(filepath)}) Stream-copy eligible (Fast remux): ` +
        `Video: ${probe.videoCodec} (Copy), Audio: ${probe.audioCodec} (Copy)`
    );
  }

  return {
    fileId,
    filepath,
    videoCodec: probe.videoCodec,
    audioCodec: probe.audioCodec,
    audioChannels: probe.audioChannels,
    videoCopy,
    audioCopy,
    tagHvc1,
    reencodeRequired,
  };
}

// ==========================================
// PHASE 2 & 3: HLS Segment Generation & Seeking
// ==========================================

/**
 * Helper to check if a cached HLS stream is fully generated and finalized with #EXT-X-ENDLIST.
 */
export function isHlsFullyCached(fileId: string): boolean {
  const fileCacheDir = path.join(HLS_CACHE_ROOT, fileId);
  const playlistPath = path.join(fileCacheDir, "index.m3u8");
  const initPath = path.join(fileCacheDir, "init.mp4");

  if (!fs.existsSync(playlistPath) || !fs.existsSync(initPath)) {
    return false;
  }

  try {
    const content = fs.readFileSync(playlistPath, "utf-8");
    return content.includes("#EXT-X-ENDLIST");
  } catch (_) {
    return false;
  }
}

/**
 * Gets an active job or starts an HLS background transcode job.
 */
export async function startOrGetHlsTranscode(
  fileId: string,
  filepath: string,
  options: { seekOffset?: number; forceRestart?: boolean } = {}
): Promise<TranscodeJob> {
  const seekOffset = options.seekOffset && options.seekOffset > 0 ? options.seekOffset : 0;
  const fileCacheDir = ensureHlsCacheDir(fileId);
  const playlistPath = path.join(fileCacheDir, "index.m3u8");
  const metaPath = path.join(fileCacheDir, "meta.json");

  // Update last accessed timestamp
  updateLastAccessed(fileId);

  // Check if fully cached and no seek restart forced
  if (isHlsFullyCached(fileId) && !options.forceRestart) {
    let existingJob = activeJobs.get(fileId);
    if (!existingJob) {
      existingJob = {
        fileId,
        filepath,
        process: null,
        status: "completed",
        lastAccessed: Date.now(),
        startTime: Date.now(),
        seekOffset: 0,
        error: null,
      };
      activeJobs.set(fileId, existingJob);
    }
    return existingJob;
  }

  // Check existing in-flight job
  let currentJob = activeJobs.get(fileId);

  if (currentJob && currentJob.status === "transcoding" && currentJob.process) {
    if (!options.forceRestart && seekOffset === 0) {
      return currentJob;
    }

    // If seekOffset is requested beyond generated portion or restart forced, kill running job to seek
    if (options.forceRestart || seekOffset > 0) {
      console.log(`[HLS] Terminating active transcode job for ${fileId} to handle seek/restart at offset ${seekOffset}s`);
      try {
        currentJob.process.kill("SIGKILL");
      } catch (_) {}
      activeJobs.delete(fileId);
    }
  }

  // Probe media file and get transcode decision
  const probe = await probeMediaFile(fileId, filepath);
  const decision = getHlsTranscodeDecision(fileId, filepath, probe);

  // Prepare FFmpeg command line arguments
  const ffmpegArgs: string[] = [];

  // Input Seeking: -ss before -i for fast keyframe seek
  if (seekOffset > 0) {
    ffmpegArgs.push("-ss", seekOffset.toString());
  }

  ffmpegArgs.push("-i", filepath);

  // Video Codec
  if (decision.videoCopy) {
    ffmpegArgs.push("-c:v", "copy");
    if (decision.tagHvc1) {
      ffmpegArgs.push("-tag:v", "hvc1");
    }
  } else {
    ffmpegArgs.push(
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "23",
      "-pix_fmt", "yuv420p"
    );
  }

  // Audio Codec
  if (decision.audioCopy) {
    ffmpegArgs.push("-c:a", "copy");
  } else {
    ffmpegArgs.push("-c:a", "aac", "-b:a", "192k");
    if (decision.audioChannels > 2) {
      ffmpegArgs.push("-ac", "2"); // Downmix to stereo for web/Safari compatibility
    }
  }

  // Segment alignment for seek offset
  if (seekOffset > 0) {
    const startNum = Math.floor(seekOffset / HLS_SEGMENT_DURATION);
    ffmpegArgs.push("-start_number", startNum.toString());
    ffmpegArgs.push("-output_ts_offset", seekOffset.toString());
  }

  // HLS Fragmented MP4 Output Flags
  const segmentPattern = path.join(fileCacheDir, "segment_%04d.m4s");
  ffmpegArgs.push(
    "-f", "hls",
    "-hls_time", HLS_SEGMENT_DURATION.toString(),
    "-hls_playlist_type", "event",
    "-hls_segment_type", "fmp4",
    "-hls_fmp4_init_filename", "init.mp4",
    "-hls_segment_filename", segmentPattern,
    playlistPath
  );

  // Enforce concurrency limit on active FFmpeg video transcode processes
  const runningJobs = getActiveTranscodes().filter((j) => j.fileId !== fileId);
  if (runningJobs.length >= MAX_CONCURRENT_HLS_TRANSCODES) {
    // Sort by lastAccessed ascending (oldest/least recently accessed first)
    runningJobs.sort((a, b) => a.lastAccessed - b.lastAccessed);
    const toKillCount = runningJobs.length - MAX_CONCURRENT_HLS_TRANSCODES + 1;
    const jobsToKill = runningJobs.slice(0, toKillCount);
    for (const jobToKill of jobsToKill) {
      console.log(
        `[HLS Concurrency] Killing LRU active transcode job for ${jobToKill.fileId} to stay within limit (${MAX_CONCURRENT_HLS_TRANSCODES})`
      );
      try {
        if (jobToKill.process) {
          jobToKill.process.kill("SIGKILL");
        }
      } catch (_) {}
      jobToKill.status = "completed";
      jobToKill.process = null;
      activeJobs.delete(jobToKill.fileId);
    }
  }

  console.log(`[HLS Job] Spawning FFmpeg for ${fileId} at seek ${seekOffset}s (Active: ${runningJobs.length + 1}/${MAX_CONCURRENT_HLS_TRANSCODES})...`);

  // Clean up existing playlist if starting from offset 0
  if (seekOffset === 0) {
    try {
      if (fs.existsSync(playlistPath)) fs.unlinkSync(playlistPath);
    } catch (_) {}
  }

  const childProc = spawn("ffmpeg", ffmpegArgs);

  const newJob: TranscodeJob = {
    fileId,
    filepath,
    process: childProc,
    status: "transcoding",
    lastAccessed: Date.now(),
    startTime: Date.now(),
    seekOffset,
    error: null,
    decision,
  };

  activeJobs.set(fileId, newJob);

  childProc.stderr.on("data", (data) => {
    // Suppress verbose logs, only print errors
    const str = data.toString();
    if (str.includes("Error") || str.includes("corrupt") || str.includes("Invalid")) {
      console.warn(`[FFmpeg stderr ${fileId}]: ${str.slice(0, 150)}`);
    }
  });

  childProc.on("close", (code) => {
    console.log(`[HLS Job] FFmpeg process for ${fileId} exited with code ${code}`);
    if (code === 0 || code === null) {
      newJob.status = "completed";
      newJob.process = null;

      // Ensure #EXT-X-ENDLIST is present in playlist when complete
      finalizePlaylist(fileId);
    } else {
      if (newJob.status !== "completed") {
        newJob.status = "error";
        newJob.error = `FFmpeg process exited with code ${code}`;
      }
    }
  });

  childProc.on("error", (err) => {
    console.error(`[HLS Job] FFmpeg process error for ${fileId}:`, err);
    newJob.status = "error";
    newJob.error = err.message;
  });

  // Save metadata
  try {
    fs.writeFileSync(metaPath, JSON.stringify({ fileId, filepath, lastAccessed: Date.now() }), "utf-8");
  } catch (_) {}

  return newJob;
}

/**
 * Appends #EXT-X-ENDLIST to the playlist when transcoding is fully complete.
 */
function finalizePlaylist(fileId: string): void {
  const fileCacheDir = path.join(HLS_CACHE_ROOT, fileId);
  const playlistPath = path.join(fileCacheDir, "index.m3u8");

  if (!fs.existsSync(playlistPath)) return;

  try {
    let content = fs.readFileSync(playlistPath, "utf-8");
    if (!content.includes("#EXT-X-ENDLIST")) {
      content = content.trim() + "\n#EXT-X-ENDLIST\n";
      fs.writeFileSync(playlistPath, content, "utf-8");
      console.log(`[HLS] Finalized playlist with #EXT-X-ENDLIST for ${fileId}`);
    }
  } catch (err) {
    console.error(`[HLS] Failed to finalize playlist for ${fileId}:`, err);
  }
}

/**
 * Waits until the playlist file and first segment/init file exist before responding.
 */
export async function ensureHlsPlaylistReady(
  fileId: string,
  timeoutMs: number = 8000
): Promise<boolean> {
  const fileCacheDir = path.join(HLS_CACHE_ROOT, fileId);
  const playlistPath = path.join(fileCacheDir, "index.m3u8");
  const initPath = path.join(fileCacheDir, "init.mp4");

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(playlistPath) && fs.existsSync(initPath)) {
      try {
        const content = fs.readFileSync(playlistPath, "utf-8");
        // Check if there is at least 1 segment entry in playlist
        if (content.includes(".m4s") || content.includes("#EXTINF")) {
          return true;
        }
      } catch (_) {}
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  return fs.existsSync(playlistPath);
}

// ==========================================
// PHASE 4: Cache Management & LRU Eviction
// ==========================================

const lastAccessedMap = new Map<string, number>();

/**
 * Updates last accessed timestamp for a file's HLS cache.
 */
export function updateLastAccessed(fileId: string): void {
  const now = Date.now();
  lastAccessedMap.set(fileId, now);

  const job = activeJobs.get(fileId);
  if (job) {
    job.lastAccessed = now;
  }

  const fileCacheDir = path.join(HLS_CACHE_ROOT, fileId);
  const metaPath = path.join(fileCacheDir, "meta.json");
  if (fs.existsSync(fileCacheDir)) {
    try {
      let meta: any = {};
      if (fs.existsSync(metaPath)) {
        meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      }
      meta.lastAccessed = now;
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf-8");
    } catch (_) {}
  }
}

/**
 * Recursively calculates directory size in bytes.
 */
function getDirectorySize(dirPath: string): number {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;

  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        size += getDirectorySize(fullPath);
      } else {
        size += stat.size;
      }
    }
  } catch (_) {}

  return size;
}

/**
 * Executes LRU eviction if total cache size exceeds configured limit.
 */
export function runHlsCacheEviction(): void {
  if (!fs.existsSync(HLS_CACHE_ROOT)) return;

  try {
    const folders = fs.readdirSync(HLS_CACHE_ROOT);
    const itemStats: { fileId: string; folderPath: string; size: number; lastAccessed: number }[] = [];
    let totalSize = 0;

    for (const folder of folders) {
      const folderPath = path.join(HLS_CACHE_ROOT, folder);
      if (!fs.statSync(folderPath).isDirectory()) continue;

      const fileId = folder;
      const size = getDirectorySize(folderPath);
      totalSize += size;

      let lastAccessed = lastAccessedMap.get(fileId) || 0;
      const metaPath = path.join(folderPath, "meta.json");
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
          if (meta.lastAccessed) {
            lastAccessed = Math.max(lastAccessed, meta.lastAccessed);
          }
        } catch (_) {}
      }

      // Fallback to mtime of playlist or folder
      if (lastAccessed === 0) {
        try {
          const stat = fs.statSync(folderPath);
          lastAccessed = stat.mtimeMs || stat.ctimeMs;
        } catch (_) {
          lastAccessed = Date.now();
        }
      }

      itemStats.push({ fileId, folderPath, size, lastAccessed });
    }

    const maxGB = (HLS_MAX_CACHE_SIZE_BYTES / (1024 * 1024 * 1024)).toFixed(1);
    const currentGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);
    console.log(`[HLS Cache Manager] Total cache size: ${currentGB} GB / ${maxGB} GB limit across ${itemStats.length} items.`);

    if (totalSize <= HLS_MAX_CACHE_SIZE_BYTES) {
      return;
    }

    console.log(`[HLS Cache Eviction] Total cache size (${currentGB} GB) exceeds threshold (${maxGB} GB). Evicting LRU items...`);

    // Sort by last accessed ascending (oldest first)
    itemStats.sort((a, b) => a.lastAccessed - b.lastAccessed);

    const now = Date.now();
    const activeThresholdMs = 5 * 60 * 1000; // Do not evict if accessed in last 5 minutes

    for (const item of itemStats) {
      if (totalSize <= HLS_MAX_CACHE_SIZE_BYTES * 0.8) {
        // Target 80% capacity headroom
        break;
      }

      // Skip currently active transcode jobs or recently accessed files
      const activeJob = activeJobs.get(item.fileId);
      const isJobActive = activeJob && activeJob.status === "transcoding";
      const isRecentlyAccessed = now - item.lastAccessed < activeThresholdMs;

      if (isJobActive || isRecentlyAccessed) {
        console.log(`[HLS Cache Eviction] Skipping active/recent item ${item.fileId}`);
        continue;
      }

      // Evict directory
      try {
        fs.rmSync(item.folderPath, { recursive: true, force: true });
        activeJobs.delete(item.fileId);
        probeCache.delete(item.fileId);
        lastAccessedMap.delete(item.fileId);

        totalSize -= item.size;
        const freedMB = (item.size / (1024 * 1024)).toFixed(1);
        console.log(`[HLS Cache Eviction] Evicted ${item.fileId} (${freedMB} MB)`);
      } catch (err) {
        console.error(`[HLS Cache Eviction] Failed to evict ${item.folderPath}:`, err);
      }
    }
  } catch (err) {
    console.error("[HLS Cache Eviction] Error during cache eviction check:", err);
  }
}

// Periodically run LRU Cache Eviction
setInterval(runHlsCacheEviction, HLS_EVICTION_INTERVAL_MS);

/**
 * Automatically terminates idle transcode processes if no client has requested segments recently.
 */
export function reapInactiveTranscodes(): void {
  const now = Date.now();
  for (const [id, job] of activeJobs.entries()) {
    if (job.status === "transcoding" && job.process) {
      if (now - job.lastAccessed > HLS_TRANSCODE_INACTIVITY_MS) {
        console.log(
          `[HLS Reaper] Terminating idle transcode process for ${id} (inactive for ${Math.round(
            (now - job.lastAccessed) / 1000
          )}s)`
        );
        try {
          job.process.kill("SIGKILL");
        } catch (_) {}
        job.status = "completed";
        job.process = null;
        activeJobs.delete(id);
      }
    }
  }
}

export function getHlsProgress(fileId: string) {
  const job = activeJobs.get(fileId);
  const fileCacheDir = path.join(HLS_CACHE_ROOT, fileId);
  const playlistPath = path.join(fileCacheDir, "index.m3u8");

  let segmentsCount = 0;
  if (fs.existsSync(fileCacheDir)) {
    try {
      const files = fs.readdirSync(fileCacheDir);
      segmentsCount = files.filter((f) => f.endsWith(".m4s")).length;
    } catch (_) {}
  }

  const isComplete = isHlsFullyCached(fileId);

  return {
    fileId,
    status: job ? job.status : isComplete ? "completed" : "idle",
    segmentsCount,
    isComplete,
    seekOffset: job ? job.seekOffset : 0,
    startTime: job ? job.startTime : null,
    error: job ? job.error : null,
  };
}

export function stopHlsTranscode(fileId: string): boolean {
  const job = activeJobs.get(fileId);
  if (job && job.process) {
    try {
      job.process.kill("SIGKILL");
    } catch (_) {}
    job.status = "completed";
    job.process = null;
    activeJobs.delete(fileId);
    return true;
  }
  return false;
}

// Periodically check and clean up inactive transcode processes (every 10 seconds)
setInterval(reapInactiveTranscodes, 10000);

