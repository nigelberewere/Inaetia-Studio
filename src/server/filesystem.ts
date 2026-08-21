import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { RESTRICTED_SYSTEM_ROOTS, resolveHome, isPathSafe } from "./auth";

export interface DirectoryItem {
  name: string;
  path: string;
  isAccessible: boolean;
  isWritable: boolean;
  isRestricted: boolean;
  hasSubdirectories: boolean;
  mediaCount: {
    videos: number;
    audio: number;
  };
}

export interface QuickMount {
  label: string;
  path: string;
  type: "mount" | "home" | "app" | "drive";
  exists: boolean;
  isAccessible: boolean;
  mediaCount?: {
    videos: number;
    audio: number;
  };
}

const VIDEO_EXTS = new Set([".mp4", ".mkv", ".avi", ".mov", ".m4v", ".webm", ".ts", ".flv", ".wmv"]);
const AUDIO_EXTS = new Set([".mp3", ".flac", ".m4a", ".wav", ".ogg", ".aac", ".wma", ".alac", ".opus"]);

/**
 * Scan a single folder (non-recursive) to get media file count
 */
export function getFolderMediaCount(dirPath: string): { videos: number; audio: number } {
  let videos = 0;
  let audio = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VIDEO_EXTS.has(ext)) videos++;
        else if (AUDIO_EXTS.has(ext)) audio++;
      }
    }
  } catch {
    // Ignore unreadable dirs
  }
  return { videos, audio };
}

/**
 * Automatically detect all mounted drives, storage volumes, and user media paths on Linux/Ubuntu/macOS/Windows
 */
export async function getDetectedMounts(): Promise<QuickMount[]> {
  const mounts: QuickMount[] = [];
  const addedPaths = new Set<string>();

  const addMount = (label: string, rawPath: string, type: "mount" | "home" | "app" | "drive") => {
    const resolved = path.resolve(resolveHome(rawPath));
    if (addedPaths.has(resolved)) return;
    addedPaths.add(resolved);

    let exists = false;
    let isAccessible = false;
    let mediaCount = { videos: 0, audio: 0 };

    try {
      if (fs.existsSync(resolved)) {
        const stat = fs.statSync(resolved);
        if (stat.isDirectory()) {
          exists = true;
          try {
            fs.accessSync(resolved, fs.constants.R_OK);
            isAccessible = true;
            mediaCount = getFolderMediaCount(resolved);
          } catch {
            isAccessible = false;
          }
        }
      }
    } catch {
      // Ignored
    }

    if (exists) {
      mounts.push({
        label,
        path: resolved,
        type,
        exists,
        isAccessible,
        mediaCount,
      });
    }
  };

  // 1. App-bundled Media Storage
  const projectMedia = path.join(process.cwd(), "media");
  addMount("App Media Folder", projectMedia, "app");
  addMount("App Videos", path.join(projectMedia, "Videos"), "app");
  addMount("App Music", path.join(projectMedia, "Music"), "app");

  // 2. Standard Dedicated Storage Mounts (Linux / Ubuntu / Headless Server)
  addMount("System Storage (/mnt/storage)", "/mnt/storage", "mount");
  addMount("Mounts Root (/mnt)", "/mnt", "mount");
  addMount("Removable Media (/media)", "/media", "mount");
  addMount("Server Data (/srv)", "/srv", "mount");

  // Check subfolders in /mnt and /media
  try {
    if (fs.existsSync("/mnt")) {
      const subMnts = fs.readdirSync("/mnt", { withFileTypes: true });
      for (const entry of subMnts) {
        if (entry.isDirectory() && !entry.name.startsWith(".")) {
          addMount(`Mount: /mnt/${entry.name}`, path.join("/mnt", entry.name), "mount");
        }
      }
    }
  } catch {
    // Ignore
  }

  try {
    if (fs.existsSync("/media")) {
      const subMedias = fs.readdirSync("/media", { withFileTypes: true });
      for (const entry of subMedias) {
        if (entry.isDirectory() && !entry.name.startsWith(".")) {
          addMount(`Storage: /media/${entry.name}`, path.join("/media", entry.name), "mount");
          // Check for /media/$USER/*
          try {
            const userSub = fs.readdirSync(path.join("/media", entry.name), { withFileTypes: true });
            for (const uEntry of userSub) {
              if (uEntry.isDirectory() && !uEntry.name.startsWith(".")) {
                addMount(`Drive: ${uEntry.name}`, path.join("/media", entry.name, uEntry.name), "mount");
              }
            }
          } catch {
            // Ignore
          }
        }
      }
    }
  } catch {
    // Ignore
  }

  // 3. User Home Directory & Standard Media Folders
  const home = os.homedir();
  if (home) {
    addMount("User Home (~)", home, "home");
    addMount("Home: Videos", path.join(home, "Videos"), "home");
    addMount("Home: Movies", path.join(home, "Movies"), "home");
    addMount("Home: Music", path.join(home, "Music"), "home");
    addMount("Home: Downloads", path.join(home, "Downloads"), "home");
  }

  // 4. macOS /Volumes
  if (process.platform === "darwin" && fs.existsSync("/Volumes")) {
    try {
      const volumes = fs.readdirSync("/Volumes", { withFileTypes: true });
      for (const vol of volumes) {
        if (vol.isDirectory() && !vol.name.startsWith(".")) {
          addMount(`Volume: ${vol.name}`, path.join("/Volumes", vol.name), "drive");
        }
      }
    } catch {
      // Ignore
    }
  }

  // 5. Windows Drive Letters
  if (process.platform === "win32") {
    const drives = ["C", "D", "E", "F", "G", "H", "I", "Z"];
    for (const d of drives) {
      const drivePath = `${d}:\\`;
      if (fs.existsSync(drivePath)) {
        addMount(`Local Disk (${d}:)`, drivePath, "drive");
      }
    }
  }

  return mounts;
}

