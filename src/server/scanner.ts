import path from "path";
import fs from "fs";
import crypto from "crypto";
import { execFile } from "child_process";
import { Movie, Track } from "../types";
import { resolveHome } from "./auth";
import {
  moviesCache,
  musicCache,
  moviesIndex,
  musicIndex,
  playlistCache,
  getPathsConfig,
  ensureDirs,
  savePersistentCache,
  repopulateShowsFoldersIndex,
  setMoviesCache,
  setMusicCache,
  setCachesLastUpdated,
  setHasPerformedInitialScan,
  hasPerformedInitialScan,
  cachesLastUpdated,
  CACHE_LIFETIME,
  parsePathsEnv,
} from "./state";
import {
  findNfoFile,
  parseNfo,
  findArtwork,
  parseTvShowNfo,
  parseSeasonEpisode,
  cleanFilenameTitle,
  extractShowTitleFromFilename,
} from "../nfoReader";
import { cleanArtistName, cleanTrackTitle } from "../utils";
import { loadProfiles, saveProfiles } from "./routes/profiles";
import {
  generateRecommendationsForProfile,
  recomputeTasteProfile,
} from "../recommendationEngine";

interface FfprobeTask {
  filepath: string;
  resolve: (duration: number) => void;
}

const ffprobeQueue: FfprobeTask[] = [];
let activeFfprobes = 0;

function processFfprobeQueue() {
  const { MAX_CONCURRENT_FFPROBES } = getPathsConfig();
  if (activeFfprobes >= MAX_CONCURRENT_FFPROBES || ffprobeQueue.length === 0) {
    return;
  }

  const task = ffprobeQueue.shift();
  if (!task) return;

  activeFfprobes++;
  execFile(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", task.filepath],
    (err, stdout) => {
      activeFfprobes--;

      let duration = 120;
      if (!err && stdout) {
        const parsed = parseFloat(stdout.trim());
        if (!isNaN(parsed)) {
          duration = Math.round(parsed);
        }
      }
      task.resolve(duration);
      processFfprobeQueue();
    }
  );

  processFfprobeQueue();
}

