/**
 * Inaetia Studios - Unified Design Tokens & Theme Constants
 * Apple TV / High-End Streaming Platform Quality Standard
 */

export const DESIGN_TOKENS = {
  colors: {
    bg: {
      base: "#07070e",
      elevated: "#0f0f1c",
      glass: "rgba(15, 15, 28, 0.65)",
      navGlass: "rgba(8, 8, 16, 0.75)",
      overlay: "rgba(0, 0, 0, 0.75)",
    },
    brand: {
      amber: "#F5A623",
      amberHover: "#FFAE2E",
      amberGlow: "rgba(245, 166, 35, 0.35)",
      amberSubtle: "rgba(245, 166, 35, 0.12)",
    },
    text: {
      primary: "#EBF0F5",
      secondary: "#A0A5C0",
      muted: "#7E82A0",
      dim: "#505470",
    },
    border: {
      subtle: "rgba(255, 255, 255, 0.08)",
      hover: "rgba(255, 255, 255, 0.22)",
      focus: "#F5A623",
    },
    semantic: {
      live: "#EF4444",      // Red pulsing badge for Live TV / Radio
      new: "#10B981",       // Emerald for newly scanned items
      error: "#F87171",     // Error red
      warning: "#F59E0B",   // Warning amber
      info: "#3B82F6",      // Blue info
    }
  },

  aspectRatios: {
    poster: "2/3",    // Movies & TV Shows
    landscape: "16/9",// Live TV, Radio Streams, Videos
    square: "1/1",    // Music Albums & Songs
  },

  typography: {
    heroTitle: "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none",
    sectionHeader: "text-xl sm:text-2xl font-bold tracking-wide text-white",
    cardTitle: "text-sm sm:text-base font-semibold text-white line-clamp-2 leading-snug",
    cardMeta: "text-xs font-medium text-cinema-muted line-clamp-1",
    badgeText: "text-[10px] sm:text-xs font-bold tracking-wider uppercase",
    body: "text-sm text-cinema-text leading-relaxed",
  },

  radius: {
    badge: "rounded-md",        // 6px
    chip: "rounded-full",       // Pill
    card: "rounded-xl sm:rounded-2xl", // 12-16px
    modal: "rounded-2xl sm:rounded-3xl", // 24px
  },

  elevation: {
    cardRest: "shadow-md shadow-black/40 border border-white/10",
    cardHover: "shadow-2xl shadow-black/80 ring-2 ring-cinema-amber border-cinema-amber/50",
    glassPanel: "backdrop-blur-xl bg-cinema-card/70 border border-white/10 shadow-2xl",
  },

  transitions: {
    spring: "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
    fast: "transition-all duration-150 ease-out",
  }
} as const;
