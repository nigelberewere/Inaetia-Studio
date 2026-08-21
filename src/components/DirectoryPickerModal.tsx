import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Folder, FolderPlus, FolderOpen, HardDrive, Disc, User, 
  Check, ChevronRight, ArrowUp, Search, Lock, RefreshCw, 
  X, Server, Plus, Film, Music, AlertCircle, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { safeFetch } from "../utils";

export interface DirectoryPickerModalProps {
  isOpen: boolean;
  initialPath?: string;
  categoryType: "music" | "videos" | "all";
  categoryTitle?: string;
  onClose: () => void;
  onSelect: (selectedPath: string) => void;
}

interface DirectoryItem {
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

interface QuickMount {
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

interface BrowseResponse {
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
  error?: string;
}

export default function DirectoryPickerModal({
  isOpen,
  initialPath = "",
  categoryType,
  categoryTitle,
  onClose,
  onSelect,
}: DirectoryPickerModalProps) {
  const [currentPath, setCurrentPath] = useState<string>(initialPath || "");
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [canSelect, setCanSelect] = useState<boolean>(true);
  const [isReadable, setIsReadable] = useState<boolean>(true);
  const [isWritable, setIsWritable] = useState<boolean>(true);
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [quickMounts, setQuickMounts] = useState<QuickMount[]>([]);
  const [mediaStats, setMediaStats] = useState<{ videos: number; audio: number; totalFiles: number }>({
    videos: 0,
    audio: 0,
    totalFiles: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Direct address editing mode
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);
  const [addressInput, setAddressInput] = useState<string>("");

  // New folder creation state
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [createFolderLoading, setCreateFolderLoading] = useState<boolean>(false);
  const [createFolderError, setCreateFolderError] = useState<string | null>(null);

  // Fetch directory contents
  const loadDirectory = useCallback(async (pathQuery: string) => {
    setLoading(true);
    setErrorMsg(null);
    setIsCreatingFolder(false);
    setNewFolderName("");
    setCreateFolderError(null);
    setSearchFilter("");

    try {
      const url = `/api/setup/browse-directories?path=${encodeURIComponent(pathQuery)}`;
      const res = await safeFetch(url);
      if (res.ok) {
        const data: BrowseResponse = await res.json();
        setCurrentPath(data.currentPath);
        setAddressInput(data.currentPath);
        setParentPath(data.parentPath);
        setCanSelect(data.canSelect);
        setIsReadable(data.isReadable);
        setIsWritable(data.isWritable);
        setDirectories(data.directories || []);
        setQuickMounts(data.quickMounts || []);
        setMediaStats(data.mediaStats || { videos: 0, audio: 0, totalFiles: 0 });
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || "Failed to inspect directory contents");
      }
    } catch (err: any) {
      setErrorMsg("Network error connecting to directory browser");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDirectory(initialPath);
    }
  }, [isOpen, initialPath, loadDirectory]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        if (isCreatingFolder) {
          setIsCreatingFolder(false);
        } else if (isEditingAddress) {
          setIsEditingAddress(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isCreatingFolder, isEditingAddress, onClose]);

  // Filtered directories based on search
  const filteredDirectories = useMemo(() => {
    if (!searchFilter.trim()) return directories;
    const q = searchFilter.toLowerCase().trim();
    return directories.filter((d) => d.name.toLowerCase().includes(q));
  }, [directories, searchFilter]);

  // Handle address bar submission
  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressInput.trim()) {
      setIsEditingAddress(false);
      loadDirectory(addressInput.trim());
    }
  };

  // Handle create folder submission
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setCreateFolderLoading(true);
    setCreateFolderError(null);

    try {
      const res = await safeFetch("/api/setup/create-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentPath: currentPath,
          folderName: newFolderName.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsCreatingFolder(false);
        setNewFolderName("");
        // Reload current directory or navigate into created folder
        if (data.path) {
          loadDirectory(data.path);
        } else {
          loadDirectory(currentPath);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setCreateFolderError(err.error || "Failed to create directory");
      }
    } catch (err: any) {
      setCreateFolderError("Network error while creating folder");
    } finally {
      setCreateFolderLoading(false);
    }
  };

