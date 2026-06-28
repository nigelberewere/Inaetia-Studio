import React, { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import MovieCard from "../components/MovieCard";
import { ListFilter, ArrowUpDown, Film, RefreshCw } from "lucide-react";

type SortType = "title-asc" | "added-desc" | "size-desc" | "duration-desc";

export default function Movies() {
  const { movies, loading, refreshLibrary } = useApp();

  const [sortBy, setSortBy] = useState<SortType>("added-desc");
  const [filterExt, setFilterExt] = useState<string>("all");

  // Collect unique movie extensions from loaded movies list dynamically
  const uniqueExtensions = useMemo(() => {
    const exts = movies.map((m) => m.extension.toLowerCase());
    return ["all", ...Array.from(new Set(exts))];
  }, [movies]);

  // Process sorting & filtering
  const processedMovies = useMemo(() => {
    let result = [...movies];

    // Filter by extension
    if (filterExt !== "all") {
      result = result.filter((m) => m.extension.toLowerCase() === filterExt);
    }

    // Sort files
    result.sort((a, b) => {
      switch (sortBy) {
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "added-desc":
          return new Date(b.added).getTime() - new Date(a.added).getTime();
        case "size-desc":
          return b.size - a.size;
        case "duration-desc":
          return b.duration - a.duration;
        default:
          return 0;
      }
    });

    return result;
  }, [movies, sortBy, filterExt]);

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
    <div className="space-y-8 pb-24 animate-fade-in" id="movies-view-page">
      {/* Top action/filters header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cinema-border pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Film className="w-7 h-7 text-cinema-amber" />
            Movies Directory
          </h1>
          <p className="text-cinema-muted text-xs md:text-sm mt-1">
            Browse and stream {movies.length} indexable movies cached locally.
          </p>
        </div>

        {/* Filters Controls Box */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dynamic Extensions Filter */}
          <div className="flex items-center gap-1.5 bg-cinema-card px-3 py-1.5 rounded-xl border border-cinema-border">
            <ListFilter className="w-4 h-4 text-cinema-muted" />
            <select
              value={filterExt}
              onChange={(e) => setFilterExt(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-2 font-medium"
              id="filter-extensions-select"
            >
              {uniqueExtensions.map((ext) => (
                <option key={ext} value={ext} className="bg-cinema-bg text-white">
                  {ext === "all" ? "All Formats" : ext.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Sorter Selector */}
          <div className="flex items-center gap-1.5 bg-cinema-card px-3 py-1.5 rounded-xl border border-cinema-border">
            <ArrowUpDown className="w-4 h-4 text-cinema-muted" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-2 font-medium"
              id="sort-movies-select"
            >
              <option value="added-desc" className="bg-cinema-bg">Recently Added</option>
              <option value="title-asc" className="bg-cinema-bg">Name A-Z</option>
              <option value="size-desc" className="bg-cinema-bg">File Size</option>
              <option value="duration-desc" className="bg-cinema-bg">Duration</option>
            </select>
          </div>

          {/* Manual reload trigger */}
          <button
            onClick={refreshLibrary}
            className="p-2 rounded-xl bg-cinema-card border border-cinema-border hover:bg-white/5 text-cinema-muted hover:text-white transition-colors"
            title="Reload library list"
            id="btn-movies-reload"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Display */}
      {processedMovies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-cinema-card border border-cinema-border rounded-2xl p-8 max-w-lg mx-auto">
          <span className="text-4xl">🎬</span>
          <h3 className="text-xl font-bold mt-4">No movies matched filters</h3>
          <p className="text-cinema-muted text-sm mt-2">
            Try choosing a different file format from the filter or place valid movie formats (.mp4, .mkv, .avi) inside your video directory.
          </p>
        </div>
      ) : (
        <div 
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6" 
          id="movies-grid"
        >
          {processedMovies.map((movie) => {
            const CardItem: any = MovieCard;
            return <CardItem key={movie.id} movie={movie} />;
          })}
        </div>
      )}
    </div>
  );
}
