import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { Track } from "../types";
import { Music as MusicIcon, Disc, Play, ChevronRight, User, FolderHeart, Clock } from "lucide-react";

export default function Music() {
  const { music, loading, playTrack, currentTrack, isPlayingAudio } = useApp();

  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

  // Group music tracks: Artist -> Album -> Tracks
  const groupedMusic = useMemo(() => {
    const groups: Record<string, Record<string, Track[]>> = {};

    music.forEach((track) => {
      const artist = track.artist || "Unknown Artist";
      const album = track.album || "Single";

      if (!groups[artist]) {
        groups[artist] = {};
      }
      if (!groups[artist][album]) {
        groups[artist][album] = [];
      }
      groups[artist][album].push(track);
    });

    return groups;
  }, [music]);

  // List of all artists
  const artists = useMemo(() => {
    return Object.keys(groupedMusic).sort();
  }, [groupedMusic]);

  // Auto-select first artist if none is selected
  useMemo(() => {
    if (artists.length > 0 && !selectedArtist) {
      setSelectedArtist(artists[0]);
    }
  }, [artists, selectedArtist]);

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-cinema-card/50 rounded w-48 animate-pulse" />
        <div className="flex gap-6">
          <div className="w-1/4 h-80 bg-cinema-card/30 rounded-xl animate-pulse" />
          <div className="w-3/4 h-80 bg-cinema-card/30 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (music.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-cinema-card border border-cinema-border rounded-2xl p-8 max-w-lg mx-auto">
        <span className="text-4xl">🎵</span>
        <h3 className="text-xl font-bold mt-4">No audio files scanned</h3>
        <p className="text-cinema-muted text-sm mt-2">
          Place files like .mp3, .flac, .m4a, or .wav inside your `/mnt/storage/Music` folder to populate your audio library.
        </p>
      </div>
    );
  }

  const selectedArtistAlbums = selectedArtist ? groupedMusic[selectedArtist] : {};

  return (
    <div className="space-y-8 pb-28 animate-fade-in" id="music-view-page">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <MusicIcon className="w-7 h-7 text-cinema-amber" />
          Music Lounge
        </h1>
        <p className="text-cinema-muted text-xs md:text-sm mt-1">
          Stream high fidelity, lossless audio tracks. Total songs catalog: {music.length}.
        </p>
      </div>

      {/* Main Music Browser Board */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left Side: Artists list rail (Desktop) */}
        <div className="w-full md:w-1/4 bg-cinema-card border border-cinema-border rounded-2xl overflow-hidden shadow-xl shrink-0 hidden md:block">
          <div className="p-4 border-b border-cinema-border bg-white/[0.02] flex items-center gap-2">
            <User className="w-4 h-4 text-cinema-amber" />
            <span className="font-bold text-xs uppercase tracking-wider text-white">Artists</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto divide-y divide-cinema-border">
            {artists.map((artist) => {
              // Calculate track count
              let tracksCount = 0;
              Object.values(groupedMusic[artist]).forEach((list: any) => {
                tracksCount += list.length;
              });

              return (
                <button
                  key={artist}
                  onClick={() => setSelectedArtist(artist)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between text-xs font-semibold transition-all flex hover:bg-white/[0.02] ${
                    selectedArtist === artist 
                      ? "bg-cinema-amber/10 text-cinema-amber border-l-2 border-cinema-amber" 
                      : "text-cinema-text"
                  }`}
                >
                  <span className="truncate pr-2 font-medium">{artist}</span>
                  <span className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-cinema-muted font-bold shrink-0">
                    {tracksCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Left Side: Artists list horizontal scroller (Mobile) */}
        <div className="w-full md:hidden space-y-2">
          <div className="flex items-center gap-2 text-cinema-muted text-xs font-bold px-1 uppercase tracking-wider">
            <User className="w-3.5 h-3.5 text-cinema-amber" />
            Select Artist ({artists.length})
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none horizontal-scroll">
            {artists.map((artist) => {
              let tracksCount = 0;
              Object.values(groupedMusic[artist]).forEach((list: any) => {
                tracksCount += list.length;
              });
              const isSelected = selectedArtist === artist;

              return (
                <button
                  key={artist}
                  onClick={() => setSelectedArtist(artist)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 active:scale-95 transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-cinema-amber text-cinema-bg border-cinema-amber shadow-lg shadow-cinema-amber/10"
                      : "bg-cinema-card border-cinema-border text-cinema-text hover:text-white"
                  }`}
                >
                  <span className="truncate max-w-[120px]">{artist}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                    isSelected ? "bg-black/20 text-cinema-amber" : "bg-white/5 text-cinema-muted"
                  }`}>
                    {tracksCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Album and track list display */}
        <div className="flex-1 w-full space-y-6">
          {selectedArtist && Object.keys(selectedArtistAlbums).map((album) => {
            const tracks = selectedArtistAlbums[album];
            
            return (
              <div 
                key={album} 
                className="bg-cinema-card border border-cinema-border rounded-2xl overflow-hidden shadow-xl"
                id={`album-card-${album.replace(/\s+/g, "-")}`}
              >
                {/* Album Header bar */}
                <div className="p-4 border-b border-cinema-border bg-white/[0.01] flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-cinema-amber/10 flex items-center justify-center border border-cinema-amber/20">
                      <Disc className="w-5 h-5 text-cinema-amber" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{album}</h3>
                      <p className="text-xs text-cinema-muted">by {selectedArtist}</p>
                    </div>
                  </div>

                  {/* Play full album queue button */}
                  <button
                    onClick={() => playTrack(tracks[0], tracks)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-cinema-amber text-cinema-bg hover:brightness-110 active:scale-95 text-xs font-bold rounded-lg transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Play Album
                  </button>
                </div>

                {/* Track Items List Table */}
                <div className="divide-y divide-cinema-border">
                  {tracks.map((track, idx) => {
                    const isCurrent = currentTrack?.id === track.id;
                    return (
                      <div
                        key={track.id}
                        id={`track-item-${track.id}`}
                        onClick={() => playTrack(track, tracks)}
                        className={`px-4 py-3 flex items-center justify-between text-xs transition-all cursor-pointer hover:bg-white/[0.02] group ${
                          isCurrent ? "bg-cinema-amber/5 text-cinema-amber" : "text-cinema-text"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Play state indicator */}
                          <div className="w-6 text-center text-cinema-muted font-semibold">
                            {isCurrent && isPlayingAudio ? (
                              <div className="flex justify-center items-end gap-0.5 h-3">
                                <span className="w-0.5 h-full bg-cinema-amber animate-[bounce_0.8s_infinite]" />
                                <span className="w-0.5 h-2/3 bg-cinema-amber animate-[bounce_0.6s_infinite]" style={{ animationDelay: "0.15s" }} />
                                <span className="w-0.5 h-3/4 bg-cinema-amber animate-[bounce_0.7s_infinite]" style={{ animationDelay: "0.3s" }} />
                              </div>
                            ) : (
                              <span className="group-hover:hidden">{idx + 1}</span>
                            )}
                            <Play className="w-3.5 h-3.5 fill-current mx-auto text-cinema-amber hidden group-hover:block" />
                          </div>

                          <div className="min-w-0">
                            <p className={`font-semibold truncate text-sm ${isCurrent ? "text-cinema-amber" : "text-white"}`}>
                              {track.title}
                            </p>
                            <p className="text-cinema-muted text-[10px] truncate">
                              {track.filename}
                            </p>
                          </div>
                        </div>

                        {/* Right columns: song time length */}
                        <div className="flex items-center gap-4 text-cinema-muted font-mono text-xs select-none">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDuration(track.duration)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