/**
 * Explore a directory on the server filesystem
 */
export async function browseDirectory(targetPath?: string): Promise<{
  currentPath: string;
  parentPath: string | null;
  canSelect: boolean;
  isReadable: boolean;
  isWritable: boolean;
  directories: DirectoryItem[];
  mediaStats: {
    videos: number;
    audio: number;
    totalFiles: number;
  };
  quickMounts: QuickMount[];
}> {
  const quickMounts = await getDetectedMounts();

  // Pick default path if none specified
  let target = targetPath ? targetPath.trim() : "";
  if (!target) {
    // Prefer /mnt/storage if exists, else project media, else home
    if (fs.existsSync("/mnt/storage")) {
      target = "/mnt/storage";
    } else if (fs.existsSync(path.join(process.cwd(), "media"))) {
      target = path.join(process.cwd(), "media");
    } else {
      target = os.homedir();
    }
  }

  const resolved = path.resolve(resolveHome(target));

  // Determine parent path
  let parentPath: string | null = null;
  if (resolved !== "/" && resolved !== path.parse(resolved).root) {
    parentPath = path.dirname(resolved);
  }

  // Check safety of current selection
  const safetyCheck = isPathSafe(resolved);
  const canSelect = safetyCheck.safe;

  let isReadable = false;
  let isWritable = false;
  let directories: DirectoryItem[] = [];
  const mediaStats = { videos: 0, audio: 0, totalFiles: 0 };

  try {
    fs.accessSync(resolved, fs.constants.R_OK);
    isReadable = true;
  } catch {
    isReadable = false;
  }

  try {
    fs.accessSync(resolved, fs.constants.W_OK);
    isWritable = true;
  } catch {
    isWritable = false;
  }

  if (isReadable && fs.existsSync(resolved)) {
    try {
      const entries = fs.readdirSync(resolved, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue; // Skip hidden dotfiles

        const fullEntryPath = path.join(resolved, entry.name);

        if (entry.isDirectory()) {
          // Check if system restricted
          const isRestricted = RESTRICTED_SYSTEM_ROOTS.some(
            (r) => fullEntryPath === r || fullEntryPath.startsWith(r + "/")
          );

          let isDirAccessible = false;
          let isDirWritable = false;
          let hasSub = false;
          let itemMedia = { videos: 0, audio: 0 };

          try {
            fs.accessSync(fullEntryPath, fs.constants.R_OK);
            isDirAccessible = true;
            // Quick check if subdirs exist
            const subEntries = fs.readdirSync(fullEntryPath, { withFileTypes: true });
            hasSub = subEntries.some((s) => s.isDirectory() && !s.name.startsWith("."));
            itemMedia = getFolderMediaCount(fullEntryPath);
          } catch {
            isDirAccessible = false;
          }

          try {
            fs.accessSync(fullEntryPath, fs.constants.W_OK);
            isDirWritable = true;
          } catch {
            isDirWritable = false;
          }

          directories.push({
            name: entry.name,
            path: fullEntryPath,
            isAccessible: isDirAccessible,
            isWritable: isDirWritable,
            isRestricted,
            hasSubdirectories: hasSub,
            mediaCount: itemMedia,
          });
        } else if (entry.isFile()) {
          mediaStats.totalFiles++;
          const ext = path.extname(entry.name).toLowerCase();
          if (VIDEO_EXTS.has(ext)) mediaStats.videos++;
          else if (AUDIO_EXTS.has(ext)) mediaStats.audio++;
        }
      }

      // Sort directories alphabetically
      directories.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
    } catch (readErr) {
      console.error("Failed to read directory entries:", readErr);
    }
  }

  return {
    currentPath: resolved,
    parentPath,
    canSelect,
    isReadable,
    isWritable,
    directories,
    mediaStats,
    quickMounts,
  };
}

/**
 * Create a new folder safely on the server
 */
export function createNewFolder(parentDir: string, newFolderName: string): { success: boolean; path?: string; error?: string } {
  if (!newFolderName || !newFolderName.trim()) {
    return { success: false, error: "Folder name cannot be empty" };
  }

  // Clean folder name to prevent traversal
  const cleanName = newFolderName.trim().replace(/[\\/\0\r\n]/g, "");
  if (!cleanName || cleanName === "." || cleanName === "..") {
    return { success: false, error: "Invalid folder name" };
  }

  const resolvedParent = path.resolve(resolveHome(parentDir));
  const newPath = path.join(resolvedParent, cleanName);

  const check = isPathSafe(newPath);
  if (!check.safe) {
    return { success: false, error: check.reason || "Creating folder in this location is not permitted" };
  }

  try {
    if (!fs.existsSync(resolvedParent)) {
      return { success: false, error: "Parent directory does not exist" };
    }

    if (fs.existsSync(newPath)) {
      return { success: false, error: "A directory or file with that name already exists" };
    }

    fs.mkdirSync(newPath, { recursive: true });
    return { success: true, path: newPath };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create directory on filesystem" };
  }
}
