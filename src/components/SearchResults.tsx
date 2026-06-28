import React from "react";
import { useApp } from "../context/AppContext";
import { Film, Music, Image as PhotoIcon, Play, Clock } from "lucide-react";
import MovieCard from "./MovieCard";
import PhotoGrid from "./PhotoGrid";

export default function SearchResults() {
  const { searchQuery, searchResults, isSearching, playTrack, music } = useApp();

  // Highlight Text Helper Function
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-cinema-amber text-cinema-bg px-0.5 rounded-sm font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const hasResults = 
    searchResults.movies.length > 0 || 
    searchResults.music.length > 0 || 
    searchResults.photos.length > 0;

  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-cinema-amber border-t-transparent animate-spin" />
        <span className="text-cinema-muted text-sm font-mono tracking-widest">SEARCHING LIBRARY...</span>
      </div>
    );
  }

  if (!hasResults) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <span className="text-4xl">🔍</span>
        <h3 className="text-xl font-bold mt-4">No results for "{searchQuery}"</h3>
        <p className="text-cinema-muted text-sm mt-2">
          Double check your spelling or try search queries with generic terms like "Nigel", "Intro", "Aesthetic", or "Sunrise".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16 animate-fade-in" id="search-results-page">
      <div className="border-b border-cinema-border pb-4">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
          Search Results for <span className="text-cinema-amber">"{searchQuery}"</span>
        </h2>
        <p className="text-cinema-muted text-xs md:text-sm mt-1">
          Found {searchResults.movies.length} movies, {searchResults.music.length} tracks, and {searchResults.photos.length} photos.
        </p>
      </div>

      {/* 1. MOVIES SECTION */}
      {searchResults.movies.length > 0 && (
        <section className="space-y-4" id="search-section-movies">
          <div className="flex items-center gap-2 border-b border-cinema-border pb-2 text-cinema-amber">
            <Film className="w-5 h-5" />
            <h3 className="font-bold text-lg text-white">Matched Movies</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {searchResults.movies.map((movie) => (
              <div key={movie.id} className="relative">
                <MovieCard movie={movie} />
                <div className="absolute top-2 left-2 pointer-events-none bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold border border-white/10 max-w-[150px] truncate">
                  {highlightText(movie.title, searchQuery)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. MUSIC SECTION */}
      {searchResults.music.length > 0 && (
        <section className="space-y-4" id="search-section-music">
          <div className="flex items-center gap-2 border-b border-cinema-border pb-2 text-cinema-amber">
            <Music className="w-5 h-5" />
            <h3 className="font-bold text-lg text-white">Matched Audio Tracks</h3>
          </div>
          <div className="bg-cinema-card/50 rounded-xl border border-cinema-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-cinema-border text-xs text-cinema-muted font-bold uppercase tracking-wider bg-cinema-card/30">
                    <th className="py-3 px-4 w-12 text-center">Play</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Artist</th>
                    <th className="py-3 px-4">Album</th>
                    <th className="py-3 px-4 w-24 text-center">
                      <Clock className="w-4 h-4 mx-auto" />
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {searchResults.music.map((track) => (
                    <tr
                      key={track.id}
                      onClick={() => playTrack(track, music)}
                      className="border-b border-cinema-border hover:bg-white/5 transition-all cursor-pointer group"
                    >
                      <td className="py-3 px-4 text-center">
                        <button className="p-1.5 rounded-full bg-cinema-amber/10 text-cinema-amber group-hover:bg-cinema-amber group-hover:text-cinema-bg transition-colors">
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {highlightText(track.title, searchQuery)}
                      </td>
                      <td className="py-3 px-4 text-cinema-muted">
                        {highlightText(track.artist, searchQuery)}
                      </td>
                      <td className="py-3 px-4 text-cinema-muted">
                        {highlightText(track.album, searchQuery)}
                      </td>
                      <td className="py-3 px-4 text-center text-cinema-muted font-mono text-xs">
                        {formatDuration(track.duration)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* 3. PHOTOS SECTION */}
      {searchResults.photos.length > 0 && (
        <section className="space-y-4" id="search-section-photos">
          <div className="flex items-center gap-2 border-b border-cinema-border pb-2 text-cinema-amber">
            <PhotoIcon className="w-5 h-5" />
            <h3 className="font-bold text-lg text-white">Matched Photos</h3>
          </div>
          <PhotoGrid photos={searchResults.photos} />
        </section>
      )}
    </div>
  );
}
