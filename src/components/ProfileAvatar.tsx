import React from "react";
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
];

// 10 custom-drawn, high-fidelity premium SVG avatars
const CUSTOM_AVATARS: Record<
  string,
  (className?: string, style?: React.CSSProperties) => React.ReactElement
> = {
  RetroAstronaut: (className, style) => (
    <svg viewBox="0 0 100 100" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="astro-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#312E81" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
        <linearGradient id="astro-visor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="astro-suit" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#astro-bg)" />
      <circle cx="25" cy="30" r="1" fill="#FFF" opacity="0.8" />
      <circle cx="75" cy="25" r="1.5" fill="#FFF" opacity="0.9" />
      <circle cx="35" cy="70" r="1.2" fill="#FFF" opacity="0.6" />
      <circle cx="70" cy="65" r="1" fill="#FFF" opacity="0.7" />
      <path d="M 18 45 L 20 47 L 18 49 L 16 47 Z" fill="#FFF" opacity="0.5" />
      <path d="M 82 50 L 84 52 L 82 54 L 80 52 Z" fill="#FFF" opacity="0.6" />
      <path d="M 24 90 C 24 75, 76 75, 76 90 Z" fill="url(#astro-suit)" />
      <rect x="42" y="78" width="16" height="10" rx="3" fill="#64748B" />
      <circle cx="50" cy="83" r="2.5" fill="#EF4444" />
      <circle cx="50" cy="48" r="28" fill="#F8FAFC" stroke="#64748B" strokeWidth="1.5" />
      <rect x="20" y="44" width="6" height="8" rx="2" fill="#94A3B8" />
      <rect x="74" y="44" width="6" height="8" rx="2" fill="#94A3B8" />
      <path d="M 28 46 C 28 35, 72 35, 72 46 C 72 58, 28 58, 28 46 Z" fill="url(#astro-visor)" stroke="#1E293B" strokeWidth="2" />
      <path d="M 34 42 C 38 40, 48 40, 52 42" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" fill="none" />
    </svg>
  ),

  PopcornMonster: (className, style) => (
    <svg viewBox="0 0 100 100" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="monster-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="monster-skin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#monster-bg)" />
      <path d="M 30 50 C 15 40, 15 20, 32 18 C 38 8, 62 8, 68 18 C 85 20, 85 40, 70 50 Z" fill="url(#monster-skin)" />
      <path d="M 38 16 Q 34 6, 30 10 Q 34 16, 38 18" fill="#FBBF24" />
      <path d="M 62 16 Q 66 6, 70 10 Q 66 16, 62 18" fill="#FBBF24" />
      <circle cx="43" cy="30" r="7" fill="#FFF" />
      <circle cx="43" cy="30" r="3.5" fill="#000" />
      <circle cx="45" cy="28" r="1.5" fill="#FFF" />
      <circle cx="57" cy="30" r="7" fill="#FFF" />
      <circle cx="57" cy="30" r="3.5" fill="#000" />
      <circle cx="59" cy="28" r="1.5" fill="#FFF" />
      <circle cx="34" cy="38" r="3" fill="#F87171" opacity="0.6" />
      <circle cx="66" cy="38" r="3" fill="#F87171" opacity="0.6" />
      <path d="M 28 55 L 32 92 L 68 92 L 72 55 Z" fill="#FFF" />
      <path d="M 34 55 L 37 92 L 43 92 L 41 55 Z" fill="#EF4444" />
      <path d="M 47 55 L 48 92 L 52 92 L 53 55 Z" fill="#EF4444" />
      <path d="M 59 55 L 57 92 L 63 92 L 66 55 Z" fill="#EF4444" />
      <rect x="25" y="52" width="50" height="6" rx="2" fill="#EF4444" />
      <circle cx="34" cy="49" r="6" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1" />
      <circle cx="42" cy="47" r="7" fill="#FFF" stroke="#E2E8F0" strokeWidth="1" />
      <circle cx="50" cy="48" r="6.5" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1" />
      <circle cx="58" cy="46" r="8" fill="#FFF" stroke="#E2E8F0" strokeWidth="1" />
      <circle cx="65" cy="49" r="6" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1" />
      <path d="M 46 68 Q 50 72, 54 68" stroke="#000" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  ),

  CyberpunkHacker: (className, style) => (
    <svg viewBox="0 0 100 100" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cyber-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#020617" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
        <linearGradient id="cyber-neon" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00F2FE" />
          <stop offset="100%" stopColor="#4FACFE" />
        </linearGradient>
        <linearGradient id="cyber-visor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ADFF2F" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#cyber-bg)" stroke="#22D3EE" strokeWidth="1.5" />
      <path d="M 15 50 L 85 50 M 50 15 L 50 85 M 25 25 L 75 75 M 25 75 L 75 25" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
      <path d="M 20 92 C 20 72, 80 72, 80 92 Z" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
      <path d="M 28 92 C 28 65, 72 65, 72 92" fill="none" stroke="url(#cyber-neon)" strokeWidth="2" opacity="0.6" />
      <path d="M 34 55 C 34 38, 66 38, 66 55 C 66 70, 34 70, 34 55 Z" fill="#1E293B" />
      <polygon points="26,44 74,44 70,58 30,58" fill="url(#cyber-visor)" stroke="#000" strokeWidth="2" />
      <line x1="32" y1="51" x2="68" y2="51" stroke="#FFF" strokeWidth="1.5" opacity="0.8" />
      <circle cx="36" cy="48" r="1.5" fill="#FFF" />
      <circle cx="64" cy="48" r="1.5" fill="#FFF" />
      <path d="M 12 30 L 22 30 L 26 34" stroke="url(#cyber-neon)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="12" cy="30" r="2.5" fill="#00F2FE" />
      <path d="M 88 30 L 78 30 L 74 34" stroke="url(#cyber-neon)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="88" cy="30" r="2.5" fill="#00F2FE" />
    </svg>
  ),

  DirectorCat: (className, style) => (
    <svg viewBox="0 0 100 100" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cat-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#881337" />
        </linearGradient>
        <linearGradient id="cat-fur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#cat-bg)" />
      <polygon points="50,15 15,90 85,90" fill="#FFE4E6" opacity="0.15" />
      <polygon points="28,45 22,20 40,32" fill="url(#cat-fur)" stroke="#94A3B8" strokeWidth="1" />
      <polygon points="26,41 22,23 34,31" fill="#FDA4AF" />
      <polygon points="72,45 78,20 60,32" fill="url(#cat-fur)" stroke="#94A3B8" strokeWidth="1" />
      <polygon points="74,41 78,23 66,31" fill="#FDA4AF" />
      <ellipse cx="50" cy="52" rx="26" ry="20" fill="url(#cat-fur)" stroke="#94A3B8" strokeWidth="1.5" />
      <ellipse cx="46" cy="30" rx="18" ry="7" fill="#1E293B" transform="rotate(-12 46 30)" />
      <circle cx="40" cy="22" r="2.5" fill="#1E293B" />
      <rect x="30" y="44" width="16" height="12" rx="3" fill="#06B6D4" stroke="#000" strokeWidth="2" />
      <rect x="33" y="47" width="10" height="6" rx="1" fill="#22D3EE" opacity="0.6" />
      <rect x="54" y="44" width="16" height="12" rx="3" fill="#EF4444" stroke="#000" strokeWidth="2" />
      <rect x="57" y="47" width="10" height="6" rx="1" fill="#FCA5A5" opacity="0.6" />
      <rect x="46" y="47" width="8" height="4" fill="#000" />
      <polygon points="48,60 52,60 50,63" fill="#FDA4AF" />
      <path d="M 46 65 Q 50 67, 50 65 Q 50 67, 54 65" stroke="#475569" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <line x1="22" y1="60" x2="10" y2="58" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="64" x2="8" y2="65" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="78" y1="60" x2="90" y2="58" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="78" y1="64" x2="92" y2="65" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),

  FilmRobot: (className, style) => (
    <svg viewBox="0 0 100 100" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="robot-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="robot-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="50%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#robot-bg)" />
      <line x1="50" y1="28" x2="50" y2="15" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="12" r="5" fill="#F59E0B" />
      <circle cx="50" cy="12" r="2" fill="#FFF" />
      <rect x="26" y="26" width="48" height="40" rx="8" fill="url(#robot-metal)" stroke="#334155" strokeWidth="2" />
      <rect x="21" y="38" width="5" height="16" rx="2" fill="#475569" />
      <rect x="74" y="38" width="5" height="16" rx="2" fill="#475569" />
      <circle cx="39" cy="44" r="9" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5" />
      <circle cx="39" cy="44" r="5" fill="#22D3EE" />
      <circle cx="39" cy="44" r="1.5" fill="#FFF" />
      <line x1="39" y1="35" x2="39" y2="53" stroke="#F59E0B" strokeWidth="1" opacity="0.4" />
      <line x1="30" y1="44" x2="48" y2="44" stroke="#F59E0B" strokeWidth="1" opacity="0.4" />
      <circle cx="61" cy="44" r="9" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5" />
      <circle cx="61" cy="44" r="5" fill="#22D3EE" />
      <circle cx="61" cy="44" r="1.5" fill="#FFF" />
      <line x1="61" y1="35" x2="61" y2="53" stroke="#F59E0B" strokeWidth="1" opacity="0.4" />
      <line x1="52" y1="44" x2="70" y2="44" stroke="#F59E0B" strokeWidth="1" opacity="0.4" />
      <rect x="34" y="56" width="32" height="6" rx="3" fill="#0F172A" />
      <path d="M 38 59 H 44 L 46 57 L 48 61 L 50 59 H 54 L 56 57 L 58 61 L 62 59" stroke="#22D3EE" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <rect x="42" y="66" width="16" height="8" fill="#475569" stroke="#334155" strokeWidth="1.5" />
      <path d="M 28 92 C 28 80, 72 80, 72 92 Z" fill="url(#robot-metal)" stroke="#334155" strokeWidth="1.5" />
      <circle cx="58" cy="85" r="3" fill="#22D3EE" />
    </svg>
  ),

  NeonSamurai: (className, style) => (
    <svg viewBox="0 0 100 100" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="samurai-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3B0764" />
          <stop offset="100%" stopColor="#090514" />
        </linearGradient>
        <linearGradient id="samurai-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#samurai-bg)" stroke="#EC4899" strokeWidth="1" />
      <path d="M 50 20 L 32 8 Q 42 16, 44 26 Z" fill="url(#samurai-glow)" />
      <path d="M 50 20 L 68 8 Q 58 16, 56 26 Z" fill="url(#samurai-glow)" />
      <circle cx="50" cy="22" r="3" fill="#FBBF24" />
      <path d="M 24 45 C 24 25, 76 25, 76 45 C 76 48, 24 48, 24 45 Z" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
      <path d="M 24 45 L 18 64 Q 28 58, 30 48 Z" fill="#334155" />
      <path d="M 76 45 L 82 64 Q 72 58, 70 48 Z" fill="#334155" />
      <path d="M 30 48 L 50 82 L 70 48 Z" fill="#0F172A" stroke="#1E293B" strokeWidth="1.5" />
      <polygon points="42,54 44,62 46,54" fill="#FBBF24" />
      <polygon points="58,54 56,62 54,54" fill="#FBBF24" />
      <path d="M 32 40 Q 50 44, 68 40 L 66 44 Q 50 48, 34 44 Z" fill="#EC4899" />
      <path d="M 36 82 L 50 94 L 64 82 Z" fill="#334155" />
    </svg>
  ),

  CineDetective: (className, style) => (
    <svg viewBox="0 0 100 100" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="det-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EA580C" />
          <stop offset="50%" stopColor="#9A3412" />
          <stop offset="100%" stopColor="#3F1404" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#det-bg)" />
      <path d="M 15 15 L 85 85" stroke="#7C2D12" strokeWidth="14" strokeDasharray="6 4" opacity="0.25" />
      <path d="M 22 92 L 32 76 L 42 82 L 50 74 L 58 82 L 68 76 L 78 92 Z" fill="#0F172A" />
      <polygon points="47,78 53,78 55,92 45,92" fill="#F59E0B" />
      <path d="M 34 52 C 34 40, 66 40, 66 52 C 66 64, 34 64, 34 52 Z" fill="#E2E8F0" />
      <circle cx="41" cy="52" r="8" fill="#1E293B" stroke="#000" strokeWidth="2" />
      <path d="M 35 50 C 37 47, 43 47, 45 50" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" fill="none" />
      <circle cx="59" cy="52" r="8" fill="#1E293B" stroke="#000" strokeWidth="2" />
      <path d="M 53 50 C 55 47, 61 47, 63 50" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" fill="none" />
      <rect x="48" y="50" width="4" height="2" fill="#000" />
      <ellipse cx="50" cy="40" rx="30" ry="5" fill="#1E293B" stroke="#0F172A" strokeWidth="1.5" />
      <path d="M 28 39 C 28 20, 72 20, 72 39 Z" fill="#1E293B" />
      <path d="M 38 22 Q 50 27, 62 22 L 72 39 H 28 Z" fill="#0F172A" />
      <rect x="27.5" y="35" width="45" height="4" fill="#EA580C" />
    </svg>
  ),

  CosmicAlien: (className, style) => (
    <svg viewBox="0 0 100 100" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="alien-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4338CA" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
        <linearGradient id="alien-head" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A3E635" />
          <stop offset="100%" stopColor="#65A30D" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#alien-bg)" />
      <ellipse cx="50" cy="65" rx="32" ry="12" fill="#475569" stroke="#94A3B8" strokeWidth="1.5" />
      <circle cx="28" cy="65" r="2" fill="#FBBF24" />
      <circle cx="39" cy="68" r="2" fill="#EF4444" />
      <circle cx="50" cy="70" r="2" fill="#22D3EE" />
      <circle cx="61" cy="68" r="2" fill="#EF4444" />
      <circle cx="72" cy="65" r="2" fill="#FBBF24" />
      <path d="M 26 40 C 26 22, 74 22, 74 40 C 74 58, 62 65, 50 65 C 38 65, 26 58, 26 40 Z" fill="url(#alien-head)" />
      <line x1="50" y1="25" x2="50" y2="14" stroke="#65A30D" strokeWidth="2.5" />
      <circle cx="50" cy="11" r="4.5" fill="#22D3EE" />
      <ellipse cx="38" cy="42" rx="9" ry="13" fill="#000" transform="rotate(-10 38 42)" />
      <circle cx="36" cy="37" r="3.5" fill="#FFF" />
      <circle cx="41" cy="44" r="1.5" fill="#FFF" />
      <ellipse cx="62" cy="42" rx="9" ry="13" fill="#000" transform="rotate(10 62 42)" />
      <circle cx="64" cy="37" r="3.5" fill="#FFF" />
      <circle cx="59" cy="44" r="1.5" fill="#FFF" />
      <path d="M 46 54 Q 50 58, 54 54" stroke="#1E3A1E" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),

  CinemaCrown: (className, style) => (
    <svg viewBox="0 0 100 100" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="crown-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#991B1B" />
          <stop offset="100%" stopColor="#450A0A" />
        </linearGradient>
        <linearGradient id="crown-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="60%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#crown-bg)" stroke="#CA8A04" strokeWidth="1" />
      <path d="M 50 15 L 20 85 H 80 Z" fill="#FEF08A" opacity="0.1" />
      <ellipse cx="50" cy="74" rx="28" ry="12" fill="#7F1D1D" stroke="#EF4444" strokeWidth="1.5" />
      <circle cx="22" cy="74" r="2.5" fill="#FBBF24" />
      <circle cx="78" cy="74" r="2.5" fill="#FBBF24" />
      <path d="M 24 64 L 28 35 L 40 48 L 50 28 L 60 48 L 72 35 L 76 64 Z" fill="url(#crown-gold)" stroke="#854D0E" strokeWidth="2" />
      <circle cx="28" cy="33" r="3.5" fill="#EF4444" stroke="#FFF" strokeWidth="1" />
      <circle cx="40" cy="46" r="2.5" fill="#3B82F6" stroke="#FFF" strokeWidth="0.5" />
      <circle cx="50" cy="26" r="4.5" fill="#F59E0B" stroke="#FFF" strokeWidth="1.5" />
      <circle cx="60" cy="46" r="2.5" fill="#3B82F6" stroke="#FFF" strokeWidth="0.5" />
      <circle cx="72" cy="33" r="3.5" fill="#EF4444" stroke="#FFF" strokeWidth="1" />
      <rect x="27" y="58" width="46" height="4" rx="2" fill="#D97706" />
      <circle cx="34" cy="60" r="1.5" fill="#3B82F6" />
      <circle cx="42" cy="60" r="1.5" fill="#EF4444" />
      <circle cx="50" cy="60" r="1.5" fill="#22C55E" />
      <circle cx="58" cy="60" r="1.5" fill="#EF4444" />
      <circle cx="66" cy="60" r="1.5" fill="#3B82F6" />
    </svg>
  ),

  RetroReel: (className, style) => (
    <svg viewBox="0 0 100 100" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="reel-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#115E59" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>
        <linearGradient id="reel-metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#F43F5E" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#reel-bg)" />
      <line x1="50" y1="50" x2="15" y2="20" stroke="#0D9488" strokeWidth="1.5" opacity="0.4" />
      <line x1="50" y1="50" x2="85" y2="20" stroke="#0D9488" strokeWidth="1.5" opacity="0.4" />
      <rect x="34" y="48" width="32" height="26" rx="4" fill="#374151" stroke="#1F2937" strokeWidth="2" />
      <circle cx="50" cy="61" r="5" fill="#9CA3AF" />
      <circle cx="50" cy="61" r="2.5" fill="#374151" />
      <path d="M 65 54 L 78 48 L 78 70 L 65 64 Z" fill="#4B5563" stroke="#1F2937" strokeWidth="1.5" />
      <ellipse cx="78" cy="59" rx="3" ry="11" fill="#22D3EE" stroke="#0891B2" strokeWidth="1" />
      <ellipse cx="76" cy="55" rx="1" ry="3" fill="#FFF" opacity="0.6" />
      <circle cx="40" cy="35" r="13" fill="url(#reel-metal)" stroke="#000" strokeWidth="2" />
      <circle cx="40" cy="35" r="10" fill="#1F2937" />
      <circle cx="40" cy="35" r="3" fill="url(#reel-metal)" />
      <line x1="40" y1="25" x2="40" y2="45" stroke="url(#reel-metal)" strokeWidth="1.5" opacity="0.8" />
      <line x1="30" y1="35" x2="50" y2="35" stroke="url(#reel-metal)" strokeWidth="1.5" opacity="0.8" />
      <circle cx="60" cy="35" r="13" fill="url(#reel-metal)" stroke="#000" strokeWidth="2" />
      <circle cx="60" cy="35" r="10" fill="#1F2937" />
      <circle cx="60" cy="35" r="3" fill="url(#reel-metal)" />
      <line x1="60" y1="25" x2="60" y2="45" stroke="url(#reel-metal)" strokeWidth="1.5" opacity="0.8" />
      <line x1="50" y1="35" x2="70" y2="35" stroke="url(#reel-metal)" strokeWidth="1.5" opacity="0.8" />
      <path d="M 48 35 Q 50 42, 52 35" stroke="#F43F5E" strokeWidth="2.5" fill="none" />
    </svg>
  )
};

interface ProfileAvatarProps {
  avatar: string;
  className?: string;
  size?: number;
}

export function ProfileAvatar({ avatar, className = "w-6 h-6", size }: ProfileAvatarProps) {
  // 1. Check if it's one of our premium custom vector avatars
  const renderCustom = CUSTOM_AVATARS[avatar];
  if (renderCustom) {
    const style = size ? { width: size, height: size } : undefined;
    return renderCustom(className, style);
  }

  // 2. Fallback to standard Lucide icons (backwards compatibility for existing profiles)
  const IconComponent = (LucideIcons as any)[avatar];
  if (IconComponent) {
    const style = size ? { width: size, height: size } : undefined;
    return <IconComponent className={className} style={style} />;
  }

  // 3. Ultimate Fallback to text/initial
  return (
    <span
      className="font-bold select-none text-center truncate uppercase flex items-center justify-center bg-zinc-800 rounded-full text-xs"
      style={size ? { width: size, height: size } : undefined}
    >
      {avatar ? avatar.substring(0, 2) : "??"}
    </span>
  );
}
