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
  if (typeof input === "string" || input instanceof URL) {
    return fetch(absoluteUrl, init);
  } else {
    return fetch(new Request(absoluteUrl, input), init);
  }
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
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

