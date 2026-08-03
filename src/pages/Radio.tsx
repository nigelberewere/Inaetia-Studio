import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { safeFetch } from "../utils";
import { RadioStation, RadioNowPlaying } from "../types";
import { 
  Radio as RadioIcon, Play, Pause, RefreshCw, Zap, 
  Folder, Calendar, Music, Clock, Disc
} from "lucide-react";

export default function Radio() {
  const { 
    activeStation, 
    isPlayingRadio, 
    radioTrack,
    tuneToStation, 
    stopRadio,
    setActiveView
  } = useApp();

  const [stations, setStations] = useState<RadioStation[]>([]);
  const [nowPlayingMap, setNowPlayingMap] = useState<Record<string, RadioNowPlaying>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchStationsAndNowPlaying = async () => {
    try {
      setLoading(true);
      const res = await safeFetch("/api/radio/stations");
      if (res.ok) {
        const data: RadioStation[] = await res.json();
        setStations(data);
        
        // Fetch now playing for all stations
        const npPromises = data.map(async (st) => {
          try {
            const npRes = await safeFetch(`/api/radio/stations/${st.id}/now`);
            if (npRes.ok) {
              const npData: RadioNowPlaying = await npRes.json();
              return { id: st.id, data: npData };
            }
          } catch (e) {
            console.error(`Error fetching now playing for ${st.id}`, e);
          }
          return null;
        });

        const npResults = await Promise.all(npPromises);
        const newMap: Record<string, RadioNowPlaying> = {};
        npResults.forEach((item) => {
          if (item) {
            newMap[item.id] = item.data;
          }
        });
        setNowPlayingMap(newMap);
      }
    } catch (err) {
      console.error("Error loading radio stations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStationsAndNowPlaying();

    // Refresh now playing data every 15 seconds to keep the dashboard fresh
    const interval = setInterval(async () => {
      try {
        const res = await safeFetch("/api/radio/stations");
        if (res.ok) {
          const data: RadioStation[] = await res.json();
          const npPromises = data.map(async (st) => {
            const npRes = await safeFetch(`/api/radio/stations/${st.id}/now`);
            if (npRes.ok) {
              const npData: RadioNowPlaying = await npRes.json();
              return { id: st.id, data: npData };
            }
            return null;
          });
          const npResults = await Promise.all(npPromises);
          const newMap: Record<string, RadioNowPlaying> = {};
          npResults.forEach((item) => {
            if (item) newMap[item.id] = item.data;
          });
          setNowPlayingMap(newMap);
        }
      } catch (e) {
        console.error("Silent background refresh error:", e);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchStationsAndNowPlaying();
    setRefreshing(false);
  };

  const handleToggleStation = async (stationId: string) => {
    if (activeStation?.id === stationId) {
      if (isPlayingRadio) {
        stopRadio();
      } else {
        await tuneToStation(stationId);
      }
    } else {
      await tuneToStation(stationId);
    }
  };

  const formatTrackDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const curatedStations = stations.filter((s) => s.type === "smart" || !s.sourceFolder);
  const libraryFolderStreams = stations.filter((s) => s.type === "folder" || !!s.sourceFolder);

  return (
    <div className="space-y-8 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-cinema-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <RadioIcon className="w-8 h-8 text-cinema-amber animate-pulse" />
            Radio Tuner
          </h1>
          <p className="text-sm text-cinema-muted mt-1.5 font-sans font-light">
            Continuous, live deterministic scheduled audio streams synchronized for all users.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView("radioguide")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cinema-card hover:bg-white/5 border border-cinema-border text-sm font-medium text-white transition-all shadow-md active:scale-95"
          >
            <Calendar className="w-4 h-4 text-cinema-amber" />
            Station Schedules
          </button>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-cinema-card hover:bg-white/5 border border-cinema-border text-cinema-text transition-all active:scale-95 hover:text-white disabled:opacity-50"
            title="Refresh Station Statuses"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin text-cinema-amber" : ""}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <RefreshCw className="w-10 h-10 text-cinema-amber animate-spin" />
          <p className="text-sm text-cinema-muted">Scanning frequency and fetching active schedules...</p>
        </div>
      ) : stations.length === 0 ? (
        <div className="text-center py-16 bg-cinema-card border border-cinema-border rounded-2xl p-6">
          <RadioIcon className="w-12 h-12 text-cinema-muted mx-auto mb-3" />
          <p className="text-lg font-bold text-white">No Radio Stations Found</p>
          <p className="text-sm text-cinema-muted mt-1 max-w-md mx-auto">
            Dynamic station folders are discovered automatically from subfolders inside your MUSIC_PATH. Add music subfolders and trigger a refresh!
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* ═══════════════════════════════════════ */}
          {/* SECTION 1: CURATED LIVE STATIONS        */}
          {/* ═══════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                  <Zap className="w-5 h-5 text-cinema-amber fill-cinema-amber/20" />
                  Curated Live Stations
                </h2>
                <p className="text-xs text-cinema-muted mt-1">
                  Continuous 24/7 scheduled streams with synchronized global playback
                </p>
              </div>
              <span className="text-xs font-bold text-cinema-amber bg-cinema-amber/10 px-3 py-1 rounded-full border border-cinema-amber/20">
                {curatedStations.length} Live Channels
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {curatedStations.map((station) => {
                const nowPlaying = nowPlayingMap[station.id];
                const isTuned = activeStation?.id === station.id;
                // Single source of truth for current playing track (matches audio engine)
                const currentTrack = isTuned && radioTrack ? radioTrack : nowPlaying?.currentTrack;
                const isPlaying = isTuned && isPlayingRadio;

                return (
                  <div
                    key={station.id}
                    className={`relative overflow-hidden rounded-2xl border bg-cinema-card p-5 transition-all duration-300 flex flex-col justify-between ${
                      isPlaying 
                        ? "border-cinema-amber/40 shadow-lg shadow-cinema-amber/5 ring-1 ring-cinema-amber/20" 
                        : "border-cinema-border hover:border-white/10 hover:bg-white/[0.02]"
                    }`}
                  >
                    {/* Visual Glow Effects for active station */}
                    {isPlaying && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-cinema-amber/5 rounded-full blur-2xl pointer-events-none" />
                    )}

                    <div>
                      {/* Top Bar with Icon & Equalizer */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cinema-amber/10 text-cinema-amber text-[10px] font-extrabold tracking-wider uppercase border border-cinema-amber/20">
                          <Zap className="w-3 h-3" />
                          Curated Live
                        </div>

                        {/* Equalizer Micro-Animation */}
                        {isPlaying && (
                          <div className="flex items-end gap-[3px] h-3.5 px-1.5">
                            <div className="w-[3px] bg-cinema-amber rounded-full animate-[equalizer_0.8s_ease-in-out_infinite_alternate]" style={{ height: "40%" }} />
                            <div className="w-[3px] bg-cinema-amber rounded-full animate-[equalizer_1.1s_ease-in-out_infinite_alternate_0.2s]" style={{ height: "100%" }} />
                            <div className="w-[3px] bg-cinema-amber rounded-full animate-[equalizer_0.9s_ease-in-out_infinite_alternate_0.4s]" style={{ height: "60%" }} />
                          </div>
                        )}
                      </div>

                      {/* Station Name & Info */}
                      <div className="mb-5">
                        <div className="flex items-baseline justify-between">
                          <h3 
                            className="text-xl font-black text-white leading-tight truncate hover:text-cinema-amber transition-colors cursor-pointer" 
                            onClick={() => handleToggleStation(station.id)}
                          >
                            {station.name}
                          </h3>
                          <span className="text-xs font-black text-white/40 tracking-wider shrink-0 ml-2">
                            CH {String(station.stationNumber).padStart(2, "0")}
                          </span>
                        </div>
                        <p className="text-xs text-cinema-muted mt-1.5 font-medium flex items-center gap-1">
                          <Music className="w-3.5 h-3.5 shrink-0" />
                          {station.trackCount} Tracks in Schedule
                        </p>
                      </div>

                      {/* Now Playing Card Block */}
                      <div className="bg-cinema-bg/80 rounded-xl p-3.5 border border-cinema-border/50 min-h-[95px] flex flex-col justify-center space-y-1">
                        {currentTrack ? (
                          <>
                            <div className="text-[10px] font-extrabold text-cinema-amber tracking-widest uppercase flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-cinema-amber animate-pulse" />
                              Now Playing
                            </div>
                            <div className="text-sm font-bold text-white truncate leading-snug" title={currentTrack.title}>
                              {currentTrack.title}
                            </div>
                            <div className="text-xs font-semibold text-cinema-muted truncate leading-normal" title={currentTrack.artist}>
                              {currentTrack.artist || "Unknown Artist"}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-cinema-muted pt-1">
                              <Clock className="w-3 h-3 shrink-0 text-cinema-amber/80" />
                              <span>Duration: {formatTrackDuration(currentTrack.duration)}</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-cinema-muted italic flex items-center justify-center">
                            Frequency quiet...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Section */}
                    <div className="mt-5 pt-4 border-t border-cinema-border/30 flex items-center justify-between">
                      <button
                        onClick={() => setActiveView("radioguide")}
                        className="text-xs font-semibold text-cinema-muted hover:text-cinema-amber transition-colors flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        View Schedule
                      </button>

                      <button
                        onClick={() => handleToggleStation(station.id)}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-extrabold transition-all shadow-md active:scale-95 ${
                          isPlaying 
                            ? "bg-cinema-amber text-cinema-bg hover:brightness-110" 
                            : "bg-white/5 hover:bg-white/10 text-white hover:text-cinema-amber border border-white/5"
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-current" />
                            Tuned In
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Tune In
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══════════════════════════════════════ */}
          {/* SECTION 2: QUICK PLAY FROM LIBRARY     */}
          {/* ═══════════════════════════════════════ */}
          {libraryFolderStreams.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-cinema-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                    <Folder className="w-5 h-5 text-blue-400" />
                    Quick Play from Library
                  </h2>
                  <p className="text-xs text-cinema-muted mt-0.5">
                    Stream your music folders and albums on continuous shuffle
                  </p>
                </div>
                <span className="text-xs font-medium text-cinema-muted bg-white/5 px-2.5 py-1 rounded-full border border-cinema-border">
                  {libraryFolderStreams.length} Folder Streams
                </span>
              </div>

              {/* Compact Grid for Library Folder Streams */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {libraryFolderStreams.map((station) => {
                  const nowPlaying = nowPlayingMap[station.id];
                  const isTuned = activeStation?.id === station.id;
                  const currentTrack = isTuned && radioTrack ? radioTrack : nowPlaying?.currentTrack;
                  const isPlaying = isTuned && isPlayingRadio;

                  return (
                    <div
                      key={station.id}
                      className={`rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between bg-zinc-950/60 ${
                        isPlaying
                          ? "border-blue-500/50 bg-blue-950/20 shadow-md ring-1 ring-blue-500/20"
                          : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60"
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Header Badge & Title */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                            <Disc className="w-3 h-3" />
                            Folder Stream
                          </div>
                          <span className="text-[10px] font-semibold text-zinc-500">
                            {station.trackCount} tracks
                          </span>
                        </div>

                        <h3 
                          onClick={() => handleToggleStation(station.id)}
                          className="font-bold text-sm text-white truncate hover:text-blue-400 cursor-pointer transition-colors"
                          title={station.name}
                        >
                          {station.name}
                        </h3>

                        {/* Compact Track Info */}
                        <div className="bg-black/40 rounded-lg p-2.5 border border-zinc-900 text-xs space-y-0.5">
                          {currentTrack ? (
                            <>
                              <div className="font-semibold text-zinc-200 truncate" title={currentTrack.title}>
                                {currentTrack.title}
                              </div>
                              <div className="text-[11px] text-zinc-400 truncate" title={currentTrack.artist}>
                                {currentTrack.artist || "Unknown Artist"}
                              </div>
                            </>
                          ) : (
                            <span className="text-[11px] text-zinc-500 italic">Idle stream</span>
                          )}
                        </div>
                      </div>

                      {/* Quick Play Button */}
                      <div className="mt-3 pt-2.5 border-t border-zinc-900/80 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500 font-medium truncate max-w-[120px]">
                          {station.sourceFolder ? station.sourceFolder.split("/").pop() : "Local Folder"}
                        </span>

                        <button
                          onClick={() => handleToggleStation(station.id)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                            isPlaying
                              ? "bg-blue-600 text-white"
                              : "bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white"
                          }`}
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="w-3 h-3 fill-current" />
                              Playing
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              Stream
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Embedded Animations Style for Equalizers */}
      <style>{`
        @keyframes equalizer {
          0% { height: 25%; }
          100% { height: 100%; }
        }
      `}</style>
    </div>
  );
}
