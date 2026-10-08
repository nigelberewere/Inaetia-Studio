import fs from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { sanitizeTitle } from "./utils";

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
  studios?: string[];
  director: string | null;
  directors?: string[];
  writers?: string[];
  actors: Array<{ name: string; role: string }>;
  trailer: string | null;
  set?: string | null;
  tags?: string[];
  aired?: string | null;
  season?: number | null;
  episode?: number | null;
  thumb?: string | null;
  poster?: string | null;
  fanart?: string | null;
}

export interface TvShowMetadata {
  title: string;
  year: number | null;
  rating: number | null;
  plot: string | null;
  genres: string[];
  studio: string | null;
  studios?: string[];
  tags?: string[];
  actors?: Array<{ name: string; role: string }>;
}

// Simple helper to normalize things to array
function getAsArray(val: any): any[] {
  if (val === undefined || val === null) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

// Extract string value from parsed XML tags robustly
function extractStringFromXmlTag(tagValue: any): string | null {
  if (!tagValue) return null;
  if (typeof tagValue === "string") return tagValue.trim();
  if (typeof tagValue === "number") return String(tagValue).trim();
  if (Array.isArray(tagValue)) {
    for (const item of tagValue) {
      const val = extractStringFromXmlTag(item);
      if (val) return val;
    }
  }
  if (typeof tagValue === "object") {
    if (tagValue["#text"] !== undefined) {
      return extractStringFromXmlTag(tagValue["#text"]);
    }
    if (tagValue.text !== undefined) {
      return extractStringFromXmlTag(tagValue.text);
    }
    if (tagValue.name !== undefined) {
      return extractStringFromXmlTag(tagValue.name);
    }
    if (tagValue.title !== undefined) {
      return extractStringFromXmlTag(tagValue.title);
    }
    if (tagValue._ !== undefined) {
      return extractStringFromXmlTag(tagValue._);
    }
  }
  return null;
}

export function safeStringVal(val: any): string | null {
  if (!val) return null;
  const str = extractStringFromXmlTag(val);
  if (str && !str.includes("[object Object]")) {
    const trimmed = str.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

export function extractSetName(root: any): string | null {
  if (!root) return null;
  const checkVal = (v: any): string | null => {
    if (!v) return null;
    if (typeof v === "string") {
      const trimmed = v.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    if (typeof v === "object") {
      if (v.name) {
        const str = extractStringFromXmlTag(v.name);
        if (str) return str;
      }
      return extractStringFromXmlTag(v);
    }
    return null;
  };

  if (root.set) {
    if (Array.isArray(root.set)) {
      for (const item of root.set) {
        const found = checkVal(item);
        if (found) return found;
      }
    } else {
      const found = checkVal(root.set);
      if (found) return found;
    }
  }

  if (root.collection) {
    const found = checkVal(root.collection);
    if (found) return found;
  }

  return null;
}

export function extractTags(root: any): string[] {
  if (!root) return [];
  const tags: string[] = [];
  const seen = new Set<string>();

  const add = (val: any) => {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach(add);
      return;
    }
    const str = extractStringFromXmlTag(val);
    if (str) {
      const parts = str.includes(",") || str.includes(";") ? str.split(/[,;]/) : [str];
      for (const part of parts) {
        const clean = part.trim();
        const norm = clean.toLowerCase();
        if (clean && !seen.has(norm)) {
          seen.add(norm);
          tags.push(clean);
        }
      }
    }
  };

  if (root.tag) add(root.tag);
  if (root.tags) {
    if (root.tags.tag) add(root.tags.tag);
    else add(root.tags);
  }
  if (root.keyword) add(root.keyword);
  if (root.keywords) {
    if (root.keywords.keyword) add(root.keywords.keyword);
    else add(root.keywords);
  }

  return tags;
}

export function extractDirectors(root: any): string[] {
  if (!root) return [];
  const directors: string[] = [];
  const seen = new Set<string>();

  const add = (val: any) => {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach(add);
      return;
    }
    const str = extractStringFromXmlTag(val);
    if (str) {
      const parts = str.includes("/") || str.includes(",") ? str.split(/[/,]/) : [str];
      for (const part of parts) {
        const clean = part.trim();
        const norm = clean.toLowerCase();
        if (clean && !seen.has(norm)) {
          seen.add(norm);
          directors.push(clean);
        }
      }
    }
  };

  if (root.director) add(root.director);
  return directors;
}

export function extractWriters(root: any): string[] {
  if (!root) return [];
  const writers: string[] = [];
  const seen = new Set<string>();

  const add = (val: any) => {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach(add);
      return;
    }
    const str = extractStringFromXmlTag(val);
    if (str) {
      const parts = str.includes("/") || str.includes(",") ? str.split(/[/,]/) : [str];
      for (const part of parts) {
        const clean = part.trim();
        const norm = clean.toLowerCase();
        if (clean && !seen.has(norm)) {
          seen.add(norm);
          writers.push(clean);
        }
      }
    }
  };

  if (root.credits) add(root.credits);
  if (root.writer) add(root.writer);
  return writers;
}

export function extractStudios(root: any): string[] {
  if (!root) return [];
  const studios: string[] = [];
  const seen = new Set<string>();

  const add = (val: any) => {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach(add);
      return;
    }
    const str = extractStringFromXmlTag(val);
    if (str) {
      const parts = str.includes("/") || str.includes(",") ? str.split(/[/,]/) : [str];
      for (const part of parts) {
        const clean = part.trim();
        const norm = clean.toLowerCase();
        if (clean && !seen.has(norm)) {
          seen.add(norm);
          studios.push(clean);
        }
      }
    }
  };

  if (root.studio) add(root.studio);
  return studios;
}

