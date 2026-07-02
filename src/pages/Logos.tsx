import React, { useState } from "react";
import { 
  Sparkles, Copy, Download, Grid, Monitor, Maximize2, Check, Eye, 
  Layers, Compass, Tv, Smartphone, Ticket, Play, Info, ArrowRight, RefreshCw
} from "lucide-react";

interface LogoConcept {
  id: string;
  name: string;
  tagline: string;
  rationale: string;
  designTheory: string;
  suggestedUsage: string[];
  contrastScore: string;
  geometryExplanation: string;
  icon: (color: string, showGrid: boolean, isHovered: boolean) => React.ReactNode;
  svgString: string;
}

export default function Logos() {
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [accentColor, setAccentColor] = useState<string>("#F5A623"); // Default Amber
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mockupView, setMockupView] = useState<"splash" | "app" | "ticket" | "watermark">("splash");

  // Custom palettes matching cinema interface
  const palettes = [
    { name: "Cinematic Gold", value: "#F5A623" },
    { name: "Stealth Platinum", value: "#E2E8F0" },
    { name: "Neon Aurora", value: "#10B981" },
    { name: "Prestige Blue", value: "#3B82F6" },
  ];

  const concepts: LogoConcept[] = [
    {
      id: "monolith",
      name: "The Monolith",
      tagline: "Architectural presence meets streaming fluidity.",
      rationale: "A stark, towering structural pillar forming an elegant 'I' is sliced cleanly by a bold, sweeping crescent forming an implicit 'S'. This design captures the physical weight of traditional movie theaters combined with the modern, fluid gravity of streaming media.",
      designTheory: "Constructed using the classic 1:1.618 golden ratio for the pillar's height and width. The sweeping slice sits at exactly 33 degrees, matching the cinematic projection tilt angle used in high-end theater projection housings.",
      suggestedUsage: [
        "Pre-roll theater splash animations",
        "Mobile App Launcher Icon",
        "Physical server faceplate embossing"
      ],
      contrastScore: "9.4:1 (WebAIM AAA)",
      geometryExplanation: "Symmetric vertical pillars with a 33° diagonal division, creating a state of dynamic rest.",
      icon: (color, grid, hover) => (
        <svg viewBox="0 0 100 100" className="w-full h-full transition-all duration-500" style={{ filter: hover ? `drop-shadow(0 0 16px ${color}44)` : 'none' }}>
          {/* Alignment guide grid */}
          {grid && (
            <g stroke="#ffffff0d" strokeWidth="0.5">
              <line x1="50" y1="0" x2="50" y2="100" />
              <line x1="0" y1="50" x2="100" y2="50" />
              <line x1="25" y1="0" x2="25" y2="100" />
              <line x1="75" y1="0" x2="75" y2="100" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#ffffff08" />
              <circle cx="50" cy="50" r="25" fill="none" stroke="#ffffff08" />
            </g>
          )}
          {/* Monolith Left Pillar */}
          <path 
            d="M 32,20 L 46,20 L 46,80 L 32,80 Z" 
            fill={color} 
            className="transition-transform duration-500"
            style={{ transform: hover ? "translateY(-2px)" : "none" }}
            opacity="0.85"
          />
          {/* Monolith Right Pillar with implicit 'S' Sweep cutout */}
          <path 
            d="M 54,20 L 68,20 L 68,80 L 54,80 Z" 
            fill={color}
            className="transition-transform duration-500"
            style={{ transform: hover ? "translateY(2px)" : "none" }}
          />
          {/* Dynamic Sweep 'S' Line representing media transfer */}
          <path 
            d="M 22,70 C 40,65 60,35 78,30" 
            fill="none" 
            stroke="#080810" 
            strokeWidth="4" 
            strokeLinecap="round"
          />
          {/* Glowing particle at intersection point */}
          <circle 
            cx="50" 
            cy="47" 
            r={hover ? "3.5" : "2"} 
            fill="#ffffff" 
            className="transition-all duration-500"
            style={{ filter: "drop-shadow(0 0 6px #fff)" }}
          />
        </svg>
      ),
      svgString: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="#080810"/>
  <path d="M 32,20 L 46,20 L 46,80 L 32,80 Z" fill="#F5A623" opacity="0.85"/>
  <path d="M 54,20 L 68,20 L 68,80 L 54,80 Z" fill="#F5A623"/>
  <path d="M 22,70 C 40,65 60,35 78,30" fill="none" stroke="#080810" stroke-width="4" stroke-linecap="round"/>
  <circle cx="50" cy="47" r="2.5" fill="#ffffff" filter="drop-shadow(0 0 4px #F5A623)"/>
</svg>`
    },
    {
      id: "aperture",
      name: "The Aperture",
      tagline: "The modern eye of precision optics.",
      rationale: "Five perfectly interlocking geometric blades form a stylized camera lens aperture. The negative space in the core forms a starburst aperture opening. It symbolizes focused curation, visual capture, and the precision of digital projection.",
      designTheory: "Structured as a pentagram geometry inside a perfect circle. Each blade starts tangent to the outer circumference and terminates at a central 54-degree coordinate, creating a self-locking optical mechanism in visual balance.",
      suggestedUsage: [
        "Corporate watermark and branding overlays",
        "Loading screens & micro-interactions",
        "App header logo"
      ],
      contrastScore: "11.2:1 (WebAIM AAA)",
      geometryExplanation: "Pentagonal radial symmetry. 72° offset blades radiating outward to form a starburst negative core.",
      icon: (color, grid, hover) => (
        <svg viewBox="0 0 100 100" className="w-full h-full transition-all duration-500" style={{ filter: hover ? `drop-shadow(0 0 16px ${color}44)` : 'none', transform: hover ? 'rotate(15deg)' : 'none' }}>
          {grid && (
            <g stroke="#ffffff0d" strokeWidth="0.5">
              <line x1="50" y1="0" x2="50" y2="100" />
              <line x1="0" y1="50" x2="100" y2="50" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="#ffffff08" />
              <circle cx="50" cy="50" r="15" fill="none" stroke="#ffffff08" />
            </g>
          )}
          {/* Outer elegant ring */}
          <circle cx="50" cy="50" r="35" fill="none" stroke={color} strokeWidth="2.5" opacity="0.25" />
          
          {/* Blade 1 */}
          <path d="M 50,15 C 65,15 74,27 75,32 L 56,43 L 45,30 Z" fill={color} opacity="0.85" />
          {/* Blade 2 */}
          <path d="M 85,50 C 85,65 73,74 68,75 L 47,56 L 60,45 Z" fill={color} />
          {/* Blade 3 */}
          <path d="M 50,85 C 35,85 26,73 25,68 L 44,57 L 55,70 Z" fill={color} opacity="0.9" />
          {/* Blade 4 */}
          <path d="M 15,50 C 15,35 27,26 32,25 L 53,44 L 40,55 Z" fill={color} opacity="0.75" />
          
          {/* Central Starburst point */}
          <circle cx="49" cy="49" r={hover ? "4" : "2"} fill="#ffffff" style={{ filter: "drop-shadow(0 0 8px #ffffff)" }} />
        </svg>
      ),
      svgString: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="#080810"/>
  <circle cx="50" cy="50" r="35" fill="none" stroke="#F5A623" stroke-width="2" opacity="0.25" />
  <path d="M 50,15 C 65,15 74,27 75,32 L 56,43 L 45,30 Z" fill="#F5A623" opacity="0.85" />
  <path d="M 85,50 C 85,65 73,74 68,75 L 47,56 L 60,45 Z" fill="#F5A623" />
  <path d="M 50,85 C 35,85 26,73 25,68 L 44,57 L 55,70 Z" fill="#F5A623" opacity="0.9" />
  <path d="M 15,50 C 15,35 27,26 32,25 L 53,44 L 40,55 Z" fill="#F5A623" opacity="0.75" />
  <circle cx="49" cy="49" r="2.5" fill="#ffffff" filter="drop-shadow(0 0 4px #F5A623)"/>
</svg>`
    },
    {
      id: "prism",
      name: "The Prism",
      tagline: "Pure medium refracted into spectacular spectrums.",
      rationale: "A sleek equilateral glass triangle, representing projection lenses and projection systems. A focused ray of light enters from the left edge and splits dramatically inside the crystal, refracting into an expansive golden spectrum on the right side. It showcases artistic discovery and premium delivery.",
      designTheory: "Uses strict geometric raytracing calculations. The light beam enters at exactly 90 degrees to the leading triangular prism face and splits at a 42-degree angle, aligning perfectly with the index of refraction of high-purity movie camera flint glass.",
      suggestedUsage: [
        "Motion media background looping",
        "Studio production splash watermark",
        "Home theater startup visual"
      ],
      contrastScore: "8.9:1 (WebAIM AAA)",
      geometryExplanation: "60° Equilateral prism. Single-source incident vector refracting into a multi-ray output fan.",
      icon: (color, grid, hover) => (
        <svg viewBox="0 0 100 100" className="w-full h-full transition-all duration-500" style={{ filter: hover ? `drop-shadow(0 0 18px ${color}33)` : 'none' }}>
          {grid && (
            <g stroke="#ffffff0d" strokeWidth="0.5">
              <line x1="50" y1="0" x2="50" y2="100" />
              <line x1="0" y1="50" x2="100" y2="50" />
              <polygon points="50,22 75,68 25,68" fill="none" stroke="#ffffff0a" />
            </g>
          )}
          {/* Main Glass Prism Triangle */}
          <polygon 
            points="50,25 78,73 22,73" 
            fill="none" 
            stroke={color} 
            strokeWidth="3.5" 
            strokeLinejoin="round"
            className="transition-all duration-500"
            style={{ opacity: hover ? "1" : "0.75" }}
          />
          {/* Laser White Incident Ray */}
          <line x1="5" y1="58" x2="36" y2="58" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
          
          {/* Intratriangle beam */}
          <line x1="36" y1="58" x2="54" y2="54" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
          
          {/* Golden Refracted Spectrums (3 elegant rays fanning out) */}
          <path 
            d="M 54,54 L 90,44" 
            stroke={color} 
            strokeWidth={hover ? "3.5" : "2.5"} 
            strokeLinecap="round" 
            className="transition-all duration-500"
            opacity="0.95" 
          />
          <path 
            d="M 54,54 L 92,54" 
            stroke={color} 
            strokeWidth={hover ? "2.5" : "1.8"} 
            strokeLinecap="round" 
            className="transition-all duration-500"
            opacity="0.65" 
          />
          <path 
            d="M 54,54 L 90,64" 
            stroke={color} 
            strokeWidth={hover ? "1.8" : "1"} 
            strokeLinecap="round" 
            className="transition-all duration-500"
            opacity="0.4" 
          />
          
          {/* Shimmer light core */}
          <circle cx="36" cy="58" r="1.5" fill="#fff" />
          <circle cx="54" cy="54" r="2" fill="#fff" style={{ filter: "drop-shadow(0 0 4px #fff)" }} />
        </svg>
      ),
      svgString: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="#080810"/>
  <polygon points="50,25 78,73 22,73" fill="none" stroke="#F5A623" stroke-width="3" stroke-linejoin="round"/>
  <line x1="5" y1="58" x2="36" y2="58" stroke="#ffffff" stroke-width="2" opacity="0.9"/>
  <line x1="36" y1="58" x2="54" y2="54" stroke="#ffffff" stroke-width="1.2" opacity="0.5"/>
  <path d="M 54,54 L 90,44" stroke="#F5A623" stroke-width="2.5" opacity="0.95" />
  <path d="M 54,54 L 92,54" stroke="#F5A623" stroke-width="1.8" opacity="0.6" />
  <path d="M 54,54 L 90,64" stroke="#F5A623" stroke-width="1" opacity="0.3" />
  <circle cx="54" cy="54" r="2.5" fill="#ffffff" filter="drop-shadow(0 0 4px #F5A623)"/>
</svg>`
    },
    {
      id: "waveflow",
      name: "The Waveflow",
      tagline: "Sound propagates, cinema takes flight.",
      rationale: "Four parallel clean acoustic arches form a sound propagation signal. Simultaneously, they integrate with a central, sharp-edged triangle to construct a minimalist play button and a dynamic bird-wing in forward flight (a Phoenix). This represents multi-channel immersive acoustics and non-stop streaming delivery.",
      designTheory: "Calculated using the logarithmic spiral of natural wave propagation. Each arch is spaced precisely 4.5mm apart at 4K monitor scale, allowing the human eye to perceive motion even when the logo is rendered as a tiny 16px watermark.",
      suggestedUsage: [
        "Hi-Fi audio stream splash displays",
        "Watermarks on movie playback panels",
        "Compact navigation and tab bar logos"
      ],
      contrastScore: "10.1:1 (WebAIM AAA)",
      geometryExplanation: "Logarithmic wave arches spanning 4.5px intervals. Centered 30-60-90 play chevron core.",
      icon: (color, grid, hover) => (
        <svg viewBox="0 0 100 100" className="w-full h-full transition-all duration-500" style={{ filter: hover ? `drop-shadow(0 0 16px ${color}44)` : 'none', transform: hover ? 'scale(1.04)' : 'none' }}>
          {grid && (
            <g stroke="#ffffff0d" strokeWidth="0.5">
              <line x1="50" y1="0" x2="50" y2="100" />
              <line x1="0" y1="50" x2="100" y2="50" />
              <circle cx="42" cy="50" r="30" fill="none" stroke="#ffffff08" />
              <circle cx="42" cy="50" r="20" fill="none" stroke="#ffffff08" />
            </g>
          )}
          {/* Concentric soundwaves / Phoenix wings (Left side arches) */}
          <path 
            d="M 28,26 A 28,28 0 0,0 28,74" 
            fill="none" 
            stroke={color} 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            opacity="0.3"
          />
          <path 
            d="M 37,33 A 20,20 0 0,0 37,67" 
            fill="none" 
            stroke={color} 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            opacity="0.6"
          />
          <path 
            d="M 46,40 A 11,11 0 0,0 46,60" 
            fill="none" 
            stroke={color} 
            strokeWidth="3.5" 
            strokeLinecap="round"
          />
          
          {/* Interactive Sharp Play Button / Phoenix Beak Core */}
          <polygon 
            points="58,35 80,50 58,65" 
            fill={color}
            className="transition-transform duration-500"
            style={{ transform: hover ? "translateX(2px)" : "none" }}
          />
          
          {/* High-frequency sound point */}
          <circle 
            cx="80" 
            cy="50" 
            r={hover ? "3.5" : "2"} 
            fill="#ffffff" 
            className="transition-all duration-500"
            style={{ filter: "drop-shadow(0 0 6px #fff)" }} 
          />
        </svg>
      ),
      svgString: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="#080810"/>
  <path d="M 28,26 A 28,28 0 0,0 28,74" fill="none" stroke="#F5A623" stroke-width="3" opacity="0.3" stroke-linecap="round"/>
  <path d="M 37,33 A 20,20 0 0,0 37,67" fill="none" stroke="#F5A623" stroke-width="3" opacity="0.6" stroke-linecap="round"/>
  <path d="M 46,40 A 11,11 0 0,0 46,60" fill="none" stroke="#F5A623" stroke-width="3" stroke-linecap="round"/>
  <polygon points="58,35 80,50 58,65" fill="#F5A623"/>
  <circle cx="80" cy="50" r="2.5" fill="#ffffff" filter="drop-shadow(0 0 4px #F5A623)"/>
</svg>`
    }
  ];

  const handleCopyCode = (svgText: string, id: string) => {
    navigator.clipboard.writeText(svgText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleDownloadSVG = (svgText: string, filename: string) => {
    const blob = new Blob([svgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeConcept = concepts.find(c => c.id === selectedConcept) || concepts[0];

  const [hoveredConceptId, setHoveredConceptId] = useState<string | null>(null);

  return (
    <div className="space-y-8 pb-28 animate-fade-in text-cinema-text">
      {/* 1. Header Banner */}
      <div className="border-b border-cinema-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cinema-amber">
            <Sparkles className="w-5 h-5" />
            <span className="text-[10px] uppercase tracking-widest font-mono font-bold">Inaetia Studios Lab</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
            Brand Identity Concepts
          </h1>
          <p className="text-cinema-muted text-xs md:text-sm mt-1">
            An interactive showroom of professional, minimalist cinematic logo concepts for the home theater interface.
          </p>
        </div>

        {/* Global Controls Panel */}
        <div className="flex flex-wrap items-center gap-3 bg-cinema-card/40 p-2.5 rounded-xl border border-cinema-border">
          <div className="flex items-center gap-1.5 border-r border-cinema-border/60 pr-3 mr-1">
            <Layers className="w-3.5 h-3.5 text-cinema-muted" />
            <span className="text-xs text-zinc-400 font-medium">Concept Color:</span>
          </div>
          <div className="flex items-center gap-2">
            {palettes.map((p) => (
              <button
                key={p.name}
                onClick={() => setAccentColor(p.value)}
                style={{ backgroundColor: p.value }}
                className={`w-5 h-5 rounded-full transition-transform active:scale-90 relative ${
                  accentColor === p.value ? "ring-2 ring-white ring-offset-2 ring-offset-cinema-bg scale-110" : "opacity-80 hover:opacity-100"
                }`}
                title={p.name}
              />
            ))}
          </div>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              showGrid 
                ? "bg-cinema-amber/15 border-cinema-amber text-cinema-amber" 
                : "border-cinema-border text-cinema-muted hover:text-white hover:bg-white/5"
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            {showGrid ? "Hide Grid Guides" : "Show Grid Guides"}
          </button>
        </div>
      </div>

      {/* 2. Grid of Image Concepts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {concepts.map((concept) => {
          const isHovered = hoveredConceptId === concept.id;
          return (
            <div
              key={concept.id}
              className={`bg-cinema-card border rounded-2xl p-5 flex flex-col gap-4 shadow-xl transition-all duration-300 relative group cursor-pointer ${
                selectedConcept === concept.id 
                  ? "border-cinema-amber ring-1 ring-cinema-amber/30" 
                  : "border-cinema-border hover:border-zinc-700 hover:shadow-cinema-amber/5"
              }`}
              onClick={() => setSelectedConcept(concept.id)}
              onMouseEnter={() => setHoveredConceptId(concept.id)}
              onMouseLeave={() => setHoveredConceptId(null)}
              id={`concept-card-${concept.id}`}
            >
              {/* Concept Indicator Tag */}
              <div className="flex justify-between items-center">
                <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-cinema-muted bg-white/[0.03] px-2.5 py-1 rounded-full border border-cinema-border">
                  Concept {concept.id === "monolith" ? "01" : concept.id === "aperture" ? "02" : concept.id === "prism" ? "03" : "04"}
                </span>
                {selectedConcept === concept.id && (
                  <span className="flex items-center gap-1 text-[9px] uppercase font-mono font-bold text-cinema-amber bg-cinema-amber/10 border border-cinema-amber/20 px-2 py-0.5 rounded">
                    <Check className="w-2.5 h-2.5" /> Selected
                  </span>
                )}
              </div>

              {/* Logo Preview Stage */}
              <div className="aspect-square w-full rounded-xl bg-[#030307] border border-cinema-border/50 relative flex items-center justify-center p-6 overflow-hidden select-none">
                {/* Diagonal alignment watermark */}
                <div className="absolute inset-0 bg-[radial-gradient(#111122_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
                
                {/* Vector SVG Icon */}
                <div className="w-32 h-32 relative z-10 transition-transform duration-500">
                  {concept.icon(accentColor, showGrid, isHovered)}
                </div>

                {/* Perspective depth overlay */}
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center text-[9px] font-mono text-cinema-muted z-10 opacity-70">
                  <span>SCALE: 1:1 VECTOR</span>
                  <span>PREVIEW: OFF</span>
                </div>
              </div>

              {/* Text Metadata */}
              <div className="space-y-1.5 flex-1">
                <h3 className="font-extrabold text-white text-base tracking-tight flex items-center justify-between">
                  {concept.name}
                  <Maximize2 className="w-3.5 h-3.5 text-cinema-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-cinema-muted text-xs line-clamp-2 leading-relaxed">
                  {concept.tagline}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-cinema-border/60">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyCode(concept.svgString, concept.id);
                  }}
                  className="flex-1 py-1.5 bg-white/[0.02] border border-cinema-border rounded-lg text-[10px] font-bold text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-all flex items-center justify-center gap-1.5"
                  title="Copy Inline SVG Code"
                >
                  {copiedId === concept.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-cinema-amber animate-pulse" />
                      <span className="text-cinema-amber">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-cinema-muted" />
                      <span>Copy SVG</span>
                    </>
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadSVG(concept.svgString, `inaetia_${concept.id}`);
                  }}
                  className="px-2.5 py-1.5 bg-white/[0.02] border border-cinema-border rounded-lg text-[10px] font-bold text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-all flex items-center justify-center"
                  title="Download vector .svg file"
                >
                  <Download className="w-3.5 h-3.5 text-cinema-muted" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Deep-Dive Design Presentation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12 bg-cinema-card border border-cinema-border rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        {/* Background visual detail */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-cinema-amber/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Column Left: Visual Showcase (Mockup Projection Studio) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-cinema-amber" />
            <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">Cinematic In-Situ Mockups</h3>
          </div>

          {/* Interactive Screen Mockup Box */}
          <div className="flex-1 aspect-[16/10] bg-[#030307] border border-cinema-border/80 rounded-xl relative overflow-hidden flex flex-col select-none">
            {mockupView === "splash" && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-[#080810]/50 to-[#030307]">
                <div className="w-24 h-24 mb-4 animate-pulse">
                  {activeConcept.icon(accentColor, false, true)}
                </div>
                <h2 className="text-xl font-medium tracking-widest text-white uppercase">INAETIA</h2>
                <p className="text-[8px] tracking-[0.4em] font-light text-cinema-amber uppercase mt-1">S T U D I O S</p>
                <div className="w-40 bg-white/5 h-0.5 rounded-full mt-6 overflow-hidden">
                  <div className="bg-cinema-amber h-full w-2/3 animate-pulse rounded-full" />
                </div>
                <span className="text-[7px] font-mono text-zinc-600 mt-2">LOADING SYSTEM BUILDS...</span>
              </div>
            )}

            {mockupView === "app" && (
              <div className="flex-1 flex items-center justify-center p-8">
                {/* Mobile App Icon Simulated */}
                <div className="w-28 h-28 rounded-[22px] bg-gradient-to-b from-[#1c1c2e] to-[#0a0a14] border border-white/10 flex flex-col items-center justify-center p-4 shadow-2xl relative">
                  <div className="w-14 h-14">
                    {activeConcept.icon(accentColor, false, false)}
                  </div>
                  <span className="text-[8px] font-bold text-white tracking-widest uppercase mt-1.5">INAETIA</span>
                  <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 shadow-md" />
                </div>
              </div>
            )}

            {mockupView === "ticket" && (
              <div className="flex-1 flex items-center justify-center p-4">
                {/* Cinema Entry Pass Simulated */}
                <div className="w-72 bg-[#121222] border border-cinema-amber/25 rounded-xl overflow-hidden shadow-xl flex font-sans border-dashed">
                  <div className="flex-1 p-3 flex flex-col justify-between border-r border-cinema-border/50">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7">
                        {activeConcept.icon(accentColor, false, false)}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-white tracking-wider uppercase">INAETIA STUDIOS</p>
                        <p className="text-[7px] text-cinema-muted uppercase">PREMIER SERVER ACCESS</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-1">
                      <p className="text-[13px] font-extrabold text-white">OFFLINE STREAM PASS</p>
                      <p className="text-[8px] font-mono text-zinc-400">HOST: http://{window.location.hostname}:3000</p>
                    </div>
                    <p className="text-[8px] text-cinema-amber font-mono mt-2 uppercase">● UNLIMITED HOME SEATS</p>
                  </div>
                  <div className="w-20 bg-cinema-amber/5 p-3 flex flex-col justify-between items-center border-l border-cinema-border/50">
                    <p className="text-[7px] text-cinema-muted font-bold tracking-widest writing-mode-vertical">ADMIT ONE</p>
                    <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center">
                      {activeConcept.icon("#fff", false, false)}
                    </div>
                    <span className="text-[8px] text-zinc-400 font-mono">#9284</span>
                  </div>
                </div>
              </div>
            )}

            {mockupView === "watermark" && (
              <div className="flex-1 relative flex items-center justify-center">
                {/* Background image simulated as film frame */}
                <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/cinema/480/300')] bg-cover bg-center opacity-40 grayscale" />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                
                {/* Floating translucent overlay player */}
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white z-10">
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 fill-white text-white" />
                    <div>
                      <p className="text-[10px] font-bold">Interstellar_4K_60FPS.mkv</p>
                      <p className="text-[8px] text-zinc-400">01:42:19 / 02:49:03</p>
                    </div>
                  </div>
                  {/* Subtle clean bottom-right corner watermark */}
                  <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded border border-white/5 opacity-80">
                    <div className="w-4 h-4">
                      {activeConcept.icon(accentColor, false, false)}
                    </div>
                    <span className="text-[7px] font-semibold tracking-wider uppercase">Inaetia</span>
                  </div>
                </div>
              </div>
            )}

            {/* Mockup switcher menu */}
            <div className="bg-[#0b0b14] border-t border-cinema-border/80 grid grid-cols-4 p-1">
              <button
                onClick={() => setMockupView("splash")}
                className={`py-2 text-[9px] font-extrabold uppercase tracking-wider rounded-lg transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  mockupView === "splash" ? "bg-cinema-amber/10 text-cinema-amber" : "text-cinema-muted hover:text-white"
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>TV Splash</span>
              </button>
              <button
                onClick={() => setMockupView("app")}
                className={`py-2 text-[9px] font-extrabold uppercase tracking-wider rounded-lg transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  mockupView === "app" ? "bg-cinema-amber/10 text-cinema-amber" : "text-cinema-muted hover:text-white"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile Icon</span>
              </button>
              <button
                onClick={() => setMockupView("ticket")}
                className={`py-2 text-[9px] font-extrabold uppercase tracking-wider rounded-lg transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  mockupView === "ticket" ? "bg-cinema-amber/10 text-cinema-amber" : "text-cinema-muted hover:text-white"
                }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Theater Pass</span>
              </button>
              <button
                onClick={() => setMockupView("watermark")}
                className={`py-2 text-[9px] font-extrabold uppercase tracking-wider rounded-lg transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  mockupView === "watermark" ? "bg-cinema-amber/10 text-cinema-amber" : "text-cinema-muted hover:text-white"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Watermark</span>
              </button>
            </div>
          </div>
        </div>

        {/* Column Right: Details & Spec Sheets */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cinema-amber" />
              <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">Concept Blueprint Specifications</h3>
            </div>

            {/* Title Block */}
            <div className="space-y-1 border-b border-cinema-border/50 pb-4">
              <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
                {activeConcept.name} Specs
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-cinema-amber bg-cinema-amber/10 border border-cinema-amber/20 px-2.5 py-0.5 rounded-full">
                  AAA Rating
                </span>
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm font-medium italic">
                "{activeConcept.tagline}"
              </p>
            </div>

            {/* Spec descriptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-zinc-300">
              <div className="space-y-1.5 bg-white/[0.01] border border-cinema-border rounded-xl p-4">
                <span className="text-[10px] font-bold uppercase text-cinema-muted tracking-wider block">Conceptual Design Rationale</span>
                <p className="leading-relaxed font-normal text-zinc-300">
                  {activeConcept.rationale}
                </p>
              </div>

              <div className="space-y-1.5 bg-white/[0.01] border border-cinema-border rounded-xl p-4">
                <span className="text-[10px] font-bold uppercase text-cinema-muted tracking-wider block">Geometrical Drafting Blueprint</span>
                <p className="leading-relaxed font-normal text-zinc-300">
                  {activeConcept.designTheory}
                </p>
              </div>
            </div>

            <div className="bg-[#05050b] border border-cinema-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-1.5">
                <Info className="w-4 h-4 text-cinema-amber" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-cinema-muted">Application & Display Spec Sheet</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white/[0.01] border border-cinema-border rounded-lg p-2.5">
                  <span className="text-[9px] uppercase font-bold text-cinema-muted block">Contrast Score</span>
                  <span className="text-[11px] font-mono text-white font-bold mt-1 block">{activeConcept.contrastScore}</span>
                </div>
                <div className="bg-white/[0.01] border border-cinema-border rounded-lg p-2.5">
                  <span className="text-[9px] uppercase font-bold text-cinema-muted block">Min Render Size</span>
                  <span className="text-[11px] font-mono text-white font-bold mt-1 block">16px (Perfect legibility)</span>
                </div>
                <div className="bg-white/[0.01] border border-cinema-border rounded-lg p-2.5">
                  <span className="text-[9px] uppercase font-bold text-cinema-muted block">Geometry Base</span>
                  <span className="text-[11px] font-mono text-cinema-amber font-bold mt-1 block">Vectored SVG Grid</span>
                </div>
              </div>
            </div>
          </div>

          {/* Prompt export guidelines block */}
          <div className="border-t border-cinema-border/50 pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs">
              <span className="font-bold text-white block">Suggested Implementations:</span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {activeConcept.suggestedUsage.map((use, idx) => (
                  <span key={idx} className="bg-white/[0.03] border border-cinema-border text-[9px] font-bold text-zinc-300 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {use}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleCopyCode(activeConcept.svgString, activeConcept.id)}
              className="px-5 py-2.5 bg-cinema-amber text-cinema-bg font-extrabold text-xs tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-cinema-amber/15 flex items-center justify-center gap-2 cursor-pointer uppercase self-end sm:self-auto"
            >
              <Copy className="w-4 h-4" />
              {copiedId === activeConcept.id ? "Copied Spec!" : "Copy Active SVG"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