  // Breadcrumbs segments
  const breadcrumbSegments = useMemo(() => {
    if (!currentPath) return [];
    const isAbsolute = currentPath.startsWith("/");
    const parts = currentPath.split(/[/\\]+/).filter(Boolean);
    const segments: { name: string; fullPath: string }[] = [];

    let runningPath = isAbsolute ? "" : "";
    if (isAbsolute) {
      segments.push({ name: "Root (/)", fullPath: "/" });
    }

    for (let i = 0; i < parts.length; i++) {
      if (isAbsolute) {
        runningPath += "/" + parts[i];
      } else {
        runningPath = runningPath ? `${runningPath}/${parts[i]}` : parts[i];
      }
      segments.push({ name: parts[i], fullPath: runningPath });
    }

    return segments;
  }, [currentPath]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none"
      id="directory-picker-modal"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-cinema-card border border-cinema-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================================= */}
        {/* HEADER BAR */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 border-b border-cinema-border flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cinema-amber/15 border border-cinema-amber/30 flex items-center justify-center text-cinema-amber shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Browse Host Directories</span>
                {categoryTitle && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-cinema-amber/20 text-cinema-amber border border-cinema-amber/30 font-medium">
                    {categoryTitle}
                  </span>
                )}
              </h2>
              <p className="text-xs text-cinema-muted truncate">
                Select a server storage directory or mounted drive for media indexing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-all cursor-pointer shrink-0"
            title="Close (Esc)"
            id="btn-close-directory-picker"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* QUICK STORAGE MOUNTS BAR */}
        {/* ========================================================================= */}
        {quickMounts.length > 0 && (
          <div className="px-4 py-2.5 bg-black/25 border-b border-cinema-border/60 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-cinema-amber" />
              Mounts:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {quickMounts.map((mount) => {
                const isActive = currentPath === mount.path;
                return (
                  <button
                    key={mount.path}
                    onClick={() => loadDirectory(mount.path)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border ${
                      isActive
                        ? "bg-cinema-amber text-cinema-bg border-cinema-amber shadow-sm"
                        : "bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10 hover:border-cinema-amber/40"
                    }`}
                    title={mount.path}
                  >
                    {mount.type === "mount" ? (
                      <HardDrive className="w-3.5 h-3.5" />
                    ) : mount.type === "home" ? (
                      <User className="w-3.5 h-3.5" />
                    ) : mount.type === "drive" ? (
                      <Disc className="w-3.5 h-3.5" />
                    ) : (
                      <Folder className="w-3.5 h-3.5" />
                    )}
                    <span>{mount.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADDRESS & BREADCRUMB NAVIGATION */}
        {/* ========================================================================= */}
        <div className="p-3 sm:px-4 sm:py-3 bg-black/15 border-b border-cinema-border/60 space-y-2 shrink-0">
          <div className="flex items-center gap-2">
            {/* Step Up Parent Button */}
            <button
              onClick={() => parentPath && loadDirectory(parentPath)}
              disabled={!parentPath || loading}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-cinema-amber border border-white/10 disabled:opacity-30 disabled:hover:text-zinc-300 transition-all cursor-pointer shrink-0"
              title={parentPath ? `Up to ${parentPath}` : "At Root Directory"}
              id="btn-nav-parent-dir"
            >
              <ArrowUp className="w-4 h-4" />
            </button>

            {/* Breadcrumb Path Bar or Address Input */}
            <div className="flex-1 min-w-0 bg-[#070712] border border-cinema-border/70 rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-xs text-white font-mono overflow-x-auto">
              {isEditingAddress ? (
                <form onSubmit={handleAddressSubmit} className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    autoFocus
                    placeholder="/path/to/folder"
                    className="flex-1 bg-transparent text-white font-mono focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-2 py-0.5 bg-cinema-amber text-cinema-bg font-bold rounded text-[10px] uppercase"
                  >
                    Go
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddressInput(currentPath);
                      setIsEditingAddress(false);
                    }}
                    className="p-0.5 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1 flex-wrap py-0.5 min-w-0">
                  {breadcrumbSegments.map((seg, idx) => (
                    <React.Fragment key={seg.fullPath}>
                      <button
                        onClick={() => loadDirectory(seg.fullPath)}
                        className={`hover:text-cinema-amber hover:underline transition-colors px-1 py-0.5 rounded ${
                          idx === breadcrumbSegments.length - 1
                            ? "text-cinema-amber font-bold"
                            : "text-zinc-300"
                        }`}
                      >
                        {seg.name}
                      </button>
                      {idx < breadcrumbSegments.length - 1 && (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                  <button
                    onClick={() => setIsEditingAddress(true)}
                    className="ml-auto text-[10px] text-zinc-500 hover:text-cinema-amber uppercase font-sans tracking-wider px-1.5 py-0.5 rounded border border-white/5 hover:border-cinema-amber/20 shrink-0"
                    title="Type custom path manually"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Refresh Directory Button */}
            <button
              onClick={() => loadDirectory(currentPath)}
              disabled={loading}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-cinema-amber border border-white/10 transition-all cursor-pointer shrink-0"
              title="Refresh Directory"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Search & Actions Toolbar */}
          <div className="flex items-center gap-2 justify-between">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter folders in this directory..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-black/40 border border-cinema-border/50 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cinema-amber"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter("")}
                  className="absolute right-2.5 top-2 text-zinc-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* New Folder Toggle Button */}
            {isWritable && (
              <button
                type="button"
                onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-cinema-amber/15 text-zinc-300 hover:text-cinema-amber border border-white/10 hover:border-cinema-amber/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>New Folder</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* INLINE CREATE FOLDER FORM */}
        {/* ========================================================================= */}
        {isCreatingFolder && (
          <form
            onSubmit={handleCreateFolder}
            className="p-3 bg-cinema-amber/10 border-b border-cinema-amber/30 flex flex-col sm:flex-row items-center gap-2 animate-fade-in"
          >
            <div className="flex-1 w-full flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-cinema-amber shrink-0" />
              <input
                type="text"
                placeholder="Enter new folder name (e.g. Movies, Music, TV Shows)"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                className="flex-1 bg-black/60 border border-cinema-amber/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cinema-amber font-mono"
              />
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="submit"
                disabled={!newFolderName.trim() || createFolderLoading}
                className="px-3.5 py-1.5 bg-cinema-amber text-cinema-bg font-extrabold rounded-xl text-xs hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1"
              >
                {createFolderLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Create</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingFolder(false)}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>
            {createFolderError && (
              <p className="w-full text-xs text-red-400 pl-6">{createFolderError}</p>
            )}
          </form>
        )}

        {/* ========================================================================= */}
        {/* MAIN DIRECTORY BROWSER CONTENT */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar min-h-[220px]">
          {loading ? (
            <div className="h-48 flex flex-col items-center justify-center gap-3 text-cinema-muted">
              <RefreshCw className="w-7 h-7 animate-spin text-cinema-amber" />
              <span className="text-xs">Inspecting server storage path...</span>
            </div>
          ) : errorMsg ? (
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-red-400">Directory Access Error</h3>
                <p className="text-xs text-zinc-300 max-w-md mx-auto">{errorMsg}</p>
              </div>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={() => loadDirectory("/mnt/storage")}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs"
                >
                  Try /mnt/storage
                </button>
                <button
                  onClick={() => loadDirectory("media")}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs"
                >
                  Try App Media
                </button>
              </div>
            </div>
          ) : !isReadable ? (
            <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-center space-y-2">
              <Lock className="w-7 h-7 text-cinema-amber mx-auto" />
              <h3 className="font-bold text-sm text-white">Permission Restricted</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                The server process lacks read permissions for this folder. Check directory permissions (chmod / chown) on your host Linux system.
              </p>
            </div>
          ) : filteredDirectories.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center space-y-2 text-zinc-500 border border-dashed border-cinema-border/60 rounded-2xl p-6">
              <Folder className="w-8 h-8 text-zinc-600" />
              <p className="text-xs text-zinc-400">
                {searchFilter ? "No subfolders matched your search filter." : "No subdirectories found in this folder."}
              </p>
              {isWritable && !searchFilter && (
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="text-xs text-cinema-amber hover:underline font-semibold"
                >
                  + Create a subfolder here
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id="directory-grid">
              {filteredDirectories.map((dir) => {
                const totalMedia = dir.mediaCount.videos + dir.mediaCount.audio;
                return (
                  <div
                    key={dir.path}
                    onClick={() => dir.isAccessible && loadDirectory(dir.path)}
                    className={`group p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      dir.isAccessible
                        ? "bg-black/30 hover:bg-black/60 border-cinema-border/60 hover:border-cinema-amber/50 cursor-pointer hover:shadow-md"
                        : "bg-red-950/20 border-red-900/30 opacity-60 cursor-not-allowed"
                    }`}
                    title={dir.path}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-white/5 group-hover:bg-cinema-amber/15 text-zinc-400 group-hover:text-cinema-amber transition-colors shrink-0">
                        {dir.isRestricted || !dir.isAccessible ? (
                          <Lock className="w-4 h-4 text-red-400" />
                        ) : (
                          <Folder className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-white group-hover:text-cinema-amber transition-colors truncate">
                          {dir.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                          {totalMedia > 0 ? (
                            <span className="text-cinema-amber font-semibold">
                              {dir.mediaCount.videos > 0 && `${dir.mediaCount.videos} video${dir.mediaCount.videos > 1 ? "s" : ""}`}
                              {dir.mediaCount.videos > 0 && dir.mediaCount.audio > 0 && ", "}
                              {dir.mediaCount.audio > 0 && `${dir.mediaCount.audio} audio`}
                            </span>
                          ) : (
                            <span>{dir.hasSubdirectories ? "Has subfolders" : "Empty"}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-cinema-amber transition-colors shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* FOOTER BAR: LIVE MEDIA STATS & SELECT BUTTON */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 border-t border-cinema-border bg-black/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Real-time media detector preview */}
          <div className="flex items-center gap-2 text-xs text-zinc-300 w-full sm:w-auto">
            <div className="p-1.5 rounded-lg bg-cinema-amber/15 text-cinema-amber">
              {categoryType === "music" ? (
                <Music className="w-4 h-4" />
              ) : (
                <Film className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white">
                {mediaStats.videos > 0 || mediaStats.audio > 0 ? (
                  <span className="text-cinema-amber">
                    Found {mediaStats.videos} video{mediaStats.videos !== 1 ? "s" : ""} & {mediaStats.audio} audio track{mediaStats.audio !== 1 ? "s" : ""}
                  </span>
                ) : (
                  <span>No media files in current level (subfolders scanned on index)</span>
                )}
              </p>
              <p className="text-[11px] text-zinc-500 truncate font-mono">
                {currentPath}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (canSelect && currentPath) {
                  onSelect(currentPath);
                  onClose();
                }
              }}
              disabled={!canSelect || !isReadable || loading}
              className="px-5 py-2 rounded-xl bg-cinema-amber text-cinema-bg font-extrabold text-xs hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all shadow-lg shadow-cinema-amber/15 cursor-pointer flex items-center gap-1.5"
              id="btn-select-this-directory"
            >
              <Check className="w-4 h-4" />
              <span>Select This Directory</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
