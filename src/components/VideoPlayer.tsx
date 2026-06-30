import React, { useRef, useState, useEffect } from "react";
import { Movie } from "../types";
import { useApp } from "../context/AppContext";
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  RotateCcw, RotateCw, X, Loader2, FastForward, AlertCircle, Clock 
} from "lucide-react";

interface VideoPlayerProps {
  movie: Movie;
}

// Smart helper to get the chronologically next episode of a TV show
function getNextEpisode(currentVideo: Movie, allMovies: Movie[]): Movie | null {
  if (currentVideo.type !== "episode" || !currentVideo.showName) return null;

  // Filter all episodes of the same show
  const showEpisodes = allMovies.filter(
    (m) => m.type === "episode" && m.showName === currentVideo.showName
  );

  const parseSeasonNumber = (sName: string = "") => {
    const m = sName.match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
  };

  const parseEpisodeNumber = (eTitle: string = "", filename: string = "") => {
    const match = (eTitle + " " + filename).match(/(?:e|ep|episode|ep\.)\s*(\d+)/i) || (eTitle + " " + filename).match(/\b(\d+)\b/);
    return match ? parseInt(match[1], 10) : null;
  };

  // Sort episodes by Season number, then Episode number/filename
  showEpisodes.sort((a, b) => {
    const sA = parseSeasonNumber(a.seasonName);
    const sB = parseSeasonNumber(b.seasonName);
    if (sA !== sB) return sA - sB;

    const epA = parseEpisodeNumber(a.episodeTitle, a.filename);
    const epB = parseEpisodeNumber(b.episodeTitle, b.filename);
    if (epA !== null && epB !== null && epA !== epB) {
      return epA - epB;
    }

    return a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' });
  });

  // Find index of currentVideo
  const currentIndex = showEpisodes.findIndex((m) => m.id === currentVideo.id);
  if (currentIndex !== -1 && currentIndex < showEpisodes.length - 1) {
    return showEpisodes[currentIndex + 1];
  }

  return null;
}

