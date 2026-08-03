import React, { useState, useEffect } from "react";
import { Movie } from "../types";
import { useApp } from "../context/AppContext";
import { Play, Info, Calendar, Clock, Disc, Tv, Clapperboard, ChevronLeft, ChevronRight, Star, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatDuration, formatSize, formatCleanDate } from "../utils";
import { Badge } from "./common/Badge";

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
    }, 7000);

    return () => clearInterval(timer);
  }, [list.length, isHovered]);

  if (list.length === 0) {
    return (
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] min-h-[300px] sm:min-h-[360px] max-h-[520px] rounded-2xl sm:rounded-3xl overflow-hidden glass-panel flex flex-col justify-center px-6 sm:px-10 md:px-16 py-8 sm:py-12 mb-8 shadow-2xl">
        <div className="max-w-xl space-y-3 sm:space-y-4 relative z-10">
          <Badge variant="amber" icon={<Tv className="w-3 h-3" />}>
            Inaetia Cinema Platform
          </Badge>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Inaetia Studios Media Server
          </h1>
          <p className="text-cinema-muted text-xs sm:text-sm md:text-base max-w-md leading-relaxed">
            Stream high-definition movies, live TV, radio stations, and music seamlessly across your devices.
          </p>
        </div>
        <div className="absolute inset-0 bg-gradient-to-tr from-cinema-amber/10 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  const activeMovie = list[currentIndex];
  const backdropImg = activeMovie.fanart || activeMovie.thumbnail;
  
  // Sanitized date (prefers year if available, falls back to clean added date)
  const cleanYear = formatCleanDate(activeMovie.year);
  const cleanAddedDate = formatCleanDate(activeMovie.added);
  const displayDate = cleanYear || cleanAddedDate;

  // Extract genre list
  const genresList = activeMovie.genres && activeMovie.genres.length > 0
    ? activeMovie.genres
    : (activeMovie.showGenres && activeMovie.showGenres.length > 0
      ? activeMovie.showGenres
      : (activeMovie.category ? [activeMovie.category] : []));

  // Synopsis plot
  const synopsis = activeMovie.plot || activeMovie.tagline || activeMovie.showPlot;

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
      className="relative w-full aspect-[16/9] sm:aspect-[21/9] min-h-[320px] sm:min-h-[420px] max-h-[580px] rounded-2xl sm:rounded-3xl overflow-hidden bg-cinema-card border border-white/10 mb-8 group select-none shadow-2xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      id="hero-carousel-container"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeMovie.id}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 md:p-12 z-10"
        >
          {/* Background Cinematic Artwork & Apple TV Scrim Gradients */}
          <div className="absolute inset-0 z-0 overflow-hidden bg-[#07070e]">
            <motion.img
              key={backdropImg}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 0.6, scale: 1 }}
              transition={{ duration: 0.8 }}
              src={backdropImg}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[10000ms] ease-out"
            />
            {/* Multi-stage Apple TV Vignette / Scrim Gradient Overlays for Guaranteed Text Legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#07070e] via-[#07070e]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#07070e] via-[#07070e]/70 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#07070e] via-[#07070e]/50 to-transparent" />
          </div>

          {/* Hero Content Panel with Glassmorphism Scrim */}
          <div className="relative z-10 max-w-3xl space-y-3 sm:space-y-4 bg-black/40 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-white/10 shadow-2xl backdrop-saturate-150">
            {/* Indicator Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="amber" icon={<Clapperboard className="w-3 h-3" />}>
                Featured {list.length > 1 && `• ${currentIndex + 1} of ${list.length}`}
              </Badge>
              {activeMovie.rating && (
                <Badge variant="glass" icon={<Star className="w-3 h-3 text-cinema-amber fill-cinema-amber" />}>
                  {(activeMovie.rating > 10 ? (activeMovie.rating / 10).toFixed(1) : activeMovie.rating.toFixed(1))}
                </Badge>
              )}
              {activeMovie.mpaa && (
                <Badge variant="hd">
                  {activeMovie.mpaa}
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-lg leading-tight">
              {activeMovie.title}
            </h1>

            {/* Genres Tag Chips */}
            {genresList.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {genresList.slice(0, 4).map((genre, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-white/10 text-white/90 border border-white/10 backdrop-blur-sm"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Synopsis (Max 2 lines) */}
            {synopsis && (
              <p className="text-xs sm:text-sm text-cinema-text/90 line-clamp-2 leading-relaxed max-w-2xl font-normal drop-shadow">
                {synopsis}
              </p>
            )}

            {/* Technical Metadata Row */}
            <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-5 gap-y-1.5 text-xs text-cinema-muted font-medium pt-1 border-t border-white/10">
              <span className="px-1.5 py-0.5 bg-white/15 text-white rounded text-[10px] font-bold uppercase tracking-wider">
                {activeMovie.extension.replace(".", "")}
              </span>

              {activeMovie.duration > 0 && (
                <span className="flex items-center gap-1 text-cinema-text">
                  <Clock className="w-3.5 h-3.5 text-cinema-amber" />
                  {formatDuration(activeMovie.duration)}
                </span>
              )}

              {activeMovie.size > 0 && (
                <span className="flex items-center gap-1 text-cinema-text">
                  <Disc className="w-3.5 h-3.5 text-cinema-amber" />
                  {formatSize(activeMovie.size)}
                </span>
              )}

              {displayDate && (
                <span className="flex items-center gap-1 text-cinema-text">
                  <Calendar className="w-3.5 h-3.5 text-cinema-amber" />
                  {displayDate}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                id="btn-hero-play"
                onClick={() => setCurrentVideo(activeMovie)}
                className="flex items-center gap-2 px-6 py-3 bg-cinema-amber hover:bg-cinema-amber-hover text-cinema-bg rounded-xl font-bold transition-all duration-200 appletv-btn shadow-lg shadow-cinema-amber/30 cursor-pointer text-xs sm:text-sm"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-cinema-bg" />
                Play Now
              </button>
              
              <button
                id="btn-hero-info"
                onClick={() => setShowInfo(!showInfo)}
                className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-xl font-semibold transition-all duration-200 appletv-btn cursor-pointer text-xs sm:text-sm backdrop-blur-md"
              >
                <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                {showInfo ? "Hide Details" : "More Info"}
              </button>
            </div>

            {/* Collapsible Technical Details */}
            {showInfo && (
              <div className="p-4 bg-black/80 backdrop-blur-xl border border-white/15 rounded-xl mt-3 animate-fade-in text-xs text-cinema-text space-y-2">
                <p className="font-bold text-cinema-amber uppercase tracking-wider text-[11px]">Media File Diagnostics:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
                  <div><span className="text-cinema-muted">ID:</span> <span className="text-white">{activeMovie.id}</span></div>
                  <div><span className="text-cinema-muted">Format:</span> <span className="text-white">{activeMovie.extension}</span></div>
                  <div className="md:col-span-2"><span className="text-cinema-muted">Filename:</span> <span className="text-white truncate block">{activeMovie.filename}</span></div>
                  {activeMovie.director && (
                    <div><span className="text-cinema-muted">Director:</span> <span className="text-white">{activeMovie.director}</span></div>
                  )}
                  {activeMovie.studio && (
                    <div><span className="text-cinema-muted">Studio:</span> <span className="text-white">{activeMovie.studio}</span></div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Slide Navigation Arrows */}
      {list.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/80 border border-white/15 text-white/90 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer hidden md:flex items-center justify-center shadow-2xl backdrop-blur-md appletv-btn"
            title="Previous Slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/80 border border-white/15 text-white/90 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer hidden md:flex items-center justify-center shadow-2xl backdrop-blur-md appletv-btn"
            title="Next Slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Slide Indicator Pills */}
      {list.length > 1 && (
        <div className="absolute bottom-5 right-6 md:right-12 flex items-center gap-2 z-20">
          {list.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 cursor-pointer rounded-full transition-all duration-300 ${
                idx === currentIndex 
                  ? "w-7 bg-cinema-amber shadow-sm shadow-cinema-amber/50" 
                  : "w-2 bg-white/30 hover:bg-white/60"
              }`}
              title={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

