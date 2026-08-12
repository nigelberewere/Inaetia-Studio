import React, { useState } from "react";
import { Movie } from "../types";
import { useApp } from "../context/AppContext";
import { 
  Play, Clock, HardDrive, Calendar, Star, Tag, X, Award, Youtube, 
  ChevronDown, ChevronUp, Cpu, FileText, Subtitles, Volume2, Film 
} from "lucide-react";
import { formatDuration, formatSize, formatCleanDate, formatRating, sanitizeTitle } from "../utils";
import { Badge } from "./common/Badge";

interface MovieDetailModalProps {
  movie: Movie;
  onClose: () => void;
}

export default function MovieDetailModal({ movie, onClose }: MovieDetailModalProps) {
  const { movies, setCurrentVideo, continueWatching } = useApp();
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [showAdvancedPath, setShowAdvancedPath] = useState(false);

  // Calculate progress
  const watchRecord = continueWatching.find((item) => item.movieId === movie.id);
  const progress = watchRecord ? (watchRecord.position / watchRecord.duration) * 100 : undefined;

  const handlePlay = () => {
    setCurrentVideo(movie);
    onClose();
  };

  // Find related movies by genre or category
  const relatedMovies = React.useMemo(() => {
    return movies
      .filter((m) => m.id !== movie.id && (
        (movie.genres && m.genres && m.genres.some((g) => movie.genres?.includes(g))) ||
        m.category === movie.category
      ))
      .slice(0, 4);
  }, [movies, movie]);

  const cleanDate = formatCleanDate(movie.year || movie.added);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
      id={`movie-detail-modal-${movie.id}`}
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl glass-panel border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-6 backdrop-saturate-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Full-Bleed Fanart Header */}
        <div 
          className="relative aspect-[16/9] sm:aspect-[21/9] w-full flex flex-col justify-end p-6 md:p-10 bg-zinc-950 bg-cover bg-center shrink-0"
          style={{
            backgroundImage: `linear-gradient(to top, #0f0f1c, rgba(15,15,28,0.5) 50%, rgba(15,15,28,0.85)), url('${movie.fanart || movie.thumbnail || "/api/artwork/" + movie.id + "/fanart"}')`,
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-cinema-amber border border-white/10 transition-all cursor-pointer z-20 backdrop-blur-md appletv-btn"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title & Badges Overlay */}
          <div className="max-w-3xl space-y-2 relative z-10">
            {movie.tagline && (
              <p className="text-cinema-amber font-bold text-xs sm:text-sm tracking-wider uppercase drop-shadow">
                {movie.tagline}
              </p>
            )}

            {/* Title: Must wrap up to 2 lines, never truncate to 1 line! */}
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white drop-shadow-xl leading-tight line-clamp-2">
              {sanitizeTitle(movie.title, movie.filename)}
            </h2>

            {movie.originalTitle && movie.originalTitle !== movie.title && (
              <p className="text-cinema-muted text-xs sm:text-sm italic font-medium">
                Original Title: {movie.originalTitle}
              </p>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 md:p-8 space-y-8 bg-cinema-card/90">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Left Column: Poster Image */}
            <div className="hidden md:block md:col-span-4 lg:col-span-3">
              <div className="aspect-[2/3] rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black/50 relative group">
                {movie.hasPoster && movie.poster ? (
                  <img 
                    src={movie.poster} 
                    alt={sanitizeTitle(movie.title, movie.filename)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-cinema-card via-[#1c182d] to-black flex flex-col items-center justify-center p-4 text-center">
                    <Film className="w-10 h-10 text-cinema-amber mb-2" />
                    <span className="text-xs font-bold text-white leading-snug px-2 line-clamp-3">
                      {sanitizeTitle(movie.title, movie.filename)}
                    </span>
                    {movie.year && (
                      <span className="text-[10px] text-cinema-muted mt-1 font-semibold">{movie.year}</span>
                    )}
                  </div>
                )}
                <span className="absolute top-3 right-3 px-2 py-0.5 bg-black/75 backdrop-blur-md rounded-md border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white">
                  {movie.extension.replace(".", "")}
                </span>
              </div>
            </div>

            {/* Right Column: Information & Metadata */}
            <div className="md:col-span-8 lg:col-span-9 space-y-5">
              
              {/* Badges and Meta Bar */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                {cleanDate && (
                  <Badge variant="glass" icon={<Calendar className="w-3.5 h-3.5 text-cinema-amber" />}>
                    {cleanDate}
                  </Badge>
                )}
                {movie.duration > 0 && (
                  <Badge variant="glass" icon={<Clock className="w-3.5 h-3.5 text-cinema-amber" />}>
                    {formatDuration(movie.duration)}
                  </Badge>
                )}
                {formatRating(movie.mpaa) && (
                  <Badge variant="hd">
                    {formatRating(movie.mpaa)}
                  </Badge>
                )}
                {movie.rating && (
                  <Badge variant="glass" icon={<Star className="w-3.5 h-3.5 text-cinema-amber fill-cinema-amber" />}>
                    {(movie.rating > 10 ? (movie.rating / 10).toFixed(1) : movie.rating.toFixed(1))} {movie.votes ? `(${movie.votes})` : ""}
                  </Badge>
                )}
                {movie.size > 0 && (
                  <Badge variant="glass" icon={<HardDrive className="w-3.5 h-3.5 text-cinema-amber" />}>
                    {formatSize(movie.size)}
                  </Badge>
                )}
              </div>

              {/* Genre Chips */}
              {movie.genres && movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((genre) => (
                    <span 
                      key={genre}
                      className="text-xs font-semibold text-cinema-text bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Synopsis Plot */}
              <div className="space-y-1.5 pt-1">
                <h4 className="text-xs font-bold text-cinema-amber uppercase tracking-wider">Synopsis</h4>
                <p className="text-sm text-cinema-text/90 leading-relaxed font-normal">
                  {movie.plot || "No detailed plot summary available for this item."}
                </p>
              </div>

              {/* Cast & Crew Avatars Row */}
              {movie.actors && movie.actors.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <h4 className="text-xs font-bold text-cinema-muted uppercase tracking-wider">Top Cast</h4>
                  <div className="flex flex-wrap gap-3">
                    {movie.actors.slice(0, 5).map((actor, idx) => {
                      const initials = actor.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                      return (
                        <div key={idx} className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cinema-amber to-amber-700 text-cinema-bg font-bold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div className="flex flex-col text-xs">
                            <span className="font-semibold text-white leading-tight">{actor.name}</span>
                            {actor.role && (
                              <span className="text-[10px] text-cinema-muted truncate max-w-[100px]">{actor.role}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={handlePlay}
                  className="flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-cinema-amber hover:bg-cinema-amber-hover text-cinema-bg transition-all cursor-pointer text-sm font-bold shadow-xl shadow-cinema-amber/25 appletv-btn"
                >
                  <Play className="w-5 h-5 fill-cinema-bg" />
                  {progress !== undefined ? "Resume Playing" : "Play Now"}
                </button>

                {movie.trailer && (
                  <a
                    href={movie.trailer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-all text-sm font-semibold backdrop-blur-md appletv-btn"
                  >
                    <Youtube className="w-5 h-5 text-red-500 fill-current" />
                    Trailer
                  </a>
                )}

                {/* Toggle Technical File Specs Drawer */}
                <button
                  onClick={() => setShowTechDetails(!showTechDetails)}
                  className="flex items-center gap-1.5 px-4 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-cinema-muted hover:text-white transition-all text-xs font-medium ml-auto cursor-pointer"
                >
                  <Cpu className="w-4 h-4 text-cinema-amber" />
                  Tech Specs
                  {showTechDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* Collapsible Power User Technical Specs Drawer */}
              {showTechDetails && (
                <div className="p-4 rounded-2xl bg-black/60 border border-white/10 text-xs space-y-2.5 animate-fade-in text-cinema-text/90">
                  <div className="flex items-center gap-2 text-cinema-amber font-bold pb-1 border-b border-white/10">
                    <FileText className="w-4 h-4" /> Technical Container Details
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div><span className="text-cinema-muted">Format Extension:</span> <span className="text-white font-medium uppercase">{movie.extension ? movie.extension.replace(".", "") : "MKV"}</span></div>
                    <div><span className="text-cinema-muted">Media Category:</span> <span className="text-white font-medium">{movie.category || (movie.type === "movie" ? "Feature Film" : "Video")}</span></div>
                    <div><span className="text-cinema-muted">File Size:</span> <span className="text-white font-medium">{formatSize(movie.size)}</span></div>
                    <div><span className="text-cinema-muted">Subtitles Available:</span> <span className="text-white font-medium">{movie.hasSubtitles ? "Yes (.srt/.vtt)" : "None"}</span></div>
                    <div><span className="text-cinema-muted">Metadata Engine:</span> <span className="text-white font-medium uppercase">{movie.metadataSource || "TMM NFO Parser"}</span></div>
                  </div>

                  {/* Advanced Debug Info (Gated) */}
                  {showAdvancedPath ? (
                    <div className="pt-2 border-t border-white/10 space-y-1 font-mono text-[10px] animate-fade-in">
                      <div><span className="text-cinema-muted">Internal File ID:</span> <span className="text-white select-all">{movie.id}</span></div>
                      <div><span className="text-cinema-muted">Server Path:</span> <span className="text-white break-all">{movie.filepath}</span></div>
                      <button
                        type="button"
                        onClick={() => setShowAdvancedPath(false)}
                        className="text-[10px] text-cinema-amber hover:underline pt-1 block cursor-pointer font-sans"
                      >
                        Hide Debug Path & ID
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAdvancedPath(true)}
                      className="text-[10px] text-cinema-muted hover:text-cinema-amber hover:underline pt-1 block cursor-pointer font-sans"
                    >
                      Show Advanced Debug Path & Internal ID
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Related Media Recommendation Row */}
          {relatedMovies.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-white/10">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Film className="w-4 h-4 text-cinema-amber" /> More Like This
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {relatedMovies.map((item) => {
                  const itemTitle = sanitizeTitle(item.title, item.filename);
                  return (
                    <div 
                      key={item.id}
                      onClick={() => {
                        // Switch active movie in modal
                        onClose();
                        setTimeout(() => setCurrentVideo(item), 100);
                      }}
                      className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-black/40 border border-white/10 cursor-pointer hover:border-cinema-amber transition-all hover:scale-105 shadow-md"
                    >
                      {item.hasPoster && item.poster ? (
                        <img 
                          src={item.poster}
                          alt={itemTitle}
                          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-cinema-card via-[#1a1728] to-black flex flex-col items-center justify-center p-2 text-center">
                          <Film className="w-6 h-6 text-cinema-amber/80 mb-1" />
                          <span className="text-[11px] font-extrabold text-white/90 line-clamp-3 leading-tight">
                            {itemTitle}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent p-2.5 flex flex-col justify-end">
                        <span className="text-xs font-bold text-white line-clamp-2 leading-tight group-hover:text-cinema-amber transition-colors">
                          {itemTitle}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

