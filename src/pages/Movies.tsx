import React, { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import MovieCard from "../components/MovieCard";
import MovieDetailModal from "../components/MovieDetailModal";
import { 
  Film, Tv, Shield, Folder, Play, Clock, HardDrive, 
  ChevronRight, RefreshCw, X, Clapperboard, Video,
  LayoutGrid, List, Columns, Calendar, ArrowUpDown, Disc, Tag, Layers
} from "lucide-react";
import { Movie } from "../types";
import { formatDuration, formatSize, formatCleanDate, normalizeSeriesName, pluralize } from "../utils";
import { Badge } from "../components/common/Badge";

type ContentTypeFilter = "all" | "movies" | "tvshows" | "videos";
type CollectionFilter = "all" | "marvel" | "cartoons" | string;
type ViewMode = "poster" | "landscape" | "list";
type SortOption = "recent" | "title" | "rating" | "duration" | "size";
type DecadeFilter = "all" | "2020s" | "2010s" | "2000s" | "older";
type FormatFilter = "all" | "mkv" | "mp4" | "hd";

export default function Movies() {
  const { movies, loading, refreshLibrary, triggerRescan, setCurrentVideo, continueWatching } = useApp();

  // Taxonomy Filter States: Row 1 = Content Type, Row 2 = Collections & Genres
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>("all");
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>("all");

  const [selectedShow, setSelectedShow] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>("Season 1");
  const [activeDetailMovie, setActiveDetailMovie] = useState<Movie | null>(null);

  // Layout & Filter States
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem("cinema_view_mode");
      if (saved === "poster" || saved === "landscape" || saved === "list") {
        return saved;
      }
    } catch {
      // Storage unavailable
    }
    return "poster";
  });

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("cinema_view_mode", mode);
    } catch {
      // Storage unavailable
    }
  };

  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [decadeFilter, setDecadeFilter] = useState<DecadeFilter>("all");
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("all");

  // Helper to compute episode progress
  const getEpisodeProgress = (episodeId: string) => {
    const watchRecord = continueWatching.find((item) => item.movieId === episodeId);
    if (watchRecord) {
      return (watchRecord.position / watchRecord.duration) * 100;
    }
    return undefined;
  };

  // Group all episodes into unique TV Shows using normalized series name to prevent duplicates
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
        const normKey = normalizeSeriesName(m.showName);
        if (!showMap.has(normKey)) {
          showMap.set(normKey, {
            name: m.showName.trim(),
            episodes: [],
            category: m.category || "Tv Shows",
            plot: m.showPlot || null,
            year: m.showYear || null,
            rating: m.showRating || null,
            genres: m.showGenres || [],
            studio: m.showStudio || null,
          });
        }
        const existing = showMap.get(normKey)!;
        // Keep the cleaner/longer title if available
        if (m.showName.trim().length > existing.name.length || (m.showPlot && !existing.plot)) {
          existing.name = m.showName.trim();
        }
        if (!existing.plot && m.showPlot) existing.plot = m.showPlot;
        if (!existing.year && m.showYear) existing.year = m.showYear;
        if (!existing.rating && m.showRating) existing.rating = m.showRating;
        if (!existing.studio && m.showStudio) existing.studio = m.showStudio;
        if ((!existing.genres || existing.genres.length === 0) && m.showGenres && m.showGenres.length > 0) {
          existing.genres = m.showGenres;
        }

        // Avoid adding duplicate episodes
        if (!existing.episodes.some((ep) => ep.id === m.id || ep.filepath === m.filepath)) {
          existing.episodes.push(m);
        }
      }
    });

    return Array.from(showMap.values());
  }, [movies]);

  // Dynamically extract genres from library for collection row
  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    movies.forEach((m) => {
      if (m.genres) {
        m.genres.forEach((g) => {
          const trimmed = g.trim();
          if (trimmed && !/^(marvel|cartoons|animation|movie|movies|tv|shows)$/i.test(trimmed)) {
            genreSet.add(trimmed);
          }
        });
      }
    });
    shows.forEach((s) => {
      if (s.genres) {
        s.genres.forEach((g) => {
          const trimmed = g.trim();
          if (trimmed && !/^(marvel|cartoons|animation|movie|movies|tv|shows)$/i.test(trimmed)) {
            genreSet.add(trimmed);
          }
        });
      }
    });
    return Array.from(genreSet).sort();
  }, [movies, shows]);

  // Selected Show details helper
  const showDetails = useMemo(() => {
    if (!selectedShow) return null;
    const normSelected = normalizeSeriesName(selectedShow);
    const show = shows.find((s) => s.name === selectedShow || normalizeSeriesName(s.name) === normSelected);
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

  // Filter & Sort Content according to two-row taxonomy
  const filteredContent = useMemo(() => {
    let moviesList = movies.filter((m) => m.type === "movie");
    let showsList = [...shows];
    const videosBySubcategory: Record<string, Movie[]> = {};

    // 1. Content Type Filter
    if (contentTypeFilter === "movies") {
      showsList = [];
    } else if (contentTypeFilter === "tvshows") {
      moviesList = [];
    } else if (contentTypeFilter === "videos") {
      moviesList = [];
      showsList = [];
      movies.forEach((m) => {
        if (m.category === "Videos" || m.type === "video") {
          const sub = m.subcategory || "Other Videos";
          if (!videosBySubcategory[sub]) videosBySubcategory[sub] = [];
          videosBySubcategory[sub].push(m);
        }
      });
    } else { // "all"
      movies.forEach((m) => {
        if (m.category === "Videos" || m.type === "video") {
          const sub = m.subcategory || "Other Videos";
          if (!videosBySubcategory[sub]) videosBySubcategory[sub] = [];
          videosBySubcategory[sub].push(m);
        }
      });
    }

    // 2. Collection / Genre Filter
    if (collectionFilter !== "all") {
      const matchCollection = (genres?: string[], category?: string) => {
        if (collectionFilter === "marvel") {
          return category === "Marvel Movies" || genres?.some((g) => /marvel/i.test(g));
        }
        if (collectionFilter === "cartoons") {
          return category === "Cartoons" || genres?.some((g) => /cartoon|animation/i.test(g));
        }
        return genres?.some((g) => g.toLowerCase() === collectionFilter.toLowerCase());
      };

      moviesList = moviesList.filter((m) => matchCollection(m.genres, m.category));
      showsList = showsList.filter((s) => matchCollection(s.genres, s.category));

      Object.keys(videosBySubcategory).forEach((sub) => {
        videosBySubcategory[sub] = videosBySubcategory[sub].filter((v) => matchCollection(v.genres, v.category));
        if (videosBySubcategory[sub].length === 0) {
          delete videosBySubcategory[sub];
        }
      });
    }

    // 3. Decade Filter
    if (decadeFilter !== "all") {
      moviesList = moviesList.filter((m) => {
        const yr = m.year || (m.added ? new Date(m.added).getFullYear() : null);
        if (!yr) return false;
        if (decadeFilter === "2020s") return yr >= 2020;
        if (decadeFilter === "2010s") return yr >= 2010 && yr < 2020;
        if (decadeFilter === "2000s") return yr >= 2000 && yr < 2010;
        if (decadeFilter === "older") return yr < 2000;
        return true;
      });
      showsList = showsList.filter((s) => {
        const yr = s.year;
        if (!yr) return false;
        if (decadeFilter === "2020s") return yr >= 2020;
        if (decadeFilter === "2010s") return yr >= 2010 && yr < 2020;
        if (decadeFilter === "2000s") return yr >= 2000 && yr < 2010;
        if (decadeFilter === "older") return yr < 2000;
        return true;
      });
    }

    // 4. Format / Resolution Filter
    if (formatFilter !== "all") {
      moviesList = moviesList.filter((m) => {
        if (formatFilter === "mkv") return m.extension.toLowerCase().includes("mkv");
        if (formatFilter === "mp4") return m.extension.toLowerCase().includes("mp4");
        if (formatFilter === "hd") return m.size > 1000 * 1024 * 1024;
        return true;
      });
    }

    // 5. Sorting logic
    const sortFn = (a: Movie, b: Movie) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "duration") return (b.duration || 0) - (a.duration || 0);
      if (sortBy === "size") return b.size - a.size;
      return new Date(b.added).getTime() - new Date(a.added).getTime();
    };

    moviesList.sort(sortFn);

    showsList.sort((a, b) => {
      if (sortBy === "title") return a.name.localeCompare(b.name);
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      return b.episodes.length - a.episodes.length;
    });

    return { moviesList, showsList, videosBySubcategory };
  }, [contentTypeFilter, collectionFilter, movies, shows, decadeFilter, formatFilter, sortBy]);

  const handleOpenShow = (showName: string) => {
    setSelectedShow(showName);
    const show = shows.find((s) => s.name === showName || normalizeSeriesName(s.name) === normalizeSeriesName(showName));
    if (show && show.episodes.length > 0) {
      const seasonMap = new Map<string, Movie[]>();
      show.episodes.forEach((ep) => {
        const sName = ep.seasonName || "Season 1";
        if (!seasonMap.has(sName)) seasonMap.set(sName, []);
        seasonMap.get(sName)!.push(ep);
      });
      const firstSeason = Array.from(seasonMap.keys())[0] || "Season 1";
      setSelectedSeason(firstSeason);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in" id="movies-library-page">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
            <Film className="w-8 h-8 text-cinema-amber" />
            Media Library
          </h1>
          <p className="text-cinema-muted text-sm mt-1">
            Browse movies, TV series, animated shows, and videos.
          </p>
        </div>

        {/* Manual Rescan Trigger */}
        <button
          onClick={triggerRescan}
          className="self-start md:self-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cinema-card border border-cinema-border hover:bg-white/5 text-cinema-muted hover:text-white transition-all text-xs font-semibold"
          title="Reload Library Filesystem"
          id="btn-movies-reload"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Library
        </button>
      </div>

      {/* Two-Row Taxonomy Filter Bar */}
      <div className="space-y-3" id="taxonomy-filters-container">
        {/* Row 1: Content Type Filter */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cinema-muted/80 flex items-center gap-1">
            <Layers className="w-3 h-3 text-cinema-amber" /> Content Type
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full max-w-full scrollbar-none" id="content-type-tabs-list">
            {(
              [
                { id: "all", label: "All Media", icon: Folder },
                { id: "movies", label: "Movies", icon: Clapperboard },
                { id: "tvshows", label: "TV Shows", icon: Tv },
                { id: "videos", label: "Videos & Clips", icon: Film }
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = contentTypeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setContentTypeFilter(tab.id);
                    setSelectedShow(null);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border font-bold text-xs shrink-0 active:scale-95 transition-all cursor-pointer ${
                    isActive
                      ? "bg-cinema-amber text-cinema-bg border-cinema-amber shadow-lg shadow-cinema-amber/20"
                      : "bg-white/5 border-white/10 text-cinema-muted hover:text-white hover:bg-white/10 backdrop-blur-md"
                  }`}
                  id={`tab-content-type-${tab.id}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Collections & Genres Filter */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cinema-muted/80 flex items-center gap-1">
            <Tag className="w-3 h-3 text-cinema-amber" /> Collections & Genres
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full max-w-full scrollbar-none" id="collection-tabs-list">
            <button
              onClick={() => setCollectionFilter("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs shrink-0 transition-all cursor-pointer ${
                collectionFilter === "all"
                  ? "bg-white/20 text-white border-white/30"
                  : "bg-white/5 border-white/10 text-cinema-muted hover:text-white hover:bg-white/10"
              }`}
            >
              All Collections
            </button>
            <button
              onClick={() => setCollectionFilter("marvel")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs shrink-0 transition-all cursor-pointer ${
                collectionFilter === "marvel"
                  ? "bg-red-500/20 text-red-400 border-red-500/40"
                  : "bg-white/5 border-white/10 text-cinema-muted hover:text-white hover:bg-white/10"
              }`}
            >
              <Shield className="w-3 h-3 text-red-400" /> Marvel Universe
            </button>
            <button
              onClick={() => setCollectionFilter("cartoons")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs shrink-0 transition-all cursor-pointer ${
                collectionFilter === "cartoons"
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/40"
                  : "bg-white/5 border-white/10 text-cinema-muted hover:text-white hover:bg-white/10"
              }`}
            >
              <Video className="w-3 h-3 text-purple-400" /> Cartoons & Animation
            </button>
            {availableGenres.map((genre) => (
              <button
                key={genre}
                onClick={() => setCollectionFilter(genre)}
                className={`px-3 py-1.5 rounded-xl border font-bold text-xs shrink-0 transition-all cursor-pointer ${
                  collectionFilter === genre
                    ? "bg-cinema-amber/20 text-cinema-amber border-cinema-amber/40"
                    : "bg-white/5 border-white/10 text-cinema-muted hover:text-white hover:bg-white/10"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Filter & Sorting Toolbar */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-wrap items-center justify-between gap-4">
        {/* Left Controls: Filter Badges & Sorting */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Sort Selection */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl">
            <ArrowUpDown className="w-3.5 h-3.5 text-cinema-amber" />
            <span className="text-cinema-muted font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-white font-bold cursor-pointer focus:outline-none"
            >
              <option value="recent" className="bg-zinc-900 text-white">Recently Added</option>
              <option value="title" className="bg-zinc-900 text-white">Title (A-Z)</option>
              <option value="rating" className="bg-zinc-900 text-white">Highest Rating</option>
              <option value="duration" className="bg-zinc-900 text-white">Duration</option>
              <option value="size" className="bg-zinc-900 text-white">File Size</option>
            </select>
          </div>

          {/* Decade Filter */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-cinema-amber" />
            <span className="text-cinema-muted font-medium">Era:</span>
            <select
              value={decadeFilter}
              onChange={(e) => setDecadeFilter(e.target.value as DecadeFilter)}
              className="bg-transparent text-white font-bold cursor-pointer focus:outline-none"
            >
              <option value="all" className="bg-zinc-900 text-white">All Years</option>
              <option value="2020s" className="bg-zinc-900 text-white">2020s</option>
              <option value="2010s" className="bg-zinc-900 text-white">2010s</option>
              <option value="2000s" className="bg-zinc-900 text-white">2000s</option>
              <option value="older" className="bg-zinc-900 text-white">Older</option>
            </select>
          </div>

          {/* Format Filter */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl">
            <Disc className="w-3.5 h-3.5 text-cinema-amber" />
            <span className="text-cinema-muted font-medium">Format:</span>
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value as FormatFilter)}
              className="bg-transparent text-white font-bold cursor-pointer focus:outline-none"
            >
              <option value="all" className="bg-zinc-900 text-white">All Formats</option>
              <option value="mkv" className="bg-zinc-900 text-white">MKV Container</option>
              <option value="mp4" className="bg-zinc-900 text-white">MP4 Video</option>
              <option value="hd" className="bg-zinc-900 text-white">High-Bitrate (&gt;1GB)</option>
            </select>
          </div>
        </div>

        {/* Right Controls: Grid/Layout View Mode Toggles */}
        <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-1 rounded-xl" id="viewmode-toggle-group">
          <button
            onClick={() => changeViewMode("poster")}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              viewMode === "poster" ? "bg-cinema-amber text-cinema-bg font-bold shadow-md" : "text-cinema-muted hover:text-white"
            }`}
            title="Poster Grid View"
            id="btn-viewmode-poster"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => changeViewMode("landscape")}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              viewMode === "landscape" ? "bg-cinema-amber text-cinema-bg font-bold shadow-md" : "text-cinema-muted hover:text-white"
            }`}
            title="Landscape Card View"
            id="btn-viewmode-landscape"
          >
            <Columns className="w-4 h-4" />
          </button>
          <button
            onClick={() => changeViewMode("list")}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              viewMode === "list" ? "bg-cinema-amber text-cinema-bg font-bold shadow-md" : "text-cinema-muted hover:text-white"
            }`}
            title="Detailed List View"
            id="btn-viewmode-list"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Rendering Grid */}
      <div className="space-y-12">
        {/* Render Aggregated TV Shows (Series) */}
        {filteredContent.showsList.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2 border-l-4 border-cinema-amber pl-3">
              <Tv className="w-5 h-5 text-cinema-amber" />
              {pluralize(filteredContent.showsList.length, "TV Series", "TV Series")}
            </h2>

            {/* Poster View */}
            {viewMode === "poster" && (
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
                        <h3 className="font-bold text-sm md:text-base text-white line-clamp-2 break-words leading-snug group-hover:text-cinema-amber transition-colors">
                          {show.name}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-cinema-muted font-medium mt-auto">
                          <span>{pluralize(show.episodes.length, "Episode")}</span>
                          <span className="flex items-center text-cinema-amber gap-0.5 text-[10px] uppercase font-bold tracking-wider">
                            Browse <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Landscape View */}
            {viewMode === "landscape" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContent.showsList.map((show) => {
                  const firstEpisode = show.episodes[0];
                  return (
                    <div
                      key={show.name}
                      onClick={() => handleOpenShow(show.name)}
                      className="group relative aspect-[16/9] rounded-2xl overflow-hidden bg-black/40 border border-white/10 hover:border-cinema-amber cursor-pointer appletv-card shadow-xl flex flex-col justify-end p-4"
                      id={`series-card-${show.name.replace(/\s+/g, "-")}`}
                    >
                      <img
                        src={`/api/show-poster/${encodeURIComponent(show.name)}?firstEpisodeId=${firstEpisode?.id || ""}`}
                        alt={show.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                      <div className="relative z-10 space-y-1">
                        <Badge variant="amber" size="sm">
                          TV Series
                        </Badge>
                        <h3 className="font-extrabold text-lg text-white line-clamp-2 break-words leading-snug group-hover:text-cinema-amber transition-colors">
                          {show.name}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-cinema-muted font-medium">
                          <span>{pluralize(show.episodes.length, "Episode")}</span>
                          <span className="flex items-center text-cinema-amber gap-0.5 text-[10px] uppercase font-bold tracking-wider">
                            Browse Episodes <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List View */}
            {viewMode === "list" && (
              <div className="space-y-3">
                {filteredContent.showsList.map((show) => {
                  const firstEpisode = show.episodes[0];
                  return (
                    <div
                      key={show.name}
                      onClick={() => handleOpenShow(show.name)}
                      className="group flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cinema-amber hover:bg-white/10 transition-all cursor-pointer backdrop-blur-md appletv-card"
                      id={`series-card-${show.name.replace(/\s+/g, "-")}`}
                    >
                      <img
                        src={`/api/show-poster/${encodeURIComponent(show.name)}?firstEpisodeId=${firstEpisode?.id || ""}`}
                        alt={show.name}
                        className="w-16 h-20 object-cover rounded-xl border border-white/10 shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-cinema-amber/10 text-cinema-amber border border-cinema-amber/20 rounded text-[10px] font-bold uppercase">
                            TV Series
                          </span>
                          <span className="text-xs text-cinema-muted font-medium">
                            {pluralize(show.episodes.length, "Episode")}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-base text-white line-clamp-1 break-words leading-snug group-hover:text-cinema-amber transition-colors">
                          {show.name}
                        </h3>
                      </div>
                      <button
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cinema-amber text-cinema-bg font-bold text-xs hover:brightness-110 transition-all cursor-pointer shrink-0"
                      >
                        Browse Episodes
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Render Direct Movies */}
        {filteredContent.moviesList.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2 border-l-4 border-cinema-amber pl-3">
              <Clapperboard className="w-5 h-5 text-cinema-amber" />
              {pluralize(filteredContent.moviesList.length, "Movie")}
            </h2>
            
            {viewMode === "poster" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {filteredContent.moviesList.map((movie) => (
                  <MovieCard 
                    key={movie.id} 
                    movie={movie} 
                    onClick={() => setActiveDetailMovie(movie)}
                  />
                ))}
              </div>
            )}

            {viewMode === "landscape" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContent.moviesList.map((movie) => (
                  <div
                    key={movie.id}
                    onClick={() => setActiveDetailMovie(movie)}
                    className="group relative aspect-[16/9] rounded-2xl overflow-hidden bg-black/40 border border-white/10 hover:border-cinema-amber cursor-pointer appletv-card shadow-xl flex flex-col justify-end p-4"
                  >
                    <img
                      src={movie.fanart || movie.thumbnail || `/api/artwork/${movie.id}/poster`}
                      alt={movie.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    <div className="relative z-10 space-y-1">
                      <Badge variant="amber" size="sm">
                        {movie.extension.replace(".", "")}
                      </Badge>
                      <h3 className="font-extrabold text-lg text-white line-clamp-2 break-words leading-snug group-hover:text-cinema-amber transition-colors">
                        {movie.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-cinema-muted">
                        {movie.duration > 0 && <span>{formatDuration(movie.duration)}</span>}
                        {movie.size > 0 && <span>• {formatSize(movie.size)}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewMode === "list" && (
              <div className="space-y-3">
                {filteredContent.moviesList.map((movie) => (
                  <div
                    key={movie.id}
                    onClick={() => setActiveDetailMovie(movie)}
                    className="group flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cinema-amber hover:bg-white/10 transition-all cursor-pointer backdrop-blur-md appletv-card"
                  >
                    <img
                      src={movie.poster || movie.thumbnail}
                      alt={movie.title}
                      className="w-16 h-20 object-cover rounded-xl border border-white/10 shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="font-extrabold text-base text-white line-clamp-2 break-words leading-snug group-hover:text-cinema-amber transition-colors">
                        {movie.title}
                      </h3>
                      <p className="text-xs text-cinema-muted line-clamp-1">
                        {movie.plot || movie.tagline || "No plot synopsis."}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-cinema-muted">
                        <span className="px-1.5 py-0.5 bg-white/10 text-white rounded text-[10px] font-bold uppercase">
                          {movie.extension.replace(".", "")}
                        </span>
                        {movie.duration > 0 && <span>{formatDuration(movie.duration)}</span>}
                        {movie.size > 0 && <span>{formatSize(movie.size)}</span>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentVideo(movie);
                      }}
                      className="p-3 rounded-xl bg-cinema-amber text-cinema-bg font-bold hover:scale-105 transition-all cursor-pointer shrink-0"
                      title="Play Immediately"
                    >
                      <Play className="w-4 h-4 fill-cinema-bg" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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

              {viewMode === "poster" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                  {videoList.map((video) => (
                    <MovieCard 
                      key={video.id} 
                      movie={video} 
                      onClick={() => setActiveDetailMovie(video)}
                    />
                  ))}
                </div>
              )}

              {viewMode === "landscape" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videoList.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => setActiveDetailMovie(video)}
                      className="group relative aspect-[16/9] rounded-2xl overflow-hidden bg-black/40 border border-white/10 hover:border-cinema-amber cursor-pointer appletv-card shadow-xl flex flex-col justify-end p-4"
                    >
                      <img
                        src={video.fanart || video.thumbnail || `/api/artwork/${video.id}/poster`}
                        alt={video.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                      <div className="relative z-10 space-y-1">
                        <Badge variant="amber" size="sm">
                          {video.extension.replace(".", "")}
                        </Badge>
                        <h3 className="font-extrabold text-lg text-white line-clamp-2 break-words leading-snug group-hover:text-cinema-amber transition-colors">
                          {video.title}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-cinema-muted">
                          {video.duration > 0 && <span>{formatDuration(video.duration)}</span>}
                          {video.size > 0 && <span>• {formatSize(video.size)}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {viewMode === "list" && (
                <div className="space-y-3">
                  {videoList.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => setActiveDetailMovie(video)}
                      className="group flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cinema-amber hover:bg-white/10 transition-all cursor-pointer backdrop-blur-md appletv-card"
                    >
                      <img
                        src={video.poster || video.thumbnail}
                        alt={video.title}
                        className="w-16 h-20 object-cover rounded-xl border border-white/10 shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <h3 className="font-extrabold text-base text-white line-clamp-2 break-words leading-snug group-hover:text-cinema-amber transition-colors">
                          {video.title}
                        </h3>
                        <p className="text-xs text-cinema-muted line-clamp-1">
                          {video.plot || video.tagline || video.filename}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-cinema-muted">
                          <span className="px-1.5 py-0.5 bg-white/10 text-white rounded text-[10px] font-bold uppercase">
                            {video.extension.replace(".", "")}
                          </span>
                          {video.duration > 0 && <span>{formatDuration(video.duration)}</span>}
                          {video.size > 0 && <span>{formatSize(video.size)}</span>}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentVideo(video);
                        }}
                        className="p-3 rounded-xl bg-cinema-amber text-cinema-bg font-bold hover:scale-105 transition-all cursor-pointer shrink-0"
                        title="Play Immediately"
                      >
                        <Play className="w-4 h-4 fill-cinema-bg" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {/* Zero Results Placeholder */}
        {filteredContent.moviesList.length === 0 &&
          filteredContent.showsList.length === 0 &&
          Object.keys(filteredContent.videosBySubcategory).length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-cinema-card border border-cinema-border rounded-2xl p-8 max-w-lg mx-auto">
              <div className="p-4 rounded-full bg-white/5 border border-cinema-border mb-2 text-cinema-muted">
                <Film className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mt-2">Directory looks empty</h3>
              <p className="text-cinema-muted text-sm mt-2">
                Make sure you place your video formats (.mp4, .mkv) in their respective folders under your configured video paths.
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
                <h2 className="text-xl sm:text-2xl md:text-4xl font-black text-white drop-shadow-md mt-1.5 sm:mt-2 line-clamp-2 break-words leading-tight">
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
                    {pluralize(showDetails.totalEpisodes, "episode")} available • Sorted sequentially
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
                {selectedSeason} ({pluralize((showDetails.episodesBySeason.get(selectedSeason) || []).length, "Episode")})
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
                          <h4 className="font-bold text-sm md:text-base text-white line-clamp-2 break-words group-hover:text-cinema-amber transition-colors">
                            {index + 1}. {episode.episodeTitle || episode.title}
                          </h4>
                        </div>
                        <p className="text-xs text-cinema-muted line-clamp-1 mt-1 leading-relaxed">
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