export function getDuration(filepath: string): Promise<number> {
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

export function isPathExcluded(targetPath: string, excludedPaths: string[]): boolean {
  if (!targetPath || !excludedPaths || excludedPaths.length === 0) return false;
  const resolvedTarget = path.resolve(resolveHome(targetPath));
  for (const rawExcluded of excludedPaths) {
    if (!rawExcluded || !rawExcluded.trim()) continue;
    const resolvedExcluded = path.resolve(resolveHome(rawExcluded.trim()));
    if (resolvedTarget === resolvedExcluded || resolvedTarget.startsWith(resolvedExcluded + path.sep)) {
      return true;
    }
  }
  return false;
}

export function getFilesRecursively(dir: string, allowedExtensions: string[], excludedPaths: string[] = []): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const resolvedDir = path.resolve(dir);
  if (isPathExcluded(resolvedDir, excludedPaths)) {
    return results;
  }

  try {
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      if (file.startsWith(".")) return;
      const fullPath = path.join(dir, file);
      const resolvedFullPath = path.resolve(fullPath);

      if (isPathExcluded(resolvedFullPath, excludedPaths)) {
        return;
      }

      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFilesRecursively(fullPath, allowedExtensions, excludedPaths));
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

export function parseVideoPath(relativePath: string, filename: string, title: string) {
  const normalizedPath = relativePath.replace(/\\/g, "/");
  const parts = normalizedPath.split("/").filter((p) => p.length > 0);

  let category = "Other";
  let subcategory = "";
  let type: "movie" | "episode" | "video" = "video";
  let showName = "";
  let seasonName = "";
  let episodeTitle = title;

  const fnShowTitle = extractShowTitleFromFilename(filename);
  const epPattern = parseSeasonEpisode(filename);
  const hasEpisodePattern = epPattern.season !== null || epPattern.episode !== null;

  if (parts.length > 0) {
    const rootDir = parts[0];
    const rootLower = rootDir.toLowerCase();

    // Generic category formatting from root directory folder name
    category = rootDir
      .replace(/_/g, " ")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();

    // Check for TV Show / Series hierarchy
    const isExplicitTvRoot = /^(tv\s*shows?|tv\s*series|series|shows|anime)$/i.test(rootLower);

    let seasonIndex = -1;
    for (let i = 0; i < parts.length; i++) {
      if (/^(season|s|series|specials?)\s*\d+/i.test(parts[i])) {
        seasonIndex = i;
        break;
      }
    }

    if (seasonIndex !== -1) {
      type = "episode";
      category = "Tv Shows";
      seasonName = parts[seasonIndex];
      if (seasonIndex > 0) {
        showName = parts[seasonIndex - 1];
      }
      const showLower = showName.toLowerCase();
      if (/^(tv\s*shows?|tv\s*series|series|shows|anime)$/i.test(showLower) && seasonIndex > 1) {
        showName = parts[seasonIndex - 2];
      }
    } else if (isExplicitTvRoot) {
      type = "episode";
      category = "Tv Shows";
      if (parts.length >= 3) {
        showName = parts[1];
        seasonName = "Season 1";
      } else if (parts.length === 2) {
        showName = parts[0];
        seasonName = "Season 1";
      }
    } else if (hasEpisodePattern) {
      // Filename indicates an episode (e.g. S01E01)
      type = "episode";
      category = "Tv Shows";
      if (parts.length >= 2) {
        const parentFolder = parts[parts.length - 2];
        if (!/^(movies?|films?|cinema|videos|media|other)$/i.test(parentFolder.toLowerCase())) {
          showName = parentFolder;
        }
      }
      if (!showName && fnShowTitle) {
        showName = fnShowTitle;
      }
    } else if (/^(movies?|films?|cinema)$/i.test(rootLower)) {
      type = "movie";
      category = "Movies";
    } else if (/^(cartoons?|animation)$/i.test(rootLower)) {
      category = "Cartoons";
      type = "movie";
    } else if (rootLower.includes("marvel")) {
      category = "Marvel Movies";
      type = "movie";
    } else {
      type = "video";
      if (parts.length > 1) {
        subcategory = parts[1];
      }
    }
  }

  // If still no showName but we extracted one from filename
  if (!showName && fnShowTitle) {
    showName = fnShowTitle;
    type = "episode";
    category = "Tv Shows";
  }

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
    if (epPattern.season !== null) {
      seasonName = `Season ${epPattern.season}`;
    } else {
      seasonName = "Season 1";
    }
  }

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

export async function scanAllLibraries() {
  const startTime = Date.now();
  console.log("Scanning libraries...");
  ensureDirs();

  playlistCache.clear();

  const existingMoviesMap = new Map<string, Movie>();
  moviesCache.forEach((m) => {
    if (m && m.filepath) existingMoviesMap.set(m.filepath, m);
  });

  const existingMusicMap = new Map<string, Track>();
  musicCache.forEach((m) => {
    if (m && m.filepath) existingMusicMap.set(m.filepath, m);
  });

  const scannedMoviesIndex = new Map<string, string>();
  const scannedMusicIndex = new Map<string, string>();

  const resolvedExcludedPaths = parsePathsEnv(process.env.EXCLUDE_PATHS, "");
  const videoExts = [".mp4", ".mkv", ".avi", ".mov", ".m4v", ".webm"];
  const videoScannedFiles: ScannedFile[] = [];

  const resolvedMoviesPaths = parsePathsEnv(process.env.MOVIES_PATHS, process.env.VIDEOS_PATH || "media/Videos");
  resolvedMoviesPaths.forEach((dir) => {
    const resolved = resolveHome(dir);
    if (fs.existsSync(resolved)) {
      const files = getFilesRecursively(resolved, videoExts, resolvedExcludedPaths);
      files.forEach((f) => {
        videoScannedFiles.push({ file: f, baseDir: resolved, category: "movie" });
      });
    }
  });

  const resolvedTvShowsPaths = parsePathsEnv(process.env.TV_SHOWS_PATHS, process.env.VIDEOS_PATH || "media/Videos");
  resolvedTvShowsPaths.forEach((dir) => {
    const resolved = resolveHome(dir);
    if (fs.existsSync(resolved)) {
      const files = getFilesRecursively(resolved, videoExts, resolvedExcludedPaths);
      files.forEach((f) => {
        videoScannedFiles.push({ file: f, baseDir: resolved, category: "episode" });
      });
    }
  });

  const resolvedOtherVideosPaths = parsePathsEnv(process.env.OTHER_VIDEOS_PATHS, process.env.VIDEOS_PATH || "media/Videos");
  resolvedOtherVideosPaths.forEach((dir) => {
    const resolved = resolveHome(dir);
    if (fs.existsSync(resolved)) {
      const files = getFilesRecursively(resolved, videoExts, resolvedExcludedPaths);
      files.forEach((f) => {
        videoScannedFiles.push({ file: f, baseDir: resolved, category: "video" });
      });
    }
  });

  const envMusicVideos = process.env.MUSIC_VIDEOS_PATH;
  if (envMusicVideos && fs.existsSync(envMusicVideos)) {
    const files = getFilesRecursively(envMusicVideos, videoExts, resolvedExcludedPaths);
    files.forEach((f) => {
      videoScannedFiles.push({ file: f, baseDir: envMusicVideos, category: "video" });
    });
  }

  const uniqueVideoFilesMap = new Map<string, ScannedFile>();
  videoScannedFiles.forEach((item) => {
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

      const id = crypto.createHash("md5").update(file).digest("hex");
      scannedMoviesIndex.set(id, file);

      const stat = fs.statSync(file);

      const nfoPath = findNfoFile(file);
      let nfoStat: fs.Stats | null = null;
      if (nfoPath) {
        try {
          nfoStat = fs.statSync(nfoPath);
        } catch (_) {}
      }
      const nfoMtime = nfoStat ? nfoStat.mtime.toISOString() : null;

      const cachedItem = existingMoviesMap.get(relativePath);
      if (cachedItem && cachedItem.size === stat.size && cachedItem.nfoMtime === nfoMtime) {
        scannedMoviesIndex.set(cachedItem.id, file);

        const artwork = findArtwork(file);
        cachedItem.hasPoster = !!artwork.poster;
        cachedItem.hasFanart = !!artwork.fanart;
        cachedItem.hasThumb = !!artwork.thumb;
        cachedItem.poster = artwork.poster ? `/api/artwork/${cachedItem.id}/poster` : null;
        cachedItem.fanart = artwork.fanart ? `/api/artwork/${cachedItem.id}/fanart` : null;
        cachedItem.thumb = artwork.thumb ? `/api/artwork/${cachedItem.id}/thumb` : `/api/artwork/${cachedItem.id}/thumb`;
        cachedItem.thumbnail = `/api/artwork/${cachedItem.id}/thumb`;
        if (cachedItem.type === "episode" || cachedItem.category === "Tv Shows") {
          cachedItem.showPoster = `/api/artwork/${cachedItem.id}/showPoster`;
          cachedItem.showFanart = `/api/artwork/${cachedItem.id}/showFanart`;
        }

        return cachedItem;
      }

      let nfo = nfoPath ? parseNfo(nfoPath) : null;
      let title = "";
      if (nfo && nfo.title) {
        title = nfo.title;
      } else {
        title = cleanFilenameTitle(filename, ext);
      }

      let duration = 120;
      if (nfo && nfo.runtime && nfo.runtime > 0) {
        duration = nfo.runtime;
      } else {
        duration = await getDuration(file);
      }

      let size = stat.size;
      const parsedMeta = parseVideoPath(relativePath, filename, title);

      const dirName = path.dirname(file);
      const baseName = path.basename(file, ext);
      const hasSubtitles =
        fs.existsSync(path.join(dirName, baseName + ".srt")) ||
        fs.existsSync(path.join(dirName, baseName + ".SRT")) ||
        fs.existsSync(path.join(dirName, baseName + ".vtt")) ||
        fs.existsSync(path.join(dirName, baseName + ".VTT"));

      const addedDate =
        stat.birthtime && stat.birthtime instanceof Date && !isNaN(stat.birthtime.getTime()) && stat.birthtime.getTime() > 0
          ? stat.birthtime
          : stat.mtime || new Date();

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

      const artwork = findArtwork(file);
      const poster = artwork.poster ? `/api/artwork/${id}/poster` : null;
      const fanart = artwork.fanart ? `/api/artwork/${id}/fanart` : null;
      const thumb = artwork.thumb ? `/api/artwork/${id}/thumb` : `/api/artwork/${id}/thumb`;

      const movieItem: Movie = {
        id,
        filename,
        filepath: relativePath,
        size,
        extension: ext,
        added: addedDate.toISOString(),
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
        poster,
        fanart,
        thumb,
        hasPoster: !!artwork.poster,
        hasFanart: !!artwork.fanart,
        hasThumb: !!artwork.thumb,
        type,
        showTitle: showTitle || parsedMeta.showName || undefined,
        showPoster: isTvShow ? `/api/artwork/${id}/showPoster` : null,
        showFanart: isTvShow ? `/api/artwork/${id}/showFanart` : null,
        season,
        episode,
        episodeTitle,
        airDate,
        showPlot,
        showYear,
        showRating,
        showGenres,
        showStudio,
        metadataSource: nfo ? "nfo" : "filename",
        hasRichMetadata: !!nfo,
        category,
        subcategory: parsedMeta.subcategory,
        showName: parsedMeta.showName || showTitle || undefined,
        seasonName: parsedMeta.seasonName,
        duration,
        hasSubtitles,
        thumbnail: `/api/artwork/${id}/thumb`,
        nfoMtime: nfoMtime || undefined,
      };

      return movieItem;
    } catch (err: any) {
      console.error(`[Scan] Failed to scan movie file ${file}:`, err.message || err);
      return null;
    }
  });

  const resolvedMovies = await Promise.all(moviePromises);
  const finalMovies = resolvedMovies.filter((item): item is Movie => item !== null);
  setMoviesCache(finalMovies);
  moviesIndex.clear();
  scannedMoviesIndex.forEach((filepath, id) => moviesIndex.set(id, filepath));
  repopulateShowsFoldersIndex();

  // 2. Scan Music
  const musicExts = [".mp3", ".flac", ".m4a", ".wav", ".ogg", ".aac"];
  const musicScannedFiles: ScannedFile[] = [];
  const resolvedMusicPaths = parsePathsEnv(process.env.MUSIC_PATHS, process.env.MUSIC_PATH || "media/Music");

  resolvedMusicPaths.forEach((dir) => {
    const resolved = resolveHome(dir);
    if (fs.existsSync(resolved)) {
      const files = getFilesRecursively(resolved, musicExts, resolvedExcludedPaths);
      files.forEach((f) => {
        musicScannedFiles.push({ file: f, baseDir: resolved, category: "music" });
      });
    }
  });

  const uniqueMusicFilesMap = new Map<string, ScannedFile>();
  musicScannedFiles.forEach((item) => {
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
      const rawBase = path.basename(file, ext);

      const id = crypto.createHash("md5").update(file).digest("hex");
      scannedMusicIndex.set(id, file);

      const stat = fs.statSync(file);
      let duration = 120;

      const cachedItem = existingMusicMap.get(relativePath);
      if (cachedItem && cachedItem.size === stat.size) {
        duration = cachedItem.duration;
      } else {
        duration = await getDuration(file);
      }

      let rawTitle = rawBase.replace(/_/g, " ").trim();
      let cleanTitle = cleanTrackTitle(rawTitle);

      let artist = "Unknown Artist";
      let title = cleanTitle;
      let album = "Unknown Album";

      if (cleanTitle.includes(" - ")) {
        const titleParts = cleanTitle.split(/\s+-\s+/);
        if (titleParts.length >= 2) {
          artist = cleanArtistName(titleParts[0]);
          title = cleanTrackTitle(titleParts.slice(1).join(" - "));
        }
      }

      const parts = relativePath.split(path.sep);
      if (artist === "Unknown Artist" || !artist) {
        if (parts.length >= 3) {
          artist = cleanArtistName(parts[parts.length - 3]);
          album = parts[parts.length - 2];
        } else if (parts.length === 2) {
          artist = cleanArtistName(parts[0]);
          if (parts[0].includes(" - ")) {
            const folderParts = parts[0].split(/\s+-\s+/);
            album = folderParts.slice(1).join(" - ").replace(/[\(\[]\s*(18\d\d|19\d\d|20\d\d)\s*[\)\]]/g, "").trim();
          } else {
            album = "Single";
          }
        }
      }

      if (album === "Unknown Album") {
        if (parts.length >= 3) {
          album = parts[parts.length - 2];
        } else if (parts.length === 2) {
          album = parts[0].includes(" - ") ? parts[0].split(/\s+-\s+/).slice(1).join(" - ").trim() : "Single";
        }
      }

      artist = cleanArtistName(artist);
      title = cleanTrackTitle(title);

      const addedDate =
        stat.birthtime && stat.birthtime instanceof Date && !isNaN(stat.birthtime.getTime()) && stat.birthtime.getTime() > 0
          ? stat.birthtime
          : stat.mtime || new Date();

      const trackItem: Track = {
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

      return trackItem;
    } catch (err: any) {
      console.error(`[Scan] Failed to scan music track ${file}:`, err.message || err);
      return null;
    }
  });

  const resolvedMusic = await Promise.all(musicPromises);
  const finalMusic = resolvedMusic.filter((item): item is Track => item !== null);
  setMusicCache(finalMusic);
  musicIndex.clear();
  scannedMusicIndex.forEach((filepath, id) => musicIndex.set(id, filepath));

  setCachesLastUpdated(Date.now());
  setHasPerformedInitialScan(true);

  savePersistentCache();

  const durationMs = Date.now() - startTime;
  const movies = finalMovies.filter((m) => m.type === "movie" || m.type === "video");
  const episodes = finalMovies.filter((m) => m.type === "episode");
  const moviesWithNfo = movies.filter((m) => m.hasRichMetadata).length;
  const moviesWithPoster = movies.filter((m) => m.hasPoster).length;
  const distinctShows = new Set(episodes.map((e) => e.showTitle).filter(Boolean)).size;

  console.log(
    `Scan completed in ${durationMs}ms: ${movies.length} movies (${moviesWithNfo} with rich NFO metadata, ${moviesWithPoster} with posters), ${episodes.length} TV episodes across ${distinctShows} shows`
  );

  try {
    const profileData = loadProfiles();
    const profilesList = profileData.profiles || [];
    if (profilesList.length > 0) {
      profilesList.forEach((p: any) => {
        p.tasteProfile = recomputeTasteProfile(p, finalMovies);
        p.cachedRecommendations = generateRecommendationsForProfile(p, profilesList, finalMovies);
      });
      saveProfiles(profileData);
      console.log(`[Taste] Updated recommendation caches for ${profilesList.length} profiles after library scan.`);
    }
  } catch (err) {
    console.error("Error refreshing profile recommendations after scan:", err);
  }
}

let scanInProgress: Promise<void> | null = null;

export async function triggerScan(): Promise<void> {
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

export async function checkCache() {
  if (hasPerformedInitialScan && (moviesCache.length > 0 || musicCache.length > 0)) {
    if (Date.now() - cachesLastUpdated > CACHE_LIFETIME) {
      console.log("[Cache] Cache is stale, triggering background rescan without blocking user response.");
      triggerScan().catch(console.error);
    }
    return;
  }

  console.log("[Cache] No cache data found in memory or cache is empty. Performing a blocking initial scan...");
  await triggerScan();
}
