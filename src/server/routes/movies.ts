import express from "express";
import path from "path";
import fs from "fs";
import { execFile, spawn } from "child_process";
import {
  moviesCache,
  moviesIndex,
  getPathsConfig,
  getMimeType,
  TRANSPARENT_GIF,
  isSafariClient,
} from "../state";
import { sanitizeMovieForClient } from "../auth";
import { checkCache } from "../scanner";
import { findArtwork, parseTvShowNfo } from "../../nfoReader";
import { ShowGroup } from "../../types";

const router = express.Router();

let activeRemuxCount = 0;
const MAX_REMUX_STREAMS = 2;

function needsRemux(filepath: string): boolean {
  const ext = path.extname(filepath).toLowerCase();
  const safariCompatible = [".mp4", ".m4v", ".mov"];
  return !safariCompatible.includes(ext);
}

export function streamMediaFile(filepath: string, mimeType: string, req: express.Request, res: express.Response) {
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

    const chunksize = end - start + 1;
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

// GET /api/movies
router.get("/api/movies", async (req, res) => {
  try {
    await checkCache();
    const safeMovies = moviesCache.map(sanitizeMovieForClient);
    res.json(safeMovies);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to scan movies", details: err.message });
  }
});

// GET /api/movies/:id
router.get("/api/movies/:id", async (req, res) => {
  try {
    await checkCache();
    const id = req.params.id;
    const movie = moviesCache.find((m) => m.id === id);
    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }
    res.json(sanitizeMovieForClient(movie));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch movie", details: err.message });
  }
});

