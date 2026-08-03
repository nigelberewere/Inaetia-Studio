import React from "react";

interface FocusableCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  id?: string;
  aspectRatio?: "poster" | "landscape" | "square" | "custom";
}

export const FocusableCard: React.FC<FocusableCardProps> = ({
  children,
  onClick,
  className = "",
  id,
  aspectRatio = "poster",
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const getAspectClass = () => {
    switch (aspectRatio) {
      case "poster":
        return "aspect-[2/3]";
      case "landscape":
        return "aspect-video";
      case "square":
        return "aspect-square";
      case "custom":
      default:
        return "";
    }
  };

  return (
    <div
      id={id}
      tabIndex={0}
      role="button"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`group relative overflow-hidden rounded-2xl bg-cinema-card border border-white/10 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:scale-[1.035] hover:border-cinema-amber/80 hover:shadow-2xl hover:shadow-cinema-amber/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-amber focus-visible:scale-[1.035] focus-visible:-translate-y-1.5 focus-visible:border-cinema-amber cursor-pointer select-none ${getAspectClass()} ${className}`}
    >
      {/* Subtle Glass Highlight Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10 pointer-events-none opacity-80 group-hover:opacity-90 transition-opacity" />
      
      {/* Ambient Inner Glow on Hover */}
      <div className="absolute inset-0 ring-1 ring-inset ring-white/10 group-hover:ring-cinema-amber/50 rounded-2xl pointer-events-none transition-all z-20" />

      {children}
    </div>
  );
};
