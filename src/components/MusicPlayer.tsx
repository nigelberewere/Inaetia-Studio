import React, { useRef, useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, 
  Disc, ListMusic, Music, Loader2 
} from "lucide-react";

export default function MusicPlayer() {
  const {
    currentTrack,
    isPlayingAudio,
    setIsPlayingAudio,
    playNextTrack,
    playPrevTrack,
    playingQueue,
  } = useApp();

  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Auto trigger audio playback on track switch
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    audio.src = `/api/music/stream/${currentTrack.id}`;
    setIsBuffering(true);
    
    if (isPlayingAudio) {
      audio.play().catch((err) => {
        console.error("Audio playback error:", err);
        setIsPlayingAudio(false);
      });
    }
  }, [currentTrack]);

  // Synchronize playing states
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlayingAudio) {
      audio.play().catch((err) => {
        console.error("Audio playback error:", err);
        setIsPlayingAudio(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlayingAudio]);

  // Sync volume
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  if (!currentTrack) return null;

  const togglePlay = () => {
    setIsPlayingAudio(!isPlayingAudio);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsBuffering(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const val = parseFloat(e.target.value);
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return "0:00";
    const m = Math.floor(timeInSeconds / 60);
    const s = Math.floor(timeInSeconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-40 bg-cinema-card/95 backdrop-blur-lg border-t border-cinema-border px-4 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xl animate-slide-up"
      id="persistent-music-player"
    >
      {/* Hidden HTML5 Audio tag */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={playNextTrack}
      />

      {/* Track info panel */}
      <div className="flex items-center gap-3 w-full md:w-1/4 min-w-[200px]">
        {/* Rotating CD album art */}
        <div className={`relative w-11 h-11 rounded-full bg-zinc-800 flex items-center justify-center border border-cinema-border shrink-0 ${isPlayingAudio ? "animate-spin" : ""}`} style={{ animationDuration: "12s" }}>
          <Disc className="w-6 h-6 text-cinema-amber" />
          <div className="absolute w-2.5 h-2.5 rounded-full bg-cinema-bg border border-zinc-800" />
        </div>
        
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-sm text-white truncate block" title={currentTrack.title}>
            {currentTrack.title}
          </span>
          <span className="text-xs text-cinema-muted truncate block">
            {currentTrack.artist} • {currentTrack.album}
          </span>
        </div>

        {isBuffering && (
          <Loader2 className="w-4 h-4 text-cinema-amber animate-spin shrink-0 ml-1.5" />
        )}
      </div>

      {/* Main Track Controller */}
      <div className="flex flex-col items-center gap-1.5 w-full md:w-2/4">
        <div className="flex items-center gap-4">
          <button
            onClick={playPrevTrack}
            disabled={playingQueue.length <= 1}
            className="p-1.5 rounded-full hover:bg-white/5 text-cinema-muted hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            title="Previous Track"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            className="p-2.5 rounded-full bg-white text-cinema-bg hover:scale-105 active:scale-95 transition-all shadow-md"
            title={isPlayingAudio ? "Pause" : "Play"}
          >
            {isPlayingAudio ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={playNextTrack}
            disabled={playingQueue.length <= 1}
            className="p-1.5 rounded-full hover:bg-white/5 text-cinema-muted hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            title="Next Track"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>

        {/* Progress bar and time labels */}
        <div className="flex items-center gap-3.5 w-full">
          <span className="text-[10px] font-mono text-cinema-muted w-8 text-right select-none">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 rounded-lg appearance-none cursor-pointer bg-white/10 accent-cinema-amber focus:outline-none hover:h-1.5 transition-all"
            title="Seek Audio"
          />
          <span className="text-[10px] font-mono text-cinema-muted w-8 text-left select-none">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Audio utility configurations (Volume & Queue) */}
      <div className="flex items-center justify-end gap-3.5 w-full md:w-1/4">
        {/* Queue size indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 text-[10px] font-semibold text-cinema-muted uppercase">
          <ListMusic className="w-3.5 h-3.5 text-cinema-amber" />
          <span>Queue ({playingQueue.length})</span>
        </div>

        {/* Volume adjust sliders */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-full hover:bg-white/5 text-cinema-muted hover:text-white"
            title="Mute Volume"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4.5 h-4.5 text-red-400" /> : <Volume2 className="w-4.5 h-4.5" />}
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
            className="w-20 md:w-24 h-1 rounded-lg appearance-none bg-white/10 accent-cinema-amber focus:outline-none"
            title="Volume Slider"
          />
        </div>
      </div>
    </div>
  );
}
