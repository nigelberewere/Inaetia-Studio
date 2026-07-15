import fs from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";

export interface MovieMetadata {
  title: string;
  originalTitle: string | null;
  year: number | null;
  rating: number | null;
  votes: number | null;
  mpaa: string | null;
  runtime: number | null; // seconds
  plot: string | null;
  tagline: string | null;
  genres: string[];
  studio: string | null;
  director: string | null;
  actors: Array<{ name: string; role: string }>;
  trailer: string | null;
  aired?: string | null;
  season?: number | null;
  episode?: number | null;
}

export interface TvShowMetadata {
  title: string;
  year: number | null;
  rating: number | null;
  plot: string | null;
  genres: string[];
  studio: string | null;
}

export function parseTvShowNfo(nfoPath: string): TvShowMetadata | null {
  try {
    if (!fs.existsSync(nfoPath)) return null;
    const content = fs.readFileSync(nfoPath, "utf8");
    if (!content || content.trim() === "") return null;
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: true,
      trimValues: true,
    });
    const parsed = parser.parse(content);
    if (!parsed || !parsed.tvshow) return null;
    const root = parsed.tvshow;
    
    const genres: string[] = [];
    if (root.genre) {
      getAsArray(root.genre).forEach((g: any) => {
        if (g) genres.push(String(g).trim());
      });
    }

    return {
      title: root.title ? String(root.title).trim() : "",
      year: root.year ? parseInt(root.year, 10) || null : null,
      rating: root.rating ? parseFloat(root.rating) || null : null,
      plot: root.plot ? String(root.plot).trim() : null,
      genres,
      studio: root.studio ? String(root.studio).trim() : null,
    };
  } catch (err) {
    console.error(`Error parsing tvshow.nfo at ${nfoPath}:`, err);
    return null;
  }
}

export function parseSeasonEpisode(filename: string): { season: number | null; episode: number | null } {
  // S01E02 or s1e2
  const sPattern = filename.match(/s(\d+)e(\d+)/i);
  if (sPattern) {
    return { season: parseInt(sPattern[1], 10), episode: parseInt(sPattern[2], 10) };
  }
  // 1x02 or 01x02
  const xPattern = filename.match(/(\d+)x(\d+)/i);
  if (xPattern) {
    return { season: parseInt(xPattern[1], 10), episode: parseInt(xPattern[2], 10) };
  }
  // Season 1 Episode 2
  const textPattern = filename.match(/season\s*(\d+)\s*episode\s*(\d+)/i);
  if (textPattern) {
    return { season: parseInt(textPattern[1], 10), episode: parseInt(textPattern[2], 10) };
  }
  return { season: null, episode: null };
}

export interface ArtworkPaths {
  poster: string | null;
  fanart: string | null;
  thumb: string | null;
  banner: string | null;
  logo: string | null;
}