// GET /api/stream/:id
router.get("/api/stream/:id", async (req, res) => {
  const id = req.params.id;
  const filepath = moviesIndex.get(id);

  if (!filepath) {
    return res.status(404).json({ error: "Movie ID not found or catalog unindexed" });
  }

  const userAgent = req.headers["user-agent"] || "";

  if (isSafariClient(userAgent) && needsRemux(filepath)) {
    console.log(`[REMUX] Safari client detected for non-native file: ${path.basename(filepath)}`);
    console.log(`[REMUX] Active streams: ${activeRemuxCount}/${MAX_REMUX_STREAMS}`);

    if (activeRemuxCount >= MAX_REMUX_STREAMS) {
      return res.status(503).json({
        error: "Server busy, too many active transcodes. Try again shortly or use direct stream.",
      });
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Transfer-Encoding", "chunked");

    activeRemuxCount++;

    const ffmpegProcess = spawn("ffmpeg", [
      "-i", filepath,
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "frag_keyframe+empty_moov+default_base_moof",
      "-f", "mp4",
      "pipe:1",
    ]);

    ffmpegProcess.stdout.pipe(res);

    let countDecremented = false;
    const decrementCount = () => {
      if (!countDecremented) {
        activeRemuxCount = Math.max(0, activeRemuxCount - 1);
        countDecremented = true;
        console.log(`[REMUX] Stream closed. Active streams: ${activeRemuxCount}/${MAX_REMUX_STREAMS}`);
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

    return;
  }

  const mimeType = getMimeType(path.extname(filepath));
  streamMediaFile(filepath, mimeType, req, res);
});

// GET /api/thumbnail/:id
router.get("/api/thumbnail/:id", (req, res) => {
  const id = req.params.id;
  const filepath = moviesIndex.get(id);

  if (!filepath) {
    res.setHeader("Content-Type", "image/gif");
    return res.end(TRANSPARENT_GIF);
  }

  const { thumbsCacheDir } = getPathsConfig();
  const thumbPath = path.join(thumbsCacheDir, `${id}.jpg`);

  if (fs.existsSync(thumbPath)) {
    res.setHeader("Content-Type", "image/jpeg");
    return fs.createReadStream(thumbPath).pipe(res);
  }

  const movie = moviesCache.find((m) => m.id === id);
  let seekSeconds = 120;
  if (movie && movie.duration) {
    if (movie.duration < 120) {
      seekSeconds = Math.max(1, Math.round(movie.duration * 0.1));
    } else {
      seekSeconds = Math.min(300, Math.round(movie.duration * 0.1));
    }
  }

  execFile(
    "ffmpeg",
    [
      "-y",
      "-ss",
      seekSeconds.toString(),
      "-i",
      filepath,
      "-vframes",
      "1",
      "-vf",
      "scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2",
      thumbPath,
    ],
    (err) => {
      if (err) {
        console.error(`Thumbnail generation failed for ID ${id}:`, err.message);
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

// GET /api/artwork/:id/:type
router.get("/api/artwork/:id/:type", (req, res) => {
  const { id, type } = req.params;
  const filepath = moviesIndex.get(id);

  if (!filepath || !fs.existsSync(filepath)) {
    res.setHeader("Content-Type", "image/gif");
    return res.end(TRANSPARENT_GIF);
  }

  const artwork = findArtwork(filepath);

  const streamImageIfExists = (targetPath: string | null) => {
    if (targetPath && fs.existsSync(targetPath)) {
      const ext = path.extname(targetPath).toLowerCase();
      res.setHeader("Content-Type", getMimeType(ext));
      res.setHeader("Cache-Control", "public, max-age=86400");
      fs.createReadStream(targetPath).pipe(res);
      return true;
    }
    return false;
  };

  if (type === "poster") {
    if (streamImageIfExists(artwork.poster)) return;
    return res.redirect(`/api/thumbnail/${id}`);
  }

  if (type === "fanart") {
    if (streamImageIfExists(artwork.fanart)) return;
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
    return res.redirect(`/api/thumbnail/${id}`);
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

// GET /api/subtitles/:id
router.get("/api/subtitles/:id", (req, res) => {
  const id = req.params.id;
  const filepath = moviesIndex.get(id);

  if (!filepath) {
    return res.status(404).send("Movie file not found");
  }

  const dirName = path.dirname(filepath);
  const ext = path.extname(filepath);
  const baseName = path.basename(filepath, ext);

  const subCandidates = [
    path.join(dirName, baseName + ".vtt"),
    path.join(dirName, baseName + ".VTT"),
    path.join(dirName, baseName + ".srt"),
    path.join(dirName, baseName + ".SRT"),
  ];

  let foundSubPath: string | null = null;
  for (const p of subCandidates) {
    if (fs.existsSync(p)) {
      foundSubPath = p;
      break;
    }
  }

  if (!foundSubPath) {
    return res.status(404).send("Subtitle file not found");
  }

  if (foundSubPath.toLowerCase().endsWith(".vtt")) {
    res.setHeader("Content-Type", "text/vtt; charset=utf-8");
    return fs.createReadStream(foundSubPath).pipe(res);
  }

  try {
    const srtContent = fs.readFileSync(foundSubPath, "utf-8");
    const vttContent = "WEBVTT\n\n" + srtContent.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
    res.setHeader("Content-Type", "text/vtt; charset=utf-8");
    res.send(vttContent);
  } catch (err: any) {
    res.status(500).send("Error converting subtitles");
  }
});

// GET /api/shows
router.get("/api/shows", async (req, res) => {
  await checkCache();
  const episodes = moviesCache.filter((m) => m.type === "episode");

  const showMap = new Map<string, typeof episodes>();
  episodes.forEach((ep) => {
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
    const seasons = new Set(eps.map((e) => e.season).filter((s) => s !== null && s !== undefined));
    const seasonsCount = seasons.size;

    const genresSet = new Set<string>();
    eps.forEach((e) => {
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
      const dir = path.dirname(fileFullPath);
      const parentNfo = path.join(dir, "tvshow.nfo");
      const gpDir = path.dirname(dir);
      const tvShowNfoPath = fs.existsSync(parentNfo) ? parentNfo : (gpDir && gpDir !== dir && fs.existsSync(path.join(gpDir, "tvshow.nfo")) ? path.join(gpDir, "tvshow.nfo") : null);

      if (tvShowNfoPath) {
        const showNfo = parseTvShowNfo(tvShowNfoPath);
        if (showNfo) {
          if (showNfo.plot) plot = showNfo.plot;
          if (showNfo.rating) rating = showNfo.rating;
          if (showNfo.studio) studio = showNfo.studio;
          if (showNfo.year) year = showNfo.year;
          if (showNfo.genres && showNfo.genres.length > 0) {
            showNfo.genres.forEach((g) => genresSet.add(g));
          }
        }
      }
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
      episodes: eps.map(sanitizeMovieForClient),
    };
  });

  showsList.sort((a, b) => a.showTitle.localeCompare(b.showTitle));
  res.json(showsList);
});

// GET /api/library/health
router.get("/api/library/health", (req, res) => {
  const movies = moviesCache.filter((m) => m.type !== "episode");
  const episodes = moviesCache.filter((m) => m.type === "episode");
  const distinctShowsTitles = new Set(episodes.map((e) => e.showTitle).filter(Boolean));

  const totalMovies = movies.length;
  const moviesWithNfoCount = movies.filter((m) => m.hasRichMetadata).length;
  const moviesWithPosterCount = movies.filter((m) => m.hasPoster).length;
  const moviesWithFanartCount = movies.filter((m) => m.hasFanart).length;

  const totalEpisodes = episodes.length;
  const episodesWithNfoCount = episodes.filter((m) => m.hasRichMetadata).length;
  const episodesWithThumbCount = episodes.filter((m) => m.hasThumb).length;

  const totalShows = distinctShowsTitles.size;

  function checkShowNfo(filepath: string): boolean {
    const dir = path.dirname(filepath);
    if (fs.existsSync(path.join(dir, "tvshow.nfo"))) return true;
    const gpDir = path.dirname(dir);
    if (gpDir && gpDir !== dir && fs.existsSync(path.join(gpDir, "tvshow.nfo"))) return true;
    return false;
  }

  const showsWithNfoCount = Array.from(distinctShowsTitles).filter((showTitle) => {
    const showEps = episodes.filter((e) => e.showTitle === showTitle);
    return showEps.some((e) => {
      const fileFullPath = moviesIndex.get(e.id);
      return fileFullPath ? checkShowNfo(fileFullPath) : false;
    });
  }).length;

  const calcPct = (count: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  res.json({
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

    totalMovies,
    moviesWithNfo: calcPct(moviesWithNfoCount, totalMovies),
    moviesWithPoster: calcPct(moviesWithPosterCount, totalMovies),
    moviesWithFanart: calcPct(moviesWithFanartCount, totalMovies),
    totalEpisodes,
    episodesWithNfo: calcPct(episodesWithNfoCount, totalEpisodes),
    episodesWithThumb: calcPct(episodesWithThumbCount, totalEpisodes),
    totalShows,
    showsWithNfo: calcPct(showsWithNfoCount, totalShows),
  });
});

export default router;