export function extractGenres(root: any): string[] {
  if (!root) return [];
  const genres: string[] = [];
  const seen = new Set<string>();

  const add = (val: any) => {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach(add);
      return;
    }
    const str = extractStringFromXmlTag(val);
    if (str) {
      const parts = str.includes("/") || str.includes(",") ? str.split(/[/,]/) : [str];
      for (const part of parts) {
        const clean = part.trim();
        const norm = clean.toLowerCase();
        if (clean && !seen.has(norm)) {
          seen.add(norm);
          genres.push(clean);
        }
      }
    }
  };

  if (root.genre) add(root.genre);
  return genres;
}

export function extractRatingsAndVotes(root: any): { rating: number | null; votes: number | null } {
  let rating: number | null = null;
  let votes: number | null = null;

  if (root.rating !== undefined && root.rating !== null) {
    const parsed = parseFloat(String(extractStringFromXmlTag(root.rating) || root.rating));
    if (!isNaN(parsed) && parsed > 0) rating = parsed;
  }

  if (root.votes !== undefined && root.votes !== null) {
    const parsed = parseInt(String(extractStringFromXmlTag(root.votes) || root.votes), 10);
    if (!isNaN(parsed) && parsed > 0) votes = parsed;
  }

  // Modern TMM / Kodi <ratings><rating default="true" name="imdb"><value>8.5</value><votes>...</votes></rating></ratings>
  if ((rating === null || votes === null) && root.ratings && root.ratings.rating) {
    const ratingsArr = getAsArray(root.ratings.rating);
    const chosenRating =
      ratingsArr.find((r: any) => r["@_default"] === "true" || r["@_default"] === true) ||
      ratingsArr.find((r: any) => r["@_name"] === "imdb" || r["@_name"] === "themoviedb") ||
      ratingsArr[0];

    if (chosenRating) {
      if (rating === null && chosenRating.value !== undefined) {
        const val = parseFloat(String(extractStringFromXmlTag(chosenRating.value) || chosenRating.value));
        if (!isNaN(val) && val > 0) rating = val;
      }
      if (votes === null && chosenRating.votes !== undefined) {
        const v = parseInt(String(extractStringFromXmlTag(chosenRating.votes) || chosenRating.votes), 10);
        if (!isNaN(v) && v > 0) votes = v;
      }
    }
  }

  return { rating, votes };
}

