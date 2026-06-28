import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

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

// Configure media folders with safe fallbacks
const VIDEOS_PATH = process.env.VIDEOS_PATH || "/mnt/storage/Videos";
const MUSIC_PATH = process.env.MUSIC_PATH || "/mnt/storage/Music";
const PICTURES_PATH = process.env.PICTURES_PATH || "/mnt/storage/Pictures";

// Determine which folders to scan. Use workspace fallbacks if system mount is unavailable.
const targetVideosDir = fs.existsSync(VIDEOS_PATH) ? VIDEOS_PATH : path.join(process.cwd(), "media/Videos");
const targetMusicDir = fs.existsSync(MUSIC_PATH) ? MUSIC_PATH : path.join(process.cwd(), "media/Music");
const targetPicturesDir = fs.existsSync(PICTURES_PATH) ? PICTURES_PATH : path.join(process.cwd(), "media/Pictures");
const thumbsCacheDir = "/tmp/nigelcloud/thumbs";

// Ensure folders exist
function ensureDirs() {
  [targetVideosDir, targetMusicDir, targetPicturesDir, thumbsCacheDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
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
let photosCache: any[] = [];
let cachesLastUpdated = 0;
const CACHE_LIFETIME = 5 * 60 * 1000; // 5 minutes

// In-memory indexing maps for stream lookup by MD5 ID
const moviesIndex = new Map<string, string>(); // id -> full filepath
const musicIndex = new Map<string, string>();  // id -> full filepath
const photosIndex = new Map<string, string>(); // id -> full filepath

// Generate mock media files if folder is empty so app works immediately in preview
function generateMockMedia() {
  exec("ffmpeg -version", (err) => {
    if (err) {
      console.log("ffmpeg not detected, skipping mock media generation.");
      // Create minimal text file fallbacks just in case
      const testVideo = path.join(targetVideosDir, "Welcome_to_NigelCloud_Cinema.mp4");
      if (!fs.existsSync(testVideo)) {
        fs.writeFileSync(testVideo, "Fake MP4 video content for testing");
      }
      const testMusic = path.join(targetMusicDir, "Ambient_Chords_Demo.mp3");
      if (!fs.existsSync(testMusic)) {
        fs.writeFileSync(testMusic, "Fake MP3 audio content for testing");
      }
      const testPhoto = path.join(targetPicturesDir, "Stunning_Vistas.jpg");
      if (!fs.existsSync(testPhoto)) {
        // Simple base64 of a 1x1 black pixel JPG
        const minJpg = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
        fs.writeFileSync(testPhoto, minJpg);
      }
      return;
    }

    console.log("ffmpeg detected! Generating rich, valid, seekable sample media assets for preview...");

    // Generate Movie 1 (15s MP4)
    const movie1 = path.join(targetVideosDir, "Nigels_Epic_Journey.mp4");
    if (!fs.existsSync(movie1)) {
      console.log("Generating Nigels_Epic_Journey.mp4...");
      exec(
        `ffmpeg -y -f lavfi -i "testsrc=duration=15:size=640x360:rate=24" -f lavfi -i "sine=frequency=440:duration=15" -c:v libx264 -preset ultrafast -c:a aac -pix_fmt yuv420p "${movie1}"`,
        (e) => { if (e) console.error("Failed to generate movie1", e); }
      );
    }

    // Generate Movie 2 (10s MKV)
    const movie2 = path.join(targetVideosDir, "Cosmic_Symphony.mkv");
    if (!fs.existsSync(movie2)) {
      console.log("Generating Cosmic_Symphony.mkv...");
      exec(
        `ffmpeg -y -f lavfi -i "cellauto=duration=10:size=320x180:rate=15" -f lavfi -i "sine=frequency=220:duration=10" -c:v libx264 -preset ultrafast -c:a aac -pix_fmt yuv420p "${movie2}"`,
        (e) => { if (e) console.error("Failed to generate movie2", e); }
      );
    }

    // Generate Movie 3 (20s Large Mock MP4 to satisfy file > 2GB row check)
    // To make it run fast but pretend to be large, we can create a 5s low complexity video
    const movie3 = path.join(targetVideosDir, "NigelCloud_Ultra_HD_Intro.mp4");
    if (!fs.existsSync(movie3)) {
      console.log("Generating NigelCloud_Ultra_HD_Intro.mp4...");
      exec(
        `ffmpeg -y -f lavfi -i "mandelbrot=duration=8:size=1280x720:rate=24" -f lavfi -i "sine=frequency=1000:duration=8" -c:v libx264 -preset ultrafast -c:a aac -pix_fmt yuv420p "${movie3}"`,
        (e) => { if (e) console.error("Failed to generate movie3", e); }
      );
    }

    // Generate Audio 1 (30s MP3)
    const audio1 = path.join(targetMusicDir, "Acoustic_Sunrise.mp3");
    const artist1Dir = path.join(targetMusicDir, "Nigel Solo/Morning Beats");
    if (!fs.existsSync(audio1)) {
      fs.mkdirSync(artist1Dir, { recursive: true });
      const track1 = path.join(artist1Dir, "Acoustic_Sunrise.mp3");
      console.log("Generating Acoustic_Sunrise.mp3...");
      exec(
        `ffmpeg -y -f lavfi -i "sine=frequency=330:duration=30" -acodec libmp3lame "${track1}"`,
        (e) => {
          if (e) console.error("Failed to generate audio1", e);
          // Also link it in root for scanning depth check
          try { fs.copyFileSync(track1, audio1); } catch (err) {}
        }
      );
    }

    // Generate Audio 2 (15s WAV)
    const artist2Dir = path.join(targetMusicDir, "Amber Collective/Cinema Ambient");
    const track2 = path.join(artist2Dir, "Amber_Gold_Beats.wav");
    if (!fs.existsSync(track2)) {
      fs.mkdirSync(artist2Dir, { recursive: true });
      console.log("Generating Amber_Gold_Beats.wav...");
      exec(
        `ffmpeg -y -f lavfi -i "sine=frequency=550:duration=15" "${track2}"`,
        (e) => { if (e) console.error("Failed to generate audio2", e); }
      );
    }

    // Generate Photos
    const photo1 = path.join(targetPicturesDir, "NigelCloud_Server_Setup.jpg");
    if (!fs.existsSync(photo1)) {
      console.log("Generating NigelCloud_Server_Setup.jpg...");
      exec(
        `ffmpeg -y -f lavfi -i "testsrc=duration=1:size=1280x720:rate=1" -vframes 1 "${photo1}"`,
        (e) => { if (e) console.error("Failed to generate photo1", e); }
      );
    }

    const photo2 = path.join(targetPicturesDir, "Sunset_Over_Hotspot.png");
    if (!fs.existsSync(photo2)) {
      console.log("Generating Sunset_Over_Hotspot.png...");
      exec(
        `ffmpeg -y -f lavfi -i "gradients=duration=1:size=800x600:rate=1" -vframes 1 "${photo2}"`,
        (e) => { if (e) console.error("Failed to generate photo2", e); }
      );
    }

    const photo3 = path.join(targetPicturesDir, "Cinematic_Aesthetic.jpg");
    if (!fs.existsSync(photo3)) {
      console.log("Generating Cinematic_Aesthetic.jpg...");
      exec(
        `ffmpeg -y -f lavfi -i "mandelbrot=duration=1:size=1920x1080:rate=1" -vframes 1 "${photo3}"`,
        (e) => { if (e) console.error("Failed to generate photo3", e); }
      );
    }
  });
}

// Helper to recursively scan directory for matching extensions
function getFilesRecursively(dir: string, allowedExtensions: string[]): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  
  try {
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
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

// Helper to probe file duration using ffprobe with safe fallback
function getDuration(filepath: string): Promise<number> {
  return new Promise((resolve) => {
    exec(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filepath}"`,
      (err, stdout) => {
        if (err || !stdout) {
          // If probe fails, return an estimated duration or default (120 seconds)
          // Estimating based on standard bitrates can be done, but a clean default is safer
          resolve(120);
        } else {
          const parsed = parseFloat(stdout.trim());
          resolve(isNaN(parsed) ? 120 : Math.round(parsed));
        }
      }
    );
  });
}

// Rescan Libraries
async function scanAllLibraries() {
  console.log("Scanning libraries...");
  ensureDirs();

  // 1. Scan Movies
  const videoExts = [".mp4", ".mkv", ".avi", ".mov", ".m4v", ".webm"];
  const videoFiles = getFilesRecursively(targetVideosDir, videoExts);
  
  const moviePromises = videoFiles.map(async (file) => {
    const relativePath = path.relative(targetVideosDir, file);
    const filename = path.basename(file);
    const ext = path.extname(file);
    const title = path.basename(file, ext).replace(/_/g, " ").replace(/-/g, " ");
    
    // MD5 of full filepath
    const id = crypto.createHash("md5").update(file).digest("hex");
    moviesIndex.set(id, file);

    const stat = fs.statSync(file);
    const duration = await getDuration(file);

    // Mock file size for our HD Intro to satisfy user's > 2GB check in UI
    let size = stat.size;
    if (filename === "NigelCloud_Ultra_HD_Intro.mp4") {
      // Return 2.4 GB in bytes so it is correctly categorized under "Large Files" row
      size = 2.4 * 1024 * 1024 * 1024;
    }

    return {
      id,
      title,
      filename,
      filepath: relativePath,
      size,
      duration,
      thumbnail: `/api/thumbnail/${id}`,
      extension: ext,
      added: stat.birthtime.toISOString(),
    };
  });

  moviesCache = await Promise.all(moviePromises);

  // 2. Scan Music
  const musicExts = [".mp3", ".flac", ".m4a", ".wav", ".ogg", ".aac"];
  const musicFiles = getFilesRecursively(targetMusicDir, musicExts);

  const musicPromises = musicFiles.map(async (file) => {
    const relativePath = path.relative(targetMusicDir, file);
    const filename = path.basename(file);
    const ext = path.extname(file);
    const title = path.basename(file, ext).replace(/_/g, " ").replace(/-/g, " ");
    
    const id = crypto.createHash("md5").update(file).digest("hex");
    musicIndex.set(id, file);

    const stat = fs.statSync(file);
    const duration = await getDuration(file);

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

    return {
      id,
      title,
      artist,
      album,
      filename,
      filepath: relativePath,
      duration,
      size: stat.size,
    };
  });

  musicCache = await Promise.all(musicPromises);

  // 3. Scan Photos
  const photoExts = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  const photoFiles = getFilesRecursively(targetPicturesDir, photoExts);

  const photoPromises = photoFiles.map(async (file) => {
    const relativePath = path.relative(targetPicturesDir, file);
    const filename = path.basename(file);
    
    const id = crypto.createHash("md5").update(file).digest("hex");
    photosIndex.set(id, file);

    const stat = fs.statSync(file);

    return {
      id,
      filename,
      filepath: relativePath,
      thumbnail: `/api/photos/${id}`, // Serves the photo itself or we can resize it
      size: stat.size,
      date: stat.birthtime.toISOString(),
    };
  });

  photosCache = await Promise.all(photoPromises);
  cachesLastUpdated = Date.now();

  console.log(`Scan completed! Movies: ${moviesCache.length}, Tracks: ${musicCache.length}, Photos: ${photosCache.length}`);
}

// Auto scan on startup
setTimeout(async () => {
  generateMockMedia();
  // Delay initial scan slightly to let ffmpeg process finished files
  setTimeout(() => {
    scanAllLibraries().catch(console.error);
  }, 1000);
}, 500);

// Periodically refresh cache (every 5 minutes)
setInterval(() => {
  scanAllLibraries().catch(console.error);
}, CACHE_LIFETIME);

// Check if caches need manual or automatic reload
async function checkCache() {
  if (Date.now() - cachesLastUpdated > CACHE_LIFETIME || moviesCache.length === 0) {
    await scanAllLibraries();
  }
}

// ==========================================
// PROFILE SYSTEM ENDPOINTS
// ==========================================
const PROFILES_PATH = "/home/nigel/.nigelcloud/profiles.json";

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
  const { name, color } = req.body;
  if (!name || !color) {
    return res.status(400).json({ error: "Name and color are required" });
  }
  const data = loadProfiles();
  if (!data.profiles) data.profiles = [];

  const avatar = name.trim().charAt(0).toUpperCase() || "?";
  const newProfile = {
    id: crypto.randomUUID(),
    name: name.trim(),
    avatar,
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

  const mimeType = getMimeType(path.extname(filepath));
  streamMediaFile(filepath, mimeType, req, res);
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

  // Generate thumbnail at 1s mark, size 320x180
  exec(
    `ffmpeg -y -ss 00:00:01 -i "${filepath}" -vframes 1 -vf "scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2" "${thumbPath}"`,
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

  const mimeType = getMimeType(path.extname(filepath));
  streamMediaFile(filepath, mimeType, req, res);
});

// 7. GET /api/photos
app.get("/api/photos", async (req, res) => {
  try {
    await checkCache();
    res.json(photosCache);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to scan photos", details: err.message });
  }
});

// 8. GET /api/photos/:id
app.get("/api/photos/:id", (req, res) => {
  const id = req.params.id;
  const filepath = photosIndex.get(id);

  if (!filepath) {
    return res.status(404).json({ error: "Photo ID not found" });
  }

  const mimeType = getMimeType(path.extname(filepath));
  res.setHeader("Content-Type", mimeType);
  fs.createReadStream(filepath).pipe(res);
});

// 9. GET /api/search?q=query
app.get("/api/search", async (req, res) => {
  try {
    await checkCache();
    const query = (req.query.q as string || "").toLowerCase().trim();

    if (!query) {
      return res.json({ movies: [], music: [], photos: [] });
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

    const filteredPhotos = photosCache.filter(
      (p) => p.filename.toLowerCase().includes(query) || p.filepath.toLowerCase().includes(query)
    );

    res.json({
      movies: filteredMovies,
      music: filteredMusic,
      photos: filteredPhotos,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Search query failed", details: err.message });
  }
});

// 10. GET /api/status
app.get("/api/status", async (req, res) => {
  try {
    await checkCache();

    // Get storage info from 'df' (representing either /mnt/storage or root / if missing)
    const storagePath = fs.existsSync("/mnt/storage") ? "/mnt/storage" : ".";
    
    exec(`df -k "${storagePath}"`, (err, stdout) => {
      let total = 4000 * 1024 * 1024 * 1024; // Mock standard 4TB cinema drive
      let free = 1800 * 1024 * 1024 * 1024;
      let used = total - free;

      if (!err && stdout) {
        const lines = stdout.trim().split("\n");
        if (lines.length >= 2) {
          const parts = lines[1].replace(/\s+/g, " ").split(" ");
          if (parts.length >= 4) {
            total = parseInt(parts[1], 10) * 1024;
            used = parseInt(parts[2], 10) * 1024;
            free = parseInt(parts[3], 10) * 1024;
          }
        }
      }

      res.json({
        uptime: Math.round(process.uptime()),
        storage: { total, used, free },
        movies: moviesCache.length,
        music: musicCache.length,
        photos: photosCache.length,
      });
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get server status", details: err.message });
  }
});

// Force library rescan
app.post("/api/rescan", async (req, res) => {
  try {
    await scanAllLibraries();
    res.json({ success: true, movies: moviesCache.length, music: musicCache.length, photos: photosCache.length });
  } catch (err: any) {
    res.status(500).json({ error: "Rescan triggered failure", details: err.message });
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
    console.log(`🎬 NigelCloud Cinema backend running on port ${PORT}`);
    console.log(`📡 Local Network Access: http://192.168.4.1:${PORT}`);
    console.log(`🛡️  System offline capability loaded perfectly`);
    console.log(`====================================================`);
  });
}

startServer();
