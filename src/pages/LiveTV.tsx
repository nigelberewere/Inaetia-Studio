import React, { Component, useState, useEffect, useRef, useMemo } from "react";
import { Tv, Calendar, Play, ChevronUp, ChevronDown, Loader2, Clock, Volume2, VolumeX, AlertCircle } from "lucide-react";
import { Channel, EPGItem } from "../types";
import { safeFetch } from "../utils";

// Safe time formatting helper to prevent RangeError crashes in sandboxed browser environments
function formatTimeSafe(dateInput: any): string {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    // Pass undefined instead of [] for the locale to guarantee safe defaults in all browser engines
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    console.error("Error formatting time safely:", e);
    return "";
  }
}

// Robust error boundary to catch runtime rendering exceptions (e.g., date conversion errors or player crashes)
class LiveTVErrorBoundary extends Component<any, any> {
  state: any;
  props: any;
  setState: any;
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("LiveTV Error caught by Boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-950/40 border border-red-800/40 rounded-2xl p-6 text-center max-w-xl mx-auto my-10 space-y-4">
          <div className="h-12 w-12 rounded-full bg-red-900/30 text-red-500 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Broadcast Player Exception</h2>
          <p className="text-sm text-gray-400">
            An unexpected rendering exception occurred. This is often due to invalid system time or a stream configuration issue.
          </p>
          <div className="bg-black/40 p-3 rounded-lg text-xs font-mono text-left text-red-300 overflow-x-auto max-h-40">
            {this.state.error?.message || "Unknown rendering error"}
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-cinema-amber text-cinema-bg hover:bg-cinema-amber/95 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
          >
            Reset Signal
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function LiveTV() {
  return (
    <LiveTVErrorBoundary>
      <LiveTVContent />
    </LiveTVErrorBoundary>
  );
}

function LiveTVContent() {
  const [activeTab, setActiveTab] = useState<"channels" | "guide">("channels");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh now-playing data for channels every 30 seconds
  const fetchChannels = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await safeFetch("/api/channels");
      if (!res.ok) throw new Error("No channels found. Please ensure you have videos in your library subfolders.");
      const data = await res.json();
      setChannels(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load TV channels");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels(true);
    const interval = setInterval(() => {
      fetchChannels(false);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 md:space-y-8 pb-16">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-cinema-border pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Tv className="h-8 w-8 text-cinema-amber animate-pulse" />
            Live TV Broadcaster
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time linear TV channels generated dynamically from your media collection.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-cinema-card-bg border border-cinema-border rounded-xl p-1 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("channels")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "channels"
                ? "bg-cinema-amber text-cinema-bg font-semibold shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Tv className="h-4 w-4" />
            Live Channels
          </button>
          <button
            onClick={() => setActiveTab("guide")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "guide"
                ? "bg-cinema-amber text-cinema-bg font-semibold shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Calendar className="h-4 w-4" />
            TV Guide (EPG)
          </button>
        </div>
      </div>

      {/* Main Broadcast Player Area */}
      {selectedChannel && (
        <div className="bg-black/40 border border-cinema-border rounded-2xl overflow-hidden p-4 md:p-6 mb-8">
          <LivePlayer
            channel={selectedChannel}
            channelsList={channels}
            onClose={() => setSelectedChannel(null)}
            onChannelChange={(ch) => setSelectedChannel(ch)}
          />
        </div>
      )}

      {loading && channels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="h-10 w-10 text-cinema-amber animate-spin" />
          <p className="text-gray-400 font-medium text-sm">Tuning in and indexing available channels...</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 bg-red-950/40 border border-red-800/40 rounded-xl p-5 text-red-200 text-sm max-w-2xl mx-auto">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <div>
            <p className="font-semibold">Unable to stream Live TV</p>
            <p className="text-xs text-red-300/80 mt-1">
              {error}. To fix this, make sure your Video Library folders (e.g., Cartoons, Marvel, etc.) contain playable video files.
            </p>
          </div>
        </div>
      ) : activeTab === "channels" ? (
        <ChannelsGrid channels={channels} onSelectChannel={setSelectedChannel} />
      ) : (
        <EPGView channels={channels} onSelectChannel={setSelectedChannel} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// SUB-COMPONENT: CHANNELS GRID
// ═══════════════════════════════════════
interface ChannelsGridProps {
  channels: Channel[];
  onSelectChannel: (channel: Channel) => void;
}

function ChannelsGrid({ channels, onSelectChannel }: ChannelsGridProps) {
  if (channels.length === 0) {
    return (
      <div className="text-center py-20 bg-cinema-card-bg/20 border border-cinema-border rounded-xl">
        <Tv className="h-12 w-12 text-gray-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white">No Linear Channels Available</h3>
        <p className="text-sm text-gray-400 max-w-md mx-auto mt-1 px-4">
          Create subfolders under your Videos directory (e.g., Cartoons, Movies, Series). Each subfolder will automatically broadcast as its own channel!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {channels.map((ch) => {
        const prog = ch.currentProgram;
        let progressPercent = 0;
        let timeRemainingStr = "";

        if (prog) {
          const start = prog.startedAt ? new Date(prog.startedAt).getTime() : 0;
          const end = prog.endsAt ? new Date(prog.endsAt).getTime() : 0;
          if (start > 0 && end > start) {
            const total = end - start;
            const elapsed = Date.now() - start;
            progressPercent = Math.min(100, Math.max(0, (elapsed / total) * 100));

            const remainingSeconds = Math.max(0, Math.floor((end - Date.now()) / 1000));
            const mins = Math.floor(remainingSeconds / 60);
            timeRemainingStr = mins > 0 ? `${mins}m left` : "Ending now";
          }
        }

        const channelArtwork = ch.fanart || ch.poster || prog?.fanart || prog?.poster;

        return (
          <div
            key={ch.id}
            onClick={() => onSelectChannel(ch)}
            className="group bg-cinema-card-bg border border-cinema-border rounded-2xl overflow-hidden hover:border-cinema-amber/50 transition-all duration-300 shadow-md hover:shadow-xl cursor-pointer flex flex-col h-full"
          >
            {/* Colored Logo / Artwork Channel Box */}
            <div
              className="h-28 flex items-center justify-between p-5 relative overflow-hidden shrink-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
              style={{
                backgroundImage: channelArtwork ? `url(${channelArtwork})` : undefined,
                background: channelArtwork ? undefined : `linear-gradient(135deg, ${ch.color} 0%, #0F0F15 100%)`,
              }}
            >
              {/* Dark overlay for perfect text readability when artwork is displayed */}
              {channelArtwork && (
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F15]/90 via-[#0F0F15]/50 to-[#0F0F15]/70 z-0" />
              )}
              
              <div className="z-10 text-white font-black tracking-tight flex flex-col">
                <span className="text-xs uppercase opacity-80 tracking-widest font-bold">Channel</span>
                <span className="text-3xl">{String(ch.channelNumber).padStart(2, "0")}</span>
              </div>
              <div className="z-10 text-right">
                <div className="text-white font-extrabold text-xl group-hover:text-cinema-amber transition-colors drop-shadow-md">
                  {ch.name}
                </div>
                <span className="text-[10px] text-white/80 bg-black/50 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold mt-1 inline-block backdrop-blur-xs">
                  🔴 LIVE broadcast
                </span>
              </div>
              {!channelArtwork && (
                <div className="absolute -bottom-6 -right-6 text-white/5 font-bold text-8xl pointer-events-none uppercase italic tracking-tighter">
                  CH{ch.channelNumber}
                </div>
              )}
            </div>

            {/* Now Playing Info */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-[10px] uppercase text-cinema-amber font-extrabold tracking-widest block">
                  Now Playing
                </span>
                <h3 className="text-white font-bold text-sm leading-snug line-clamp-2" title={prog?.title || "Off Air"}>
                  {prog?.title || "Broadcast Loop Initializing..."}
                </h3>
                {prog && (
                  <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {formatTimeSafe(prog.startedAt)} - {formatTimeSafe(prog.endsAt)}
                    </span>
                  </div>
                )}
              </div>

              {/* Live Program Progress Bar */}
              {prog && (
                <div className="mt-4 pt-4 border-t border-cinema-border/50">
                  <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                    <span>{Math.round(progressPercent)}% completed</span>
                    <span className="font-semibold text-cinema-amber">{timeRemainingStr}</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cinema-amber transition-all duration-1000"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════
// SUB-COMPONENT: LIVE PLAYER
// ═══════════════════════════════════════
interface LivePlayerProps {
  channel: Channel;
  channelsList: Channel[];
  onClose: () => void;
  onChannelChange: (channel: Channel) => void;
}

function LivePlayer({ channel, channelsList, onClose, onChannelChange }: LivePlayerProps) {
  const [nowPlaying, setNowPlaying] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(false);
  const [showBumper, setShowBumper] = useState<boolean>(false);
  const [liveDrift, setLiveDrift] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  const streamUrl = useMemo(() => {
    if (!nowPlaying?.currentProgram?.id) return "";
    return `/api/channels/${channel.id}/stream?t=${nowPlaying.currentProgram.id}`;
  }, [channel.id, nowPlaying?.currentProgram?.id]);

  const fetchLiveInfo = async () => {
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 4000) {
      console.log("Coordinating fast fetch requests. Skipping to prevent loop.");
      return;
    }
    lastFetchTimeRef.current = now;

    try {
      setError(null);
      const res = await safeFetch(`/api/channels/${channel.id}/now`);
      if (res.ok) {
        const data = await res.json();
        setNowPlaying(data);
        setShowBumper(false);
        setLiveDrift(0);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to retrieve channel broadcast schedule.");
      }
    } catch (err: any) {
      console.error("Error fetching live channel data:", err);
      setError("Network or server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setNowPlaying(null);
    setError(null);
    setShowBumper(false);
    setLiveDrift(0);
    setLoading(true);
    // Reset rate limiter so tuning channel is always immediate
    lastFetchTimeRef.current = 0;
    fetchLiveInfo();
  }, [channel.id]);

  // Handle continuous playback of next programs
  useEffect(() => {
    if (!nowPlaying) return;

    // Monitor countdown to program endsAt or ended event
    const checkEndInterval = setInterval(() => {
      if (!nowPlaying?.endsAt) return;
      
      const remainingMs = new Date(nowPlaying.endsAt).getTime() - Date.now();
      
      // Show "Up Next" bumper overlay in the last 60 seconds of the program
      if (remainingMs <= 60000 && remainingMs > 0 && !showBumper) {
        setShowBumper(true);
      }

      // Automatically advance to the next program if remaining time has expired
      if (remainingMs <= 0) {
        clearInterval(checkEndInterval);
        console.log("Program duration elapsed, advancing to next live scheduled program...");
        fetchLiveInfo();
      }
    }, 4000);

    return () => clearInterval(checkEndInterval);
  }, [nowPlaying, showBumper]);

  // Dynamically measure and track playback drift from the schedule
  useEffect(() => {
    if (!nowPlaying || !videoRef.current) return;

    const interval = setInterval(() => {
      if (!videoRef.current || videoRef.current.paused) return;

      const startedTime = new Date(nowPlaying.startedAt).getTime();
      const idealOffset = (Date.now() - startedTime) / 1000;
      const actualOffset = videoRef.current.currentTime;
      const diff = idealOffset - actualOffset;
      
      // Set the live drift (floor to prevent minor flutter under 1s)
      setLiveDrift(diff > 1 ? Math.floor(diff) : 0);
    }, 4000);

    return () => clearInterval(interval);
  }, [nowPlaying]);

  const syncToLive = () => {
    if (videoRef.current && nowPlaying) {
      const startedTime = new Date(nowPlaying.startedAt).getTime();
      const idealOffset = (Date.now() - startedTime) / 1000;
      const duration = videoRef.current.duration;
      const target = duration ? Math.min(idealOffset, duration - 1) : idealOffset;

      videoRef.current.currentTime = Math.max(0, target);
      setLiveDrift(0);
      console.log(`Manually synchronized playhead to live: offset is now ${target}s`);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current && nowPlaying) {
      const targetOffset = nowPlaying.offsetSeconds || 0;
      console.log(`Live TV joined: Seeking to active broadcast offset: ${targetOffset}s`);
      videoRef.current.currentTime = targetOffset;
      videoRef.current.play().catch((err) => {
        console.warn("Autoplay block: awaiting user interaction", err);
      });
    }
  };

  const handleVideoEnded = () => {
    console.log("Video source ended, re-fetching live information...");
    fetchLiveInfo();
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(videoRef.current.muted);
    }
  };

  const zapChannel = (direction: "up" | "down") => {
    const currentIndex = channelsList.findIndex((c) => c.id === channel.id);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (direction === "up") {
      nextIndex = (currentIndex + 1) % channelsList.length;
    } else {
      nextIndex = currentIndex === 0 ? channelsList.length - 1 : currentIndex - 1;
    }
    onChannelChange(channelsList[nextIndex]);
  };

  if (error) {
    return (
      <div className="aspect-video w-full flex flex-col items-center justify-center bg-zinc-950/80 rounded-xl border border-red-950/30 p-6 space-y-3">
        <AlertCircle className="h-10 w-10 text-red-500 animate-pulse" />
        <h3 className="text-white font-bold text-sm">Signal Weak or Lost</h3>
        <p className="text-xs text-gray-400 max-w-md text-center leading-relaxed">
          {error}
          <br />
          <span className="text-[10px] text-gray-500 mt-1 block">
            To restore the broadcast, make sure your Video Library subfolders (e.g., "Movies" or "Cartoons") contain compatible media files.
          </span>
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => {
              setLoading(true);
              fetchLiveInfo();
            }}
            className="px-3.5 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Retry Tuning
          </button>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 border border-cinema-border hover:bg-white/5 text-gray-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Exit Player
          </button>
        </div>
      </div>
    );
  }

  if (loading && !nowPlaying) {
    return (
      <div className="aspect-video w-full flex flex-col items-center justify-center bg-zinc-950/80 rounded-xl border border-cinema-border">
        <Loader2 className="h-10 w-10 text-cinema-amber animate-spin mb-3" />
        <p className="text-sm text-gray-400">Connecting to channel stream...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-cinema-border/50 pb-3">
        <div className="flex items-center gap-3">
          <div
            className="px-3 py-1 rounded-lg text-xs font-black text-white shrink-0 shadow-md"
            style={{ backgroundColor: channel.color }}
          >
            CH {String(channel.channelNumber).padStart(2, "0")}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {channel.name}
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] text-red-500 font-black uppercase tracking-wider">LIVE</span>
            </h2>
            <p className="text-xs text-gray-400 line-clamp-1">
              Playing: <span className="text-gray-200 font-medium">{nowPlaying?.currentProgram?.title || "Looping..."}</span>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xs border border-cinema-border px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          Exit Screen
        </button>
      </div>

      {/* Video Canvas Container */}
      <div className="relative aspect-video w-full bg-black rounded-xl border border-cinema-border overflow-hidden group shadow-2xl">
        {nowPlaying?.currentProgram ? (
          <video
            ref={videoRef}
            src={streamUrl}
            onLoadedMetadata={handleVideoLoadedMetadata}
            onEnded={handleVideoEnded}
            onPause={(e) => {
              // Real-world Live TV cannot be paused! Force resume immediately.
              const video = e.currentTarget;
              video.play().catch((err) => {
                console.warn("Autoplay block or live playback resume failed", err);
              });
            }}
            onKeyDown={(e) => {
              // Prevent Spacebar from pausing Live TV
              if (e.key === " " || e.code === "Space") {
                e.preventDefault();
              }
            }}
            className="w-full h-full object-contain"
            controls
            autoPlay
            playsInline
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
            <Tv className="h-12 w-12 text-gray-600 animate-bounce" />
            <p className="text-sm text-gray-400">Static signal: Awaiting schedule loop</p>
          </div>
        )}

        {/* Custom Overlay Controls */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
          <span className="flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-md shadow-lg tracking-widest pointer-events-none select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
            🔴 LIVE BROADCAST
          </span>

          {liveDrift > 3 ? (
            <button
              onClick={syncToLive}
              className="bg-cinema-amber hover:bg-cinema-amber/95 hover:scale-[1.02] text-cinema-bg font-black text-[10px] uppercase px-2.5 py-1 rounded-md shadow-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer select-none"
              title="Click to synchronize your playhead precisely with the real-time server broadcast schedule"
            >
              <Clock className="w-3 h-3" />
              Behind by {liveDrift}s • Click to Sync
            </button>
          ) : (
            <span className="bg-emerald-950/80 border border-emerald-500/35 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-md shadow-lg flex items-center gap-1.5 pointer-events-none select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              IN SYNC WITH LIVE
            </span>
          )}

          <span className="bg-black/60 text-gray-300 text-[10px] font-bold px-2.5 py-1 rounded-md shadow-lg border border-white/5 pointer-events-none select-none">
            SEEK POSITION LOCKED
          </span>
        </div>

        {/* Bumper "Up Next" Notification Overlay (shown in the last 60 seconds) */}
        {showBumper && nowPlaying?.nextProgram && (
          <div className="absolute bottom-16 right-4 bg-zinc-950/90 border border-cinema-amber/40 p-4 rounded-xl shadow-2xl z-20 max-w-sm animate-fade-in pointer-events-none">
            <div className="text-[10px] text-cinema-amber font-extrabold uppercase tracking-widest mb-1">
              Coming Up Next
            </div>
            <div className="text-xs font-bold text-white leading-tight line-clamp-2">
              {nowPlaying.nextProgram.title}
            </div>
            <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Starts at {formatTimeSafe(nowPlaying.endsAt)}
            </div>
          </div>
        )}

        {/* Channel Up/Down Remote Button Overlays */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 p-2 rounded-xl border border-white/5 backdrop-blur-sm z-10">
          <button
            onClick={() => zapChannel("down")}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
            title="Channel Down"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <span className="text-[10px] font-black text-center text-white select-none">
            CH
          </span>
          <button
            onClick={() => zapChannel("up")}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
            title="Channel Up"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// SUB-COMPONENT: PROGRAM GUIDE (EPG)
// ═══════════════════════════════════════
interface EPGViewProps {
  channels: Channel[];
  onSelectChannel: (channel: Channel) => void;
}

function EPGView({ channels, onSelectChannel }: EPGViewProps) {
  const [epgData, setEpgData] = useState<Record<string, EPGItem[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const guideContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchEPG = async () => {
      setLoading(true);
      try {
        const res = await safeFetch("/api/channels/epg/all?hours=8");
        if (res.ok) {
          const data = await res.json();
          setEpgData(data);
        }
      } catch (err) {
        console.error("Failed to load EPG:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEPG();
  }, [channels]);

  // Generate beautiful horizontal timeline headers (every 30 mins for the next 8 hours)
  const timelineBlocks: Date[] = [];
  const startOfTimeline = new Date();
  startOfTimeline.setMinutes(startOfTimeline.getMinutes() < 30 ? 0 : 30, 0, 0); // Round down to nearest 30m

  for (let i = 0; i < 16; i++) {
    const time = new Date(startOfTimeline.getTime() + i * 30 * 60 * 1000);
    timelineBlocks.push(time);
  }

  // Calculate EPG cell width (minutes * 4.5px, meaning 30m = 135px for robust readability)
  const MINUTE_WIDTH = 4.5;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-2">
        <Loader2 className="h-8 w-8 text-cinema-amber animate-spin" />
        <p className="text-gray-400 text-sm font-medium">Loading program guides...</p>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        No channels to show on guide.
      </div>
    );
  }

  return (
    <div className="bg-cinema-card-bg border border-cinema-border rounded-2xl p-4 md:p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-cinema-amber" />
          <h2 className="text-lg font-bold text-white">Grid Program Guide (EPG)</h2>
        </div>
        <span className="text-[10px] text-gray-400 bg-black/40 px-3 py-1 rounded-full uppercase border border-white/5 tracking-wider font-semibold">
          Click any block to tune in
        </span>
      </div>

      {/* Grid Controller Container */}
      <div className="border border-cinema-border/50 rounded-xl overflow-hidden flex flex-col bg-zinc-950/20">
        {/* Horizontal Timeline Header */}
        <div className="flex border-b border-cinema-border">
          {/* Left spacer block */}
          <div className="w-32 sm:w-48 bg-cinema-card-bg border-r border-cinema-border py-3 px-2 sm:px-4 text-xs font-black text-gray-400 shrink-0 select-none">
            Channels
          </div>
          {/* Timeline Blocks */}
          <div className="flex-1 overflow-x-auto scrollbar-hide flex">
            <div className="flex relative">
              {timelineBlocks.map((time, idx) => (
                <div
                  key={idx}
                  className="border-r border-cinema-border/30 text-xs text-gray-300 font-semibold py-3 px-2 text-center select-none"
                  style={{ width: `${30 * MINUTE_WIDTH}px` }}
                >
                  {formatTimeSafe(time)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grid EPG rows */}
        <div className="flex flex-col divide-y divide-cinema-border" ref={guideContainerRef}>
          {channels.map((ch) => {
            const programs = epgData[ch.id] || [];
            
            return (
              <div key={ch.id} className="flex hover:bg-white/[0.01] transition-colors">
                {/* Channel Label Row */}
                <div
                  onClick={() => onSelectChannel(ch)}
                  className="w-32 sm:w-48 bg-cinema-card-bg border-r border-cinema-border py-4 px-2 sm:px-4 flex items-center gap-1.5 sm:gap-2.5 shrink-0 cursor-pointer hover:bg-white/5 transition-colors group select-none"
                >
                  <div
                    className="h-6 w-8 rounded text-[10px] font-black text-white flex items-center justify-center shrink-0 shadow"
                    style={{ backgroundColor: ch.color }}
                  >
                    {ch.channelNumber}
                  </div>
                  <div className="truncate">
                    <div className="text-sm font-bold text-white group-hover:text-cinema-amber transition-colors truncate">
                      {ch.name}
                    </div>
                  </div>
                </div>

                {/* Programs Blocks */}
                <div className="flex-1 overflow-x-auto scrollbar-hide flex items-center relative py-1">
                  <div className="flex min-w-max h-12">
                    {programs.length === 0 ? (
                      <div className="text-xs text-gray-500 italic pl-4 flex items-center">
                        Schedule unpopulated
                      </div>
                    ) : (
                      programs.map((item, pIdx) => {
                        const start = new Date(item.startTime).getTime();
                        const end = new Date(item.endTime).getTime();
                        const durMins = Math.max(2, (end - start) / 60000);
                        const calculatedWidth = durMins * MINUTE_WIDTH;
                        // Enforce a sensible minimum width of 32px so the item is clickable and doesn't collapse
                        const widthPx = Math.max(32, calculatedWidth);

                        // Check if this program is currently broadcasting "live"
                        const isLiveNow = Date.now() >= start && Date.now() <= end;

                        // Layout configuration based on cell width
                        const isUltraNarrow = widthPx < 55;
                        const isMedium = widthPx >= 55 && widthPx < 115;

                        let paddingClass = "p-2.5";
                        if (isUltraNarrow) {
                          paddingClass = "p-1";
                        } else if (isMedium) {
                          paddingClass = "py-1.5 px-2";
                        }

                        return (
                          <div
                            key={pIdx}
                            onClick={() => onSelectChannel(ch)}
                            className={`group h-full border border-cinema-border/40 hover:border-cinema-amber/60 rounded-lg mx-0.5 flex flex-col justify-between shrink-0 cursor-pointer select-none transition-all overflow-hidden min-w-0 ${paddingClass} ${
                              isLiveNow
                                ? "bg-cinema-amber/10 border-cinema-amber/40 shadow-[inset_0_0_8px_rgba(217,119,6,0.15)]"
                                : "bg-black/20 hover:bg-white/5"
                            }`}
                            style={{ width: `${widthPx}px` }}
                            title={`${item.program.title} (${Math.round(durMins)} mins)`}
                          >
                            {isUltraNarrow ? (
                              <div className="flex items-center justify-center h-full w-full">
                                {isLiveNow ? (
                                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                ) : (
                                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 group-hover:bg-zinc-400 transition-colors" />
                                )}
                              </div>
                            ) : isMedium ? (
                              <div className="flex flex-col justify-center h-full w-full min-w-0">
                                <span className="text-[10px] font-bold text-white leading-snug truncate block min-w-0">
                                  {isLiveNow && <span className="text-red-500 font-extrabold mr-1">●</span>}
                                  {item.program.title}
                                </span>
                                <span className="text-[9px] text-gray-400 truncate block">
                                  {Math.round(durMins)}m
                                </span>
                              </div>
                            ) : (
                              <>
                                <span className="text-xs font-bold text-white leading-tight truncate block min-w-0" title={item.program.title}>
                                  {item.program.title}
                                </span>
                                <div className="flex items-center gap-1 text-[9px] text-gray-400 min-w-0 truncate">
                                  {isLiveNow && (
                                    <span className="text-red-500 font-extrabold flex items-center gap-0.5 animate-pulse mr-1 shrink-0">
                                      ● LIVE
                                    </span>
                                  )}
                                  <span className="shrink-0">
                                    {formatTimeSafe(item.startTime)}
                                  </span>
                                  <span className="shrink-0">•</span>
                                  <span className="truncate">{Math.round(durMins)} mins</span>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