export function extractYear(root: any): number | null {
  if (root.year !== undefined && root.year !== null) {
    const y = parseInt(String(extractStringFromXmlTag(root.year) || root.year), 10);
    if (!isNaN(y) && y > 1880 && y < 2100) return y;
  }
  if (root.premiered) {
    const p = String(extractStringFromXmlTag(root.premiered) || root.premiered).trim();
    const m = p.match(/^(\d{4})/);
    if (m) {
      const y = parseInt(m[1], 10);
      if (!isNaN(y) && y > 1880 && y < 2100) return y;
    }
  }
  if (root.releasedate) {
    const p = String(extractStringFromXmlTag(root.releasedate) || root.releasedate).trim();
    const m = p.match(/^(\d{4})/);
    if (m) {
      const y = parseInt(m[1], 10);
      if (!isNaN(y) && y > 1880 && y < 2100) return y;
    }
  }
  return null;
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
    
    const genres = extractGenres(root);
    const tags = extractTags(root);
    const studios = extractStudios(root);
    const { rating } = extractRatingsAndVotes(root);
    const year = extractYear(root);

    const actors: Array<{ name: string; role: string }> = [];
    if (root.actor) {
      getAsArray(root.actor).forEach((act: any) => {
        if (act) {
          const name = extractStringFromXmlTag(act.name);
          const role = act.role ? (extractStringFromXmlTag(act.role) || "") : "";
          if (name) actors.push({ name, role });
        }
      });
    }

    return {
      title: root.title ? String(extractStringFromXmlTag(root.title) || root.title).trim() : "",
      year,
      rating,
      plot: root.plot ? String(extractStringFromXmlTag(root.plot) || root.plot).trim() : null,
      genres,
      studio: studios.length > 0 ? studios[0] : (root.studio ? String(extractStringFromXmlTag(root.studio) || root.studio).trim() : null),
      studios,
      tags,
      actors,
    };
  } catch (err) {
    console.error(`Error parsing tvshow.nfo at ${nfoPath}:`, err);
    return null;
  }
}

export function parseSeasonEpisode(filename: string): { season: number | null; episode: number | null } {
  // S01E02 or s1e2 or S01.E02 or S01_E02 or S01-E02
  const sPattern = filename.match(/s(\d+)[\s._-]*e(\d+)/i);
  if (sPattern) {
    return { season: parseInt(sPattern[1], 10), episode: parseInt(sPattern[2], 10) };
  }
  // 1x02 or 01x02
  const xPattern = filename.match(/(\d+)x(\d+)/i);
  if (xPattern) {
    return { season: parseInt(xPattern[1], 10), episode: parseInt(xPattern[2], 10) };
  }
  // Season 1 Episode 2 or Season 01 - Episode 02
  const textPattern = filename.match(/season\s*(\d+)[^\d]*episode\s*(\d+)/i);
  if (textPattern) {
    return { season: parseInt(textPattern[1], 10), episode: parseInt(textPattern[2], 10) };
  }
  // Season 1 - 02 or Season 01 - 02
  const seasonNumPattern = filename.match(/season\s*(\d+)[^\d]+(\d+)/i);
  if (seasonNumPattern) {
    return { season: parseInt(seasonNumPattern[1], 10), episode: parseInt(seasonNumPattern[2], 10) };
  }
  // Episode 2 or Ep 2 or EP.02 (assume season 1 if not specified)
  const epOnlyPattern = filename.match(/(?:^|[^\w])(?:ep|episode|ep\.)\s*(\d+)/i);
  if (epOnlyPattern) {
    return { season: 1, episode: parseInt(epOnlyPattern[1], 10) };
  }
  return { season: null, episode: null };
}

