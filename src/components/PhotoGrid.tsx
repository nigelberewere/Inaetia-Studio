import React, { useState, useEffect } from "react";
import { Photo } from "../types";
import { X, ChevronLeft, ChevronRight, Eye, Calendar, HardDrive } from "lucide-react";

interface PhotoGridProps {
  photos: Photo[];
}

export default function PhotoGrid({ photos }: PhotoGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Esc key & Arrow key support for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") {
        closeLightbox();
      } else if (e.key === "ArrowLeft") {
        showPrev();
      } else if (e.key === "ArrowRight") {
        showNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const showPrev = () => {
    if (lightboxIndex === null || photos.length === 0) return;
    const prevIdx = lightboxIndex === 0 ? photos.length - 1 : lightboxIndex - 1;
    setLightboxIndex(prevIdx);
  };

  const showNext = () => {
    if (lightboxIndex === null || photos.length === 0) return;
    const nextIdx = (lightboxIndex + 1) % photos.length;
    setLightboxIndex(nextIdx);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-cinema-card border border-cinema-border rounded-2xl p-8 text-center max-w-lg mx-auto">
        <span className="text-4xl">📸</span>
        <h3 className="text-xl font-bold mt-4">No photos scanned</h3>
        <p className="text-cinema-muted text-sm mt-2">
          Place .jpg, .jpeg, .png, .webp, or .gif files inside your `/mnt/storage/Pictures` directory to stream them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Masonry-Style Grid layout using Tailwind's columns model */}
      <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            id={`photo-card-${photo.id}`}
            onClick={() => openLightbox(index)}
            className="break-inside-avoid relative rounded-xl overflow-hidden border border-cinema-border group bg-cinema-card cursor-pointer hover:border-cinema-amber/40 hover:shadow-lg hover:shadow-cinema-amber/5 transition-all duration-300"
          >
            <img
              src={`/api/photos/${photo.id}`}
              alt={photo.filename}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-auto object-cover max-h-[360px]"
            />

            {/* Hover overlay details */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 flex flex-col justify-end p-3 transition-opacity duration-300">
              <span className="text-white font-semibold text-xs truncate mb-1">
                {photo.filename}
              </span>
              <div className="flex items-center gap-2.5 text-[10px] text-cinema-muted">
                <span className="flex items-center gap-0.5 shrink-0">
                  <HardDrive className="w-3 h-3" />
                  {formatSize(photo.size)}
                </span>
                <span className="flex items-center gap-0.5 shrink-0">
                  <Calendar className="w-3 h-3" />
                  {formatDate(photo.date)}
                </span>
              </div>
              <div className="absolute top-2 right-2 p-1.5 rounded-full bg-cinema-amber text-cinema-bg scale-75 group-hover:scale-100 transition-transform duration-300 shadow shadow-cinema-amber/30">
                <Eye className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Lightbox Overlay */}
      {lightboxIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-between p-4"
          id="photo-lightbox-modal"
          onClick={closeLightbox}
        >
          {/* Top Control Header */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-10 pointer-events-none">
            <div className="bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-md flex flex-col text-xs font-medium">
              <span className="text-white font-semibold truncate max-w-[200px] sm:max-w-md">
                {photos[lightboxIndex].filename}
              </span>
              <span className="text-cinema-muted text-[10px] mt-0.5">
                {formatSize(photos[lightboxIndex].size)} • {formatDate(photos[lightboxIndex].date)}
              </span>
            </div>
            
            <button
              onClick={closeLightbox}
              className="p-2.5 rounded-full bg-black/60 hover:bg-white/10 text-white pointer-events-auto hover:text-cinema-amber transition-colors shadow"
              title="Close Gallery (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Previous Arrow Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              showPrev();
            }}
            className="p-3 rounded-full bg-black/40 hover:bg-black/75 border border-cinema-border text-white/80 hover:text-white transition-colors cursor-pointer z-10 shrink-0 shadow-lg"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Main Focused Photo Asset */}
          <div 
            className="flex-1 flex items-center justify-center max-w-full max-h-full p-4 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`/api/photos/${photos[lightboxIndex].id}`}
              alt={photos[lightboxIndex].filename}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-fade-in"
            />
          </div>

          {/* Next Arrow Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              showNext();
            }}
            className="p-3 rounded-full bg-black/40 hover:bg-black/75 border border-cinema-border text-white/80 hover:text-white transition-colors cursor-pointer z-10 shrink-0 shadow-lg"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Indicator label */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-1 rounded-full backdrop-blur text-xs text-cinema-muted">
            {lightboxIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  );
}