// Simple helper to normalize things to array
function getAsArray(val: any): any[] {
  if (val === undefined || val === null) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

/**
 * Given a video file path, find its NFO file
 */
export function findNfoFile(videoFilePath: string): string | null {
  try {
    const dir = path.dirname(videoFilePath);
    const ext = path.extname(videoFilePath);
    const baseName = path.basename(videoFilePath, ext);

    // 1. Same directory, same name but .nfo extension
    const sameNameNfo = path.join(dir, baseName + ".nfo");
    if (fs.existsSync(sameNameNfo)) return sameNameNfo;

    // 2. Same directory, named "movie.nfo"
    const movieNfo = path.join(dir, "movie.nfo");
    if (fs.existsSync(movieNfo)) return movieNfo;

    // 3. Same directory, named "tvshow.nfo"
    const tvshowNfo = path.join(dir, "tvshow.nfo");
    if (fs.existsSync(tvshowNfo)) return tvshowNfo;

    // 4. Parent directory, named "movie.nfo" or "tvshow.nfo"
    const parentDir = path.dirname(dir);
    if (parentDir && parentDir !== dir) {
      const parentMovieNfo = path.join(parentDir, "movie.nfo");
      if (fs.existsSync(parentMovieNfo)) return parentMovieNfo;

      const parentTvshowNfo = path.join(parentDir, "tvshow.nfo");
      if (fs.existsSync(parentTvshowNfo)) return parentTvshowNfo;
    }
  } catch (err) {
    console.error(`Error finding NFO file for ${videoFilePath}:`, err);
  }
  return null;
}

/**
 * Parse NFO XML file
 */
export function parseNfo(nfoPath: string): MovieMetadata | null {
  try {
    if (!fs.existsSync(nfoPath)) return null;
    const content = fs.readFileSync(nfoPath, "utf8");
    if (!content || content.trim() === "") return null;

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseTagValue: true,
      trimValues: true,
    });

    const parsed = parser.parse(content);
    if (!parsed) return null;

    // The root could be <movie>, <tvshow>, or <episodedetails>
    const root = parsed.movie || parsed.tvshow || parsed.episodedetails;
    if (!root) return null;

    // Clean genres
    const genres: string[] = [];
    if (root.genre) {
      getAsArray(root.genre).forEach((g: any) => {
        if (g) genres.push(String(g).trim());
      });
    }

    // Clean actors
    const actors: Array<{ name: string; role: string }> = [];
    if (root.actor) {
      getAsArray(root.actor).forEach((act: any) => {
        if (act && act.name) {
          actors.push({
            name: String(act.name).trim(),
            role: act.role ? String(act.role).trim() : "",
          });
        }
      });
    }

    // Parse runtime and convert to seconds (NFO runtime is usually in minutes)
    let runtimeSeconds: number | null = null;
    if (root.runtime) {
      const parsedRuntime = parseInt(root.runtime, 10);
      if (!isNaN(parsedRuntime)) {
        runtimeSeconds = parsedRuntime < 1000 ? parsedRuntime * 60 : parsedRuntime;
      }
    }

    // Format title
    const title = root.title ? String(root.title).trim() : "";

    return {
      title,
      originalTitle: root.originaltitle ? String(root.originaltitle).trim() : null,
      year: root.year ? parseInt(root.year, 10) || null : null,
      rating: root.rating ? parseFloat(root.rating) || null : null,
      votes: root.votes ? parseInt(root.votes, 10) || null : null,
      mpaa: root.mpaa ? String(root.mpaa).trim() : null,
      runtime: runtimeSeconds,
      plot: root.plot ? String(root.plot).trim() : null,
      tagline: root.tagline ? String(root.tagline).trim() : null,
      genres,
      studio: root.studio ? String(root.studio).trim() : null,
      director: root.director ? String(root.director).trim() : null,
      actors,
      trailer: root.trailer ? String(root.trailer).trim() : null,
      aired: root.aired ? String(root.aired).trim() : null,
      season: root.season ? parseInt(root.season, 10) || null : null,
      episode: root.episode ? parseInt(root.episode, 10) || null : null,
    };
  } catch (err) {
    console.error(`Error parsing NFO file ${nfoPath}:`, err);
    return null;
  }
}

/**
 * Check if file exists (case-insensitive) and return correct case path
 */
function fileExistsCaseInsensitive(dir: string, base: string, exts: string[]): string | null {
  try {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    const baseLower = base.toLowerCase();
    const extsLower = exts.map((e) => e.toLowerCase());

    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      if (!extsLower.includes(ext)) continue;
      const name = path.basename(f, path.extname(f)).toLowerCase();
      if (name === baseLower) {
        return path.join(dir, f);
      }
    }
  } catch (err) {
    console.error("Error doing case-insensitive file existence check:", err);
  }
  return null;
}

/**
 * Given video path, find all artwork files
 */
