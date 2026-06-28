import React, { useState } from "react";
import { Movie } from "../types";
import { useApp } from "../context/AppContext";
import { Play, Info, Calendar, Clock, Disc, Sparkles } from "lucide-react";

interface HeroProps {
  movie: Movie | null;
}

export default function Hero({ movie }: HeroProps) {
  const { setCurrentVideo } = useApp();
  const [showInfo, setShowInfo] = useState(false);

  if (!movie) {
    // Elegant fallback skeleton / welcome banner if no movie is found
    return (
      <div className="relative w-full aspect-[21/9] min-h-[320px] max-h-[500px] rounded-2xl overflow-hidden bg-gradient-to-r from-cinema-card to-cinema-bg border border-cinema-border flex flex-col justify-center px-8 md:px-16 py-12 mb-8">
        <div className="max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cinema-amber/10 text-cinema-amber border border-cinema-amber/20 rounded-full text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Welcome to NigelCloud
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
            NigelCloud Cinema Server
          </h1>
          <p className="text-cinema-muted text-sm md:text-base max-w-md">
            Stream your media files beautifully directly from your Ubuntu server at 192.168.4.1. Access completely offline from your phones, laptops, and smart TVs.
          </p>
        </div>
        <div className="absolute inset-0 bg-radial-gradient from-cinema-amber/5 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  // Format Duration (Seconds to Hh Mm Ss)
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m ${s}s`;
  };

  // Humanize File Size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="relative w-full aspect-[21/9] min-h-[360px] max-h-[520px] rounded-2xl overflow-hidden bg-cinema-card border border-cinema-border mb-8 flex flex-col justify-end p-6 md:p-12 group">
      {/* Background Cinematic Artwork Thumbnail (Blurred) & Dominant Gradient Overlays */}
      <div className="absolute inset-0 z-0">
        <img
          src={movie.thumbnail}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-30 filter blur-sm scale-105 transition-transform duration-[10000ms] group-hover:scale-110"
        />
        {/* Master Dark/Color Gradient overlays for cinema mood */}
        <div className="absolute inset-0 bg-gradient-to-t from-cinema-bg via-cinema-bg/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-cinema-bg via-cinema-bg/30 to-transparent" />
      </div>

      {/* Hero Content Panel */}
      <div className="relative z-10 max-w-2xl space-y-4">
        {/* Amber tag indicator */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cinema-amber/10 border border-cinema-amber/20 text-cinema-amber rounded-full text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> Featured Movie
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-md">
          {movie.title}
        </h1>

        {/* Metadata Badges */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs md:text-sm text-cinema-muted">
          <span className="px-2 py-0.5 bg-white/10 text-white rounded text-xs font-bold uppercase">
            {movie.extension.replace(".", "")}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {formatDuration(movie.duration)}
          </span>
          <span className="flex items-center gap-1.5">
            <Disc className="w-3.5 h-3.5" />
            {formatSize(movie.size)}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(movie.added).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            id="btn-hero-play"
            onClick={() => setCurrentVideo(movie)}
            className="flex items-center gap-2 px-6 py-3 bg-cinema-amber text-cinema-bg rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-cinema-amber/15 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            Play Now
          </button>
          
          <button
            id="btn-hero-info"
            onClick={() => setShowInfo(!showInfo)}
            className="flex items-center gap-2 px-5 py-3 bg-[#1A1A2E]/40 border border-cinema-border hover:bg-white/5 text-white rounded-xl font-semibold transition-all cursor-pointer"
          >
            <Info className="w-5 h-5" />
            {showInfo ? "Hide Details" : "More Info"}
          </button>
        </div>

        {/* Collapsible Info Card */}
        {showInfo && (
          <div className="p-4 bg-cinema-bg/90 backdrop-blur border border-cinema-border rounded-xl mt-3 animate-fade-in text-sm text-cinema-text/90 space-y-2">
            <p className="font-semibold text-cinema-amber">Technical File Info:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
              <div><span className="text-cinema-muted">ID:</span> <span className="text-white">{movie.id}</span></div>
              <div><span className="text-cinema-muted">Filename:</span> <span className="text-white truncate block">{movie.filename}</span></div>
              <div><span className="text-cinema-muted">Filepath:</span> <span className="text-white truncate block">{movie.filepath}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
