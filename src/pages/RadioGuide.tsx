import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { safeFetch } from "../utils";
import { RadioStation, RadioEPGItem } from "../types";
import { 
  Radio as RadioIcon, ArrowLeft, RefreshCw, Clock, 
  Play, Pause, ChevronRight, Music, Calendar
} from "lucide-react";

export default function RadioGuide() {
  const { 
    activeStation, 
    isPlayingRadio, 
    tuneToStation, 
    stopRadio,
    setActiveView 
  } = useApp();

  const [stations, setStations] = useState<RadioStation[]>([]);
  const [scheduleData, setScheduleData] = useState<Record<string, RadioEPGItem[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchGuideData = async () => {
    try {
      setLoading(true);
      // Fetch both stations list and schedules in parallel
      const stationsRes = await safeFetch("/api/radio/stations");
      const scheduleRes = await safeFetch("/api/radio/stations/schedule/all?hours=8");

      if (stationsRes.ok && scheduleRes.ok) {
        const stationsList: RadioStation[] = await stationsRes.json();
        const schedules: Record<string, RadioEPGItem[]> = await scheduleRes.json();
        
        setStations(stationsList);
        setScheduleData(schedules);
      }
    } catch (err) {
      console.error("Error loading Radio Guide data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuideData();
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchGuideData();
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

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    h = h ? h : 12; // hour '0' should be '12'
    return `${h}:${m < 10 ? "0" : ""}${m} ${ampm}`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0s";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const isItemLiveNow = (item: RadioEPGItem) => {
    const now = Date.now();
    const start = new Date(item.startTime).getTime();
    const end = new Date(item.endTime).getTime();
    return now >= start && now <= end;
  };

  return (
    <div className="space-y-6 md:space-y-8 select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-cinema-border pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView("radio")}
            className="p-2.5 rounded-lg bg-cinema-card hover:bg-white/5 border border-cinema-border text-cinema-text hover:text-white transition-all active:scale-95"
            title="Back to Tuner"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Calendar className="w-7 h-7 text-cinema-amber" />
              Radio Programming Guide
            </h1>
            <p className="text-sm text-cinema-muted mt-1 font-sans font-light">
              Interactive 8-hour schedule for each dynamic frequency. See what's playing next live.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cinema-card hover:bg-white/5 border border-cinema-border text-sm font-medium text-cinema-text hover:text-white transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-cinema-amber" : ""}`} />
            Refresh Schedule
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <RefreshCw className="w-10 h-10 text-cinema-amber animate-spin" />
          <p className="text-sm text-cinema-muted">Tuning schedule grids and synchronizing timelines...</p>
        </div>
      ) : stations.length === 0 ? (
        <div className="text-center py-16 bg-cinema-card border border-cinema-border rounded-2xl p-6">
          <RadioIcon className="w-12 h-12 text-cinema-muted mx-auto mb-3" />
          <p className="text-lg font-bold text-white">No schedules available</p>
          <p className="text-sm text-cinema-muted mt-1">Please ensure media directories are configured and populated.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {stations.map((station) => {
            const items = scheduleData[station.id] || [];
            const isTuned = activeStation?.id === station.id;
            const isPlaying = isTuned && isPlayingRadio;

            return (
              <div 
                key={station.id} 
                className={`bg-cinema-card rounded-2xl border transition-all duration-300 ${
                  isTuned 
                    ? "border-cinema-amber/30 ring-1 ring-cinema-amber/10 shadow-lg shadow-cinema-amber/5" 
                    : "border-cinema-border"
                }`}
              >
                {/* Station Row Header */}
                <div className="px-5 py-4 border-b border-cinema-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cinema-bg/80 border border-cinema-border text-cinema-amber">
                      <RadioIcon className={`w-5 h-5 ${isPlaying ? "animate-pulse" : ""}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">{station.name}</h3>
                      <p className="text-xs text-cinema-muted flex items-center gap-1.5 mt-0.5 font-medium">
                        <Music className="w-3.5 h-3.5" />
                        {station.trackCount} track rotation
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleStation(station.id)}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all shadow active:scale-95 self-start sm:self-auto ${
                      isPlaying
                        ? "bg-cinema-amber text-cinema-bg hover:brightness-110"
                        : "bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:text-cinema-amber"
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
                        Tune In Station
                      </>
                    )}
                  </button>
                </div>

                {/* Scheduled Items List */}
                <div className="p-4 sm:p-5 overflow-x-auto">
                  {items.length === 0 ? (
                    <p className="text-xs text-cinema-muted italic py-2">No upcoming programming schedule generated.</p>
                  ) : (
                    <div className="flex gap-4 min-w-max pb-2">
                      {items.map((item, index) => {
                        const isLive = isItemLiveNow(item);
                        
                        return (
                          <div
                            key={index}
                            className={`w-72 rounded-xl p-4 border transition-all flex flex-col justify-between ${
                              isLive
                                ? "bg-cinema-amber/5 border-cinema-amber/30 shadow-md ring-1 ring-cinema-amber/20"
                                : "bg-cinema-bg/40 border-cinema-border hover:border-white/5"
                            }`}
                          >
                            <div className="space-y-2">
                              {/* Schedule Timeline Badging */}
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-cinema-muted flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full">
                                  <Clock className="w-3 h-3 text-cinema-amber" />
                                  {formatTime(item.startTime)}
                                </span>
                                {isLive && (
                                  <span className="text-[9px] font-black tracking-widest text-cinema-bg bg-cinema-amber px-2 py-0.5 rounded-full uppercase animate-pulse">
                                    Live Now
                                  </span>
                                )}
                              </div>

                              {/* Track info */}
                              <div>
                                <h4 className="text-sm font-bold text-white truncate leading-snug" title={item.track.title}>
                                  {item.track.title}
                                </h4>
                                <p className="text-xs text-cinema-muted truncate mt-0.5 leading-normal" title={item.track.artist}>
                                  {item.track.artist || "Unknown Artist"}
                                </p>
                              </div>
                            </div>

                            {/* Track Metadata */}
                            <div className="mt-4 pt-3 border-t border-cinema-border/50 flex items-center justify-between text-[10px] text-cinema-muted font-medium">
                              <span>Track {index + 1}</span>
                              <span>Duration: {formatDuration(item.track.duration)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
