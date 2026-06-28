import React from "react";
import { useApp } from "../context/AppContext";
import PhotoGrid from "../components/PhotoGrid";
import { Image as PhotoIcon, RefreshCw } from "lucide-react";

export default function Photos() {
  const { photos, loading, refreshLibrary } = useApp();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-cinema-card/50 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <div key={n} className="aspect-[3/4] bg-cinema-card/40 rounded-xl border border-cinema-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 animate-fade-in" id="photos-view-page">
      {/* Title Header */}
      <div className="flex items-center justify-between gap-4 border-b border-cinema-border pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <PhotoIcon className="w-7 h-7 text-cinema-amber" />
            Photo Galleries
          </h1>
          <p className="text-cinema-muted text-xs md:text-sm mt-1">
            Browse high-resolution photographs. Total files indexed: {photos.length}.
          </p>
        </div>

        <button
          onClick={refreshLibrary}
          className="p-2.5 rounded-xl bg-cinema-card border border-cinema-border hover:bg-white/5 text-cinema-muted hover:text-white transition-all"
          title="Refresh library"
          id="btn-photos-reload"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Mounting our PhotoGrid */}
      <PhotoGrid photos={photos} />
    </div>
  );
}