export function findArtwork(videoFilePath: string): ArtworkPaths {
  const result: ArtworkPaths = {
    poster: null,
    fanart: null,
    thumb: null,
    banner: null,
    logo: null,
  };

  try {
    const dir = path.dirname(videoFilePath);
    const ext = path.extname(videoFilePath);
    const videoBase = path.basename(videoFilePath, ext);
    const exts = [".jpg", ".jpeg", ".png", ".webp"];

    // Check if the directory is a library root directory where multiple loose media files live.
    // If it is, we should not match generic poster/folder/fanart files as they belong to the library parent, not the specific file.
    const envVideos = process.env.VIDEOS_PATH ? path.resolve(process.env.VIDEOS_PATH).toLowerCase() : "";
    const envMusic = process.env.MUSIC_PATH ? path.resolve(process.env.MUSIC_PATH).toLowerCase() : "";
    const resolvedDir = path.resolve(dir).toLowerCase();
    const dirNameLower = path.basename(dir).toLowerCase();

    const isLibraryRoot = resolvedDir === envVideos ||
                          resolvedDir === envMusic ||
                          dirNameLower === "movies" ||
                          dirNameLower === "videos" ||
                          dirNameLower === "tv shows" ||
                          dirNameLower === "tv series" ||
                          dirNameLower === "tvshows" ||
                          dirNameLower === "cartoons" ||
                          dirNameLower === "marvel movies" ||
                          dirNameLower === "marvel universe" ||
                          dirNameLower === "music" ||
                          dirNameLower === "music videos" ||
                          dirNameLower === "pictures";

    // 1. Locate poster
    // E.g. "The Dark Knight-poster.jpg" or "poster.jpg"
    let posterPath = fileExistsCaseInsensitive(dir, videoBase + "-poster", exts);
    if (!posterPath && !isLibraryRoot) {
      posterPath = fileExistsCaseInsensitive(dir, "poster", exts) ||
                   fileExistsCaseInsensitive(dir, "folder", exts);
    }
    
    // 2. Locate fanart
    let fanartPath = fileExistsCaseInsensitive(dir, videoBase + "-fanart", exts);
    if (!fanartPath && !isLibraryRoot) {
      fanartPath = fileExistsCaseInsensitive(dir, "fanart", exts) ||
                   fileExistsCaseInsensitive(dir, "background", exts);
    }

    // 3. Locate thumb
    let thumbPath = fileExistsCaseInsensitive(dir, videoBase + "-thumb", exts);
    if (!thumbPath) {
      thumbPath = fileExistsCaseInsensitive(dir, videoBase, exts);
    }
    if (!thumbPath && !isLibraryRoot) {
      thumbPath = fileExistsCaseInsensitive(dir, "thumb", exts) ||
                  fileExistsCaseInsensitive(dir, "landscape", exts);
    }

    // 4. Locate banner
    let bannerPath = fileExistsCaseInsensitive(dir, videoBase + "-banner", exts);
    if (!bannerPath && !isLibraryRoot) {
      bannerPath = fileExistsCaseInsensitive(dir, "banner", exts);
    }

    // 5. Locate logo / clearlogo
    let logoPath = fileExistsCaseInsensitive(dir, videoBase + "-logo", exts);
    if (!logoPath && !isLibraryRoot) {
      logoPath = fileExistsCaseInsensitive(dir, "logo", exts) ||
                 fileExistsCaseInsensitive(dir, "clearlogo", exts);
    }

    // If not found, and we might be inside a Season XX folder (or episode folder), check the parent (TV show level folder)
    const parentDir = path.dirname(dir);
    const isSeasonFolder = /^(season|s)\s*\d+/i.test(dirNameLower);

    if (isSeasonFolder && parentDir && parentDir !== dir) {
      const parentDirLower = path.basename(parentDir).toLowerCase();
      const isParentRoot = parentDirLower === "tv shows" || parentDirLower === "tv series" || parentDirLower === "tvshows";
      
      if (!isParentRoot) {
        if (!posterPath) {
          posterPath = fileExistsCaseInsensitive(parentDir, "poster", exts) ||
                       fileExistsCaseInsensitive(parentDir, "folder", exts);
        }
        if (!fanartPath) {
          fanartPath = fileExistsCaseInsensitive(parentDir, "fanart", exts) ||
                       fileExistsCaseInsensitive(parentDir, "background", exts);
        }
        if (!bannerPath) {
          bannerPath = fileExistsCaseInsensitive(parentDir, "banner", exts);
        }
        if (!logoPath) {
          logoPath = fileExistsCaseInsensitive(parentDir, "logo", exts) ||
                     fileExistsCaseInsensitive(parentDir, "clearlogo", exts);
        }
      }
    }

    result.poster = posterPath || null;
    result.fanart = fanartPath || null;
    result.thumb = thumbPath || null;
    result.banner = bannerPath || null;
    result.logo = logoPath || null;
  } catch (err) {
    console.error("Error detecting artwork paths:", err);
  }

  return result;
}

export function cleanFilenameTitle(filename: string, ext: string): string {
  let title = path.basename(filename, ext);
  
  // 1. Remove year in parentheses e.g. (2008)
  title = title.replace(/\(\d{4}\)/g, "");
  // 2. Remove brackets e.g. [YTS.MX]
  title = title.replace(/\[[^\]]+\]/g, "");
  // 3. Remove common quality/codec/group tags (case insensitive)
  const tags = [
    /\b1080p\b/i, /\b720p\b/i, /\b2160p\b/i, /\b4k\b/i,
    /\bwebrip\b/i, /\bbluray\b/i, /\bweb-dl\b/i, /\bhdrip\b/i,
    /\bx264\b/i, /\bx265\b/i, /\bhevc\b/i, /\baac\b/i, /\bh264\b/i, /\bh265\b/i,
    /\bshvc\b/i, /\bdts\b/i, /\beztvx?\.to\b/i, /\byts\b/i
  ];
  tags.forEach(tag => {
    title = title.replace(tag, "");
  });

  // 4. Replace dots and underscores with spaces
  title = title.replace(/[._\-]+/g, " ");

  // 5. Trim extra spaces
  title = title.replace(/\s+/g, " ").trim();

  // 6. Title-case helper
  title = title.split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return title || path.basename(filename, ext);
}

