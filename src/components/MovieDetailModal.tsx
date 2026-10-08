import React, { useState, useRef, useEffect, useMemo } from "react";
import { Movie } from "../types";
import { useApp } from "../context/AppContext";
import { 
  Play, Clock, HardDrive, Calendar, Star, Tag, X, Award, Youtube, 
  ChevronDown, ChevronUp, Cpu, FileText, Subtitles, Volume2, Film, Layers, Sparkles 
} from "lucide-react";
import { formatDuration, formatSize, formatCleanDate, formatRating, sanitizeTitle } from "../utils";
import { Badge } from "./common/Badge";
import { getSimilarMovies } from "../recommendationEngine";

interface MovieDetailModalProps {
  movie: Movie;
  onClose: () => void;
}

export default function MovieDetailModal({ movie, onClose }: MovieDetailModalProps) {
  const { movies, setCurrentVideo, continueWatching } = useApp();
  const [activeMovie, setActiveMovie] = useState<Movie>(movie);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Sync state if initial movie prop changes
  useEffect(() => {
    setActiveMovie(movie);
  }, [movie]);

  // Handle switching active movie in the modal (e.g. clicking More Like This recommendation)
  const handleSelectMovie = (nextMovie: Movie) => {
    setActiveMovie(nextMovie);
    if (modalContainerRef.current) {
      modalContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Calculate progress for current movie
  const watchRecord = continueWatching.find((item) => item.movieId === activeMovie.id);
  const progress = watchRecord ? (watchRecord.position / watchRecord.duration) * 100 : undefined;

  const handlePlay = (targetToPlay: Movie = activeMovie) => {
    setCurrentVideo(targetToPlay);
    onClose();
  };

  // Find rich related movies using TMM NFO content-based recommendation engine
  const similarRecommendations = useMemo(() => {
    return getSimilarMovies(activeMovie, movies, 6);
  }, [activeMovie, movies]);

  const cleanDate = formatCleanDate(activeMovie.year || activeMovie.added);

  return (
    <div 
      ref={modalContainerRef}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
      id={`movie-detail-modal-${activeMovie.id}`}
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-[1550px] 2xl:max-w-[1650px] mx-auto glass-panel border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-4 sm:my-6 backdrop-saturate-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Full-Bleed Fanart Header */}
        <div 
          className="relative aspect-[16/9] sm:aspect-[21/9] w-full flex flex-col justify-end p-6 md:p-10 bg-zinc-950 bg-cover bg-center shrink-0"
          style={{
            backgroundImage: `linear-gradient(to top, #0f0f1c, rgba(15,15,28,0.5) 50%, rgba(15,15,28,0.85)), url('${activeMovie.fanart || activeMovie.thumbnail || "/api/artwork/" + activeMovie.id + "/fanart"}')`,
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-cinema-amber border border-white/10 transition-all cursor-pointer z-20 backdrop-blur-md platform-btn"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title & Badges Overlay */}
          <div className="max-w-3xl space-y-2 relative z-10">
            {activeMovie.set && (
              <div className="flex items-center gap-1.5 text-xs text-cinema-amber font-bold tracking-wide uppercase drop-shadow">
                <Layers className="w-3.5 h-3.5" />
                <span>Part of {activeMovie.set.replace(/\bcollection\b/gi, "").trim()} Collection</span>
              </div>
            )}

            {activeMovie.tagline && (
              <p className="text-cinema-amber/90 font-semibold text-xs sm:text-sm tracking-wider uppercase drop-shadow">
                {activeMovie.tagline}
              </p>
            )}

            {/* Title: Must wrap up to 2 lines, never truncate to 1 line! */}
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white drop-shadow-xl leading-tight line-clamp-2">
              {sanitizeTitle(activeMovie.title, activeMovie.filename)}
            </h2>

            {activeMovie.originalTitle && activeMovie.originalTitle !== activeMovie.title && (
              <p className="text-cinema-muted text-xs sm:text-sm italic font-medium">
                Original Title: {activeMovie.originalTitle}
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
                {activeMovie.hasPoster && activeMovie.poster ? (
                  <img 
                    src={activeMovie.poster} 
                    alt={sanitizeTitle(activeMovie.title, activeMovie.filename)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-cinema-card via-[#1c182d] to-black flex flex-col items-center justify-center p-4 text-center">
                    <Film className="w-10 h-10 text-cinema-amber mb-2" />
                    <span className="text-xs font-bold text-white leading-snug px-2 line-clamp-3">
                      {sanitizeTitle(activeMovie.title, activeMovie.filename)}
                    </span>
                    {activeMovie.year && (
                      <span className="text-[10px] text-cinema-muted mt-1 font-semibold">{activeMovie.year}</span>
                    )}
                  </div>
                )}
                <span className="absolute top-3 right-3 px-2 py-0.5 bg-black/75 backdrop-blur-md rounded-md border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white">
                  {activeMovie.extension.replace(".", "")}
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
                {activeMovie.duration > 0 && (
                  <Badge variant="glass" icon={<Clock className="w-3.5 h-3.5 text-cinema-amber" />}>
                    {formatDuration(activeMovie.duration)}
                  </Badge>
                )}
                {formatRating(activeMovie.mpaa) && (
                  <Badge variant="hd">
                    {formatRating(activeMovie.mpaa)}
                  </Badge>
                )}
                {activeMovie.rating && (
                  <Badge variant="glass" icon={<Star className="w-3.5 h-3.5 text-cinema-amber fill-cinema-amber" />}>
                    {(activeMovie.rating > 10 ? (activeMovie.rating / 10).toFixed(1) : activeMovie.rating.toFixed(1))} {activeMovie.votes ? `(${activeMovie.votes})` : ""}
                  </Badge>
                )}
                {activeMovie.size > 0 && (
                  <Badge variant="glass" icon={<HardDrive className="w-3.5 h-3.5 text-cinema-amber" />}>
                    {formatSize(activeMovie.size)}
                  </Badge>
                )}
              </div>

              {/* Genre Chips */}
              {activeMovie.genres && activeMovie.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeMovie.genres.map((genre) => (
                    <span 
                      key={genre}
                      className="text-xs font-semibold text-cinema-text bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Curated TMM Tags / Themes Chips */}
              {activeMovie.tags && activeMovie.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] font-bold text-cinema-muted uppercase tracking-wider flex items-center gap-1 mr-1">
                    <Tag className="w-3 h-3 text-cinema-amber" /> Themes:
                  </span>
                  {activeMovie.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-medium text-cinema-muted/90 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Synopsis Plot */}
              <div className="space-y-1.5 pt-1">
                <h4 className="text-xs font-bold text-cinema-amber uppercase tracking-wider">Synopsis</h4>
                <p className="text-sm text-cinema-text/90 leading-relaxed font-normal">
                  {activeMovie.plot || "No detailed plot summary available for this item."}
                </p>
              </div>

              {/* Filmmakers & Studio Row */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-cinema-muted pt-2 border-t border-white/10">
                {(() => {
                  const rawDirs = (activeMovie.directors && activeMovie.directors.length > 0)
                    ? activeMovie.directors
                    : (activeMovie.director ? [activeMovie.director] : []);
                  const cleanDirs = rawDirs
                    .map((d: any) => typeof d === "string" ? d : (d?.name || ""))
                    .filter((d: string) => d && !d.includes("[object"));
                  if (cleanDirs.length === 0) return null;
                  return (
                    <div>
                      <span className="font-bold text-cinema-muted/80 uppercase tracking-wider mr-1.5">Director:</span>
                      <span className="font-semibold text-white">
                        {cleanDirs.join(", ")}
                      </span>
                    </div>
                  );
                })()}

                {(() => {
                  const rawWriters = activeMovie.writers || [];
                  const cleanWriters = rawWriters
                    .map((w: any) => typeof w === "string" ? w : (w?.name || ""))
                    .filter((w: string) => w && !w.includes("[object"));
                  if (cleanWriters.length === 0) return null;
                  return (
                    <div>
                      <span className="font-bold text-cinema-muted/80 uppercase tracking-wider mr-1.5">Writer:</span>
                      <span className="font-medium text-cinema-text">
                        {cleanWriters.join(", ")}
                      </span>
                    </div>
                  );
                })()}

                {(() => {
                  const rawStudios = (activeMovie.studios && activeMovie.studios.length > 0)
                    ? activeMovie.studios
                    : (activeMovie.studio ? [activeMovie.studio] : []);
                  const cleanStudios = rawStudios
                    .map((s: any) => typeof s === "string" ? s : (s?.name || ""))
                    .filter((s: string) => s && !s.includes("[object"));
                  if (cleanStudios.length === 0) return null;
                  return (
                    <div>
                      <span className="font-bold text-cinema-muted/80 uppercase tracking-wider mr-1.5">Studio:</span>
                      <span className="font-medium text-cinema-text">
                        {cleanStudios.join(", ")}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Cast & Crew Avatars Row */}
              {activeMovie.actors && activeMovie.actors.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <h4 className="text-xs font-bold text-cinema-muted uppercase tracking-wider">Top Cast</h4>
                  <div className="flex flex-wrap gap-3">
                    {activeMovie.actors.slice(0, 5).map((actor, idx) => {
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
                  onClick={() => handlePlay(activeMovie)}
                  className="flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-cinema-amber hover:bg-cinema-amber-hover text-cinema-bg transition-all cursor-pointer text-sm font-bold shadow-xl shadow-cinema-amber/25 platform-btn"
                >
                  <Play className="w-5 h-5 fill-cinema-bg" />
                  {progress !== undefined ? "Resume Playing" : "Play Now"}
                </button>

                {activeMovie.trailer && (
                  <a
                    href={activeMovie.trailer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-all text-sm font-semibold backdrop-blur-md platform-btn"
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
                    <div><span className="text-cinema-muted">Format Extension:</span> <span className="text-white font-medium uppercase">{activeMovie.extension ? activeMovie.extension.replace(".", "") : "MKV"}</span></div>
                    <div><span className="text-cinema-muted">Media Category:</span> <span className="text-white font-medium">{activeMovie.category || (activeMovie.type === "movie" ? "Feature Film" : "Video")}</span></div>
                    <div><span className="text-cinema-muted">File Size:</span> <span className="text-white font-medium">{formatSize(activeMovie.size)}</span></div>
                    <div><span className="text-cinema-muted">Subtitles Available:</span> <span className="text-white font-medium">{activeMovie.hasSubtitles ? "Yes (.srt/.vtt)" : "None"}</span></div>
                    <div><span className="text-cinema-muted">Metadata Engine:</span> <span className="text-white font-medium uppercase">{activeMovie.metadataSource || "TMM NFO Parser"}</span></div>
                    {activeMovie.set && (
                      <div><span className="text-cinema-muted">Franchise Collection:</span> <span className="text-white font-medium">{activeMovie.set}</span></div>
                    )}
                    {(activeMovie.directors?.length || activeMovie.director) && (
                      <div><span className="text-cinema-muted">Director:</span> <span className="text-white font-medium">{activeMovie.directors?.join(", ") || activeMovie.director}</span></div>
                    )}
                    {activeMovie.writers && activeMovie.writers.length > 0 && (
                      <div><span className="text-cinema-muted">Screenplay:</span> <span className="text-white font-medium">{activeMovie.writers.join(", ")}</span></div>
                    )}
                    {(activeMovie.studios?.length || activeMovie.studio) && (
                      <div><span className="text-cinema-muted">Production Studio:</span> <span className="text-white font-medium">{activeMovie.studios?.join(", ") || activeMovie.studio}</span></div>
                    )}
                    {activeMovie.tags && activeMovie.tags.length > 0 && (
                      <div className="sm:col-span-2"><span className="text-cinema-muted">Thematic Tags:</span> <span className="text-white font-medium">{activeMovie.tags.join(", ")}</span></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Related Media Recommendation Row */}
          {similarRecommendations.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Film className="w-4 h-4 text-cinema-amber" /> More Like This
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {similarRecommendations.map((rec) => {
                  const item = rec.movie;
                  const itemTitle = sanitizeTitle(item.title, item.filename);
                  return (
                    <div 
                      key={item.id}
                      onClick={() => handleSelectMovie(item)}
                      className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-black/40 border border-white/10 cursor-pointer hover:border-cinema-amber hover:shadow-xl hover:shadow-cinema-amber/10 transition-all hover:scale-105 shadow-md flex flex-col justify-between"
                      title={`View details for ${itemTitle}`}
                    >
                      {/* Top Match Reason Badge */}
                      <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between gap-1 pointer-events-none">
                        <span className="px-2 py-0.5 rounded-md bg-black/85 backdrop-blur-md text-[10px] font-bold text-cinema-amber border border-cinema-amber/40 truncate max-w-[80%] shadow">
                          {rec.matchReason}
                        </span>
                        {item.rating && (
                          <span className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-0.5 border border-white/10 shrink-0">
                            ★ {(item.rating > 10 ? item.rating / 10 : item.rating).toFixed(1)}
                          </span>
                        )}
                      </div>

                      {/* Poster / Artwork */}
                      {item.hasPoster && item.poster ? (
                        <img 
                          src={item.poster} 
                          alt={itemTitle}
                          className="w-full h-full object-cover group-hover:opacity-90 group-hover:scale-105 transition-all duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-cinema-card via-[#1a1728] to-black flex flex-col items-center justify-center p-2 text-center">
                          <Film className="w-6 h-6 text-cinema-amber/80 mb-1" />
                          <span className="text-[11px] font-extrabold text-white/90 line-clamp-3 leading-tight px-1">
                            {itemTitle}
                          </span>
                          {item.year && (
                            <span className="text-[10px] text-cinema-muted mt-1 font-semibold">{item.year}</span>
                          )}
                        </div>
                      )}

                      {/* Center Quick Play Overlay Button */}
                      <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlay(item);
                          }}
                          className="w-10 h-10 rounded-full bg-cinema-amber hover:bg-cinema-amber-hover text-cinema-bg flex items-center justify-center shadow-xl shadow-cinema-amber/40 transform scale-90 group-hover:scale-100 transition-transform pointer-events-auto cursor-pointer"
                          title="Play Immediately"
                        >
                          <Play className="w-5 h-5 fill-cinema-bg ml-0.5" />
                        </button>
                      </div>

                      {/* Bottom Title & Year Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent p-2.5 flex flex-col justify-end pointer-events-none z-10">
                        <span className="text-xs font-bold text-white line-clamp-2 leading-tight group-hover:text-cinema-amber transition-colors">
                          {itemTitle}
                        </span>
                        {item.year && (
                          <span className="text-[10px] text-cinema-muted font-medium mt-0.5">
                            {item.year}
                          </span>
                        )}
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
