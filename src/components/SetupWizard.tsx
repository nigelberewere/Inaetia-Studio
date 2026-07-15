import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { safeFetch } from "../utils";
import { 
  Server, Monitor, Cpu, Check, ShieldAlert, 
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

  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-transition from intro to setup screen after 4.2 seconds
  useEffect(() => {
    if (showIntro) {
      const timer = setTimeout(() => {
        setShowIntro(false);
      }, 4200);
      return () => clearTimeout(timer);
    }
  }, [showIntro]);

  // System Info from backend
  const [sysInfo, setSysInfo] = useState({
    os: "Detecting...",
    nodeVersion: "Detecting...",
    ffmpegDetected: false,
    serverIp: "Detecting...",
    appName: "Inaetia Studios"
  });

  // Step 2 Form States for multiple path support per category
  const [musicPaths, setMusicPaths] = useState<string[]>(["media/Music"]);
  const [moviesPaths, setMoviesPaths] = useState<string[]>(["media/Videos/Movies"]);
  const [tvShowsPaths, setTvShowsPaths] = useState<string[]>(["media/Videos/Tv Shows"]);
  const [otherVideosPaths, setOtherVideosPaths] = useState<string[]>(["media/Videos"]);

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
          if (data.themeColor) setSelectedColor(data.themeColor);

          // Parse or default directory arrays
          if (data.musicPaths) {
            setMusicPaths(data.musicPaths.split(","));
          } else if (data.musicPath) {
            setMusicPaths([data.musicPath]);
          }

          if (data.moviesPaths) {
            setMoviesPaths(data.moviesPaths.split(","));
          } else if (data.videosPath) {
            setMoviesPaths([data.videosPath + "/Movies"]);
          }

          if (data.tvShowsPaths) {
            setTvShowsPaths(data.tvShowsPaths.split(","));
          } else if (data.videosPath) {
            setTvShowsPaths([data.videosPath + "/Tv Shows"]);
          }

          if (data.otherVideosPaths) {
            setOtherVideosPaths(data.otherVideosPaths.split(","));
          } else if (data.videosPath) {
            setOtherVideosPaths([data.videosPath]);
          }
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

  // Validation function for a single path
  const validatePath = async (path: string, type: "music" | "videos"): Promise<{ exists: boolean; fileCount: number }> => {
    if (!path.trim()) {
      return { exists: false, fileCount: 0 };
    }
    try {
      const res = await safeFetch("/api/setup/validate-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, type })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error("Error validating path:", path, err);
    }
    return { exists: false, fileCount: 0 };
  };

  const handleNextStep = async () => {
    setErrorMsg(null);

    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      // Validate that at least one path is non-empty for each category
      const activeMusic = musicPaths.filter(p => p.trim() !== "");
      const activeMovies = moviesPaths.filter(p => p.trim() !== "");
      const activeTv = tvShowsPaths.filter(p => p.trim() !== "");
      const activeOther = otherVideosPaths.filter(p => p.trim() !== "");

      if (activeMusic.length === 0 || activeMovies.length === 0 || activeTv.length === 0 || activeOther.length === 0) {
        setErrorMsg("At least one directory path is required for each category.");
        return;
      }

      setLoading(true);
      try {
        // Trigger validation in parallel
        const musicValidations = await Promise.all(activeMusic.map(p => validatePath(p, "music")));
        const moviesValidations = await Promise.all(activeMovies.map(p => validatePath(p, "videos")));
        const tvShowsValidations = await Promise.all(activeTv.map(p => validatePath(p, "videos")));
        const otherVideosValidations = await Promise.all(activeOther.map(p => validatePath(p, "videos")));

        const invalidMusic = activeMusic.filter((_, i) => !musicValidations[i].exists);
        const invalidMovies = activeMovies.filter((_, i) => !moviesValidations[i].exists);
        const invalidTv = activeTv.filter((_, i) => !tvShowsValidations[i].exists);
        const invalidOther = activeOther.filter((_, i) => !otherVideosValidations[i].exists);

        if (invalidMusic.length > 0 || invalidMovies.length > 0 || invalidTv.length > 0 || invalidOther.length > 0) {
          let error = "The following directories were not found on the server:\n";
          if (invalidMusic.length > 0) error += `• Music: ${invalidMusic.join(", ")}\n`;
          if (invalidMovies.length > 0) error += `• Movies: ${invalidMovies.join(", ")}\n`;
          if (invalidTv.length > 0) error += `• TV Shows: ${invalidTv.join(", ")}\n`;
          if (invalidOther.length > 0) error += `• Other Videos: ${invalidOther.join(", ")}\n`;
          error += "Please verify that the paths exist on your host system.";
          setErrorMsg(error);
          setLoading(false);
          return;
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

    const activeMusic = musicPaths.filter(p => p.trim() !== "");
    const activeMovies = moviesPaths.filter(p => p.trim() !== "");
    const activeTv = tvShowsPaths.filter(p => p.trim() !== "");
    const activeOther = otherVideosPaths.filter(p => p.trim() !== "");

    try {
      const res = await safeFetch("/api/setup/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          musicPaths: activeMusic,
          moviesPaths: activeMovies,
          tvShowsPaths: activeTv,
          otherVideosPaths: activeOther,
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

  const renderPathCategoryInputs = (
    title: string,
    paths: string[],
    setPaths: React.Dispatch<React.SetStateAction<string[]>>,
    type: "music" | "videos",
    description: string
  ) => {
    const addPath = () => {
      setPaths([...paths, ""]);
    };

    const removePath = (index: number) => {
      if (paths.length === 1) {
        setPaths([""]);
      } else {
        setPaths(paths.filter((_, i) => i !== index));
      }
    };

    const updatePathValue = (index: number, val: string) => {
      const updated = [...paths];
      updated[index] = val;
      setPaths(updated);
    };

    return (
      <div className="space-y-2 bg-black/25 p-4 rounded-2xl border border-cinema-border/50">
        <div className="flex justify-between items-center">
          <div className="space-y-0.5 text-left">
            <label className="font-bold text-xs uppercase text-zinc-300 tracking-wider flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-cinema-amber" /> {title}
            </label>
            <p className="text-[10px] text-zinc-500 italic">{description}</p>
          </div>
          <button
            type="button"
            onClick={addPath}
            className="text-[10px] text-cinema-amber font-extrabold bg-cinema-amber/10 px-2.5 py-1 rounded-lg border border-cinema-amber/20 hover:bg-cinema-amber/20 transition-all cursor-pointer"
          >
            + Add Path
          </button>
        </div>
        <div className="space-y-2 pt-1">
          {paths.map((p, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder={type === "music" ? "e.g. /home/user/Music" : "e.g. /home/user/Videos"}
                value={p}
                onChange={(e) => updatePathValue(idx, e.target.value)}
                className="flex-1 bg-[#070712] border border-cinema-border/60 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cinema-amber"
              />
              <button
                type="button"
                onClick={() => removePath(idx)}
                className="text-zinc-500 hover:text-red-400 p-2 border border-cinema-border/40 hover:border-red-500/30 rounded-xl transition-all cursor-pointer"
                title="Remove path"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      {showIntro ? (
        <motion.div
          key="intro-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.8, ease: "easeInOut" } }}
          className="fixed inset-0 bg-[#020208] flex flex-col justify-center items-center p-6 z-50 overflow-hidden font-sans"
          id="intro-screen"
        >
          {/* Ambient particle glows */}
          <div className="absolute w-[500px] h-[500px] bg-cinema-amber/10 rounded-full blur-[140px] -top-40 -left-40 animate-pulse pointer-events-none" />
          <div className="absolute w-[400px] h-[400px] bg-purple-600/[0.04] rounded-full blur-[120px] -bottom-20 -right-20 pointer-events-none" />

          <div className="text-center relative z-10 space-y-8 max-w-2xl">
            {/* Logo Mark or Accent */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                y: [0, -10, 0],
              }}
              transition={{ 
                delay: 0.2, 
                duration: 1, 
                ease: "easeOut",
                y: {
                  repeat: Infinity,
                  duration: 2.5,
                  ease: "easeInOut"
                }
              }}
              className="flex justify-center mb-2"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cinema-amber to-amber-300 flex items-center justify-center shadow-[0_0_50px_rgba(245,166,35,0.3)] border border-white/20">
                  <Play className="w-7 h-7 text-black fill-black ml-0.5" />
                </div>
                {/* Pulsing ring around the play icon */}
                <span className="absolute -inset-2 rounded-2xl border border-cinema-amber/30 animate-ping opacity-75" />
              </div>
            </motion.div>

            {/* Main Animated Title */}
            <motion.div
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.08,
                    delayChildren: 0.5,
                  }
                }
              }}
              initial="hidden"
              animate="visible"
              className="flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-2"
            >
              <div className="flex gap-1.5 sm:gap-2.5">
                {"INAETIA".split("").map((char, index) => (
                  <motion.span
                    key={`left-${index}`}
                    variants={{
                      hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
                      visible: { opacity: 1, y: 0, filter: "blur(0px)" }
                    }}
                    transition={{ type: "spring", damping: 10, stiffness: 100 }}
                    className="text-4xl sm:text-6xl md:text-7xl font-black tracking-normal bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                  >
                    {char}
                  </motion.span>
                ))}
              </div>
              <div className="flex gap-1.5 sm:gap-2.5">
                {"STUDIOS".split("").map((char, index) => (
                  <motion.span
                    key={`right-${index}`}
                    variants={{
                      hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
                      visible: { opacity: 1, y: 0, filter: "blur(0px)" }
                    }}
                    transition={{ type: "spring", damping: 10, stiffness: 100 }}
                    className="text-4xl sm:text-6xl md:text-7xl font-black tracking-normal bg-gradient-to-b from-cinema-amber via-amber-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(245,166,35,0.3)]"
                  >
                    {char}
                  </motion.span>
                ))}
              </div>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, letterSpacing: "0.1em" }}
              animate={{ opacity: 1, letterSpacing: "0.3em" }}
              transition={{ delay: 1.8, duration: 1.5, ease: "easeOut" }}
              className="text-[10px] sm:text-xs uppercase text-zinc-500 tracking-[0.3em] font-mono"
            >
              ENTERTAINMENT SYSTEMS
            </motion.p>

            {/* Glowing Action Button or Auto-skip progress bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.2, duration: 0.8 }}
              className="pt-6 flex flex-col items-center gap-4"
            >
              <button
                onClick={() => setShowIntro(false)}
                className="group relative px-8 py-3 bg-white/5 hover:bg-cinema-amber text-white hover:text-black font-extrabold text-xs sm:text-sm tracking-widest uppercase rounded-full border border-white/15 hover:border-cinema-amber shadow-lg transition-all duration-300 active:scale-95 cursor-pointer"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Launch Setup <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <span className="absolute inset-0 rounded-full bg-cinema-amber/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </button>

              <div className="w-32 h-[2px] bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3.5, delay: 0.5, ease: "linear" }}
                  className="h-full bg-cinema-amber shadow-[0_0_8px_rgba(245,166,35,0.8)]"
                />
              </div>
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono">
                Auto-starting...
              </span>
            </motion.div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="setup-screen"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="min-h-screen bg-[#06060F] text-white flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 select-none font-sans w-full"
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
            <div className="flex-1 min-h-[300px] flex flex-col justify-center">
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
                        <Server className="w-3.5 h-3.5" /> Welcome to {appNameInput}
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
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                        Setup Media Directories
                      </h2>
                      <p className="text-cinema-muted text-xs">
                        Configure directories for each library category separately. You can add multiple paths per category.
                      </p>
                    </div>

                    <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1.5 scrollbar-thin">
                      {/* Music Category */}
                      {renderPathCategoryInputs(
                        "Music Directories",
                        musicPaths,
                        setMusicPaths,
                        "music",
                        "Files will be indexed as music tracks"
                      )}

                      {/* Movies Category */}
                      {renderPathCategoryInputs(
                        "Movies Directories",
                        moviesPaths,
                        setMoviesPaths,
                        "videos",
                        "Files will be indexed as full-length movies"
                      )}

                      {/* TV Shows Category */}
                      {renderPathCategoryInputs(
                        "TV Shows Directories",
                        tvShowsPaths,
                        setTvShowsPaths,
                        "videos",
                        "Files will be grouped into TV Series, seasons, and episodes"
                      )}

                      {/* Other Videos Category */}
                      {renderPathCategoryInputs(
                        "Other Videos Directories",
                        otherVideosPaths,
                        setOtherVideosPaths,
                        "videos",
                        "Miscellaneous movies, home videos, clips, or sub-channel media"
                      )}
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
              <div className="text-xs text-red-500 bg-red-600/10 border border-red-500/20 px-4 py-2.5 rounded-xl text-left whitespace-pre-wrap flex items-start gap-2 max-h-[140px] overflow-y-auto">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Footer Navigation Buttons */}
            <div className="flex justify-between gap-3 pt-2">
              {step > 1 ? (
                <button
                  type="button"
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
                  type="button"
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
                  type="button"
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
                      Finish Installation <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
