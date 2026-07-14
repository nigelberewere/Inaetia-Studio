import React, { useState, useEffect } from "react";
import { Movie } from "../types";
import { useApp } from "../context/AppContext";
import { Play, Info, Calendar, Clock, Disc, Tv, Clapperboard, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatDuration, formatSize } from "../utils";

interface HeroProps {
  movies?: Movie[];
  movie?: Movie | null;
}

export default function Hero({ movies = [], movie }: HeroProps) {
  const { setCurrentVideo } = useApp();
  const [showInfo, setShowInfo] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const list = movies.length > 0 ? movies : (movie ? [movie] : []);

  // Reset index if list length changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [list.length]);

  // Auto-play interval
  useEffect(() => {
    if (list.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % list.length);
    }, 7000); // 7 seconds per slide

    return () => clearInterval(timer);
  }, [list.length, isHovered]);

  if (list.length === 0) {
    // Elegant fallback skeleton / welcome banner if no movie is found
    return (
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] min-h-[280px] sm:min-h-[320px] max-h-[500px] rounded-2xl overflow-hidden bg-gradient-to-r from-cinema-card to-cinema-bg border border-cinema-border flex flex-col justify-center px-6 sm:px-8 md:px-16 py-8 sm:py-12 mb-8">
        <div className="max-w-xl space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cinema-amber/10 text-cinema-amber border border-cinema-amber/20 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
            <Tv className="w-3.5 h-3.5" /> Welcome to Inaetia Studios
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
            Inaetia Studios Cinema Server
          </h1>
          <p className="text-cinema-muted text-xs sm:text-sm md:text-base max-w-md">
            Stream your media files beautifully directly from your Ubuntu server at 192.168.4.1. Access completely offline from your phones, laptops, and smart TVs.
          </p>
        </div>
        <div className="absolute inset-0 bg-radial-gradient from-cinema-amber/5 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  const activeMovie = list[currentIndex];
  const backdropImg = activeMovie.fanart || activeMovie.thumbnail;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + list.length) % list.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % list.length);
  };

  return (
    <div 
      className="relative w-full aspect-[16/9] sm:aspect-[21/9] min-h-[300px] sm:min-h-[380px] max-h-[540px] rounded-2xl overflow-hidden bg-cinema-card border border-cinema-border mb-8 group select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      id="hero-carousel-container"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeMovie.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 md:p-12 z-10"
        >
          {/* Background Cinematic Artwork Fanart/Backdrop & Dominant Gradient Overlays */}
          <div className="absolute inset-0 z-0 overflow-hidden bg-[#0a0a0f]">
            <motion.img
              key={backdropImg}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.65 }}
              transition={{ duration: 0.8 }}
              src={backdropImg}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover scale-100 group-hover:scale-[1.02] transition-transform duration-[8000ms] ease-out"
            />
            {/* Master Dark/Color Gradient overlays for cinema mood */}
            <div className="absolute inset-0 bg-gradient-to-t from-cinema-bg via-cinema-bg/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-cinema-bg via-cinema-bg/65 to-transparent" />
          </div>

          {/* Hero Content Panel */}
          <div className="relative z-10 max-w-2xl space-y-4">
            {/* Amber tag indicator */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cinema-amber/10 border border-cinema-amber/20 text-cinema-amber rounded-full text-xs font-semibold uppercase tracking-wider">
              <Clapperboard className="w-3.5 h-3.5 animate-pulse" /> Featured Movie {list.length > 1 && `(${currentIndex + 1}/${list.length})`}
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-md leading-tight">
              {activeMovie.title}
            </h1>

            {/* Metadata Badges */}
            <div className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-4 gap-y-1.5 sm:gap-y-2 text-[10px] sm:text-xs md:text-sm text-cinema-muted">
              <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 bg-white/10 text-white rounded text-[10px] sm:text-xs font-bold uppercase">
                {activeMovie.extension.replace(".", "")}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {formatDuration(activeMovie.duration)}
              </span>
              <span className="flex items-center gap-1">
                <Disc className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {formatSize(activeMovie.size)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {new Date(activeMovie.added).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
              <button
                id="btn-hero-play"
                onClick={() => setCurrentVideo(activeMovie)}
                className="flex items-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-cinema-amber text-cinema-bg rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-cinema-amber/15 cursor-pointer text-xs sm:text-sm"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                Play Now
              </button>
              
              <button
                id="btn-hero-info"
                onClick={() => setShowInfo(!showInfo)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-5 sm:py-3 bg-[#1A1A2E]/40 border border-cinema-border hover:bg-white/5 text-white rounded-xl font-semibold transition-all cursor-pointer text-xs sm:text-sm"
              >
                <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                {showInfo ? "Hide Details" : "More Info"}
              </button>
            </div>

            {/* Collapsible Info Card */}
            {showInfo && (
              <div className="p-4 bg-cinema-bg/95 backdrop-blur border border-cinema-border rounded-xl mt-3 animate-fade-in text-sm text-cinema-text/90 space-y-2">
                <p className="font-semibold text-cinema-amber">Technical File Info:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-mono">
                  <div><span className="text-cinema-muted">ID:</span> <span className="text-white">{activeMovie.id}</span></div>
                  <div><span className="text-cinema-muted">Filename:</span> <span className="text-white truncate block">{activeMovie.filename}</span></div>
                  <div><span className="text-cinema-muted">Filepath:</span> <span className="text-white truncate block">{activeMovie.filepath}</span></div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Manual Slide Navigation Arrows (Apple TV style on hover) */}
      {list.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 border border-white/5 text-white/85 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer hidden md:flex items-center justify-center shadow-lg hover:scale-105 active:scale-95"
            title="Previous Slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 border border-white/5 text-white/85 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer hidden md:flex items-center justify-center shadow-lg hover:scale-105 active:scale-95"
            title="Next Slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Slide Indicator Pills (Apple TV style at the bottom right) */}
      {list.length > 1 && (
        <div className="absolute bottom-4 right-6 md:right-12 flex items-center gap-1.5 z-20">
          {list.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1 cursor-pointer rounded-full transition-all duration-300 ${
                idx === currentIndex 
                  ? "w-6 bg-cinema-amber" 
                  : "w-1.5 bg-white/20 hover:bg-white/40"
              }`}
              title={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
