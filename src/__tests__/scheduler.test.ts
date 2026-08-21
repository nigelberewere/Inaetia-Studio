import { describe, it, expect } from "vitest";
import {
  getSeededRandom,
  getSeededShuffle,
  getScheduledItemAt,
} from "../scheduler";

describe("Deterministic Scheduler Service", () => {
  it("generates deterministic pseudo-random numbers from seed", () => {
    const rng1 = getSeededRandom("test-seed-2026-08-21");
    const rng2 = getSeededRandom("test-seed-2026-08-21");
    const r1 = rng1();
    const r2 = rng2();
    expect(r1).toBe(r2);
    expect(r1).toBeGreaterThanOrEqual(0);
    expect(r1).toBeLessThan(1);
  });

  it("shuffles arrays deterministically given the same seed", () => {
    const items = [
      { id: "1", title: "Item A" },
      { id: "2", title: "Item B" },
      { id: "3", title: "Item C" },
      { id: "4", title: "Item D" },
    ];

    const s1 = getSeededShuffle(items, "channel-1-2026-08-21");
    const s2 = getSeededShuffle(items, "channel-1-2026-08-21");
    expect(s1).toEqual(s2);
    expect(s1.length).toBe(4);
  });

  it("calculates current scheduled item accurately across epoch offsets", () => {
    const playlist = [
      { id: "m1", title: "Movie 1", duration: 3600 }, // 1 hr (0 - 3600)
      { id: "m2", title: "Movie 2", duration: 7200 }, // 2 hr (3600 - 10800)
      { id: "m3", title: "Movie 3", duration: 1800 }, // 30 min (10800 - 12600)
    ];

    const epoch = 1700000000000;
    // 5000 seconds after epoch -> in Movie 2 (5000 - 3600 = 1400s in)
    const timestamp = epoch + 5000 * 1000;

    const result = getScheduledItemAt(playlist, epoch, timestamp, 120);

    expect(result).not.toBeNull();
    expect(result!.item.id).toBe("m2");
    expect(result!.offsetSeconds).toBe(1400);
    expect(result!.nextItem?.id).toBe("m3");
    expect(new Date(result!.startedAt).getTime()).toBe(epoch + 3600 * 1000);
    expect(new Date(result!.endsAt).getTime()).toBe(epoch + 10800 * 1000);
  });

  it("handles playlist looping seamlessly when elapsed time exceeds total runtime", () => {
    const playlist = [
      { id: "t1", title: "Track 1", duration: 300 }, // 5 min
      { id: "t2", title: "Track 2", duration: 300 }, // 5 min
    ];
    // Total runtime = 600s (10 min)
    const epoch = 1700000000000;
    // 650s after epoch -> 1 full loop + 50s into Track 1
    const timestamp = epoch + 650 * 1000;

    const result = getScheduledItemAt(playlist, epoch, timestamp, 120);

    expect(result).not.toBeNull();
    expect(result!.item.id).toBe("t1");
    expect(result!.offsetSeconds).toBe(50);
    expect(result!.nextItem?.id).toBe("t2");
  });

  it("returns null for empty playlists", () => {
    const result = getScheduledItemAt([], 1700000000000, 1700000005000);
    expect(result).toBeNull();
  });
});
