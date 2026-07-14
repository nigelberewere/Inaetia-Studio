import React from "react";
import { Movie } from "../types";
import { useApp } from "../context/AppContext";
import { Play, Clock, HardDrive, Calendar, Star, Tag, X, Award, Youtube } from "lucide-react";
import { formatDuration, formatSize } from "../utils";

interface MovieDetailModalProps {
  movie: Movie;
  onClose: () => void;
}

export default function MovieDetailModal({ movie, onClose }: MovieDetailModalProps) {
  const { setCurrentVideo, continueWatching } = useApp();

  // Calculate episode or movie progress
  const getProgress = () => {
    const watchRecord = continueWatching.find((item) => item.movieId === movie.id);
    if (watchRecord) {
      return (watchRecord.position / watchRecord.duration) * 100;
    }
    return undefined;
  };

  const progress = getProgress();

  const handlePlay = () => {
    setCurrentVideo(movie);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
      id={`movie-detail-modal-${movie.id}`}
    >
      <div className="relative w-full max-w-4xl bg-cinema-bg border border-cinema-border rounded-2xl overflow-hidden shadow-2xl flex flex-col my-8">
        
        {/* Backdrop Wide Fanart */}
        <div 
          className="relative aspect-[16/9] sm:aspect-[21/9] w-full flex flex-col justify-end p-4 sm:p-6 md:p-8 bg-zinc-950 bg-cover bg-center shrink-0"
          style={{
            backgroundImage: `linear-gradient(to top, #09090b, rgba(9,9,11,0.3) 50%, rgba(9,9,11,0.8)), url('${movie.fanart || movie.thumbnail || "/api/artwork/" + movie.id + "/fanart"}')`,
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/90 hover:text-cinema-amber text-white transition-all cursor-pointer z-10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title & Tagline in overlay */}
          <div className="max-w-2xl space-y-2">
            {movie.tagline && (
              <p className="text-cinema-amber font-bold text-xs sm:text-sm tracking-wider uppercase drop-shadow-md">
                {movie.tagline}
              </p>
            )}
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-white drop-shadow-lg leading-tight">
              {movie.title}
            </h2>
            {movie.originalTitle && movie.originalTitle !== movie.title && (
              <p className="text-cinema-muted text-xs sm:text-sm italic">
                Original: {movie.originalTitle}
              </p>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 bg-cinema-bg">
          
          {/* Left Column: Portrait Poster */}
          <div className="hidden md:block md:col-span-4 lg:col-span-3">
            <div className="aspect-[2/3] rounded-xl overflow-hidden border border-cinema-border shadow-lg bg-cinema-card relative group">
              <img 
                src={movie.poster || `/api/artwork/${movie.id}/poster`} 
                alt={movie.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <span className="absolute top-3 right-3 px-2 py-0.5 bg-black/75 backdrop-blur-md rounded text-[10px] font-black uppercase tracking-wider text-white">
                {movie.extension.replace(".", "")}
              </span>
            </div>
          </div>

          {/* Right Column: Information & Metadata */}
          <div className="md:col-span-8 lg:col-span-9 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Meta Stats Row */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-semibold text-cinema-muted">
                {movie.year && (
                  <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                    <Calendar className="w-3.5 h-3.5 text-cinema-amber" />
                    {movie.year}
                  </span>
                )}
                {movie.duration && (
                  <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                    <Clock className="w-3.5 h-3.5 text-cinema-amber" />
                    {formatDuration(movie.duration)}
                  </span>
                )}
                {movie.mpaa && (
                  <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-[10px] font-black rounded uppercase text-white tracking-wide">
                    {movie.mpaa}
                  </span>
                )}
                {movie.rating && (
                  <span className="flex items-center gap-1 text-cinema-amber bg-cinema-amber/5 px-2.5 py-1 rounded-md border border-cinema-amber/10">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {movie.rating.toFixed(1)} {movie.votes ? `(${movie.votes})` : ""}
                  </span>
                )}
                {movie.studio && (
                  <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-md border border-white/5 truncate max-w-[150px]">
                    <Award className="w-3.5 h-3.5 text-cinema-amber" />
                    {movie.studio}
                  </span>
                )}
              </div>

              {/* Genre Badges */}
              {movie.genres && movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {movie.genres.map((genre) => (
                    <span 
                      key={genre}
                      className="text-[10px] font-bold text-cinema-muted uppercase tracking-wider bg-zinc-900 border border-cinema-border px-2.5 py-1 rounded-full"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Plot */}
              <div className="space-y-1">
                <h4 className="text-xs font-black text-cinema-amber uppercase tracking-widest">Plot Summary</h4>
                <p className="text-sm text-cinema-muted leading-relaxed font-medium">
                  {movie.plot || "No plot summary available for this item."}
                </p>
              </div>

              {/* Director & Cast (if available) */}
              {(movie.director || (movie.actors && movie.actors.length > 0)) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-cinema-border pt-4 text-xs">
                  {movie.director && (
                    <div className="space-y-0.5">
                      <span className="text-cinema-muted font-bold block uppercase tracking-wider text-[10px]">Director</span>
                      <span className="text-white font-medium text-sm">{movie.director}</span>
                    </div>
                  )}
                  {movie.actors && movie.actors.length > 0 && (
                    <div className="space-y-0.5">
                      <span className="text-cinema-muted font-bold block uppercase tracking-wider text-[10px]">Starring Cast</span>
                      <span className="text-white font-medium text-sm truncate block" title={movie.actors.map(a => a.name).join(", ")}>
                        {movie.actors.slice(0, 3).map(a => a.name).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-t border-cinema-border pt-6 mt-6">
              <button
                onClick={handlePlay}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-cinema-amber text-cinema-bg hover:bg-white transition-all cursor-pointer text-sm font-black shadow-lg shadow-cinema-amber/15 active:scale-[0.98]"
              >
                <Play className="w-5 h-5 fill-current" />
                {progress !== undefined ? "Resume Playing" : "Play Feature"}
              </button>

              {movie.trailer && (
                <a
                  href={movie.trailer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-cinema-card border border-cinema-border text-white hover:bg-white/5 transition-all text-sm font-bold"
                >
                  <Youtube className="w-5 h-5 text-red-500 fill-current" />
                  Watch Trailer
                </a>
              )}

              <span className="text-right sm:ml-auto text-[10px] text-cinema-muted font-mono uppercase bg-white/5 border border-white/5 px-2 py-1 rounded self-center">
                Size: {formatSize(movie.size)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
