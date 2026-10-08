import React, { useState, useRef, useEffect, useMemo } from "react";
import { Movie } from "../types";
import { 
  Play, Clock, HardDrive, X, Star, Calendar, 
  Tv, Layers, ChevronRight, Sparkles 
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

  const activeSeason = (selectedSeason && showDetails.seasons.includes(selectedSeason))
    ? selectedSeason
    : showDetails.seasons[0] || "Season 1";

  // Get current season episodes
  const currentSeasonEpisodes = useMemo(() => {
    return showDetails.episodesBySeason.get(activeSeason) || showDetails.episodesBySeason.get(showDetails.seasons[0]) || [];
  }, [showDetails, activeSeason]);

  // First episode of active season
  const activeSeasonFirstEp = currentSeasonEpisodes[0] || showDetails.episodesBySeason.get(showDetails.seasons[0])?.[0];
  // First episode of overall show
  const showFirstEp = showDetails.episodesBySeason.get(showDetails.seasons[0])?.[0];

  // Next unplayed episode or first episode of season
  const nextUpEpisode = useMemo(() => {
    const unplayed = currentSeasonEpisodes.find((ep) => (getEpisodeProgress(ep.id) || 0) < 90);
    return unplayed || currentSeasonEpisodes[0];
  }, [currentSeasonEpisodes, getEpisodeProgress]);

  // URLs for dynamic artwork
  const seasonPosterUrl = `/api/season-poster/${encodeURIComponent(showDetails.name)}/${encodeURIComponent(activeSeason)}?firstEpisodeId=${activeSeasonFirstEp?.id || ""}`;
  const showPosterUrl = `/api/show-poster/${encodeURIComponent(showDetails.name)}?firstEpisodeId=${showFirstEp?.id || ""}`;
  const showFanartUrl = `/api/show-fanart/${encodeURIComponent(showDetails.name)}?firstEpisodeId=${showFirstEp?.id || ""}`;

  // Handle season selection and smooth scroll to episodes
  const handleSeasonChange = (season: string) => {
    onSelectSeason(season);
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

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 animate-fade-in select-none"
      id="tv-show-details-modal"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[1550px] 2xl:max-w-[1650px] bg-cinema-bg border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_25px_70px_-15px_rgba(0,0,0,0.95)] flex flex-col h-[95vh] sm:h-[92vh] backdrop-saturate-150 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Full Modal Scroll Container */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto custom-scrollbar"
        >
          {/* ========================================================================= */}
          {/* 1. EXPANSIVE CINEMATIC HERO BANNER & SHOW METADATA                        */}
          {/* ========================================================================= */}
          <div className="relative w-full overflow-hidden border-b border-cinema-border/60 shrink-0">
            {/* Full-Bleed Artwork Backdrop */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(to top, #09090b 5%, rgba(9,9,11,0.75) 50%, rgba(9,9,11,0.92) 100%), linear-gradient(to right, #09090b 15%, rgba(9,9,11,0.6) 60%, rgba(9,9,11,0.95) 100%), url('${showFanartUrl}')`,
              }}
            />

            {/* Ambient Accent Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-cinema-amber/10 via-transparent to-amber-950/20 pointer-events-none" />

            {/* Persistent Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 sm:p-3 rounded-full bg-black/70 hover:bg-black/95 text-white/90 hover:text-cinema-amber border border-white/15 hover:border-cinema-amber/50 transition-all cursor-pointer z-30 backdrop-blur-md shadow-2xl"
              title="Close (Esc)"
              id="btn-close-show-details"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Hero Main Content Grid: Poster on Left, Rich Metadata on Right */}
            <div className="relative z-10 p-5 sm:p-8 md:p-10 lg:p-12 flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-10 items-start">
              {/* Left Column: Season / Show High-Res Poster */}
              <div className="relative w-44 sm:w-52 md:w-60 lg:w-72 shrink-0 aspect-[2/3] rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black/60 group">
                <img
                  src={seasonPosterUrl}
                  alt={showDetails.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    // Fallback to show poster if season poster fails
                    const target = e.currentTarget;
                    if (target.src !== showPosterUrl) {
                      target.src = showPosterUrl;
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                {/* Corner Badges on Poster */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white uppercase tracking-wider">
                  <Tv className="w-3 h-3 text-cinema-amber" />
                  {activeSeason}
                </div>

                {showDetails.rating && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/15 text-xs font-bold text-cinema-amber shadow-md">
                    <Star className="w-3.5 h-3.5 fill-current text-cinema-amber" />
                    <span>{Number(showDetails.rating).toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Right Column: Title, Subtitle, Badges, Plot & Actions */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Badge Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-cinema-amber uppercase tracking-wider bg-cinema-amber/15 px-3 py-1 rounded-lg border border-cinema-amber/30 flex items-center gap-1.5 shadow-sm">
                    <Tv className="w-3.5 h-3.5 text-cinema-amber" />
                    TV Series
                  </span>

                  {showDetails.studio && (
                    <span className="px-2.5 py-1 bg-white/10 rounded-lg text-zinc-300 font-bold uppercase text-[11px] border border-white/10">
                      {showDetails.studio}
                    </span>
                  )}

                  {showDetails.year && (
                    <span className="px-2.5 py-1 bg-white/10 rounded-lg text-white font-semibold text-[11px] border border-white/10 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      {showDetails.year}
                    </span>
                  )}

                  <span className="px-2.5 py-1 bg-white/5 rounded-lg text-zinc-400 font-medium text-[11px] border border-white/5">
                    {pluralize(showDetails.totalEpisodes, "Episode")} across {pluralize(showDetails.seasons.length, "Season")}
                  </span>
                </div>

                {/* Show Title & Active Season Subtitle */}
                <div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-xl">
                    {showDetails.name}
                  </h1>
                  <p className="text-cinema-amber font-extrabold text-base sm:text-lg md:text-xl tracking-wide mt-1">
                    {activeSeason}
                  </p>
                </div>

                {/* Genres Pills */}
                {showDetails.genres && showDetails.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {showDetails.genres.map((genre, idx) => (
                      <span 
                        key={idx}
                        className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-zinc-300 hover:text-white transition-colors"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {/* Plot Synopsis (Generous & Legible across wide screen) */}
                <div className="max-w-4xl pt-1">
                  {showDetails.plot ? (
                    <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-inner">
                      {showDetails.plot}
                    </p>
                  ) : (
                    <p className="text-sm text-cinema-muted italic">
                      Explore all episodes and seasons for {showDetails.name}.
                    </p>
                  )}
                </div>

                {/* Primary Action Button */}
                {nextUpEpisode && (
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => onPlayEpisode(nextUpEpisode)}
                      className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-cinema-amber text-cinema-bg hover:brightness-110 font-extrabold text-sm sm:text-base shadow-xl shadow-cinema-amber/30 transition-all hover:scale-[1.02] cursor-pointer"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span>
                        Play {nextUpEpisode.episodeTitle || `Episode ${(currentSeasonEpisodes.indexOf(nextUpEpisode) + 1)}`}
                      </span>
                    </button>

                    <span className="text-xs text-cinema-muted">
                      {activeSeason} • {pluralize(currentSeasonEpisodes.length, "Episode")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. VISUAL SEASONS GALLERY (Seasons with Season Artwork Cards - Jellyfin Style) */}
          {/* ========================================================================= */}
          <div className="p-5 sm:p-8 md:p-10 lg:p-12 space-y-10">
            {showDetails.seasons.length > 0 && (
              <section className="space-y-4" id="tv-show-seasons-section">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-cinema-amber/10 border border-cinema-amber/30 text-cinema-amber">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        Seasons
                      </h2>
                      <p className="text-xs text-cinema-muted mt-0.5">
                        Browse season artwork and select a season to view its episodes
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-cinema-muted">
                    {pluralize(showDetails.seasons.length, "Season")}
                  </span>
                </div>

                {/* Horizontal Scrollable Season Poster Cards */}
                <div className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 scrollbar-hide -mx-2 px-2">
                  {showDetails.seasons.map((season) => {
                    const isSelected = activeSeason === season;
                    const seasonEpisodes = showDetails.episodesBySeason.get(season) || [];
                    const seasonFirstEp = seasonEpisodes[0];
                    const seasonCardPosterUrl = `/api/season-poster/${encodeURIComponent(showDetails.name)}/${encodeURIComponent(season)}?firstEpisodeId=${seasonFirstEp?.id || ""}`;

                    return (
                      <div
                        key={season}
                        onClick={() => handleSeasonChange(season)}
                        className={`group relative w-36 sm:w-44 md:w-48 shrink-0 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col p-2 bg-cinema-card/50 border ${
                          isSelected
                            ? "border-cinema-amber bg-cinema-amber/5 shadow-2xl shadow-cinema-amber/20 scale-[1.02]"
                            : "border-white/10 hover:border-cinema-amber/60 hover:bg-white/5 hover:scale-[1.02]"
                        }`}
                        id={`season-card-${season.replace(/\s+/g, "-").toLowerCase()}`}
                      >
                        {/* Season 2:3 Poster Frame */}
                        <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-black/60 border border-white/5 shadow-md">
                          <img
                            src={seasonCardPosterUrl}
                            alt={season}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (target.src !== showPosterUrl) {
                                target.src = showPosterUrl;
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                          {/* Episode Count Badge (Top-Right, matching Jellyfin) */}
                          <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[11px] font-extrabold shadow-lg backdrop-blur-md border ${
                            isSelected
                              ? "bg-cinema-amber text-cinema-bg border-cinema-amber"
                              : "bg-black/80 text-white border-white/15"
                          }`}>
                            {seasonEpisodes.length}
                          </div>

                          {/* Active Indicator on Selected Card */}
                          {isSelected && (
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-cinema-amber text-cinema-bg text-[10px] font-black uppercase tracking-wider shadow-lg">
                              Viewing
                            </span>
                          )}
                        </div>

                        {/* Season Name & Meta */}
                        <div className="pt-2.5 pb-1 px-1 text-center">
                          <h3 className={`text-sm sm:text-base font-extrabold line-clamp-1 transition-colors ${
                            isSelected ? "text-cinema-amber" : "text-white group-hover:text-cinema-amber"
                          }`}>
                            {season}
                          </h3>
                          <span className="text-[11px] text-cinema-muted font-medium block mt-0.5">
                            {pluralize(seasonEpisodes.length, "Episode")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* 3. EXPANSIVE EPISODES GRID (Wide 2-column or 1-column layout)              */}
            {/* ========================================================================= */}
            <section className="space-y-4" id="tv-show-episodes-section">
              <div className="flex items-center justify-between border-b border-cinema-border/50 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cinema-amber/10 border border-cinema-amber/30 text-cinema-amber">
                    <Tv className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {activeSeason} Episodes
                    </h2>
                    <p className="text-xs text-cinema-muted mt-0.5">
                      Select any episode to stream immediately
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-cinema-amber bg-cinema-amber/10 px-3 py-1 rounded-full border border-cinema-amber/20">
                  {pluralize(currentSeasonEpisodes.length, "Episode")}
                </span>
              </div>

              {/* Episodes Grid: Wide and Expansive across Screen */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5" id="tv-episodes-list">
                {currentSeasonEpisodes.map((episode, index) => {
                  const progress = getEpisodeProgress(episode.id);
                  const cleanEpTitle = episode.episodeTitle || episode.title || `Episode ${index + 1}`;

                  return (
                    <div
                      key={episode.id}
                      onClick={() => onPlayEpisode(episode)}
                      className="group flex flex-col sm:flex-row items-stretch bg-cinema-card/60 hover:bg-cinema-card border border-cinema-border/70 hover:border-cinema-amber/60 rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer p-3 sm:p-4 gap-4 hover:shadow-2xl hover:shadow-cinema-amber/10"
                      id={`episode-row-${episode.id}`}
                    >
                      {/* 16:9 Landscape Episode Thumbnail */}
                      <div className="relative aspect-video w-full sm:w-48 md:w-56 shrink-0 bg-black/60 rounded-xl overflow-hidden border border-white/10 group-hover:border-cinema-amber/40 transition-colors">
                        <img
                          src={episode.thumbnail}
                          alt={cleanEpTitle}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="p-3 rounded-full bg-cinema-amber text-cinema-bg shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </div>

                        {/* Format Tag */}
                        <span className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm text-[9px] font-extrabold px-2 py-0.5 rounded text-white uppercase tracking-wider border border-white/10">
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

                      {/* Episode Information */}
                      <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-extrabold text-base sm:text-lg text-white line-clamp-2 break-words group-hover:text-cinema-amber transition-colors leading-snug">
                              {index + 1}. {cleanEpTitle}
                            </h3>
                          </div>

                          <p className="text-xs text-cinema-muted truncate font-mono">
                            {episode.filename}
                          </p>

                          {episode.plot ? (
                            <p className="text-xs sm:text-sm text-zinc-300 line-clamp-2 md:line-clamp-3 mt-1.5 leading-relaxed">
                              {episode.plot}
                            </p>
                          ) : (
                            <p className="text-xs text-cinema-muted italic mt-1">
                              No synopsis provided for this episode.
                            </p>
                          )}
                        </div>

                        {/* Bottom Row Badges */}
                        <div className="flex items-center gap-4 text-xs text-cinema-muted mt-3 pt-2 border-t border-white/5 font-medium">
                          {episode.duration > 0 && (
                            <span className="flex items-center gap-1.5 text-zinc-300">
                              <Clock className="w-3.5 h-3.5 text-cinema-amber" />
                              {formatDuration(episode.duration)}
                            </span>
                          )}

                          {episode.size > 0 && (
                            <span className="flex items-center gap-1.5 text-zinc-400">
                              <HardDrive className="w-3.5 h-3.5" />
                              {formatSize(episode.size)}
                            </span>
                          )}

                          {progress !== undefined && (
                            <span className="text-cinema-amber font-semibold text-[10px] bg-cinema-amber/10 px-2 py-0.5 rounded border border-cinema-amber/20 ml-auto">
                              {Math.round(progress)}% Watched
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
