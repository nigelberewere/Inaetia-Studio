import React from "react";
import { Movie } from "../types";
import { useApp } from "../context/AppContext";
import { Play, Clock, HardDrive } from "lucide-react";
import { formatDuration, formatSize } from "../utils";

interface MovieCardProps {
  movie: Movie;
  progress?: number;
}

export default function MovieCard({ movie, progress }: MovieCardProps) {
  const { setCurrentVideo } = useApp();

  return (
    <div
      id={`movie-card-${movie.id}`}
      onClick={() => setCurrentVideo(movie)}
      className="group relative bg-cinema-card rounded-xl overflow-hidden border border-cinema-border cursor-pointer flex flex-col movie-card-hover"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/40">
        <img
          src={movie.thumbnail}
          alt={movie.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
          <div className="w-12 h-12 rounded-full bg-cinema-amber text-cinema-bg flex items-center justify-center font-bold scale-75 group-hover:scale-100 transition-transform duration-300 shadow-lg shadow-cinema-amber/25">
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </div>
        </div>

        {/* Video format tag (top right corner) */}
        <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/75 backdrop-blur-md rounded text-[10px] font-bold text-white uppercase tracking-wider">
          {movie.extension.replace(".", "")}
        </span>
      </div>

      {/* Meta Content */}
      <div className="p-3 md:p-4 flex flex-col flex-1 gap-1.5">
        <h3 className="font-semibold text-sm md:text-base text-white truncate group-hover:text-cinema-amber transition-colors">
          {movie.title}
        </h3>
        
        {/* Row of badges */}
        <div className="flex items-center justify-between text-xs text-cinema-muted mt-auto">
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
            className="bg-cinema-amber h-full"
          />
        </div>
      )}
    </div>
  );
}
