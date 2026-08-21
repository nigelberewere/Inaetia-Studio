import { ScheduledItemResult } from "./types";

/**
 * Deterministic pseudo-random number generator (Mulberry32).
 */
export function getSeededRandom(seedStr: string): () => number {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
  }
  let s = h >>> 0;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic Fisher-Yates shuffle with seeded PRNG.
 */
export function getSeededShuffle<T>(array: T[], seed: string): T[] {
  const result = [...array];
  const rand = getSeededRandom(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generic pure scheduler helper for deterministic, looping live media playback.
 * Used identically for Live TV channels and Radio stations.
 *
 * @param items List of playable items (must have an optional duration in seconds)
 * @param epochStartMs Midnight / start timestamp in milliseconds (e.g. UTC midnight)
 * @param timestampMs Current or requested target timestamp in milliseconds
 * @param defaultDurationSec Default item duration if item.duration is missing or invalid (default 120s)
 */
export function getScheduledItemAt<T extends { duration?: number }>(
  items: T[],
  epochStartMs: number,
  timestampMs: number,
  defaultDurationSec: number = 120
): ScheduledItemResult<T> | null {
  if (!items || items.length === 0) return null;

  const totalRuntime = items.reduce((sum, item) => {
    const d = item.duration && item.duration > 0 ? item.duration : defaultDurationSec;
    return sum + d;
  }, 0);

  if (totalRuntime <= 0) return null;

  const elapsedSeconds = Math.floor((timestampMs - epochStartMs) / 1000);
  const position = ((elapsedSeconds % totalRuntime) + totalRuntime) % totalRuntime;

  let currentSum = 0;
  let activeIndex = -1;
  for (let i = 0; i < items.length; i++) {
    const dur = items[i].duration && items[i].duration! > 0 ? items[i].duration! : defaultDurationSec;
    if (currentSum + dur > position) {
      activeIndex = i;
      break;
    }
    currentSum += dur;
  }

  if (activeIndex === -1) {
    activeIndex = items.length - 1;
  }

  const currentItem = items[activeIndex];
  const offsetSeconds = position - currentSum;
  const loopNumber = Math.floor(elapsedSeconds / totalRuntime);
  const durSec = currentItem.duration && currentItem.duration > 0 ? currentItem.duration : defaultDurationSec;

  const startedAt = new Date(epochStartMs + (loopNumber * totalRuntime + currentSum) * 1000).toISOString();
  const endsAt = new Date(epochStartMs + (loopNumber * totalRuntime + currentSum + durSec) * 1000).toISOString();
  const nextItem = items[(activeIndex + 1) % items.length];

  return {
    item: currentItem,
    activeIndex,
    offsetSeconds,
    startedAt,
    endsAt,
    loopNumber,
    nextItem: nextItem || null,
  };
}
