import React, { useState } from "react";
import * as LucideIcons from "lucide-react";

export const PRESET_AVATARS = [
  "RetroAstronaut",
  "PopcornMonster",
  "CyberpunkHacker",
  "DirectorCat",
  "FilmRobot",
  "NeonSamurai",
  "CineDetective",
  "CosmicAlien",
  "CinemaCrown",
  "RetroReel"
] as const;

export type PresetAvatar = (typeof PRESET_AVATARS)[number];

interface AvatarMetadata {
  src: string;
  alt: string;
  label: string;
}

export const AVATAR_METADATA: Record<string, AvatarMetadata> = {
  RetroAstronaut: {
    src: "/assets/avatars/retro-astronaut.png",
    alt: "Retro Astronaut Avatar",
    label: "Retro Astronaut",
  },
  PopcornMonster: {
    src: "/assets/avatars/popcorn-monster.png",
    alt: "Popcorn Monster Avatar",
    label: "Popcorn Monster",
  },
  CyberpunkHacker: {
    src: "/assets/avatars/cyberpunk-hacker.png",
    alt: "Cyberpunk Hacker Avatar",
    label: "Cyberpunk Hacker",
  },
  DirectorCat: {
    src: "/assets/avatars/director-cat.png",
    alt: "Director Cat Avatar",
    label: "Director Cat",
  },
  FilmRobot: {
    src: "/assets/avatars/film-robot.png",
    alt: "Film Robot Avatar",
    label: "Film Robot",
  },
  NeonSamurai: {
    src: "/assets/avatars/neon-samurai.png",
    alt: "Neon Samurai Avatar",
    label: "Neon Samurai",
  },
  CineDetective: {
    src: "/assets/avatars/cine-detective.png",
    alt: "Cine Detective Avatar",
    label: "Cine Detective",
  },
  CosmicAlien: {
    src: "/assets/avatars/cosmic-alien.png",
    alt: "Cosmic Alien Avatar",
    label: "Cosmic Alien",
  },
  CinemaCrown: {
    src: "/assets/avatars/cinema-crown.png",
    alt: "Cinema Crown Avatar",
    label: "Cinema Crown",
  },
  RetroReel: {
    src: "/assets/avatars/retro-reel.png",
    alt: "Retro Reel Avatar",
    label: "Retro Reel",
  },
};

interface ProfileAvatarProps {
  avatar: string;
  className?: string;
  size?: number;
}

export function ProfileAvatar({ avatar, className = "w-6 h-6", size }: ProfileAvatarProps) {
  const [hasError, setHasError] = useState(false);

  // 1. Check if avatar matches one of the high-fidelity cinematic image avatars
  const avatarMeta = AVATAR_METADATA[avatar];
  if (avatarMeta && !hasError) {
    const style: React.CSSProperties = size ? { width: size, height: size } : {};
    return (
      <img
        src={avatarMeta.src}
        alt={avatarMeta.alt}
        onError={() => setHasError(true)}
        className={`rounded-full object-cover shrink-0 select-none pointer-events-none ${className}`}
        style={style}
        loading="lazy"
        draggable={false}
      />
    );
  }

  // 2. Fallback to standard Lucide icons (backwards compatibility for legacy saved profiles)
  const IconComponent = (LucideIcons as any)[avatar];
  if (IconComponent) {
    const style = size ? { width: size, height: size } : undefined;
    return <IconComponent className={className} style={style} />;
  }

  // 3. Ultimate Fallback to text/initials
  return (
    <span
      className="font-bold select-none text-center truncate uppercase flex items-center justify-center bg-zinc-800 rounded-full text-xs"
      style={size ? { width: size, height: size } : undefined}
    >
      {avatar ? avatar.substring(0, 2) : "??"}
    </span>
  );
}
