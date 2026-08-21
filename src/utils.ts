export function getAbsoluteUrl(url: string): string {
  if (url && (url.startsWith("/") || !url.includes("://"))) {
    try {
      let base = window.location.origin;
      if (!base || base === "null" || !base.startsWith("http")) {
        if (document.referrer && document.referrer.startsWith("http")) {
          try {
            base = new URL(document.referrer).origin;
          } catch (_) {}
        }
      }
      if (!base || base === "null" || !base.startsWith("http")) {
        base = "https://ais-dev-wcueoxz7eccayzvsngcybb-569886994781.europe-west2.run.app";
      }
      return new URL(url, base).toString();
    } catch (e) {
      console.warn("Normalize relative fetch URL failed:", url, e);
    }
  }
  return url;
}

export function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" 
    ? input 
    : (input instanceof URL ? input.toString() : (input instanceof Request ? input.url : ""));
  const absoluteUrl = getAbsoluteUrl(url);

  // Propagate authentication token if present
  let authHeaders: Record<string, string> = {};
  if (typeof window !== "undefined") {
    try {
      const token = localStorage.getItem("inaetia_auth_token");
      if (token) {
        authHeaders["x-profile-token"] = token;
      }
    } catch (_) {}
  }

  const customHeaders = {
    ...authHeaders,
    ...(init?.headers || {}),
  };

  const customInit: RequestInit = {
    ...init,
    headers: customHeaders,
  };

  if (typeof input === "string" || input instanceof URL) {
    return fetch(absoluteUrl, customInit);
  } else {
    return fetch(new Request(absoluteUrl, input), customInit);
  }
}