export function extractShowTitleFromFilename(filename: string): string | null {
  if (!filename) return null;
  const ext = path.extname(filename);
  const baseName = path.basename(filename, ext);

  // Match Show Name before S01E02 / 1x02 / Season 1 / Ep 1
  const match = baseName.match(/^(.+?)\s*[-_.]?\s*(?:s\d+[\s._-]*e\d+|\d+x\d+|season\s*\d+|episode\s*\d+|ep\s*\d+)/i);
  if (match && match[1]) {
    const raw = match[1].replace(/[._]/g, " ").trim();
    if (raw.length > 1 && !/^(season|episode|ep|part)\b/i.test(raw)) {
      return raw;
    }
  }
  return null;
}

export interface ArtworkPaths {
  poster: string | null;
  fanart: string | null;
  thumb: string | null;
  banner: string | null;
  logo: string | null;
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
 * Parse NFO XML string directly
 */
export function parseNfoFromString(content: string): MovieMetadata | null {
  try {
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

    const genres = extractGenres(root);
    const tags = extractTags(root);
    const set = extractSetName(root);
    const directors = extractDirectors(root);
    const writers = extractWriters(root);
    const studios = extractStudios(root);
    const { rating, votes } = extractRatingsAndVotes(root);
    const year = extractYear(root);

    // Clean actors
    const actors: Array<{ name: string; role: string }> = [];
    if (root.actor) {
      getAsArray(root.actor).forEach((act: any) => {
        if (act) {
          const name = extractStringFromXmlTag(act.name);
          const role = act.role ? (extractStringFromXmlTag(act.role) || "") : "";
          if (name) {
            actors.push({
              name,
              role,
            });
          }
        }
      });
    }

    // Parse runtime and convert to seconds (NFO runtime is usually in minutes)
    let runtimeSeconds: number | null = null;
    if (root.runtime) {
      const parsedRuntime = parseInt(String(extractStringFromXmlTag(root.runtime) || root.runtime), 10);
      if (!isNaN(parsedRuntime)) {
        runtimeSeconds = parsedRuntime < 1000 ? parsedRuntime * 60 : parsedRuntime;
      }
    }

    // Format title
    const title = root.title ? String(extractStringFromXmlTag(root.title) || root.title).trim() : "";

    // Parse artwork fields from XML
    let thumb: string | null = null;
    let poster: string | null = null;
    let fanart: string | null = null;

    if (root.thumb) {
      thumb = extractStringFromXmlTag(root.thumb);
    }
    if (root.poster) {
      poster = extractStringFromXmlTag(root.poster);
    }
    if (root.fanart) {
      if (root.fanart.thumb) {
        fanart = extractStringFromXmlTag(root.fanart.thumb);
      } else {
        fanart = extractStringFromXmlTag(root.fanart);
      }
    }
    if (root.art) {
      if (root.art.poster && !poster) {
        poster = extractStringFromXmlTag(root.art.poster);
      }
      if (root.art.fanart && !fanart) {
        fanart = extractStringFromXmlTag(root.art.fanart);
      }
      if (root.art.thumb && !thumb) {
        thumb = extractStringFromXmlTag(root.art.thumb);
      }
    }

    // Parse and deduplicate MPAA rating / certification
    let rawMpaa: string | null = null;
    if (root.mpaa) {
      rawMpaa = String(extractStringFromXmlTag(root.mpaa) || root.mpaa).trim();
    } else if (root.certification) {
      rawMpaa = String(extractStringFromXmlTag(root.certification) || root.certification).trim();
    }
    if (rawMpaa) {
      const parts = rawMpaa.split(/[\/\|,]/).map((p) => p.trim()).filter(Boolean);
      const cleanTokens: string[] = [];
      const seenNorm = new Set<string>();
      for (const part of parts) {
        let clean = part
          .replace(/^(US|UK|GB|CA|AU|DE|FR|JP|NL|ES|IT|SE|NO|FI|DK)\s*:\s*/i, "")
          .replace(/^RATED\s*:\s*/i, "")
          .replace(/^RATED\s+/i, "")
          .replace(/^RATED-/i, "")
          .trim();
        if (!clean) continue;
        const norm = clean.toUpperCase().replace(/[^A-Z0-9\-]/g, "");
        if (norm && !seenNorm.has(norm)) {
          seenNorm.add(norm);
          cleanTokens.push(clean);
        }
      }
      rawMpaa = cleanTokens.length > 0 ? cleanTokens[0] : rawMpaa;
    }

    return {
      title,
      originalTitle: safeStringVal(root.originaltitle),
      year,
      rating,
      votes,
      mpaa: rawMpaa,
      runtime: runtimeSeconds,
      plot: safeStringVal(root.plot),
      tagline: safeStringVal(root.tagline),
      genres,
      studio: studios.length > 0 ? studios[0] : safeStringVal(root.studio),
      studios,
      director: directors.length > 0 ? directors.join(", ") : safeStringVal(root.director),
      directors,
      writers,
      actors,
      trailer: safeStringVal(root.trailer),
      aired: safeStringVal(root.aired),
      season: root.season ? parseInt(String(extractStringFromXmlTag(root.season) || root.season), 10) || null : null,
      episode: root.episode ? parseInt(String(extractStringFromXmlTag(root.episode) || root.episode), 10) || null : null,
      set,
      tags,
      thumb,
      poster,
      fanart
    };
  } catch (err) {
    console.error("Error parsing NFO content:", err);
    return null;
  }
}

/**
 * Parse NFO XML file
 */
export function parseNfo(nfoPath: string): MovieMetadata | null {
  try {
    if (!fs.existsSync(nfoPath)) return null;
    const content = fs.readFileSync(nfoPath, "utf8");
    return parseNfoFromString(content);
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
    // Added .tbn for standard sidecar thumbnail support (Kodi, Jellyfin, etc.)
    const exts = [".jpg", ".jpeg", ".png", ".webp", ".tbn"];

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
    // Supports standard sidecars: videoBase-thumb, videoBase.thumb, videoBase, videoBase-preview, videoBase.preview
    let thumbPath = fileExistsCaseInsensitive(dir, videoBase + "-thumb", exts);
    if (!thumbPath) {
      thumbPath = fileExistsCaseInsensitive(dir, videoBase + ".thumb", exts);
    }
    if (!thumbPath) {
      thumbPath = fileExistsCaseInsensitive(dir, videoBase, exts);
    }
    if (!thumbPath) {
      thumbPath = fileExistsCaseInsensitive(dir, videoBase + "-preview", exts);
    }
    if (!thumbPath) {
      thumbPath = fileExistsCaseInsensitive(dir, videoBase + ".preview", exts);
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

    // 6. Locate NFO specified artwork if available
    const nfoPath = findNfoFile(videoFilePath);
    if (nfoPath && fs.existsSync(nfoPath)) {
      const nfoData = parseNfo(nfoPath);
      if (nfoData) {
        const nfoDir = path.dirname(nfoPath);
        
        // Resolve NFO specified thumb
        if (!thumbPath && nfoData.thumb) {
          const possibleThumb = path.isAbsolute(nfoData.thumb)
            ? nfoData.thumb
            : path.join(nfoDir, nfoData.thumb);
          if (fs.existsSync(possibleThumb)) {
            thumbPath = possibleThumb;
          }
        }

        // Resolve NFO specified poster
        if (!posterPath && nfoData.poster) {
          const possiblePoster = path.isAbsolute(nfoData.poster)
            ? nfoData.poster
            : path.join(nfoDir, nfoData.poster);
          if (fs.existsSync(possiblePoster)) {
            posterPath = possiblePoster;
          }
        }

        // Resolve NFO specified fanart
        if (!fanartPath && nfoData.fanart) {
          const possibleFanart = path.isAbsolute(nfoData.fanart)
            ? nfoData.fanart
            : path.join(nfoDir, nfoData.fanart);
          if (fs.existsSync(possibleFanart)) {
            fanartPath = possibleFanart;
          }
        }
      }
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
  const base = path.basename(filename, ext);
  return sanitizeTitle(base, filename);
}
