import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Movie } from "../types";
import { 
  Play, Clock, HardDrive, X, Star, Calendar, 
  Film, Tv, Layers, ChevronRight, Sparkles 
} from "lucide-react";
import { formatDuration, formatSize, formatCleanDate, sanitizeTitle, pluralize } from "../utils";

interface ShowDetails {
  name: string;
  category: string;
  seasons: string[];
  episodesBySeason: Map<string, Movie[]>;
  totalEpisodes: number;
  plot?: string | null;
  year?: number | null;
  rating?: number | null;
  genres?: string[];
  studio?: string | null;
}

interface TVShowDetailModalProps {
  showDetails: ShowDetails;
  selectedSeason: string;
  onSelectSeason: (season: string) => void;
  onClose: () => void;
  onPlayEpisode: (episode: Movie) => void;
  getEpisodeProgress: (episodeId: string) => number | undefined;
}

export default function TVShowDetailModal({
  showDetails,
  selectedSeason,
  onSelectSeason,
  onClose,
  onPlayEpisode,
  getEpisodeProgress,
}: TVShowDetailModalProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0); // 0 (expanded) to 1 (collapsed)

  // Get current season episodes
  const currentSeasonEpisodes = useMemo(() => {
    return showDetails.episodesBySeason.get(selectedSeason) || [];
  }, [showDetails, selectedSeason]);

  // First episode thumbnail or poster for artwork
  const firstEpisode = currentSeasonEpisodes[0] || showDetails.episodesBySeason.get(showDetails.seasons[0])?.[0];
  const posterUrl = `/api/show-poster/${encodeURIComponent(showDetails.name)}?firstEpisodeId=${firstEpisode?.id || ""}`;

  // Track scroll position on every frame with requestAnimationFrame for buttery smooth transition
  const rafId = useRef<number | null>(null);

  const handleScroll = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      if (!scrollContainerRef.current) return;
      const scrollTop = scrollContainerRef.current.scrollTop;
      // Collapse happens across the first 170px of scroll
      const maxScroll = 170;
      const progress = Math.min(1, Math.max(0, scrollTop / maxScroll));
      setScrollProgress(progress);
    });
  }, []);

  // Cleanup RAF
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  // Handle season selection and smooth scroll back to top
  const handleSeasonChange = (season: string) => {
    onSelectSeason(season);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Scroll back to top on compact header click
  const handleHeaderClick = () => {
    if (scrollProgress > 0.3 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Dynamic values calculated from scrollProgress
  // Header total height goes from 290px down to 72px
  const headerHeight = 290 - scrollProgress * 218; // 290 -> 72
  const heroContentOpacity = Math.max(0, 1 - scrollProgress * 1.5);
  const heroContentScale = 1 - scrollProgress * 0.15;
  const compactBarOpacity = Math.min(1, Math.max(0, (scrollProgress - 0.35) / 0.65));

  // Artwork thumbnail shrinking into top-left corner
  // When expanded: full backdrop background
  // When collapsing: a mini preview card animates into place in top-left
  const miniArtworkScale = Math.min(1, Math.max(0, (scrollProgress - 0.2) / 0.8));

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in select-none"
      id="tv-show-details-modal"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-cinema-bg border border-cinema-border/80 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col h-[92vh] sm:h-[88vh] backdrop-saturate-150 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================================= */}
        {/* ANIMATED DYNAMIC HERO / HEADER (Shrinks and transitions smoothly on scroll) */}
        {/* ========================================================================= */}
        <div
          className="relative w-full shrink-0 overflow-hidden border-b border-cinema-border/60 transition-[height] duration-75 ease-out"
          style={{ height: `${headerHeight}px` }}
          id="tv-show-collapsible-header"
        >
          {/* Full-Bleed Artwork Backdrop */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-75"
            style={{
              backgroundImage: `linear-gradient(to top, #09090b 0%, rgba(9,9,11,0.65) 45%, rgba(9,9,11,0.85) 100%), url('${posterUrl}')`,
              filter: `blur(${scrollProgress * 4}px) brightness(${1 - scrollProgress * 0.3})`,
              transform: `scale(${1 + scrollProgress * 0.08})`,
            }}
          />

          {/* Subtly animated ambient light glow */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-cinema-amber/10 via-transparent to-purple-500/5 pointer-events-none"
            style={{ opacity: 1 - scrollProgress }}
          />

          {/* Persistent Close Button (Always top-right) */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 sm:p-2.5 rounded-full bg-black/70 hover:bg-black/95 text-white/80 hover:text-cinema-amber border border-white/10 hover:border-cinema-amber/40 transition-all cursor-pointer z-30 backdrop-blur-md shadow-lg"
            title="Close (Esc)"
            id="btn-close-show-details"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* ----------------------------------------------------------------------- */}
          {/* 1. EXPANDED VIEW CONTENT (Fades out gracefully as user scrolls down) */}
          {/* ----------------------------------------------------------------------- */}
          <div
            className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 md:p-8 pointer-events-none transition-all duration-75"
            style={{
              opacity: heroContentOpacity,
              transform: `scale(${heroContentScale}) translateY(${scrollProgress * -20}px)`,
              pointerEvents: scrollProgress > 0.5 ? "none" : "auto",
            }}
          >
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-bold text-cinema-amber uppercase tracking-wider bg-cinema-amber/15 px-2.5 py-0.5 rounded-md border border-cinema-amber/30 flex items-center gap-1.5 shadow-sm">
                  <Tv className="w-3 h-3 text-cinema-amber" />
                  TV Series
                </span>
                {showDetails.studio && (
                  <span className="px-2 py-0.5 bg-white/10 rounded-md text-zinc-300 font-bold uppercase text-[10px] border border-white/10">
                    {showDetails.studio}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white drop-shadow-lg leading-tight line-clamp-2">
                {showDetails.name}
              </h2>

              {/* Metadata Badges */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cinema-muted font-medium">
                {showDetails.year && (
                  <span className="text-white font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-zinc-400" />
                    {showDetails.year}
                  </span>
                )}
                {showDetails.rating && (
                  <span className="flex items-center gap-1 text-cinema-amber font-bold">
                    <Star className="w-3 h-3 fill-cinema-amber text-cinema-amber" />
                    {Number(showDetails.rating).toFixed(1)}
                  </span>
                )}
                {showDetails.genres && showDetails.genres.length > 0 && (
                  <span className="text-zinc-300">• {showDetails.genres.join(", ")}</span>
                )}
                <span className="text-zinc-400">
                  • {pluralize(showDetails.totalEpisodes, "episode")}
                </span>
              </div>

              {/* Plot Synopsis Box */}
              {showDetails.plot ? (
                <p className="text-xs sm:text-sm text-zinc-300 mt-1 line-clamp-2 md:line-clamp-3 bg-black/60 backdrop-blur-md p-2.5 sm:p-3 rounded-xl border border-white/10 leading-relaxed shadow-inner max-w-2xl">
                  {showDetails.plot}
                </p>
              ) : (
                <p className="text-xs text-cinema-muted">
                  {pluralize(showDetails.totalEpisodes, "episode")} available across {showDetails.seasons.length} seasons.
                </p>
              )}
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* 2. COMPACT TOP-CORNER ARTWORK & TITLE (Fades in smoothly when scrolled) */}
          {/* ----------------------------------------------------------------------- */}
          <div
            onClick={handleHeaderClick}
            className="absolute inset-0 flex items-center px-4 sm:px-6 pr-14 z-20 transition-all duration-75"
            style={{
              opacity: compactBarOpacity,
              pointerEvents: scrollProgress > 0.5 ? "auto" : "none",
              cursor: scrollProgress > 0.5 ? "pointer" : "default",
            }}
            title={scrollProgress > 0.5 ? "Click to scroll back to top" : undefined}
          >
            <div className="flex items-center gap-3.5 min-w-0 max-w-[calc(100%-48px)]">
              {/* Shrunk Artwork in Top-Left Corner */}
              <div
                className="relative w-14 sm:w-16 h-10 sm:h-11 rounded-lg overflow-hidden border border-cinema-amber/40 shadow-lg shrink-0 bg-black/60 transition-transform duration-75"
                style={{
                  transform: `scale(${miniArtworkScale})`,
                }}
              >
                <img
                  src={posterUrl}
                  alt={showDetails.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>

              {/* Compact Title & Season Marker */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-cinema-amber uppercase tracking-wider bg-cinema-amber/20 px-1.5 py-0.2 rounded border border-cinema-amber/30 shrink-0">
                    TV
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-white truncate drop-shadow">
                    {showDetails.name}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-cinema-muted mt-0.5">
                  <span className="text-zinc-300 font-semibold">{selectedSeason}</span>
                  <span>•</span>
                  <span>{pluralize(currentSeasonEpisodes.length, "episode")}</span>
                  {showDetails.year && (
                    <>
                      <span>•</span>
                      <span>{showDetails.year}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEASONS TAB SELECTOR ROW (Sticky or Fixed directly beneath the header) */}
        {/* ========================================================================= */}
        {showDetails.seasons.length > 1 && (
          <div 
            className="px-4 sm:px-6 py-2.5 border-b border-cinema-border/60 bg-cinema-card/95 backdrop-blur-md flex items-center gap-2 overflow-x-auto shrink-0 z-20 shadow-sm"
            id="tv-show-season-tabs"
          >
            <span className="text-xs font-bold text-cinema-muted uppercase tracking-wider hidden sm:inline-block mr-1">
              Seasons:
            </span>
            {showDetails.seasons.map((season) => {
              const isSelected = selectedSeason === season;
              const count = (showDetails.episodesBySeason.get(season) || []).length;
              return (
                <button
                  key={season}
                  onClick={() => handleSeasonChange(season)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-cinema-amber text-cinema-bg shadow-md shadow-cinema-amber/20 scale-[1.02]"
                      : "bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20"
                  }`}
                  id={`btn-season-${season.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <span>{season}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                    isSelected ? "bg-black/20 text-cinema-bg" : "bg-black/40 text-cinema-muted"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCROLLABLE EPISODES LIST (Expands vertically when header shrinks) */}
        {/* ========================================================================= */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 custom-scrollbar"
          id="tv-episodes-scroll-container"
        >
          <div className="flex items-center justify-between pb-1">
            <h4 className="text-xs sm:text-sm font-bold text-cinema-amber uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cinema-amber" />
              {selectedSeason} Episodes ({pluralize(currentSeasonEpisodes.length, "Episode")})
            </h4>
            <span className="text-[11px] text-cinema-muted">
              Click any episode to start streaming
            </span>
          </div>

          <div className="grid gap-2.5 sm:gap-3" id="tv-episodes-list">
            {currentSeasonEpisodes.map((episode, index) => {
              const progress = getEpisodeProgress(episode.id);
              const cleanEpTitle = episode.episodeTitle || episode.title || `Episode ${index + 1}`;

              return (
                <div
                  key={episode.id}
                  onClick={() => onPlayEpisode(episode)}
                  className="group flex flex-col sm:flex-row items-stretch bg-cinema-card/70 hover:bg-cinema-card border border-cinema-border/70 hover:border-cinema-amber/60 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer p-2.5 sm:p-3 gap-3.5 hover:shadow-lg hover:shadow-cinema-amber/5"
                  id={`episode-row-${episode.id}`}
                >
                  {/* Image Preview Thumbnail */}
                  <div className="relative aspect-[16/10] w-full sm:w-44 md:w-48 shrink-0 bg-black/60 rounded-lg overflow-hidden border border-white/5 group-hover:border-cinema-amber/30 transition-colors">
                    <img
                      src={episode.thumbnail}
                      alt={cleanEpTitle}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-2 rounded-full bg-cinema-amber text-cinema-bg shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>

                    {/* Extension Badge */}
                    <span className="absolute top-1.5 right-1.5 bg-black/80 backdrop-blur-sm text-[9px] font-bold px-1.5 py-0.5 rounded text-white uppercase tracking-wider border border-white/10">
                      {episode.extension.replace(".", "")}
                    </span>

                    {/* Watch History Progress Bar */}
                    {progress !== undefined && (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/70">
                        <div
                          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                          className="bg-cinema-amber h-full rounded-r-full"
                        />
                      </div>
                    )}
                  </div>

                  {/* Episode Meta Info */}
                  <div className="flex-1 flex flex-col justify-center min-w-0 py-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm sm:text-base text-white line-clamp-2 break-words group-hover:text-cinema-amber transition-colors leading-snug">
                        {index + 1}. {cleanEpTitle}
                      </h4>
                    </div>

                    <p className="text-[11px] text-cinema-muted truncate mt-0.5 font-mono">
                      {episode.filename}
                    </p>

                    {episode.plot && (
                      <p className="text-xs text-zinc-300 line-clamp-2 mt-1 leading-relaxed max-w-3xl">
                        {episode.plot}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-[11px] text-cinema-muted mt-2 font-medium">
                      <span className="flex items-center gap-1 text-zinc-300">
                        <Clock className="w-3.5 h-3.5 text-cinema-amber" />
                        {formatDuration(episode.duration)}
                      </span>
                      <span className="flex items-center gap-1 text-zinc-400">
                        <HardDrive className="w-3.5 h-3.5" />
                        {formatSize(episode.size)}
                      </span>
                      {progress !== undefined && (
                        <span className="text-cinema-amber font-semibold text-[10px] bg-cinema-amber/10 px-1.5 py-0.2 rounded border border-cinema-amber/20">
                          {Math.round(progress)}% Watched
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
