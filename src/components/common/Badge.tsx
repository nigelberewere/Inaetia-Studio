import React from "react";

export type BadgeVariant = "live" | "new" | "amber" | "outline" | "glass" | "hd";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "glass",
  children,
  icon,
  className = "",
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "live":
        return "bg-red-600 text-white shadow-lg shadow-red-600/40 animate-pulse font-bold";
      case "new":
        return "bg-emerald-500/90 text-white font-bold shadow-md shadow-emerald-500/30";
      case "amber":
        return "bg-cinema-amber text-cinema-bg font-bold shadow-md shadow-cinema-amber/30";
      case "hd":
        return "bg-white/15 text-white/90 border border-white/20 backdrop-blur-md font-semibold";
      case "outline":
        return "border border-cinema-muted/40 text-cinema-muted font-medium";
      case "glass":
      default:
        return "bg-black/60 backdrop-blur-md text-white/90 border border-white/15 font-semibold";
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs tracking-wider uppercase select-none transition-all ${getVariantStyles()} ${className}`}
    >
      {icon && <span className="w-3 h-3 flex items-center justify-center">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
