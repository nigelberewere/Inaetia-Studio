import React from "react";
import * as LucideIcons from "lucide-react";

export const PRESET_AVATARS = [
  "Film",
  "Clapperboard",
  "Tv",
  "Popcorn",
  "Flame",
  "Ghost",
  "Star",
  "Crown",
  "Shield",
  "Gamepad2",
  "Pizza",
  "Heart",
  "Music",
  "Cat",
  "Dog",
  "Rocket",
  "Coffee",
  "Sun",
  "Moon",
  "Smile"
];

interface ProfileAvatarProps {
  avatar: string;
  className?: string;
  size?: number;
}

export function ProfileAvatar({ avatar, className = "w-6 h-6", size }: ProfileAvatarProps) {
  // Look up the icon dynamically in the Lucide exports
  const IconComponent = (LucideIcons as any)[avatar];

  if (IconComponent) {
    const style = size ? { width: size, height: size } : undefined;
    return <IconComponent className={className} style={style} />;
  }

  // Fallback to the text/first-letter string
  return (
    <span className="font-bold select-none text-center truncate uppercase">
      {avatar.substring(0, 2)}
    </span>
  );
}
