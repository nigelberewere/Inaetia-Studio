import React from "react";

interface ChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  count?: number;
  className?: string;
  id?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  active = false,
  onClick,
  icon,
  count,
  className = "",
  id,
}) => {
  return (
    <button
      id={id}
      onClick={onClick}
      type="button"
      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 appletv-btn cursor-pointer select-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-amber ${
        active
          ? "bg-cinema-amber text-cinema-bg border-cinema-amber shadow-lg shadow-cinema-amber/25 font-bold scale-[1.02]"
          : "bg-white/5 hover:bg-white/12 text-cinema-text hover:text-white border-white/10 hover:border-white/20"
      } ${className}`}
    >
      {icon && <span className="w-3.5 h-3.5 flex items-center justify-center">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            active ? "bg-cinema-bg/20 text-cinema-bg font-bold" : "bg-white/10 text-cinema-muted"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
