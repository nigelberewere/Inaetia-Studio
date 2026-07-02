import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { safeFetch } from "../utils";
import { 
  Settings as SettingsIcon, Server, HardDrive, RefreshCw, 
  Film, Music, Cpu, ShieldAlert, Wifi, Trash2, Image
} from "lucide-react";

export default function Settings() {
  const { status, fetchStatus, triggerRescan, loading, movies } = useApp();
  const [rescanning, setRescanning] = useState(false);
  const [clearingThumbs, setClearingThumbs] = useState(false);
  const [confirmClearThumbs, setConfirmClearThumbs] = useState(false);
  const [thumbsClearedMessage, setThumbsClearedMessage] = useState("");

  useEffect(() => {
    fetchStatus();
    // Refresh stats every 10 seconds while on settings page
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

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
              <p className="text-[10px] uppercase font-bold text-cinema-muted tracking-wider">Videos Path</p>
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
    </div>
  );
}
