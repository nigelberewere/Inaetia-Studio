import { describe, it, expect } from "vitest";
import {
  parsePathsEnv,
  getMimeType,
  isSafariClient,
  findShowFolderPath,
} from "../server/state";

describe("Server State and Path Helpers", () => {
  it("parses comma-separated path env values and falls back to default", () => {
    expect(parsePathsEnv("media/Videos, /mnt/storage/movies", "default/path")).toEqual([
      "media/Videos",
      "/mnt/storage/movies",
    ]);
    expect(parsePathsEnv(undefined, "media/Music")).toEqual(["media/Music"]);
    expect(parsePathsEnv("", "media/Videos")).toEqual(["media/Videos"]);
  });

  it("returns correct MIME types for audio and video media extensions", () => {
    expect(getMimeType(".mp4")).toBe("video/mp4");
    expect(getMimeType(".mkv")).toBe("video/x-matroska");
    expect(getMimeType(".mp3")).toBe("audio/mpeg");
    expect(getMimeType(".flac")).toBe("audio/flac");
    expect(getMimeType(".m4a")).toBe("audio/mp4");
    expect(getMimeType(".unknown")).toBe("application/octet-stream");
  });

  it("accurately detects Apple/Safari user agents", () => {
    const safariUA =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
    const chromeUA =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const iPhoneUA =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";

    expect(isSafariClient(safariUA)).toBe(true);
    expect(isSafariClient(chromeUA)).toBe(false);
    expect(isSafariClient(iPhoneUA)).toBe(true);
  });

  it("extracts show folder paths correctly from episode filepaths", () => {
    const epPath = "/media/TV/Breaking Bad/Season 01/Breaking.Bad.S01E01.mkv";
    const showFolder = findShowFolderPath(epPath, "Breaking Bad");
    expect(showFolder).toBe("/media/TV/Breaking Bad");
  });
});
