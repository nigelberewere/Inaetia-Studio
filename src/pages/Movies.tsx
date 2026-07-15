import React, { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import MovieCard from "../components/MovieCard";
import MovieDetailModal from "../components/MovieDetailModal";
import { 
  Film, Tv, Shield, Folder, Play, Clock, HardDrive, 
  ChevronRight, RefreshCw, X, Clapperboard, Video
} from "lucide-react";
import { Movie } from "../types";
import { formatDuration, formatSize } from "../utils";

type CategoryType = "all" | "movies" | "tvshows" | "marvel" | "cartoons" | "videos";

export default function Movies() {
  const { movies, loading, refreshLibrary, setCurrentVideo, continueWatching } = useApp();

  const [activeCategory, setActiveCategory] = useState<CategoryType>("all");
  const [selectedShow, setSelectedShow] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>("Season 1");
  const [activeDetailMovie, setActiveDetailMovie] = useState<Movie | null>(null);

  // Helper to compute episode progress
  const getEpisodeProgress = (episodeId: string) => {
    const watchRecord = continueWatching.find((item) => item.movieId === episodeId);
    if (watchRecord) {
      return (watchRecord.position / watchRecord.duration) * 100;
    }
    return undefined;
  };

  // Group all episodes into unique TV Shows
  const shows = useMemo(() => {
    const showMap = new Map<string, { 
      name: string; 
      episodes: Movie[]; 
      category: string;
      plot?: string | null;
      year?: number | null;
      rating?: number | null;
      genres?: string[];
      studio?: string | null;
    }>();
    
    movies.forEach((m) => {
      if (m.type === "episode" && m.showName) {
        if (!showMap.has(m.showName)) {
          showMap.set(m.showName, {
            name: m.showName,
            episodes: [],
            category: m.category || "Tv Shows",
            plot: m.showPlot,
            year: m.showYear,
            rating: m.showRating,
            genres: m.showGenres,
            studio: m.showStudio
          });
        }
        showMap.get(m.showName)!.episodes.push(m);
      }
    });

    return Array.from(showMap.values());
  }, [movies]);

  // Selected Show details helper
  const showDetails = useMemo(() => {
    if (!selectedShow) return null;
    const show = shows.find((s) => s.name === selectedShow);
    if (!show) return null;

    // Group episodes of this show by season
    const seasonMap = new Map<string, Movie[]>();
    show.episodes.forEach((ep) => {
      const sName = ep.seasonName || "Season 1";
      if (!seasonMap.has(sName)) {
        seasonMap.set(sName, []);
      }
      seasonMap.get(sName)!.push(ep);
    });

    // Sort seasons numerically
    const parseSeasonNum = (name: string) => {
      const match = name.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };

    const sortedSeasons = Array.from(seasonMap.keys()).sort(
      (a, b) => parseSeasonNum(a) - parseSeasonNum(b)
    );

    // Sort episodes within seasons by filename/episode title
    const parseEpisodeNum = (title: string = "", filename: string = "") => {
      const match = (title + " " + filename).match(/(?:e|ep|episode|ep\.)\s*(\d+)/i) || (title + " " + filename).match(/\b(\d+)\b/);
      return match ? parseInt(match[1], 10) : null;
    };

    seasonMap.forEach((eps) => {
      eps.sort((a, b) => {
        const epA = parseEpisodeNum(a.episodeTitle, a.filename);
        const epB = parseEpisodeNum(b.episodeTitle, b.filename);
        if (epA !== null && epB !== null && epA !== epB) {
          return epA - epB;
        }
        return a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: "base" });
      });
    });

    return {
      name: show.name,
      category: show.category,
      seasons: sortedSeasons,
      episodesBySeason: seasonMap,
      totalEpisodes: show.episodes.length,
      plot: show.plot,
      year: show.year,
      rating: show.rating,
      genres: show.genres,
      studio: show.studio
    };
  }, [selectedShow, shows]);

  // Filter content based on active category
  const filteredContent = useMemo(() => {
    const result = {
      moviesList: [] as Movie[],
      showsList: [] as typeof shows,
      videosBySubcategory: {} as Record<string, Movie[]>,
      standaloneVideos: [] as Movie[]
    };

    if (activeCategory === "all") {
      // Direct movies
      result.moviesList = movies.filter((m) => m.type === "movie");
      // All aggregated TV shows
      result.showsList = shows;
      // Videos category items
      movies.forEach((m) => {
        if (m.category === "Videos" || m.type === "video") {
          const sub = m.subcategory || "Other Videos";
          if (!result.videosBySubcategory[sub]) {
            result.videosBySubcategory[sub] = [];
          }
          result.videosBySubcategory[sub].push(m);
        }
      });
    } else if (activeCategory === "movies") {
      // Just normal movies (from any root but parsed as movies)
      result.moviesList = movies.filter((m) => m.type === "movie");
    } else if (activeCategory === "tvshows") {
      // Only TV Shows from the Tv Shows root
      result.showsList = shows.filter((s) => s.category === "Tv Shows");
    } else if (activeCategory === "marvel") {
      // Marvel Movies (individual movies)
      result.moviesList = movies.filter((m) => m.category === "Marvel Movies" && m.type === "movie");
      // Marvel Shows (grouped series)
      result.showsList = shows.filter((s) => s.category === "Marvel Movies");
    } else if (activeCategory === "cartoons") {
      // Cartoon Shows (grouped series)
      result.showsList = shows.filter((s) => s.category === "Cartoons");
      // Cartoon Movies/Videos (independent cartoon files)
      result.moviesList = movies.filter((m) => m.category === "Cartoons" && m.type !== "episode");
    } else if (activeCategory === "videos") {
      // Group by subcategory: Music Videos, dramas, etc.
      movies.forEach((m) => {
        if (m.category === "Videos" || m.type === "video") {
          const sub = m.subcategory || "Other Videos";
          if (!result.videosBySubcategory[sub]) {
            result.videosBySubcategory[sub] = [];
          }
          result.videosBySubcategory[sub].push(m);
        }
      });
    }

    return result;
  }, [activeCategory, movies, shows]);

  const handleOpenShow = (showName: string) => {
    setSelectedShow(showName);
    const show = shows.find((s) => s.name === showName);
    if (show && show.episodes.length > 0) {
      // Default to the first season available
      const seasonMap = new Map<string, Movie[]>();
      show.episodes.forEach((ep) => {
        const sName = ep.seasonName || "Season 1";
        if (!seasonMap.has(sName)) seasonMap.set(sName, []);
        seasonMap.get(sName)!.push(ep);
      });
      const keys = Array.from(seasonMap.keys());
      if (keys.length > 0) {
        setSelectedSeason(keys[0]);
      } else {
        setSelectedSeason("Season 1");
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center h-10 animate-pulse bg-cinema-card/50 rounded w-full max-w-sm" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="aspect-[10/14] bg-cinema-card/40 rounded-xl border border-cinema-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 animate-fade-in text-white" id="movies-view-page">
      {/* Category Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cinema-border pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Film className="w-7 h-7 text-cinema-amber" />
            Media Explorer
          </h1>
          <p className="text-cinema-muted text-xs md:text-sm mt-1">
            Organized directories and high-definition local streams.
          </p>
        </div>

        {/* Manual Rescan Trigger */}
        <button
          onClick={refreshLibrary}
          className="self-start md:self-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cinema-card border border-cinema-border hover:bg-white/5 text-cinema-muted hover:text-white transition-all text-xs font-semibold"
          title="Reload Library Filesystem"
          id="btn-movies-reload"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Library
        </button>
      </div>

      {/* Directory Category Filters Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full max-w-full scrollbar-none" id="directory-tabs-list">
        {(
          [
            { id: "all", label: "All Media", icon: Folder },
            { id: "movies", label: "Movies", icon: Clapperboard },
            { id: "tvshows", label: "TV Shows", icon: Tv },
            { id: "marvel", label: "Marvel Universe", icon: Shield },
            { id: "cartoons", label: "Cartoons", icon: Video },
            { id: "videos", label: "Videos & Clips", icon: Film }
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveCategory(tab.id);
                setSelectedShow(null); // Close active show panel
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs shrink-0 active:scale-95 transition-all cursor-pointer ${
                isActive
                  ? "bg-cinema-amber text-cinema-bg border-cinema-amber shadow-lg shadow-cinema-amber/10"
                  : "bg-cinema-card border-cinema-border text-cinema-muted hover:text-white hover:bg-white/5"
              }`}
              id={`tab-category-${tab.id}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Rendering Grid */}
      <div className="space-y-12">
        {/* Render Aggregated TV Shows (Series) */}
        {filteredContent.showsList.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2 border-l-4 border-cinema-amber pl-3">
              <Tv className="w-5 h-5 text-cinema-amber" />
              TV Series ({filteredContent.showsList.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {filteredContent.showsList.map((show) => {
                const firstEpisode = show.episodes[0];
                return (
                  <div
                    key={show.name}
                    onClick={() => handleOpenShow(show.name)}
                    className="group relative bg-cinema-card rounded-xl overflow-hidden border border-cinema-border cursor-pointer flex flex-col movie-card-hover"
                    id={`series-card-${show.name.replace(/\s+/g, "-")}`}
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-black/40">
                      <img
                        src={`/api/show-poster/${encodeURIComponent(show.name)}?firstEpisodeId=${firstEpisode?.id || ""}`}
                        alt={show.name}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute top-2 right-2 px-2 py-0.5 bg-cinema-amber text-cinema-bg rounded text-[10px] font-black uppercase tracking-wider">
                        Series
                      </span>
                    </div>
                    <div className="p-3 md:p-4 flex flex-col flex-1 justify-between gap-2">
                      <h3 className="font-bold text-sm md:text-base text-white truncate group-hover:text-cinema-amber transition-colors">
                        {show.name}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-cinema-muted font-medium mt-auto">
                        <span>{show.episodes.length} Episodes</span>
                        <span className="flex items-center text-cinema-amber gap-0.5 text-[10px] uppercase font-bold tracking-wider">
                          Browse <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Render Direct Movies */}
        {filteredContent.moviesList.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2 border-l-4 border-cinema-amber pl-3">
              <Clapperboard className="w-5 h-5 text-cinema-amber" />
              Movies ({filteredContent.moviesList.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {filteredContent.moviesList.map((movie) => {
                const CardItem = MovieCard as any;
                return (
                  <CardItem 
                    key={movie.id} 
                    movie={movie} 
                    onClick={() => setActiveDetailMovie(movie)}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Render Custom Videos Subcategories (Clips, Music Videos, Local dramas etc.) */}
        {Object.entries(filteredContent.videosBySubcategory).map(([sub, list]) => {
          const videoList = list as Movie[];
          return (
            <section key={sub} className="space-y-4">
              <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2 border-l-4 border-cinema-amber pl-3 capitalize">
                <Film className="w-5 h-5 text-cinema-amber" />
                {sub} ({videoList.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {videoList.map((video) => {
                  const CardItem = MovieCard as any;
                  return (
                    <CardItem 
                      key={video.id} 
                      movie={video} 
                      onClick={() => setActiveDetailMovie(video)}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Zero Results Placeholder */}
        {filteredContent.moviesList.length === 0 &&
          filteredContent.showsList.length === 0 &&
          Object.keys(filteredContent.videosBySubcategory).length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-cinema-card border border-cinema-border rounded-2xl p-8 max-w-lg mx-auto">
              <span className="text-5xl">📼</span>
              <h3 className="text-xl font-bold mt-4">Directory looks empty</h3>
              <p className="text-cinema-muted text-sm mt-2">
                Make sure you place your video formats (.mp4, .mkv) in their respective folders under the hard drive mounting path `/mnt/storage/Videos`.
              </p>
            </div>
          )}
      </div>

      {/* Netflix-style TV Show Details Immersive Overlay Panel */}
      {selectedShow && showDetails && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in"
          id="tv-show-details-modal"
        >
          <div className="relative w-full max-w-4xl bg-cinema-bg border border-cinema-border rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh]">
            {/* Modal Header */}
            <div 
              style={{
                backgroundImage: `linear-gradient(to top, #09090b, rgba(9,9,11,0.2) 50%, rgba(9,9,11,0.7)), url('/api/show-poster/${encodeURIComponent(showDetails.name)}?firstEpisodeId=${showDetails.episodesBySeason.get(selectedSeason)?.[0]?.id || ""}')`,
                backgroundSize: "cover",
                backgroundPosition: "center"
              }}
              className="relative aspect-[16/9] sm:aspect-[21/9] w-full flex flex-col justify-end p-4 sm:p-6 md:p-8 shrink-0 bg-zinc-900"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedShow(null)}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/90 hover:text-cinema-amber text-white transition-all cursor-pointer"
                title="Close Panel"
                id="btn-close-show-details"
              >
                <X className="w-4 sm:w-5 sm:h-5 h-4" />
              </button>

              <div className="space-y-1.5 max-w-3xl">
                <span className="text-[10px] sm:text-xs font-bold text-cinema-amber uppercase tracking-wider bg-cinema-amber/10 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md border border-cinema-amber/20">
                  TV Series
                </span>
                <h2 className="text-xl sm:text-2xl md:text-4xl font-black text-white drop-shadow-md mt-1.5 sm:mt-2">
                  {showDetails.name}
                </h2>
                
                {/* TV Show Metadata Badges */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cinema-muted font-medium mt-1">
                  {showDetails.year && (
                    <span className="text-white font-semibold">{showDetails.year}</span>
                  )}
                  {showDetails.rating && (
                    <span className="flex items-center gap-0.5 text-cinema-amber">
                      ⭐ {Number(showDetails.rating).toFixed(1)}
                    </span>
                  )}
                  {showDetails.studio && (
                    <span className="px-1.5 py-0.2 bg-zinc-800 rounded text-zinc-300 font-bold uppercase text-[9px]">
                      {showDetails.studio}
                    </span>
                  )}
                  {showDetails.genres && showDetails.genres.length > 0 && (
                    <span>• {showDetails.genres.join(", ")}</span>
                  )}
                </div>

                {showDetails.plot ? (
                  <p className="text-xs sm:text-sm text-zinc-300 mt-2 line-clamp-2 md:line-clamp-3 bg-black/50 backdrop-blur-sm p-2 sm:p-3 rounded-lg leading-relaxed shadow-inner">
                    {showDetails.plot}
                  </p>
                ) : (
                  <p className="text-[10px] sm:text-xs md:text-sm text-cinema-muted">
                    {showDetails.totalEpisodes} episodes available • Sorted sequentially
                  </p>
                )}
              </div>
            </div>

            {/* Seasons Tab Selector Row */}
            {showDetails.seasons.length > 1 && (
              <div className="px-6 border-b border-cinema-border py-3 flex gap-2 overflow-x-auto shrink-0">
                {showDetails.seasons.map((season) => (
                  <button
                    key={season}
                    onClick={() => setSelectedSeason(season)}
                    className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
                      selectedSeason === season
                        ? "bg-cinema-amber text-cinema-bg"
                        : "bg-cinema-card border border-cinema-border text-cinema-muted hover:text-white"
                    }`}
                  >
                    {season}
                  </button>
                ))}
              </div>
            )}

            {/* Episodes List Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <h3 className="text-sm font-bold text-cinema-amber uppercase tracking-wider">
                {selectedSeason} Episodes
              </h3>
              
              <div className="grid gap-3" id="tv-episodes-list">
                {(showDetails.episodesBySeason.get(selectedSeason) || []).map((episode, index) => {
                  const progress = getEpisodeProgress(episode.id);
                  return (
                    <div
                      key={episode.id}
                      onClick={() => {
                        setCurrentVideo(episode);
                      }}
                      className="group flex flex-col sm:flex-row items-stretch bg-cinema-card border border-cinema-border rounded-xl overflow-hidden hover:border-cinema-amber/50 transition-colors cursor-pointer p-2.5 gap-4"
                      id={`episode-row-${episode.id}`}
                    >
                      {/* Image Preview Thumbnail */}
                      <div className="relative aspect-[16/10] w-full sm:w-44 shrink-0 bg-black/40 rounded-lg overflow-hidden">
                        <img
                          src={episode.thumbnail}
                          alt={episode.episodeTitle}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-8 h-8 text-cinema-amber fill-current" />
                        </div>
                        {/* Format tag */}
                        <span className="absolute top-1.5 right-1.5 bg-black/70 text-[9px] font-bold px-1 py-0.2 rounded text-white uppercase tracking-wider">
                          {episode.extension.replace(".", "")}
                        </span>

                        {/* Custom watch history progress bar */}
                        {progress !== undefined && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                            <div
                              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                              className="bg-cinema-amber h-full"
                            />
                          </div>
                        )}
                      </div>

                      {/* Episode Meta Info */}
                      <div className="flex-1 flex flex-col justify-center min-w-0 py-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm md:text-base text-white truncate group-hover:text-cinema-amber transition-colors">
                            {index + 1}. {episode.episodeTitle || episode.title}
                          </h4>
                        </div>
                        <p className="text-xs text-cinema-muted truncate mt-1 leading-relaxed">
                          {episode.filename}
                        </p>

                        {episode.plot && (
                          <p className="text-xs text-zinc-400 line-clamp-2 mt-1.5 leading-relaxed max-w-3xl">
                            {episode.plot}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-cinema-muted mt-3 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDuration(episode.duration)}
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3.5 h-3.5" />
                            {formatSize(episode.size)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {activeDetailMovie && (
        <MovieDetailModal 
          movie={activeDetailMovie} 
          onClose={() => setActiveDetailMovie(null)} 
        />
      )}
    </div>
  );
}
