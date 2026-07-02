import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { safeFetch } from "../utils";
import { 
  Sparkles, Monitor, Cpu, Check, ShieldAlert, 
  Folder, ArrowRight, ArrowLeft, Loader2, Play
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const PRESET_COLORS = [
  { name: "Amber Gold", hex: "#F5A623" },
  { name: "Crimson Red", hex: "#E74C3C" },
  { name: "Vibrant Blue", hex: "#3498DB" },
  { name: "Emerald Green", hex: "#2ECC71" },
  { name: "Royal Purple", hex: "#9B59B6" },
  { name: "Ocean Teal", hex: "#1ABC9C" }
];

export default function SetupWizard() {
  const { 
    setSetupComplete, 
    setThemeColor, 
    setAppName, 
    themeColor: currentGlobalColor 
  } = useApp();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // System Info from backend
  const [sysInfo, setSysInfo] = useState({
    os: "Detecting...",
    nodeVersion: "Detecting...",
    ffmpegDetected: false,
    serverIp: "Detecting...",
    appName: "Inaetia Studios"
  });

  // Step 2 Form States
  const [videosPath, setVideosPath] = useState("/path/to/videos");
  const [musicPath, setMusicPath] = useState("/path/to/music");
  const [musicVideosPath, setMusicVideosPath] = useState("");
  
  // Path verification statuses
  const [videosValid, setVideosValid] = useState<boolean | null>(null);
  const [videosCount, setVideosCount] = useState<number>(0);
  const [videosLoading, setVideosLoading] = useState(false);

  const [musicValid, setMusicValid] = useState<boolean | null>(null);
  const [musicCount, setMusicCount] = useState<number>(0);
  const [musicLoading, setMusicLoading] = useState(false);

  const [musicVideosValid, setMusicVideosValid] = useState<boolean | null>(null);
  const [musicVideosCount, setMusicVideosCount] = useState<number>(0);
  const [musicVideosLoading, setMusicVideosLoading] = useState(false);

  // Step 3 Performance Profiles
  const [perfProfile, setPerfProfile] = useState<"low" | "mid" | "high">("mid");

  // Step 4 Appearance
  const [selectedColor, setSelectedColor] = useState("#F5A623");
  const [appNameInput, setAppNameInput] = useState("Inaetia Studios");

  // Fetch initial system info
  useEffect(() => {
    const fetchSysInfo = async () => {
      try {
        const res = await safeFetch("/api/setup/status");
        if (res.ok) {
          const data = await res.json();
          setSysInfo({
            os: data.os,
            nodeVersion: data.nodeVersion,
            ffmpegDetected: data.ffmpegDetected,
            serverIp: data.serverIp,
            appName: data.appName
          });
          setAppNameInput(data.appName || "Inaetia Studios");
          if (data.videosPath) setVideosPath(data.videosPath);
          if (data.musicPath) setMusicPath(data.musicPath);
          if (data.musicVideosPath) setMusicVideosPath(data.musicVideosPath);
          if (data.themeColor) setSelectedColor(data.themeColor);
        }
      } catch (err) {
        console.error("Error loading system setup info:", err);
      }
    };
    fetchSysInfo();
  }, []);

  // Set local color picker to match any returned custom color
  useEffect(() => {
    if (selectedColor) {
      setThemeColor(selectedColor);
    }
  }, [selectedColor]);

  // Validation routines for media paths
  const validateSinglePath = async (path: string, type: "videos" | "music" | "musicvideos") => {
    if (!path.trim()) {
      if (type === "musicvideos") {
        setMusicVideosValid(null);
        setMusicVideosCount(0);
      }
      return;
    }

    if (type === "videos") {
      setVideosLoading(true);
      setVideosValid(null);
    } else if (type === "music") {
      setMusicLoading(true);
      setMusicValid(null);
    } else {
      setMusicVideosLoading(true);
      setMusicVideosValid(null);
    }

    try {
      const res = await safeFetch("/api/setup/validate-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, type: type === "music" ? "music" : "videos" })
      });

      if (res.ok) {
        const data = await res.json();
        if (type === "videos") {
          setVideosValid(data.exists);
          setVideosCount(data.fileCount);
        } else if (type === "music") {
          setMusicValid(data.exists);
          setMusicCount(data.fileCount);
        } else {
          setMusicVideosValid(data.exists);
          setMusicVideosCount(data.fileCount);
        }
      } else {
        throw new Error("Validation failed");
      }
    } catch (err) {
      if (type === "videos") setVideosValid(false);
      else if (type === "music") setMusicValid(false);
      else setMusicVideosValid(false);
    } finally {
      if (type === "videos") setVideosLoading(false);
      else if (type === "music") setMusicLoading(false);
      else setMusicVideosLoading(false);
    }
  };

  const handleNextStep = async () => {
    setErrorMsg(null);

    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      // Validate paths before continuing
      if (!videosPath.trim() || !musicPath.trim()) {
        setErrorMsg("Videos folder and Music folder paths are required.");
        return;
      }

      setLoading(true);
      try {
        // Trigger verification requests
        const [vRes, mRes] = await Promise.all([
          safeFetch("/api/setup/validate-path", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: videosPath, type: "videos" })
          }),
          safeFetch("/api/setup/validate-path", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: musicPath, type: "music" })
          })
        ]);

        const vData = vRes.ok ? await vRes.json() : { exists: false, fileCount: 0 };
        const mData = mRes.ok ? await mRes.json() : { exists: false, fileCount: 0 };

        setVideosValid(vData.exists);
        setVideosCount(vData.fileCount);
        setMusicValid(mData.exists);
        setMusicCount(mData.fileCount);

        if (!vData.exists || !mData.exists) {
          let error = "";
          if (!vData.exists) error += "Videos folder was not found on the server. ";
          if (!mData.exists) error += "Music folder was not found on the server.";
          setErrorMsg(error);
          setLoading(false);
          return;
        }

        // If optional music videos path is set, validate it too
        if (musicVideosPath.trim()) {
          const mvRes = await safeFetch("/api/setup/validate-path", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: musicVideosPath, type: "videos" })
          });
          const mvData = mvRes.ok ? await mvRes.json() : { exists: false, fileCount: 0 };
          setMusicVideosValid(mvData.exists);
          setMusicVideosCount(mvData.fileCount);

          if (!mvData.exists) {
            setErrorMsg("Optional Music Videos folder was not found on the server.");
            setLoading(false);
            return;
          }
        }

        setStep(3);
      } catch (err) {
        setErrorMsg("Failed to connect to backend for validation.");
      } finally {
        setLoading(false);
      }
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleFinish = async () => {
    if (!appNameInput.trim()) {
      setErrorMsg("Please enter an Application Name");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await safeFetch("/api/setup/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videosPath,
          musicPath,
          musicVideosPath,
          performanceProfile: perfProfile,
          themeColor: selectedColor,
          appName: appNameInput
        })
      });

      if (res.ok) {
        setAppName(appNameInput);
        setThemeColor(selectedColor);
        setSetupComplete(true);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || "Failed to submit server setup.");
      }
    } catch (err) {
      setErrorMsg("Network error occurred during server configuration.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#06060F] text-white flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 select-none font-sans" 
      id="setup-wizard-screen"
      style={{ "--color-cinema-amber": selectedColor } as any}
    >
      <div className="max-w-xl w-full bg-cinema-card border border-cinema-border rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl space-y-8 flex flex-col relative overflow-hidden">
        
        {/* Absolute Background Ambient Glow */}
        <div 
          className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 pointer-events-none transition-colors duration-1000"
          style={{ backgroundColor: selectedColor }}
        />

        {/* Header Progress Indicator */}
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-cinema-muted">
            <span>Setup Installation</span>
            <span className="text-cinema-amber font-mono font-black">Step {step} of 4</span>
          </div>

          <div className="flex gap-2 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className={`h-full rounded-full flex-1 transition-all duration-300 ${
                  i <= step ? "bg-cinema-amber" : "bg-white/5"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content Wizard Cards with Micro-animations */}
        <div className="flex-1 min-h-[280px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: WELCOME SCREEN */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-cinema-amber/10 text-cinema-amber border border-cinema-amber/20 rounded-full text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" /> Welcome to {appNameInput}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                    Inaetia Studios Server Setup
                  </h1>
                  <p className="text-cinema-muted text-sm leading-relaxed">
                    A beautiful, self-hosted media server designed to scan, index, and stream your videos, music, and local audio channels completely offline on any device.
                  </p>
                </div>

                {/* Detected Server Info Panel */}
                <div className="bg-black/30 border border-cinema-border/60 rounded-2xl p-4 sm:p-5 space-y-3.5 text-xs">
                  <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5" /> Environmental Diagnostics
                  </span>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-cinema-muted">
                    <div className="flex justify-between border-b border-white/5 pb-1.5">
                      <span>Host OS:</span>
                      <span className="text-white font-bold">{sysInfo.os}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1.5">
                      <span>Node.js:</span>
                      <span className="text-white font-bold">{sysInfo.nodeVersion}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1.5 col-span-2">
                      <span>FFmpeg Binary:</span>
                      {sysInfo.ffmpegDetected ? (
                        <span className="text-green-400 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> FOUND
                        </span>
                      ) : (
                        <span className="text-red-400 font-bold flex items-center gap-1 animate-pulse">
                          <ShieldAlert className="w-3.5 h-3.5" /> NOT DETECTED (Scan Limited)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-xs font-semibold text-cinema-muted italic">
                  Let's get your local folders set up in 2 minutes. Click Next to proceed.
                </div>
              </motion.div>
            )}

            {/* STEP 2: MEDIA LIBRARY PATHS */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Setup Media Directories
                  </h2>
                  <p className="text-cinema-muted text-xs">
                    Please provide the absolute file-system directories for your video library and music files on the host computer.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Videos Folder Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-cinema-amber" /> Videos Directory
                      </label>
                      <span className="text-[10px] text-zinc-500 font-mono italic">"Browse" / Root Path</span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. /home/user/Videos"
                        value={videosPath}
                        onChange={(e) => {
                          setVideosPath(e.target.value);
                          setVideosValid(null);
                        }}
                        onBlur={() => validateSinglePath(videosPath, "videos")}
                        className="w-full bg-[#070712] border border-cinema-border rounded-xl pl-3 pr-20 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cinema-amber"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        {videosLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-cinema-amber" />}
                        {videosValid === true && (
                          <span className="text-[10px] text-green-400 font-semibold bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                            {videosCount} Files
                          </span>
                        )}
                        {videosValid === false && (
                          <span className="text-[10px] text-red-400 font-semibold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                            Invalid
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Music Folder Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-cinema-amber" /> Music Directory
                      </label>
                      <span className="text-[10px] text-zinc-500 font-mono italic">Root audio folder</span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. /home/user/Music"
                        value={musicPath}
                        onChange={(e) => {
                          setMusicPath(e.target.value);
                          setMusicValid(null);
                        }}
                        onBlur={() => validateSinglePath(musicPath, "music")}
                        className="w-full bg-[#070712] border border-cinema-border rounded-xl pl-3 pr-20 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cinema-amber"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        {musicLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-cinema-amber" />}
                        {musicValid === true && (
                          <span className="text-[10px] text-green-400 font-semibold bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                            {musicCount} Files
                          </span>
                        )}
                        {musicValid === false && (
                          <span className="text-[10px] text-red-400 font-semibold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                            Invalid
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Optional Music Videos Folder Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-bold uppercase text-zinc-500 tracking-wider flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-zinc-500" /> Music Videos Directory (Optional)
                      </label>
                      <span className="text-[10px] text-zinc-500 font-mono">Optional</span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. /home/user/MusicVideos"
                        value={musicVideosPath}
                        onChange={(e) => {
                          setMusicVideosPath(e.target.value);
                          setMusicVideosValid(null);
                        }}
                        onBlur={() => validateSinglePath(musicVideosPath, "musicvideos")}
                        className="w-full bg-[#070712] border border-cinema-border rounded-xl pl-3 pr-20 py-2.5 text-xs text-zinc-400 font-mono focus:outline-none focus:border-zinc-500"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        {musicVideosLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />}
                        {musicVideosValid === true && (
                          <span className="text-[10px] text-green-400 font-semibold bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                            {musicVideosCount} Files
                          </span>
                        )}
                        {musicVideosValid === false && (
                          <span className="text-[10px] text-red-400 font-semibold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                            Invalid
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: PERFORMANCE PROFILE */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Performance Profile
                  </h2>
                  <p className="text-cinema-muted text-xs">
                    Choose a hardware profile to optimize background file rescans, thumbnail extractions, and client-side processing based on your server capacity.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  
                  {/* LOW END OPTION */}
                  <div 
                    onClick={() => setPerfProfile("low")}
                    className={`border rounded-2xl p-4 flex items-start gap-4 cursor-pointer transition-all duration-300 bg-[#070712]/40 hover:bg-white/[0.02] ${
                      perfProfile === "low" ? "border-cinema-amber shadow-lg shadow-cinema-amber/5" : "border-cinema-border"
                    }`}
                  >
                    <div className="text-2xl pt-1">🐌</div>
                    <div className="space-y-1 text-left flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-white">Low-end Hardware</span>
                        {perfProfile === "low" && <Check className="w-4 h-4 text-cinema-amber" />}
                      </div>
                      <p className="text-[11px] text-cinema-muted">
                        Raspberry Pi, old mini-PC, weak laptops, or systems with less than 2GB RAM. Throttles ffprobe (2 concurrent tasks), background scan interval: 60 minutes.
                      </p>
                    </div>
                  </div>

                  {/* MID RANGE OPTION */}
                  <div 
                    onClick={() => setPerfProfile("mid")}
                    className={`border rounded-2xl p-4 flex items-start gap-4 cursor-pointer transition-all duration-300 bg-[#070712]/40 hover:bg-white/[0.02] ${
                      perfProfile === "mid" ? "border-cinema-amber shadow-lg shadow-cinema-amber/5" : "border-cinema-border"
                    }`}
                  >
                    <div className="text-2xl pt-1">⚡</div>
                    <div className="space-y-1 text-left flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-white">Mid-range Hardware (Default)</span>
                        {perfProfile === "mid" && <Check className="w-4 h-4 text-cinema-amber" />}
                      </div>
                      <p className="text-[11px] text-cinema-muted">
                        Modern mini PCs, dual/quad-core processors, Intel N100, or systems with 4-8GB RAM. Balances resource load (5 concurrent ffprobes), background scan interval: 30 minutes.
                      </p>
                    </div>
                  </div>

                  {/* HIGH END OPTION */}
                  <div 
                    onClick={() => setPerfProfile("high")}
                    className={`border rounded-2xl p-4 flex items-start gap-4 cursor-pointer transition-all duration-300 bg-[#070712]/40 hover:bg-white/[0.02] ${
                      perfProfile === "high" ? "border-cinema-amber shadow-lg shadow-cinema-amber/5" : "border-cinema-border"
                    }`}
                  >
                    <div className="text-2xl pt-1">🚀</div>
                    <div className="space-y-1 text-left flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-white">High-end Server / NAS</span>
                        {perfProfile === "high" && <Check className="w-4 h-4 text-cinema-amber" />}
                      </div>
                      <p className="text-[11px] text-cinema-muted">
                        Dedicated home servers, Synology NAS, Ryzen, or Intel Core i5/i7/i9 desktop CPUs with 16GB+ RAM. Maximizes ingestion speed (10 concurrent ffprobes), background scan interval: 15 minutes.
                      </p>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* STEP 4: APPEARANCE PREVIEW */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Brand & Theme Colors
                  </h2>
                  <p className="text-cinema-muted text-xs">
                    Choose your customized application server name and color theme preset to complete your installation.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* App Name Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
                      Media Server Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Inaetia Studios"
                      value={appNameInput}
                      maxLength={30}
                      onChange={(e) => setAppNameInput(e.target.value)}
                      className="w-full bg-[#070712] border border-cinema-border rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-cinema-amber"
                    />
                  </div>

                  {/* Theme Presets */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
                      Accent Theme Color
                    </label>
                    
                    <div className="grid grid-cols-6 gap-2">
                      {PRESET_COLORS.map((c) => {
                        const isSelected = selectedColor === c.hex;
                        return (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setSelectedColor(c.hex)}
                            style={{ backgroundColor: c.hex }}
                            className="aspect-square rounded-full flex items-center justify-center transition-transform hover:scale-110 relative border border-white/5 shadow-md"
                            title={c.name}
                          >
                            {isSelected && (
                              <Check className="w-4 h-4 text-white drop-shadow" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color Preset Preview Block */}
                  <div className="bg-black/20 border border-cinema-border/60 rounded-2xl p-4 text-center space-y-2 text-xs text-cinema-muted">
                    <p>Live Theme Color Highlight Preview</p>
                    <div className="flex gap-2 justify-center pt-1">
                      <button 
                        style={{ backgroundColor: selectedColor }}
                        className="px-4 py-1.5 text-cinema-bg font-extrabold rounded-lg text-[10px] uppercase shadow-lg shadow-cinema-amber/10"
                      >
                        Sample Button
                      </button>
                      <span 
                        style={{ color: selectedColor }}
                        className="font-black text-xs flex items-center gap-1 font-mono uppercase"
                      >
                        Inaetia FM
                      </span>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Error messaging */}
        {errorMsg && (
          <div className="text-xs text-red-500 bg-red-600/10 border border-red-500/20 px-4 py-2.5 rounded-xl text-left animate-pulse flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex justify-between gap-3 pt-2">
          {step > 1 ? (
            <button
              onClick={handlePrevStep}
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div /> /* spacer */
          )}

          {step < 4 ? (
            <button
              onClick={handleNextStep}
              disabled={loading}
              className="px-6 py-2.5 bg-cinema-amber text-cinema-bg hover:brightness-110 font-extrabold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-cinema-amber/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Validating...
                </>
              ) : (
                <>
                  Next <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={submitting}
              className="px-6 py-2.5 bg-cinema-amber text-cinema-bg hover:brightness-110 font-black rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-cinema-amber/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Provisioning...
                </>
              ) : (
                <>
                  Finish Installation <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