export default function VideoPlayer({ movie }: VideoPlayerProps) {
  const { setCurrentVideo, currentProfile, fetchContinueWatching, fetchProfiles, movies } = useApp();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [resumeTime, setResumeTime] = useState<number | null>(null);
  const [showResumeToast, setShowResumeToast] = useState(false);

  // Next episode autoplay states
  const [showNextEpisodeOverlay, setShowNextEpisodeOverlay] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const nextEpisode = getNextEpisode(movie, movies);

  const handleVideoEnded = () => {
    savePosition(duration || videoRef.current?.currentTime || 0);
    if (nextEpisode) {
      setShowNextEpisodeOverlay(true);
      setCountdown(5);
    } else {
      closePlayer();
    }
  };

  useEffect(() => {
    if (showNextEpisodeOverlay && countdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (showNextEpisodeOverlay && countdown === 0) {
      playNextEpisode();
    }

    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, [showNextEpisodeOverlay, countdown]);

  const playNextEpisode = () => {
    if (nextEpisode) {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
      setShowNextEpisodeOverlay(false);
      setCurrentVideo(nextEpisode);
    }
  };

  const cancelNextEpisode = () => {
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    setShowNextEpisodeOverlay(false);
  };

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load Saved Playback Position from profile history
  useEffect(() => {
    if (!currentProfile) return;

    const fetchSavedPosition = async () => {
      try {
        const res = await fetch(`/api/profiles/${currentProfile.id}/history`);
        if (res.ok) {
          const history = await res.json();
          const savedRecord = history.find((h: any) => h.movieId === movie.id);
          if (savedRecord && savedRecord.position > 10 && !savedRecord.completed) {
            const video = videoRef.current;
            if (video) {
              video.currentTime = savedRecord.position;
              setCurrentTime(savedRecord.position);
            }
            setResumeTime(savedRecord.position);
            setShowResumeToast(true);
          }
        }
      } catch (err) {
        console.error("Error loading saved position:", err);
      } finally {
        setIsBuffering(false);
      }
    };

    fetchSavedPosition();
  }, [movie.id, currentProfile]);

  // Handle Controls Visibility Timeout
  const triggerControlsVisibility = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2500);
  };

  useEffect(() => {
    window.addEventListener("mousemove", triggerControlsVisibility);
    return () => {
      window.removeEventListener("mousemove", triggerControlsVisibility);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  // Keyboard Shortcuts (Space, F, ESC, Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      // Avoid capturing keyboard shortcuts if user is typing in search
      if (document.activeElement?.tagName === "INPUT") return;

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "escape":
          e.preventDefault();
          closePlayer();
          break;
        case "arrowleft":
          e.preventDefault();
          skipTime(-10);
          break;
        case "arrowright":
          e.preventDefault();
          skipTime(10);
          break;
        case "arrowup":
          e.preventDefault();
          setVolume((prev) => Math.min(prev + 0.05, 1));
          setIsMuted(false);
          break;
        case "arrowdown":
          e.preventDefault();
          setVolume((prev) => Math.max(prev - 0.05, 0));
          setIsMuted(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, isFullscreen]);

  // Apply volume changes
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Action methods
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(console.error);
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    triggerControlsVisibility();
  };

  const savePosition = async (time: number) => {
    if (!currentProfile) return;
    const video = videoRef.current;
    if (!video) return;
    const videoDuration = video.duration || duration || movie.duration;
    if (!videoDuration) return;

    try {
      await fetch(`/api/profiles/${currentProfile.id}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: movie.id,
          position: Math.round(time),
          duration: Math.round(videoDuration)
        })
      });
      fetchContinueWatching();
    } catch (err) {
      console.error("Error saving watch position:", err);
    }
  };

  // Every 10 seconds during playback, POST current position to history
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (videoRef.current) {
        savePosition(videoRef.current.currentTime);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isPlaying, movie.id]);

  const closePlayer = async () => {
    if (videoRef.current) {
      const finalTime = videoRef.current.currentTime;
      await savePosition(finalTime);
    }
    await fetchProfiles();
    setCurrentVideo(null);
  };

  const skipTime = (amount: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + amount));
      triggerControlsVisibility();
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (video) {
      const seekVal = parseFloat(e.target.value);
      video.currentTime = seekVal;
      setCurrentTime(seekVal);
      triggerControlsVisibility();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    triggerControlsVisibility();
  };

  const handlePlaybackRateChange = (rate: number) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = rate;
      setPlaybackRate(rate);
      triggerControlsVisibility();
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
    triggerControlsVisibility();
  };

  // Video Events
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      const current = video.currentTime;
      setCurrentTime(current);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
      setIsBuffering(false);
    }
  };

  // Format MM:SS or HH:MM:SS
  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return "0:00";
    const h = Math.floor(timeInSeconds / 3600);
    const m = Math.floor((timeInSeconds % 3600) / 60);
    const s = Math.floor(timeInSeconds % 60);

    const pad = (num: number) => num.toString().padStart(2, "0");
    if (h > 0) {
      return `${h}:${pad(m)}:${pad(s)}`;
    }
    return `${m}:${pad(s)}`;
  };

  // Detect format support
  const isFormatUnsupported = !movie.extension.toLowerCase().match(/\.(mp4|webm)$/);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none"
      id="fullscreen-video-overlay"
    >
      {/* Video Tag */}
      <video
        ref={videoRef}
        src={`/api/stream/${movie.id}`}
        className="w-full h-full max-h-screen object-contain"
        autoPlay
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={handleVideoEnded}
        onClick={togglePlay}
        playsInline
      />

      {/* Resume Toast */}
      {showResumeToast && resumeTime !== null && (
        <div 
          className="absolute bottom-24 left-6 bg-cinema-card/95 backdrop-blur-md border border-cinema-border p-4 rounded-xl shadow-2xl flex flex-col gap-3 z-30 w-72 md:w-80 animate-fade-in text-white"
          id="video-resume-toast"
        >
          <div className="flex items-start gap-2.5 text-sm">
            <Clock className="w-5 h-5 text-cinema-amber shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Resume watching?</p>
              <p className="text-xs text-cinema-muted">You previously watched up to {formatTime(resumeTime)}</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs font-bold">
            <button
              onClick={() => {
                setShowResumeToast(false);
                const video = videoRef.current;
                if (video && video.paused) {
                  video.play().catch(console.error);
                }
              }}
              className="flex-1 py-2 bg-cinema-amber hover:bg-amber-600 text-cinema-bg rounded-lg active:scale-95 transition-all cursor-pointer"
              id="btn-video-resume"
            >
              Resume
            </button>
            <button
              onClick={() => {
                const video = videoRef.current;
                if (video) {
                  video.currentTime = 0;
                  setCurrentTime(0);
                  if (video.paused) {
                    video.play().catch(console.error);
                  }
                }
                setShowResumeToast(false);
              }}
              className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg active:scale-95 transition-all cursor-pointer"
              id="btn-video-start-over"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 gap-3 z-10 pointer-events-none">
          <Loader2 className="w-12 h-12 text-cinema-amber animate-spin" />
          <span className="text-sm font-mono text-cinema-amber tracking-wider">BUFFERING...</span>
        </div>
      )}

      {/* Warning Alert Banner for MKV/AVI/unsupported formats */}
      {isFormatUnsupported && (
        <div className="absolute top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-xl z-20 bg-amber-500/10 backdrop-blur-md border border-amber-500/20 text-amber-200 p-3 rounded-lg flex items-start gap-2 text-xs">
          <AlertCircle className="w-5 h-5 text-cinema-amber shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-cinema-amber">Format Warning: {movie.extension.toUpperCase()}</p>
            <p>
              Your browser may not support this container natively. If playback fails, convert this file to H.264 <b>.mp4</b> using:
            </p>
            <code className="block bg-black/50 p-1.5 rounded font-mono text-[10px] break-all select-all">
              ffmpeg -i "{movie.filename}" -c:v libx264 -c:a aac -preset fast output.mp4
            </code>
          </div>
        </div>
      )}

      {/* Custom Video Controls Overlay */}
      <div 
        className={`absolute inset-0 flex flex-col justify-between p-4 md:p-6 bg-gradient-to-t from-black/80 via-transparent to-black/45 transition-opacity duration-300 z-10 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-cinema-muted tracking-wider uppercase font-medium">NOW STREAMING</span>
            <span className="text-base md:text-lg font-bold text-white drop-shadow-sm">{movie.title}</span>
          </div>

          <button 
            onClick={closePlayer}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 hover:text-cinema-amber text-white transition-all cursor-pointer"
            title="Close Player (ESC)"
            id="btn-close-player"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Control Box */}
        <div className="space-y-4">
          {/* Progress Timeline Row */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-cinema-muted w-12 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeekChange}
              className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer bg-white/20 accent-cinema-amber focus:outline-none"
              title="Seek Timeline"
            />
            <span className="text-xs font-mono text-cinema-muted w-12 text-left">
              {formatTime(duration)}
            </span>
          </div>

          {/* Buttons and Settings Control Row */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2.5">
              {/* Back 10s */}
              <button
                onClick={() => skipTime(-10)}
                className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title="Rewind 10s (Left Arrow)"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                className="p-3 rounded-full bg-cinema-amber text-cinema-bg hover:scale-105 active:scale-95 transition-all shadow-md shadow-cinema-amber/15"
                title="Play/Pause (Space)"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              {/* Forward 10s */}
              <button
                onClick={() => skipTime(10)}
                className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title="Skip 10s (Right Arrow)"
              >
                <RotateCw className="w-5 h-5" />
              </button>

              {/* Next Episode Shortcut Button */}
              {nextEpisode && (
                <button
                  onClick={() => setCurrentVideo(nextEpisode)}
                  className="p-2.5 rounded-full text-white/80 hover:text-cinema-amber hover:bg-white/10 transition-colors flex items-center gap-1.5"
                  title={`Next Episode: ${nextEpisode.episodeTitle || nextEpisode.title}`}
                  id="btn-next-episode-skip"
                >
                  <FastForward className="w-5 h-5 fill-current text-cinema-amber" />
                  <span className="hidden sm:inline text-xs font-semibold">Next Ep</span>
                </button>
              )}

              {/* Volume Controller */}
              <div className="flex items-center gap-1.5 ml-2 group/volume">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  title="Mute"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-0 group-hover/volume:w-16 h-1 rounded-lg appearance-none bg-white/20 accent-cinema-amber transition-all duration-300 focus:outline-none"
                  title="Volume (Up/Down Arrow)"
                />
              </div>
            </div>

            {/* Right-aligned speed and screen settings */}
            <div className="flex items-center gap-3">
              {/* Playback speed selector */}
              <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5 text-xs">
                {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handlePlaybackRateChange(rate)}
                    className={`px-2 py-1 rounded font-semibold transition-all cursor-pointer ${
                      playbackRate === rate 
                        ? "bg-cinema-amber text-cinema-bg" 
                        : "text-cinema-muted hover:text-white"
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title="Fullscreen (F)"
              >
                {isFullscreen ? <Minimize2 className="w-4.5 h-4.5" /> : <Maximize2 className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Up Next / Autoplay Next Episode Overlay */}
      {showNextEpisodeOverlay && nextEpisode && (
        <div 
          className="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center text-white px-4 text-center animate-fade-in"
          id="tv-show-next-episode-countdown-overlay"
        >
          <div className="max-w-md w-full bg-zinc-900/90 border border-zinc-800 p-8 rounded-2xl shadow-2xl space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-cinema-amber tracking-wider uppercase bg-cinema-amber/10 px-3 py-1 rounded-full">UP NEXT</span>
              <h2 className="text-2xl font-black mt-3 leading-tight">{nextEpisode.showName}</h2>
              <p className="text-sm text-zinc-400 font-medium">
                {nextEpisode.seasonName} • Episode {nextEpisode.episodeTitle}
              </p>
            </div>

            {/* Visual Countdown Ring / Core */}
            <div className="relative flex items-center justify-center py-4">
              <div className="w-24 h-24 rounded-full border-4 border-zinc-800 flex items-center justify-center relative">
                {/* Simulated spinning border */}
                <div className="absolute inset-0 rounded-full border-4 border-cinema-amber border-t-transparent animate-spin duration-1000" />
                <span className="text-3xl font-black font-mono text-cinema-amber">{countdown}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={playNextEpisode}
                className="flex-1 py-3 px-5 bg-cinema-amber hover:bg-amber-600 text-cinema-bg font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
                id="btn-play-next-episode-now"
              >
                Play Now
              </button>
              <button
                onClick={cancelNextEpisode}
                className="flex-1 py-3 px-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
                id="btn-cancel-next-episode"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
