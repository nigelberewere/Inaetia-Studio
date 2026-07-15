import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { safeFetch } from "../utils";
import { 
  Settings as SettingsIcon, Server, HardDrive, RefreshCw, 
  Film, Music, Cpu, ShieldAlert, Wifi, Trash2, Image,
  HeartPulse, ShieldCheck, Activity, Sparkles, Folder, Save, Check
} from "lucide-react";

interface LibraryHealth {
  totalItems: number;
  nfoCount: number;
  nfoCoverage: number;
  posterCount: number;
  posterCoverage: number;
  fanartCount: number;
  fanartCoverage: number;
  thumbCount: number;
  thumbCoverage: number;
  richMetadataCount: number;
  richMetadataCoverage: number;
}

export default function Settings() {
  const { status, fetchStatus, triggerRescan, loading, movies } = useApp();
  const [rescanning, setRescanning] = useState(false);
  const [clearingThumbs, setClearingThumbs] = useState(false);
  const [confirmClearThumbs, setConfirmClearThumbs] = useState(false);
  const [thumbsClearedMessage, setThumbsClearedMessage] = useState("");
  const [health, setHealth] = useState<LibraryHealth | null>(null);
  const [fetchingHealth, setFetchingHealth] = useState(false);

  // Is Form Dirty (edited by user)
  const [isDirty, setIsDirty] = useState(false);

  // Directory Management States (Initialized from status if already loaded, otherwise fallback)
  const [musicPaths, setMusicPaths] = useState<string[]>(() => {
    if (status) {
      if (status.musicPaths) return status.musicPaths.split(",");
      if (status.musicPath) return [status.musicPath];
    }
    return ["media/Music"];
  });
  const [moviesPaths, setMoviesPaths] = useState<string[]>(() => {
    if (status) {
      if (status.moviesPaths) return status.moviesPaths.split(",");
      if (status.videosPath) return [status.videosPath];
    }
    return ["media/Videos/Movies"];
  });
  const [tvShowsPaths, setTvShowsPaths] = useState<string[]>(() => {
    if (status) {
      if (status.tvShowsPaths) return status.tvShowsPaths.split(",");
      if (status.videosPath) return [status.videosPath];
    }
    return ["media/Videos/Tv Shows"];
  });
  const [otherVideosPaths, setOtherVideosPaths] = useState<string[]>(() => {
    if (status) {
      if (status.otherVideosPaths) return status.otherVideosPaths.split(",");
      if (status.videosPath) return [status.videosPath];
    }
    return ["media/Videos"];
  });

  const [savingDirs, setSavingDirs] = useState(false);
  const [saveDirsSuccess, setSaveDirsSuccess] = useState("");
  const [saveDirsError, setSaveDirsError] = useState("");
  const [hasInitializedDirs, setHasInitializedDirs] = useState(() => !!status);

  const fetchHealth = async () => {
    setFetchingHealth(true);
    try {
      const res = await safeFetch("/api/library/health");
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (err) {
      console.error("Failed to fetch library health:", err);
    } finally {
      setFetchingHealth(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchHealth();
    // Refresh stats every 10 seconds while on settings page
    const interval = setInterval(() => {
      fetchStatus();
      fetchHealth();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Initialize directory states from status if not dirty and not yet initialized
  useEffect(() => {
    if (status && !hasInitializedDirs && !isDirty) {
      if (status.musicPaths) {
        setMusicPaths(status.musicPaths.split(","));
      } else if (status.musicPath) {
        setMusicPaths([status.musicPath]);
      } else {
        setMusicPaths(["media/Music"]);
      }

      if (status.moviesPaths) {
        setMoviesPaths(status.moviesPaths.split(","));
      } else if (status.videosPath) {
        setMoviesPaths([status.videosPath]);
      } else {
        setMoviesPaths(["media/Videos/Movies"]);
      }

      if (status.tvShowsPaths) {
        setTvShowsPaths(status.tvShowsPaths.split(","));
      } else if (status.videosPath) {
        setTvShowsPaths([status.videosPath]);
      } else {
        setTvShowsPaths(["media/Videos/Tv Shows"]);
      }

      if (status.otherVideosPaths) {
        setOtherVideosPaths(status.otherVideosPaths.split(","));
      } else if (status.videosPath) {
        setOtherVideosPaths([status.videosPath]);
      } else {
        setOtherVideosPaths(["media/Videos"]);
      }
      setHasInitializedDirs(true);
    }
  }, [status, hasInitializedDirs, isDirty]);

  // Format Bytes (B to KB/MB/GB/TB)
  const formatBytes = (bytes: number) => {
    if (bytes === 0 || isNaN(bytes)) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Convert Uptime in seconds to a human-readable string
  const formatUptime = (seconds: number) => {
    if (isNaN(seconds)) return "0s";
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 && d === 0) parts.push(`${s}s`);
    
    return parts.join(" ") || "0s";
  };

  const handleRescan = async () => {
    setRescanning(true);
    try {
      await triggerRescan();
      await fetchHealth();
    } catch (err) {
      console.error(err);
    } finally {
      setRescanning(false);
    }
  };

  const handleClearThumbnails = async () => {
    if (!confirmClearThumbs) {
      setConfirmClearThumbs(true);
      // Reset confirmation if not clicked again within 5 seconds
      setTimeout(() => setConfirmClearThumbs(false), 5000);
      return;
    }

    setClearingThumbs(true);
    setConfirmClearThumbs(false);
    setThumbsClearedMessage("");
    try {
      const res = await safeFetch("/api/thumbnails/clear", { method: "POST" });
      if (res.ok) {
        setThumbsClearedMessage("Cleared! New smart thumbnails will generate as you browse.");
        setTimeout(() => setThumbsClearedMessage(""), 5000);
      } else {
        throw new Error("Failed to clear thumbnail cache");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error clearing thumbnail cache: " + err.message);
    } finally {
      setClearingThumbs(false);
    }
  };

  const handleSaveDirectories = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDirs(true);
    setSaveDirsSuccess("");
    setSaveDirsError("");

    const activeMusic = musicPaths.filter(p => p.trim() !== "");
    const activeMovies = moviesPaths.filter(p => p.trim() !== "");
    const activeTv = tvShowsPaths.filter(p => p.trim() !== "");
    const activeOther = otherVideosPaths.filter(p => p.trim() !== "");

    if (activeMusic.length === 0 || activeMovies.length === 0 || activeTv.length === 0 || activeOther.length === 0) {
      setSaveDirsError("At least one directory path is required for each category.");
      setSavingDirs(false);
      return;
    }

    try {
      const res = await safeFetch("/api/settings/save-directories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          musicPaths: activeMusic,
          moviesPaths: activeMovies,
          tvShowsPaths: activeTv,
          otherVideosPaths: activeOther
        })
      });

      if (res.ok) {
        setSaveDirsSuccess("Media directories updated successfully! Triggered background rescan.");
        setIsDirty(false);
        fetchStatus();
        fetchHealth();
        setTimeout(() => setSaveDirsSuccess(""), 6000);
      } else {
        const data = await res.json();
        setSaveDirsError(data.error || "Failed to update directories.");
      }
    } catch (err) {
      setSaveDirsError("Failed to connect to backend server.");
    } finally {
      setSavingDirs(false);
    }
  };

  const renderPathInputsSection = (
    title: string,
    paths: string[],
    setPaths: React.Dispatch<React.SetStateAction<string[]>>,
    type: "music" | "videos"
  ) => {
    const addPath = () => {
      setIsDirty(true);
      setPaths([...paths, ""]);
    };

    const removePath = (index: number) => {
      setIsDirty(true);
      if (paths.length === 1) {
        setPaths([""]);
      } else {
        setPaths(paths.filter((_, i) => i !== index));
      }
    };

    const updatePathValue = (index: number, val: string) => {
      setIsDirty(true);
      const updated = [...paths];
      updated[index] = val;
      setPaths(updated);
    };

    return (
      <div className="space-y-2 bg-black/15 p-4 rounded-xl border border-cinema-border/55">
        <div className="flex justify-between items-center">
          <label className="font-bold text-xs uppercase text-zinc-300 tracking-wider flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-cinema-amber" /> {title}
          </label>
          <button
            type="button"
            onClick={addPath}
            className="text-[10px] text-cinema-amber font-extrabold bg-cinema-amber/10 px-2 py-0.5 rounded-md border border-cinema-amber/20 hover:bg-cinema-amber/20 transition-all cursor-pointer"
          >
            + Add Path
          </button>
        </div>
        <div className="space-y-1.5">
          {paths.map((p, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder={type === "music" ? "e.g. /home/user/Music" : "e.g. /home/user/Videos"}
                value={p}
                onChange={(e) => updatePathValue(idx, e.target.value)}
                className="flex-1 bg-[#070712] border border-cinema-border/60 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cinema-amber"
              />
              <button
                type="button"
                onClick={() => removePath(idx)}
                className="text-zinc-500 hover:text-red-400 p-1.5 border border-cinema-border/40 hover:border-red-500/30 rounded-lg transition-all cursor-pointer"
                title="Remove path"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const storage = status?.storage || { total: 4398046511104, used: 2516582400000, free: 1881464111104 };
  const usedPercent = Math.round((storage.used / storage.total) * 100) || 57;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24 animate-fade-in" id="settings-view-page">
      {/* Page Title */}
      <div className="border-b border-cinema-border pb-5">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-7 h-7 text-cinema-amber" />
          Server Configuration
        </h1>
        <p className="text-cinema-muted text-xs md:text-sm mt-1">
          Monitor your {status?.appName || "Inaetia Studios"} media assets, disk spaces, and local network hotspot health.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. DISK STORAGE CARD */}
        <div className="md:col-span-2 bg-cinema-card border border-cinema-border rounded-2xl p-6 flex flex-col gap-5 shadow-xl">
          <div className="flex items-center gap-2 text-cinema-amber">
            <HardDrive className="w-5 h-5" />
            <h2 className="font-bold text-white text-base">Disk Storage Status</h2>
          </div>

          <div className="space-y-3">
            {/* Storage Progress gauge */}
            <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-cinema-amber h-full rounded-full shadow-lg shadow-cinema-amber/15 transition-all duration-1000"
                style={{ width: `${usedPercent}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-cinema-muted">Used: <span className="text-white font-mono">{formatBytes(storage.used)}</span> ({usedPercent}%)</span>
              <span className="text-cinema-muted">Free: <span className="text-cinema-amber font-mono">{formatBytes(storage.free)}</span></span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-cinema-border pt-5 text-center">
            <div>
              <p className="text-[10px] uppercase font-bold text-cinema-muted tracking-wider">Primary Path</p>
              <p className="text-xs font-semibold text-white mt-1 font-mono truncate" title={status?.videosPath || "/media/Videos"}>
                {status?.videosPath || "/media/Videos"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-cinema-muted tracking-wider">Total capacity</p>
              <p className="text-xs font-semibold text-white mt-1 font-mono">{formatBytes(storage.total)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-cinema-muted tracking-wider">Storage device</p>
              <p className="text-xs font-semibold text-white mt-1 font-mono truncate">
                {status?.os === "Windows" ? "Local C:\\ Drive" : "System Storage Partition"}
              </p>
            </div>
          </div>
        </div>

        {/* 2. SERVER ACTIONS CARD */}
        <div className="bg-cinema-card border border-cinema-border rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-cinema-amber">
              <Server className="w-5 h-5" />
              <h2 className="font-bold text-white text-base">System Admin</h2>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-cinema-border">
                <span className="text-cinema-muted">Server Host IP:</span>
                <span className="text-white font-mono font-bold">
                  {status?.serverIp || window.location.hostname}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-cinema-border">
                <span className="text-cinema-muted">Server OS:</span>
                <span className="text-white font-mono">{status?.os || "Linux"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-cinema-border">
                <span className="text-cinema-muted">Server Port:</span>
                <span className="text-white font-mono">{status?.port || 3000}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-cinema-muted">Server Uptime:</span>
                <span className="text-cinema-amber font-mono font-bold">
                  {status ? formatUptime(status.uptime) : "Syncing..."}
                </span>
              </div>
            </div>
          </div>

          <button
            id="btn-settings-rescan"
            onClick={handleRescan}
            disabled={rescanning || loading}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 bg-cinema-amber text-cinema-bg font-extrabold rounded-xl hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all shadow-lg shadow-cinema-amber/15 cursor-pointer text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${rescanning ? "animate-spin" : ""}`} />
            {rescanning ? "Scanning Filesystem..." : "Rescan Media Library"}
          </button>

          <button
            id="btn-settings-clear-thumbs"
            onClick={handleClearThumbnails}
            disabled={clearingThumbs || loading}
            className={`w-full mt-2.5 flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-xs transition-all border ${
              confirmClearThumbs 
                ? "bg-red-600/20 text-red-400 border-red-500 hover:bg-red-600/35"
                : "bg-white/[0.03] text-cinema-muted border-cinema-border hover:bg-white/[0.08] hover:text-white"
            } active:scale-95 disabled:opacity-50 disabled:active:scale-100 cursor-pointer`}
          >
            {clearingThumbs ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Purging Thumbnail Cache...</span>
              </>
            ) : confirmClearThumbs ? (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm: Purge Old Thumbnails?</span>
              </>
            ) : (
              <>
                <Image className="w-3.5 h-3.5" />
                <span>Purge & Regenerate Thumbnails</span>
              </>
            )}
          </button>

          {thumbsClearedMessage && (
            <div className="text-[11px] text-cinema-amber mt-2 text-center animate-pulse bg-cinema-amber/5 py-1 px-2 rounded-lg border border-cinema-amber/10">
              {thumbsClearedMessage}
            </div>
          )}
        </div>
      </div>

      {/* Directory Management Dashboard */}
      <div className="bg-cinema-card border border-cinema-border rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-cinema-border pb-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-cinema-amber" />
            <h2 className="font-bold text-white text-base">Media Library Directory Manager</h2>
          </div>
          <span className="text-[11px] text-cinema-muted font-mono">
            Support for multiple directories per category
          </span>
        </div>

        <form onSubmit={handleSaveDirectories} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderPathInputsSection("Music Directories", musicPaths, setMusicPaths, "music")}
            {renderPathInputsSection("Movies Directories", moviesPaths, setMoviesPaths, "videos")}
            {renderPathInputsSection("TV Shows Directories", tvShowsPaths, setTvShowsPaths, "videos")}
            {renderPathInputsSection("Other Videos Directories", otherVideosPaths, setOtherVideosPaths, "videos")}
          </div>

          {saveDirsSuccess && (
            <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-4 py-2.5 rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <span>{saveDirsSuccess}</span>
            </div>
          )}

          {saveDirsError && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>{saveDirsError}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingDirs}
              className="flex items-center gap-2 px-5 py-2.5 bg-cinema-amber text-cinema-bg font-extrabold rounded-xl hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shadow-lg shadow-cinema-amber/15 cursor-pointer text-xs uppercase tracking-wider"
            >
              {savingDirs ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Saving Configuration...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Directory Configuration
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 3. CATALOG SUMMARIES & NETWORK HOVER CARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Media Counts */}
        <div className="bg-cinema-card border border-cinema-border rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider border-b border-cinema-border pb-2">Catalog Summaries</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/[0.01] border border-cinema-border rounded-xl p-4 flex flex-col items-center">
              <Film className="w-6 h-6 text-cinema-amber mb-2" />
              <span className="text-2xl font-bold text-white font-mono">{status?.movies ?? movies.length}</span>
              <span className="text-[10px] text-cinema-muted font-bold uppercase mt-1">Movies</span>
            </div>
            
            <div className="bg-white/[0.01] border border-cinema-border rounded-xl p-4 flex flex-col items-center">
              <Music className="w-6 h-6 text-cinema-amber mb-2" />
              <span className="text-2xl font-bold text-white font-mono">{status?.music ?? 0}</span>
              <span className="text-[10px] text-cinema-muted font-bold uppercase mt-1">Tracks</span>
            </div>
          </div>
        </div>

        {/* Local Wi-Fi Connection Card */}
        <div className="bg-cinema-card border border-cinema-border rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider border-b border-cinema-border pb-2 flex items-center gap-1.5">
              <Wifi className="w-4 h-4 text-cinema-amber" /> Local Offline Access Guide
            </h3>
            <p className="text-xs text-cinema-muted mt-3 leading-relaxed">
              This streaming app operates strictly inside your private local network router loop. No data leaves your home, and no external internet access is required.
            </p>
          </div>

          <div className="bg-white/[0.01] border border-cinema-border rounded-xl p-3 mt-4 text-[11px] font-mono space-y-1.5 text-cinema-muted">
            <p>📡 <span className="text-white font-semibold">Server Name:</span> {status?.appName || "Inaetia Studios"}</p>
            <p>🔗 <span className="text-white font-semibold">Address:</span> http://{status?.serverIp || window.location.hostname}:{status?.port || 3000}</p>
            <p>💻 <span className="text-white font-semibold">Clients:</span> PC, iPad/iPhone Safari, Android Chrome, Smart TV</p>
          </div>
        </div>
      </div>

      {/* 4. TMM LIBRARY HEALTH DASHBOARD */}
      <div className="bg-cinema-card border border-cinema-border rounded-2xl p-6 shadow-xl space-y-6" id="tmm-health-dashboard">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cinema-border pb-3">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-cinema-amber animate-pulse" />
            <h2 className="font-bold text-white text-base">Metadata & Artwork Health Dashboard</h2>
          </div>
          <span className="text-[11px] font-mono text-cinema-muted">
            Powered by Tiny Media Manager (TMM) Integration
          </span>
        </div>

        {health ? (
          <div className="space-y-6">
            {/* Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              <div className="bg-white/[0.02] border border-cinema-border rounded-xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-cinema-muted text-[10px] font-bold uppercase tracking-wider">Total Video Files</span>
                <span className="text-xl font-black text-white mt-1 font-mono">{health.totalItems}</span>
              </div>
              <div className="bg-white/[0.02] border border-cinema-border rounded-xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-cinema-muted text-[10px] font-bold uppercase tracking-wider">NFO Metadata</span>
                <span className="text-xl font-black text-white mt-1 font-mono">{health.nfoCount} ({Math.round(health.nfoCoverage)}%)</span>
              </div>
              <div className="bg-white/[0.02] border border-cinema-border rounded-xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-cinema-muted text-[10px] font-bold uppercase tracking-wider">Portrait Posters</span>
                <span className="text-xl font-black text-white mt-1 font-mono">{health.posterCount} ({Math.round(health.posterCoverage)}%)</span>
              </div>
              <div className="bg-white/[0.02] border border-cinema-border rounded-xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-cinema-muted text-[10px] font-bold uppercase tracking-wider">Fanart Backdrops</span>
                <span className="text-xl font-black text-white mt-1 font-mono">{health.fanartCount} ({Math.round(health.fanartCoverage)}%)</span>
              </div>
              <div className="bg-white/[0.02] border border-cinema-border rounded-xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-cinema-muted text-[10px] font-bold uppercase tracking-wider">Rich Descriptions</span>
                <span className="text-xl font-black text-white mt-1 font-mono">{health.richMetadataCount} ({Math.round(health.richMetadataCoverage)}%)</span>
              </div>
            </div>

            {/* Coverage Progress Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-4">
                {/* NFO */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1.5 text-white font-medium">
                      <ShieldCheck className="w-4 h-4 text-cinema-amber" />
                      NFO Metadata Coverage
                    </span>
                    <span className="font-bold text-cinema-amber font-mono">{Math.round(health.nfoCoverage)}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div className="bg-cinema-amber h-full rounded-full" style={{ width: `${health.nfoCoverage}%` }} />
                  </div>
                  <p className="text-[10px] text-cinema-muted">
                    NFO files provide structured details like actors, ratings, and studio info.
                  </p>
                </div>

                {/* Posters */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1.5 text-white font-medium">
                      <Image className="w-4 h-4 text-cinema-amber" />
                      Portrait Poster Coverage (2:3 Aspect)
                    </span>
                    <span className="font-bold text-cinema-amber font-mono">{Math.round(health.posterCoverage)}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div className="bg-cinema-amber h-full rounded-full" style={{ width: `${health.posterCoverage}%` }} />
                  </div>
                  <p className="text-[10px] text-cinema-muted">
                    Standardized portrait artwork files used for movie and TV series listing grids.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Fanarts */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1.5 text-white font-medium">
                      <Sparkles className="w-4 h-4 text-cinema-amber" />
                      Scenic Fanart Backgrounds
                    </span>
                    <span className="font-bold text-cinema-amber font-mono">{Math.round(health.fanartCoverage)}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div className="bg-cinema-amber h-full rounded-full" style={{ width: `${health.fanartCoverage}%` }} />
                  </div>
                  <p className="text-[10px] text-cinema-muted">
                    Wide background backdrops loaded on the detailed immersive movie models.
                  </p>
                </div>

                {/* Rich TMM Descriptions */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1.5 text-white font-medium">
                      <Activity className="w-4 h-4 text-cinema-amber" />
                      Rich Content (Plot + Genres + Studio)
                    </span>
                    <span className="font-bold text-cinema-amber font-mono">{Math.round(health.richMetadataCoverage)}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div className="bg-cinema-amber h-full rounded-full" style={{ width: `${health.richMetadataCoverage}%` }} />
                  </div>
                  <p className="text-[10px] text-cinema-muted">
                    Ensures your videos contain complete synopsis descriptions and category tags.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-cinema-muted leading-relaxed bg-white/[0.01] border border-cinema-border rounded-xl p-4 mt-2">
              💡 <span className="text-white font-semibold">Pro Tip:</span> Save your movies and TV series inside their own dedicated directories (e.g. <code className="text-cinema-amber">/mnt/storage/Videos/Movies/The Dark Knight/</code>) and let <span className="font-semibold text-white">Tiny Media Manager (TMM)</span> fetch metadata. Once saved alongside each file, hit <span className="text-white font-semibold">Rescan Media Library</span> above to load beautiful IMAX-quality covers and details!
            </p>
          </div>
        ) : (
          <div className="text-center py-8 text-cinema-muted text-xs animate-pulse">
            Syncing metadata health dashboard stats...
          </div>
        )}
      </div>
    </div>
  );
}
