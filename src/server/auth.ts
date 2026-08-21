import express from "express";
import path from "path";
import crypto from "crypto";
import os from "os";
import { AuthSession } from "../types";

export const RESTRICTED_SYSTEM_ROOTS = [
  "/etc",
  "/proc",
  "/sys",
  "/root",
  "/var",
  "/dev",
  "/boot",
  "/lib",
  "/lib64",
  "/usr",
  "/bin",
  "/sbin",
  "/run",
];

// Helper to resolve ~ in paths
export function resolveHome(filepath: string): string {
  if (!filepath) return "";
  if (filepath.startsWith("~")) {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

export function isPathSafe(rawPath: string): { safe: boolean; reason?: string; resolvedPath: string } {
  if (!rawPath || typeof rawPath !== "string") {
    return { safe: false, reason: "Path is empty or invalid", resolvedPath: "" };
  }
  // Check for null bytes, carriage returns, or control characters
  if (/[\0\r\n\x1b]/.test(rawPath)) {
    return { safe: false, reason: "Path contains illegal control characters", resolvedPath: "" };
  }

  const expanded = resolveHome(rawPath.trim());
  const normalized = path.resolve(expanded);

  // Disallow bare root directory
  if (normalized === "/") {
    return { safe: false, reason: "Access to root directory is forbidden", resolvedPath: normalized };
  }

  // Disallow restricted system directories
  for (const restricted of RESTRICTED_SYSTEM_ROOTS) {
    if (normalized === restricted || normalized.startsWith(restricted + "/")) {
      return { safe: false, reason: `Access to system directory (${restricted}) is restricted`, resolvedPath: normalized };
    }
  }

  // Disallow hidden sensitive config files and dotfolders
  const baseName = path.basename(normalized);
  if (/^\.(env|git|ssh|aws|config|bashrc|profile)/i.test(baseName) || normalized.includes("/.ssh") || normalized.includes("/.git")) {
    return { safe: false, reason: "Access to sensitive configuration directories is restricted", resolvedPath: normalized };
  }

  return { safe: true, resolvedPath: normalized };
}

// Sanitize string for .env storage (strip newlines, control characters, and escape double quotes)
export function sanitizeEnvVal(val: any): string {
  if (val === undefined || val === null) return "";
  const str = String(val);
  const clean = str.replace(/[\r\n\0\x1b]/g, "").trim();
  return clean.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export const activeSessions = new Map<string, AuthSession>();

export function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(`inaetia_pin_salt_${pin.trim()}`).digest("hex");
}

export function createSession(profileId: string, isAdmin: boolean = false): string {
  const token = crypto.randomBytes(32).toString("hex");
  activeSessions.set(token, {
    profileId,
    isAdmin,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  });
  return token;
}

export function validateSession(token: string): AuthSession | null {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return session;
}

export function getSessionFromReq(req: express.Request): AuthSession | null {
  const headerToken = (req.headers["x-profile-token"] as string) || "";
  const authHeader = req.headers["authorization"] ? (req.headers["authorization"] as string).replace(/^Bearer\s+/i, "").trim() : "";
  const queryToken = (req.query.token as string) || "";

  const token = headerToken || authHeader || queryToken;
  return validateSession(token);
}

export function sanitizeProfile(profile: any) {
  if (!profile) return profile;
  const { pin, pinHash, ...safe } = profile;
  return {
    ...safe,
    hasPin: Boolean(pin || pinHash),
    isAdmin: Boolean(profile.isAdmin),
  };
}

export function sanitizeMovieForClient<T extends { filepath?: string }>(movie: T): Omit<T, "filepath"> {
  if (!movie) return movie;
  const { filepath, ...safeMovie } = movie;
  return safeMovie;
}

export function sanitizeTrackForClient<T extends { filepath?: string }>(track: T): Omit<T, "filepath"> {
  if (!track) return track;
  const { filepath, ...safeTrack } = track;
  return safeTrack;
}
