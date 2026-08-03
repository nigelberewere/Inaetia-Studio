import React, { useState } from "react";
import { Play, Film, Tv, Radio, Music, ImageOff } from "lucide-react";
import { FocusableCard } from "./FocusableCard";
import { Badge } from "./Badge";

export type MediaCardAspect = "poster" | "landscape" | "square";

interface MediaCardProps {
  id?: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  aspectRatio?: MediaCardAspect;
  mediaType?: "movie" | "tv" | "radio" | "music";
  progress?: number; // 0 to 100 percentage
  badge?: {
    text: string;
    variant?: "live" | "new" | "amber" | "outline" | "glass" | "hd";
  };
  secondaryBadge?: string;
  onClick?: () => void;
  className?: string;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  id,
  title,
  subtitle,
  imageUrl,
  aspectRatio = "poster",
  mediaType = "movie",
  progress,
  badge,
  secondaryBadge,
  onClick,
  className = "",
}) => {
  const [imageError, setImageError] = useState(false);

  const getMediaIcon = () => {
    switch (mediaType) {
      case "tv":
        return <Tv className="w-8 h-8 text-cinema-muted/60" />;
      case "radio":
        return <Radio className="w-8 h-8 text-cinema-muted/60" />;
      case "music":
        return <Music className="w-8 h-8 text-cinema-muted/60" />;
      case "movie":
      default:
        return <Film className="w-8 h-8 text-cinema-muted/60" />;
    }
  };

  return (
    <FocusableCard
      id={id}
      onClick={onClick}
      aspectRatio={aspectRatio}
      className={className}
    >
      {/* Background Image or Fallback */}
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={title}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />
      ) : (
        /* Fallback Empty State with Premium Gradient & Icon */
        <div className="w-full h-full bg-gradient-to-br from-cinema-card via-cinema-card/90 to-black/80 flex flex-col items-center justify-center p-4 text-center group-hover:from-cinema-card/90 group-hover:to-amber-950/20 transition-colors">
          <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:border-cinema-amber/40 transition-all">
            {getMediaIcon()}
          </div>
          <span className="text-xs text-cinema-muted/80 font-medium line-clamp-1 px-2">
            Inaetia Media
          </span>
        </div>
      )}

      {/* Top Badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
        {badge ? (
          <Badge variant={badge.variant}>{badge.text}</Badge>
        ) : (
          <div />
        )}

        {secondaryBadge && (
          <Badge variant="glass">{secondaryBadge}</Badge>
        )}
      </div>

      {/* Center Hover Play Action Icon */}
      <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-300 pointer-events-none">
        <div className="w-12 h-12 rounded-full bg-cinema-amber text-cinema-bg flex items-center justify-center shadow-xl shadow-cinema-amber/40 transform scale-75 group-hover:scale-100 group-focus-visible:scale-100 transition-transform duration-300">
          <Play className="w-6 h-6 fill-cinema-bg ml-0.5" />
        </div>
      </div>

      {/* Bottom Info Overlay */}
      <div className="absolute bottom-0 inset-x-0 z-20 p-3 sm:p-3.5 flex flex-col justify-end">
        {/* Title: MUST wrap up to 2 lines, never truncate to 1 line! */}
        <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-cinema-amber transition-colors drop-shadow-md">
          {title}
        </h3>

        {subtitle && (
          <p className="text-[11px] sm:text-xs text-cinema-muted line-clamp-1 font-medium mt-0.5">
            {subtitle}
          </p>
        )}

        {/* Progress Bar for Watch/Resume Progress */}
        {progress !== undefined && progress > 0 && (
          <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden mt-2">
            <div
              className="bg-cinema-amber h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>
    </FocusableCard>
  );
};
