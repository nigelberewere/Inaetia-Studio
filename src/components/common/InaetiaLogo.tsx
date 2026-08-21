import React, { useId } from "react";

interface InaetiaLogoProps {
  size?: number | string;
  className?: string;
  withBackground?: boolean;
  accentColor?: string;
  variant?: "icon" | "full";
  appName?: string;
  id?: string;
}

export const InaetiaLogo: React.FC<InaetiaLogoProps> = ({
  size = 36,
  className = "",
  withBackground = true,
  accentColor,
  variant = "icon",
  appName = "Inaetia Studios",
  id,
}) => {
  const generatedId = useId().replace(/:/g, "-");
  const bgGradId = `inaetia-bg-${generatedId}`;
  const accentGradId = `inaetia-accent-${generatedId}`;
  const glowGradId = `inaetia-glow-${generatedId}`;

  const numSize = typeof size === "number" ? size : parseInt(size as string, 10) || 36;

  const svgContent = (
    <svg
      id={id || `inaetia-logo-svg-${generatedId}`}
      width={numSize}
      height={numSize}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-300 select-none"
      aria-label="Inaetia Studios Logo"
      role="img"
    >
      <defs>
        <linearGradient id={bgGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#141424" />
          <stop offset="100%" stopColor="#080811" />
        </linearGradient>

        <linearGradient id={accentGradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accentColor || "#F5A623"} />
          <stop offset="50%" stopColor={accentColor || "#FFAE2E"} />
          <stop offset="100%" stopColor={accentColor || "#FF9500"} />
        </linearGradient>

        <linearGradient id={glowGradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accentColor || "#F5A623"} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accentColor || "#FFAE2E"} stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Background Container */}
      {withBackground && (
        <>
          <rect x="0" y="0" width="512" height="512" rx="96" ry="96" fill={`url(#${bgGradId})`} />
          <rect
            x="2"
            y="2"
            width="508"
            height="508"
            rx="94"
            ry="94"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.08"
            strokeWidth="3"
          />
          <rect
            x="8"
            y="8"
            width="496"
            height="496"
            rx="88"
            ry="88"
            fill="none"
            stroke={`url(#${glowGradId})`}
            strokeWidth="2"
          />
        </>
      )}

      {/* Viewfinder corner brackets */}
      <g
        fill="none"
        stroke={`url(#${accentGradId})`}
        strokeWidth="24"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M 106 176 L 106 106 L 176 106" />
        <path d="M 336 106 L 406 106 L 406 176" />
        <path d="M 406 336 L 406 406 L 336 406" />
        <path d="M 176 406 L 106 406 L 106 336" />
      </g>

      {/* "i" monogram, centered in the frame */}
      <rect x="233" y="260" width="46" height="140" rx="23" fill={`url(#${accentGradId})`} />
      <rect
        x="223"
        y="167"
        width="66"
        height="66"
        rx="12"
        transform="rotate(45 256 200)"
        fill={`url(#${accentGradId})`}
      />
    </svg>
  );

  if (variant === "full") {
    return (
      <div className={`flex items-center gap-3 select-none ${className}`}>
        {svgContent}
        <span className="font-bold text-lg tracking-wider text-white">
          {appName.includes(" ") ? (
            <>
              {appName.split(" ")[0]}
              <span className="text-cinema-amber font-light"> {appName.split(" ").slice(1).join(" ")}</span>
            </>
          ) : (
            appName
          )}
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      {svgContent}
    </div>
  );
};
