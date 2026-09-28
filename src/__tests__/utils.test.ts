import { describe, it, expect } from "vitest";
import {
  cleanArtistName,
  cleanTrackTitle,
  formatDuration,
  formatBytes,
  extractMovieYear,
} from "../utils";

describe("Media String & Formatting Utils", () => {
  it("cleans track titles by stripping track numbers and release quality tags", () => {
    expect(cleanTrackTitle("01. Bohemian Rhapsody 1080p")).toBe("Bohemian Rhapsody");
    expect(cleanTrackTitle("02 - Hotel California [FLAC]")).toBe("Hotel California");
    expect(cleanTrackTitle("03_Imagine_720p_x264")).toBe("Imagine");
  });

  it("preserves legitimate words that contain tag substrings (e.g. Italian, DVDrip)", () => {
    expect(cleanTrackTitle("The Italian Job")).toBe("The Italian Job");
    expect(cleanTrackTitle("Aac River Journey")).toBe("Aac River Journey");
  });

  it("cleans artist names properly", () => {
    expect(cleanArtistName("01. Pink Floyd")).toBe("Pink Floyd");
    expect(cleanArtistName("Queen [Official]")).toBe("Queen");
  });

  it("formats durations accurately", () => {
    expect(formatDuration(30)).toBe("30s");
    expect(formatDuration(65)).toBe("1m");
    expect(formatDuration(3665)).toBe("1h 1m");
    expect(formatDuration(0)).toBe("--:--");
  });

  it("formats bytes accurately into human readable sizes", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1024 * 1024 * 1.5)).toBe("1.5 MB");
    expect(formatBytes(1024 * 1024 * 1024 * 2)).toBe("2 GB");
  });

  it("extracts movie release year accurately with priority and regex fallback", () => {
    // 1. Direct number year
    expect(extractMovieYear({ year: 2014, title: "Interstellar" })).toBe(2014);

    // 2. String year
    expect(extractMovieYear({ year: "1999" as unknown as number, title: "The Matrix" })).toBe(1999);

    // 3. TV show year fallback
    expect(extractMovieYear({ showYear: 2008, title: "Breaking Bad" })).toBe(2008);

    // 4. Filename extraction when year is null
    expect(extractMovieYear({ year: null, filename: "Inception.2010.1080p.BluRay.x264.mkv" })).toBe(2010);
    expect(extractMovieYear({ year: null, title: "Gladiator (2000)" })).toBe(2000);

    // 5. Handles null, undefined, and non-year patterns gracefully
    expect(extractMovieYear(null)).toBeNull();
    expect(extractMovieYear({ year: null, filename: "random_home_video.mp4" })).toBeNull();
    expect(extractMovieYear({ year: 1800 })).toBeNull(); // Out of movie era bounds
  });
});
