import React, { useState } from "react";
import { Movie } from "../types";
import { useApp } from "../context/AppContext";
import { Play, Clock, HardDrive, Star, Film, Tv } from "lucide-react";
import { formatDuration, formatSize, sanitizeTitle } from "../utils";

interface MovieCardProps {
  movie: Movie;
  progress?: number;
  onClick?: () => void;
  aspect?: "portrait" | "landscape";
  key?: React.Key;
}

export default function MovieCard({ movie, progress, onClick, aspect }: MovieCardProps) {
  const { setCurrentVideo } = useApp();
  const [imageError, setImageError] = useState(false);

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      setCurrentVideo(movie);
    }
  };

  const displayTitle = sanitizeTitle(movie.title, movie.filename);

  // Default to portrait for movies, and landscape for episodes or simple clips
  const cardAspect = aspect || (movie.type === "movie" || movie.hasPoster ? "portrait" : "landscape");
  
  const isPortrait = cardAspect === "portrait";
  const hasRealPoster = isPortrait ? (movie.hasPoster && movie.poster && !imageError) : (!imageError);
  
  const imageSrc = isPortrait 
    ? (movie.hasPoster ? movie.poster : null)
    : (movie.thumb || movie.thumbnail || `/api/artwork/${movie.id}/thumb`);

  return (
    <div
      id={`movie-card-${movie.id}`}
      tabIndex={0}
      role="button"
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="group relative glass-card rounded-2xl overflow-hidden border border-white/10 cursor-pointer flex flex-col movie-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-amber focus-visible:scale-[1.035]"
    >
      {/* Thumbnail/Poster Container */}
      <div className={`relative ${isPortrait ? "aspect-[2/3]" : "aspect-[16/9]"} w-full overflow-hidden bg-black/50`}>
        {hasRealPoster && imageSrc ? (
          <img
            src={imageSrc}
            alt={displayTitle}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          /* Designed Branded Gradient Placeholder Fallback */
          <div className="w-full h-full bg-gradient-to-br from-cinema-card via-[#1a1728] to-black flex flex-col items-center justify-center p-3 text-center border border-white/5 group-hover:from-cinema-card/90 group-hover:to-amber-950/30 transition-all">
            <div className="w-11 h-11 rounded-2xl bg-cinema-amber/10 border border-cinema-amber/20 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:border-cinema-amber/40 transition-all">
              {movie.type === "episode" ? (
                <Tv className="w-5 h-5 text-cinema-amber" />
              ) : (
                <Film className="w-5 h-5 text-cinema-amber" />
              )}
            </div>
            <span className="text-xs font-extrabold text-white/90 line-clamp-3 leading-tight px-1 group-hover:text-cinema-amber transition-colors">
              {displayTitle}
            </span>
            {movie.year && (
              <span className="text-[10px] font-bold text-cinema-muted mt-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                {movie.year}
              </span>
            )}
          </div>
        )}
        
        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
          <div className="w-12 h-12 rounded-full bg-cinema-amber text-cinema-bg flex items-center justify-center font-bold scale-75 group-hover:scale-100 transition-transform duration-300 shadow-xl shadow-cinema-amber/30">
            <Play className="w-6 h-6 fill-current ml-0.5 text-cinema-bg" />
          </div>
        </div>

        {/* Video format tag (top right corner) */}
        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-black/75 backdrop-blur-md border border-white/10 rounded-md text-[10px] font-bold text-white/90 uppercase tracking-wider">
          {movie.extension.replace(".", "")}
        </span>

        {/* Rating/Year overlay on poster bottom */}
        {isPortrait && hasRealPoster && (movie.rating || movie.year) && (
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 bg-black/75 backdrop-blur-md rounded-md border border-white/10 text-[10px] font-bold text-white">
            {movie.rating && (
              <span className="flex items-center gap-0.5 text-cinema-amber">
                <Star className="w-2.5 h-2.5 fill-current" />
                {movie.rating.toFixed(1)}
              </span>
            )}
            {movie.rating && movie.year && <span className="opacity-40">|</span>}
            {movie.year && <span>{movie.year}</span>}
          </div>
        )}
      </div>

      {/* Meta Content */}
      <div className="p-3 md:p-3.5 flex flex-col flex-1 gap-1.5">
        <h3 className="font-semibold text-sm md:text-base text-white line-clamp-2 break-words leading-snug group-hover:text-cinema-amber transition-colors">
          {displayTitle}
        </h3>
        
        {/* Row of badges */}
        <div className="flex items-center justify-between text-xs text-cinema-muted mt-auto pt-1">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatDuration(movie.duration)}
          </span>
          <span className="flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5" />
            {formatSize(movie.size)}
          </span>
        </div>
      </div>
      {progress !== undefined && (
        <div className="w-full bg-black/40 h-1 overflow-hidden" id={`movie-progress-bar-${movie.id}`}>
          <div 
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            className="bg-cinema-amber h-full transition-all duration-300"
          />
        </div>
      )}
    </div>
  );
}
