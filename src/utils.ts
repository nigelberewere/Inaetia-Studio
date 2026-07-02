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

