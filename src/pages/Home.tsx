import React from "react";
import { useApp } from "../context/AppContext";
import Hero from "../components/Hero";
import MovieCard from "../components/MovieCard";
import { Sparkles, Film, Disc, Clock } from "lucide-react";

export default function Home() {
  const { movies, loading, error, continueWatching } = useApp();

  // Pick a featured movie
  const featuredMovie = movies.length > 0 ? movies[0] : null;

  // Row 1: Recently Added (last 10 by file date)
  const recentlyAdded = [...movies]
    .sort((a, b) => new Date(b.added).getTime() - new Date(a.added).getTime())
    .slice(0, 10);

  // Row 2: All Movies
  const allMovies = movies;

  // Row 3: Large Files (files > 2GB, i.e., 2 * 1024 * 1024 * 1024 bytes)
  const largeFiles = movies.filter((m) => m.size > 2 * 1024 * 1024 * 1024);

  if (loading) {
    return (
      <div className="space-y-10 animate-pulse">
        {/* Hero Banner Skeleton */}
        <div className="w-full aspect-[21/9] min-h-[360px] bg-cinema-card/50 rounded-2xl border border-white/5" />
        
        {/* Row Skeletons */}
        {[1, 2].map((row) => (
          <div key={row} className="space-y-4">
            <div className="h-6 w-48 bg-cinema-card/80 rounded" />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 4, 5].map((card) => (
                <div key={card} className="w-[280px] h-[210px] shrink-0 bg-cinema-card/40 rounded-xl border border-white/5" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <span className="text-5xl">⚠️</span>
        <h3 className="text-2xl font-bold mt-4 text-red-400">Library Sync Error</h3>
        <p className="text-cinema-muted text-sm mt-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-5 py-2.5 bg-cinema-amber text-cinema-bg font-bold rounded-xl active:scale-95 transition-all shadow-md"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-24" id="home-view-page">
      {/* Cinematic Hero */}
      <Hero movie={featuredMovie} />

      {/* 0. CONTINUE WATCHING ROW */}
      <section className="space-y-4" id="home-row-continue">
        <div className="flex items-center gap-2 text-cinema-amber font-semibold">
          <Clock className="w-5 h-5" />
          <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-white uppercase">Continue Watching</h2>
        </div>
        {continueWatching.length === 0 ? (
          <div className="bg-cinema-card/30 border border-cinema-border/50 rounded-xl p-6 text-center text-sm text-cinema-muted">
            Nothing to continue yet. Start watching!
          </div>
        ) : (
          <div className="horizontal-scroll">
            {continueWatching.map((item) => {
              if (!item.movie) return null;
              const pct = (item.position / item.duration) * 100;
              return (
                <div key={item.movieId} className="w-[240px] sm:w-[280px] shrink-0">
                  <MovieCard movie={item.movie} progress={pct} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 1. RECENTLY ADDED ROW */}
      {recentlyAdded.length > 0 && (
        <section className="space-y-4" id="home-row-recent">
          <div className="flex items-center gap-2 text-cinema-amber font-semibold">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-white uppercase">Recently Added</h2>
          </div>
          <div className="horizontal-scroll">
            {recentlyAdded.map((movie) => (
              <div key={movie.id} className="w-[240px] sm:w-[280px] shrink-0">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. ALL MOVIES ROW */}
      {allMovies.length > 0 && (
        <section className="space-y-4" id="home-row-movies">
          <div className="flex items-center gap-2 text-cinema-amber font-semibold">
            <Film className="w-5 h-5" />
            <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-white uppercase">Movies Directory</h2>
          </div>
          <div className="horizontal-scroll">
            {allMovies.map((movie) => (
              <div key={movie.id} className="w-[240px] sm:w-[280px] shrink-0">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. LARGE HIGH-QUALITY FILES ROW */}
      {largeFiles.length > 0 && (
        <section className="space-y-4" id="home-row-large">
          <div className="flex items-center gap-2 text-cinema-amber font-semibold">
            <img src="/api/thumbnail" className="hidden" alt="" />
            <Disc className="w-5 h-5" />
            <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-white uppercase">Large High-Definition Files</h2>
          </div>
          <div className="horizontal-scroll">
            {largeFiles.map((movie) => (
              <div key={movie.id} className="w-[240px] sm:w-[280px] shrink-0">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