export function formatDuration(seconds: number): string {
  if (seconds === undefined || seconds === null || isNaN(seconds) || !isFinite(seconds) || seconds <= 0) {
    return "--:--";
  }
  const sec = Math.floor(seconds);
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function formatCleanDate(rawDate?: string | number | null): string | null {
  if (!rawDate) return null;

  if (typeof rawDate === "number") {
    if (rawDate >= 1890 && rawDate <= 2100) return String(rawDate);
    return null;
  }

  const str = String(rawDate).trim();
  if (!str) return null;

  // 4-digit year
  if (/^\d{4}$/.test(str)) {
    const yr = parseInt(str, 10);
    if (yr >= 1890 && yr <= 2100) return str;
    return null;
  }

  // Attempt standard date parse
  const d = new Date(str);
  if (isNaN(d.getTime())) {
    // Try extracting 4 digit year regex if parsing failed
    const match = str.match(/\b(19\d\d|20\d\d)\b/);
    return match ? match[1] : null;
  }

  const year = d.getFullYear();
  if (year < 1890 || year > 2100) return null;

  try {
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (_) {
    return `${year}`;
  }
}

export function normalizeSeriesName(name: string = ""): string {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ");
}

export function pluralize(count: number, singular: string, plural?: string): string {
  const p = plural || `${singular}s`;
  return `${count} ${count === 1 ? singular : p}`;
}

export function formatRating(rawRating?: string | null): string | null {
  if (!rawRating) return null;
  const str = String(rawRating).trim();
  if (!str) return null;

  // Split by slashes, pipes, or commas in case multiple certifications/ratings were concatenated
  const parts = str.split(/[\/\|,]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const cleanTokens: string[] = [];
  const seenNormalized = new Set<string>();

  for (const part of parts) {
    // Strip prefixes like "US:", "UK:", "RATED ", "RATED:", "RATED-", etc.
    let clean = part
      .replace(/^(US|UK|GB|CA|AU|DE|FR|JP|NL|ES|IT|SE|NO|FI|DK)\s*:\s*/i, "")
      .replace(/^RATED\s*:\s*/i, "")
      .replace(/^RATED\s+/i, "")
      .replace(/^RATED-/i, "")
      .trim();

    if (!clean) continue;

    // Normalize for comparison (uppercase, strip non-alphanumeric except hyphen)
    const norm = clean.toUpperCase().replace(/[^A-Z0-9\-]/g, "");
    if (norm && !seenNormalized.has(norm)) {
      seenNormalized.add(norm);
      cleanTokens.push(clean);
    }
  }

  if (cleanTokens.length === 0) return null;

  // Return the first clean rating value
  return cleanTokens[0];
}

export function sanitizeTitle(rawTitle?: string | null, filename?: string | null): string {
  if (!rawTitle && !filename) return "Untitled";

  let str = (rawTitle || filename || "").trim();

  // Strip file extension if present (e.g. .mkv, .mp4, .avi, etc.)
  str = str.replace(/\.(mkv|mp4|avi|mov|m4v|webm|ts|flv|wmv|mpg|mpeg)$/i, "");

  // 1. Remove year in parentheses or brackets e.g. (2008), [2023]
  str = str.replace(/[\(\[]\s*(18\d\d|19\d\d|20\d\d)\s*[\)\]]/g, "");

  // 2. Remove scene group tags in brackets e.g. [YTS.MX], [Etrg], [Rarbg]
  str = str.replace(/\[[^\]]+\]/g, "");

  // 3. Trailing hyphenated release group e.g. -ETRG, -YIFY, -LOL, -SPARKS, -mSD, -MeGusta, -FLUX
  str = str.replace(/-\s*[A-Za-z0-9]+$/i, "");

  // 4. Common quality / source / codec / release group tag patterns (case-insensitive with word boundaries)
  const qualityCodecTags = [
    /\b480p\b/gi, /\b576p\b/gi, /\b720p\b/gi, /\b1080p\b/gi, /\b2160p\b/gi, /\b4k\b/gi, /\buhd\b/gi,
    /\bdvdrip\b/gi, /\bdvd-rip\b/gi, /\bbrrip\b/gi, /\bbdrip\b/gi, /\bbluray\b/gi, /\bblu-ray\b/gi,
    /\bwebrip\b/gi, /\bweb-rip\b/gi, /\bwebdl\b/gi, /\bweb-dl\b/gi, /\bhdtv\b/gi, /\bhdrip\b/gi,
    /\bxvid\b/gi, /\bdivx\b/gi, /\bx264\b/gi, /\bx265\b/gi, /\bh264\b/gi, /\bh265\b/gi, /\bhevc\b/gi,
    /\baac\b/gi, /\bac3\b/gi, /\bdts\b/gi, /\bdd5\.1\b/gi, /\beztv\b/gi, /\brarbg\b/gi, /\byts\b/gi, /\byify\b/gi, /\betrg\b/gi
  ];

  qualityCodecTags.forEach((tag) => {
    str = str.replace(tag, " ");
  });

  // 5. Replace dots, underscores, hyphens (when separating words) with spaces
  str = str.replace(/[._\-]+/g, " ");

  // 6. Collapse extra whitespace
  str = str.replace(/\s+/g, " ").trim();

  if (!str) {
    return rawTitle || filename || "Untitled";
  }

  // 7. Title-case the result
  return str
    .split(" ")
    .map((word) => {
      if (!word) return "";
      // Keep Roman numerals or short acronyms capitalized
      if (/^(3d|hd|tv|i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join(" ");
}

export function cleanArtistName(rawArtist?: string | null): string {
  if (!rawArtist) return "Unknown Artist";
  let str = rawArtist.trim();
  if (!str || str.toLowerCase() === "unknown" || str.toLowerCase() === "unknown artist") {
    return "Unknown Artist";
  }

  // 1. If artist string contains " - " (e.g. "Drake - For All The Dogs (2023)"), take the artist part
  if (str.includes(" - ")) {
    const parts = str.split(/\s+-\s+/);
    if (parts.length >= 2) {
      str = parts[0].trim();
    }
  }

  // 2. Remove year in parens or brackets e.g. (2023), [2023]
  str = str.replace(/[\(\[]\s*(18\d\d|19\d\d|20\d\d)\s*[\)\]]/g, "");

  // 3. Remove trailing album or folder tags in parens if attached
  str = str.replace(/\s*[\(\[].*?[\)\]]/g, "");

  // 4. Strip leading track numbers if present in artist
  str = str.replace(/^\d+[\.\s\-]+/, "");

  // 5. Replace underscores with spaces & collapse whitespace
  str = str.replace(/_/g, " ").replace(/\s+/g, " ").trim();

  return str || "Unknown Artist";
}

export function cleanTrackTitle(rawTitle?: string | null): string {
  if (!rawTitle) return "Unknown Track";
  let str = rawTitle.trim();

  // Strip file extension if present
  str = str.replace(/\.(mp3|flac|m4a|wav|ogg|aac)$/i, "");

  // Strip leading track numbers: e.g. "10. Home", "22. Away From Home", "01 - Title", "01. "
  str = str.replace(/^\d{1,3}\s*[\.\-]\s*/, "");
  str = str.replace(/^\d{1,3}\s+/, "");

  // Replace underscores with spaces & collapse whitespace
  str = str.replace(/_/g, " ").replace(/\s+/g, " ").trim();

  return str || "Unknown Track";
}


