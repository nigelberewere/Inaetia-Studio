import { describe, it, expect } from "vitest";
import {
  hashPin,
  createSession,
  validateSession,
  isPathSafe,
  sanitizeEnvVal,
  sanitizeProfile,
} from "../server/auth";

describe("Auth & Security Services", () => {
  it("hashes PINs deterministically with SHA-256", () => {
    const pin = "1234";
    const hash1 = hashPin(pin);
    const hash2 = hashPin(pin);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it("creates and validates bearer session tokens", () => {
    const profileId = "user-abc-123";
    const token = createSession(profileId, true);

    expect(typeof token).toBe("string");
    expect(token.length).toBe(64);

    const session = validateSession(token);
    expect(session).not.toBeNull();
    expect(session?.profileId).toBe(profileId);
    expect(session?.isAdmin).toBe(true);
  });

  it("rejects invalid or expired session tokens", () => {
    const session = validateSession("invalid-token-value");
    expect(session).toBeNull();
  });

  it("prevents dangerous directory traversal and restricted system roots", () => {
    expect(isPathSafe("../../../etc/passwd").safe).toBe(false);
    expect(isPathSafe("/etc").safe).toBe(false);
    expect(isPathSafe("/var").safe).toBe(false);
    expect(isPathSafe("/proc").safe).toBe(false);
    expect(isPathSafe("/sys").safe).toBe(false);
    expect(isPathSafe("/dev").safe).toBe(false);
    expect(isPathSafe("/boot").safe).toBe(false);
  });

  it("permits safe local media paths", () => {
    expect(isPathSafe("media/Videos").safe).toBe(true);
    expect(isPathSafe("media/Music").safe).toBe(true);
  });

  it("sanitizes environment variables against injection", () => {
    const raw = 'test"value\nwith\rbreaks';
    const sanitized = sanitizeEnvVal(raw);
    expect(sanitized).toBe('test\\"valuewithbreaks');
    expect(sanitized).not.toContain("\n");
    expect(sanitized).not.toContain("\r");
  });

  it("sanitizes profile objects to hide sensitive pin hashes from client", () => {
    const rawProfile = {
      id: "p1",
      name: "Admin",
      pinHash: "secret-hash-123",
      pin: "1234",
      isAdmin: true,
      color: "#F5A623",
      avatar: "A",
    };

    const safe = sanitizeProfile(rawProfile);
    expect((safe as any).pinHash).toBeUndefined();
    expect((safe as any).pin).toBeUndefined();
    expect(safe.hasPin).toBe(true);
    expect(safe.name).toBe("Admin");
  });
});
