import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, 
  Radio as RadioIcon, Calendar, X, Disc
} from "lucide-react";

export default function RadioPlayer() {
  const {
    activeStation,
    isPlayingRadio,
    setIsPlayingRadio,
    radioTrack,
    radioVolume,
    setRadioVolume,
    nextStation,
    prevStation,
    stopRadio,
    setActiveView,
    currentVideo
  } = useApp();

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [prevVolume, setPrevVolume] = useState<number>(0.8);

  // Subscribe to time updates from the root audio engine
  useEffect(() => {
    const handleTimeUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      setCurrentTime(customEvent.detail.currentTime || 0);
      setDuration(customEvent.detail.duration || 0);
    };

    window.addEventListener("radio-timeupdate", handleTimeUpdate);
    return () => {
      window.removeEventListener("radio-timeupdate", handleTimeUpdate);
    };
  }, []);

  // Sync state if active station changes or is cleared
  useEffect(() => {
    if (!activeStation) {
      setCurrentTime(0);
      setDuration(0);
    }
  }, [activeStation]);

  // Handle Toast notification listener
  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log("Radio Notification:", customEvent.detail.title, customEvent.detail.message);
    };
    window.addEventListener("radio-toast-notify", handleToast);
    return () => window.removeEventListener("radio-toast-notify", handleToast);
  }, []);

  // Do not render anything if no active station is tuned OR if a video player is active (per user instruction)
  if (!activeStation || currentVideo) return null;

  const togglePlay = () => {
    setIsPlayingRadio(!isPlayingRadio);
  };

  const toggleMute = () => {
    if (isMuted) {
      setRadioVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(radioVolume);
      setRadioVolume(0);
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setRadioVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds === 0) return "0:00";
    const m = Math.floor(timeInSeconds / 60);
    const s = Math.floor(timeInSeconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-40 bg-cinema-card/95 backdrop-blur-lg border-t border-cinema-border px-4 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xl animate-slide-up select-none"
      id="persistent-radio-player"
    >
      {/* Radio Frequency Info Panel */}
      <div className="flex items-center gap-3 w-full md:w-1/4 min-w-[200px]">
        {/* Rotating Tuner Dial Animation */}
        <div 
          className={`relative w-11 h-11 rounded-full bg-zinc-800 flex items-center justify-center border border-cinema-border shrink-0 ${isPlayingRadio ? "animate-spin" : ""}`} 
          style={{ animationDuration: "12s" }}
        >
          <Disc className="w-6 h-6 text-cinema-amber" />
          <div className="absolute w-2.5 h-2.5 rounded-full bg-cinema-bg border border-zinc-800" />
        </div>
        
        <div className="flex flex-col min-w-0">
          <span className="font-extrabold text-sm text-cinema-amber truncate block flex items-center gap-1.5">
            <RadioIcon className="w-3.5 h-3.5" />
            {activeStation.name}
          </span>
          {radioTrack ? (
            <span className="text-xs text-cinema-text truncate block mt-0.5" title={`${radioTrack.title} - ${radioTrack.artist}`}>
              {radioTrack.title} • {radioTrack.artist || "Unknown"}
            </span>
          ) : (
            <span className="text-xs text-cinema-muted italic block mt-0.5">
              Tuning live track...
            </span>
          )}
        </div>
      </div>

      {/* Center Tuner & Playback Control */}
      <div className="flex flex-col items-center gap-1.5 w-full md:w-2/4">
        <div className="flex items-center gap-4">
          <button
            onClick={prevStation}
            className="p-2 rounded-full hover:bg-white/5 text-cinema-muted hover:text-white transition-all active:scale-90"
            title="Previous Radio Station"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>
          
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-cinema-amber text-cinema-bg flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md shadow-cinema-amber/10"
            title={isPlayingRadio ? "Pause Stream" : "Play Stream"}
          >
            {isPlayingRadio ? (
              <Pause className="w-4.5 h-4.5 fill-current" />
            ) : (
              <Play className="w-4.5 h-4.5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={nextStation}
            className="p-2 rounded-full hover:bg-white/5 text-cinema-muted hover:text-white transition-all active:scale-90"
            title="Next Radio Station"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* Dynamic seek progress display (strictly visual since live streams cannot be manual seek-buffered) */}
        <div className="flex items-center gap-2.5 w-full max-w-md">
          <span className="text-[10px] font-mono text-cinema-muted w-8 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-cinema-amber rounded-full transition-all duration-300" 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-cinema-muted w-8 text-left">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right Tools Panel: Volume & Schedule Short-cuts & Shut-down button */}
      <div className="flex items-center justify-end gap-3.5 w-full md:w-1/4">
        {/* Schedule guide link */}
        <button
          onClick={() => setActiveView("radioguide")}
          className="p-2 rounded-full hover:bg-white/5 text-cinema-muted hover:text-white transition-all active:scale-90"
          title="Open Programming Guide"
        >
          <Calendar className="w-4.5 h-4.5" />
        </button>

        {/* Volume controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-full hover:bg-white/5 text-cinema-muted hover:text-white transition-all"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || radioVolume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : radioVolume}
            onChange={handleVolumeChange}
            className="w-20 accent-cinema-amber bg-zinc-800 h-1 rounded-lg cursor-pointer appearance-none"
            title="Volume"
          />
        </div>

        {/* Split separator */}
        <div className="w-px h-5 bg-cinema-border" />

        {/* Stop Tuner Radio completely */}
        <button
          onClick={stopRadio}
          className="p-1.5 rounded-full hover:bg-red-500/15 text-cinema-muted hover:text-red-400 border border-transparent hover:border-red-500/10 transition-all active:scale-90"
          title="Turn Off Radio"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
