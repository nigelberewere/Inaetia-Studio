import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Movie, Track, ServerStatus, SearchResults, Profile, WatchHistoryItem, RadioStation } from "../types";
import { safeFetch } from "../utils";

export type ViewType = "home" | "movies" | "music" | "livetv" | "settings" | "search" | "radio" | "radioguide";

interface AppContextType {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  
  // Library collections
  movies: Movie[];
  music: Track[];
  loading: boolean;
  error: string | null;
  refreshLibrary: () => Promise<void>;
  triggerRescan: () => Promise<void>;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResults;
  isSearching: boolean;

  // Video Player state
  currentVideo: Movie | null;
  setCurrentVideo: (video: Movie | null) => void;

  // Audio Player state
  currentTrack: Track | null;
  setCurrentTrack: (track: Track | null) => void;
  playingQueue: Track[];
  setPlayingQueue: (queue: Track[]) => void;
  queueIndex: number;
  setQueueIndex: (index: number) => void;
  isPlayingAudio: boolean;
  setIsPlayingAudio: (playing: boolean) => void;
  playTrack: (track: Track, queue?: Track[]) => void;
  playNextTrack: () => void;
  playPrevTrack: () => void;

  // Radio Player state
  activeStation: RadioStation | null;
  isPlayingRadio: boolean;
  radioTrack: Track | null;
  radioOffsetSeconds: number;
  radioVolume: number;
  tuneToStation: (stationId: string) => Promise<void>;
  nextStation: () => Promise<void>;
  prevStation: () => Promise<void>;
  stopRadio: () => void;
  setRadioVolume: (volume: number) => void;
  setIsPlayingRadio: (playing: boolean) => void;

  // Server stats
  status: ServerStatus | null;
  fetchStatus: () => Promise<void>;

  // Profiles
  currentProfile: Profile | null;
  setCurrentProfile: (profile: Profile | null) => void;
  profiles: Profile[];
  loadingProfiles: boolean;
  fetchProfiles: () => Promise<void>;
  createProfile: (name: string, color: string, avatar: string) => Promise<Profile>;
  deleteProfile: (id: string) => Promise<void>;
  clearProfileHistory: () => Promise<void>;
  continueWatching: WatchHistoryItem[];
  fetchContinueWatching: () => Promise<void>;

  // Setup Wizard States
  setupComplete: boolean;
  setSetupComplete: (complete: boolean) => void;
  themeColor: string;
  setThemeColor: (color: string) => void;
  appName: string;
  setAppName: (name: string) => void;
  setupLoading: boolean;
  fetchSetupStatus: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<ViewType>("home");
  
  // Setup Wizard States
  const [setupComplete, setSetupComplete] = useState<boolean>(true);
  const [themeColor, setThemeColor] = useState<string>("#F5A623");
  const [appName, setAppName] = useState<string>("Inaetia Studios");
  const [setupLoading, setSetupLoading] = useState<boolean>(true);

  // Profile system states
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState<boolean>(true);
  const [continueWatching, setContinueWatching] = useState<WatchHistoryItem[]>([]);

  // Fetch all profiles
  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const res = await safeFetch("/api/profiles");
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      }
    } catch (err) {
      console.error("Error fetching profiles:", err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const fetchSetupStatus = async () => {
    setSetupLoading(true);
    try {
      const res = await safeFetch("/api/setup/status");
      if (res.ok) {
        const data = await res.json();
        setSetupComplete(data.setupComplete);
        setThemeColor(data.themeColor || "#F5A623");
        setAppName(data.appName || "Inaetia Studios");
      }
    } catch (err) {
      console.error("Error fetching setup status:", err);
    } finally {
      setSetupLoading(false);
    }
  };

  // Create a new profile
  const createProfile = async (name: string, color: string, avatar: string): Promise<Profile> => {
    const res = await safeFetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color, avatar }),
    });
    if (!res.ok) {
      throw new Error("Failed to create profile");
    }
    const newProfile = await res.json();
    await fetchProfiles();
    return newProfile;
  };

  // Delete a profile
  const deleteProfile = async (id: string) => {
    const res = await safeFetch(`/api/profiles/${id}`, { method: "DELETE" });
    if (!res.ok) {
      throw new Error("Failed to delete profile");
    }
    await fetchProfiles();
    if (currentProfile?.id === id) {
      setCurrentProfile(null);
    }
  };

  // Clear entire watch history
  const clearProfileHistory = async () => {
    if (!currentProfile) return;
    const res = await safeFetch(`/api/profiles/${currentProfile.id}/history`, { method: "DELETE" });
    if (!res.ok) {
      throw new Error("Failed to clear watch history");
    }
    setContinueWatching([]);
    // Update active profile locally to clear history
    setCurrentProfile({
      ...currentProfile,
      watchHistory: {}
    });
  };

  // Fetch continue watching movies
  const fetchContinueWatching = async () => {
    if (!currentProfile) {
      setContinueWatching([]);
      return;
    }
    try {
      const res = await safeFetch(`/api/profiles/${currentProfile.id}/continue`);
      if (res.ok) {
        const data = await res.json();
        setContinueWatching(data);
      }
    } catch (err) {
      console.error("Error fetching continue watching list:", err);
    }
  };
  
  // Library data
  const [movies, setMovies] = useState<Movie[]>([]);
  const [music, setMusic] = useState<Track[]>([]);
  const [moviesLoaded, setMoviesLoaded] = useState<boolean>(false);
  const [musicLoaded, setMusicLoaded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchResults>({ movies: [], music: [] });
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Video Player state
  const [currentVideo, setCurrentVideo] = useState<Movie | null>(null);

  // Audio Player state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playingQueue, setPlayingQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Radio Player state
  const [activeStation, setActiveStation] = useState<RadioStation | null>(null);
  const [isPlayingRadio, setIsPlayingRadio] = useState<boolean>(false);
  const [radioTrack, setRadioTrack] = useState<Track | null>(null);
  const [radioOffsetSeconds, setRadioOffsetSeconds] = useState<number>(0);
  const [radioVolume, setRadioVolume] = useState<number>(0.8);
  const [wasRadioPlayingBeforeVideo, setWasRadioPlayingBeforeVideo] = useState<boolean>(false);

  // Server Status
  const [status, setStatus] = useState<ServerStatus | null>(null);

  const loadMovies = async (force = false) => {
    if (moviesLoaded && !force) return;
    setLoading(true);
    setError(null);
    try {
      const res = await safeFetch("/api/movies");
      if (!res.ok) throw new Error("Failed to load movies");
      const data = await res.json();
      setMovies(data);
      setMoviesLoaded(true);
    } catch (err: any) {
      console.error("Error loading movies:", err);
      setError("Failed to fetch movies. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  };

  const loadMusic = async (force = false) => {
    if (musicLoaded && !force) return;
    setLoading(true);
    setError(null);
    try {
      const res = await safeFetch("/api/music");
      if (!res.ok) throw new Error("Failed to load music");
      const data = await res.json();
      setMusic(data);
      setMusicLoaded(true);
    } catch (err: any) {
      console.error("Error loading music:", err);
      setError("Failed to fetch music. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch media on-demand based on visible screen
  const refreshLibrary = async () => {
    if (activeView === "home" || activeView === "movies") {
      await loadMovies(true);
    } else if (activeView === "music") {
      await loadMusic(true);
    } else {
      setLoading(true);
      setError(null);
      try {
        const [moviesRes, musicRes] = await Promise.all([
          safeFetch("/api/movies"),
          safeFetch("/api/music"),
        ]);
        if (moviesRes.ok) setMovies(await moviesRes.json());
        if (musicRes.ok) setMusic(await musicRes.json());
        setMoviesLoaded(true);
        setMusicLoaded(true);
      } catch (err) {
        console.error("Error refreshing library:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Fetch status
  const fetchStatus = async () => {
    try {
      const res = await safeFetch("/api/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error("Error fetching status:", err);
    }
  };

  // Trigger server scan
  const triggerRescan = async () => {
    setLoading(true);
    try {
      const res = await safeFetch("/api/rescan", { method: "POST" });
      if (res.ok) {
        await refreshLibrary();
        await fetchStatus();
      } else {
        throw new Error("Failed to trigger server-side rescan");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error scanning library: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Perform search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ movies: [], music: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await safeFetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Audio queue handlers
  const playTrack = (track: Track, queue: Track[] = []) => {
    // Pause radio if playing
    setIsPlayingRadio(false);

    setCurrentTrack(track);
    setIsPlayingAudio(true);
    
    if (queue.length > 0) {
      setPlayingQueue(queue);
      const idx = queue.findIndex((t) => t.id === track.id);
      setQueueIndex(idx);
    } else {
      setPlayingQueue([track]);
      setQueueIndex(0);
    }
  };

  const playNextTrack = () => {
    if (playingQueue.length === 0 || queueIndex === -1) return;
    const nextIdx = (queueIndex + 1) % playingQueue.length;
    setQueueIndex(nextIdx);
    setCurrentTrack(playingQueue[nextIdx]);
    setIsPlayingAudio(true);
  };

  const playPrevTrack = () => {
    if (playingQueue.length === 0 || queueIndex === -1) return;
    const prevIdx = queueIndex === 0 ? playingQueue.length - 1 : queueIndex - 1;
    setQueueIndex(prevIdx);
    setCurrentTrack(playingQueue[prevIdx]);
    setIsPlayingAudio(true);
  };

  // Radio actions
  const tuneToStation = async (stationId: string) => {
    try {
      // Pause normal music player
      setIsPlayingAudio(false);
      setCurrentTrack(null);

      const res = await safeFetch(`/api/radio/stations/${stationId}/now`);
      if (res.ok) {
        const data = await res.json();
        setActiveStation(data.station);
        setRadioTrack(data.currentTrack);
        setRadioOffsetSeconds(data.offsetSeconds);
        setIsPlayingRadio(true);
      } else {
        console.error("Failed to tune to station", stationId);
      }
    } catch (err) {
      console.error("Error tuning to radio station:", err);
    }
  };

  const nextStation = async () => {
    if (!activeStation) return;
    try {
      const res = await safeFetch("/api/radio/stations");
      if (res.ok) {
        const stations: RadioStation[] = await res.json();
        const currentIndex = stations.findIndex(s => s.id === activeStation.id);
        if (currentIndex !== -1) {
          const nextIndex = (currentIndex + 1) % stations.length;
          await tuneToStation(stations[nextIndex].id);
        }
      }
    } catch (err) {
      console.error("Error cycling to next station:", err);
    }
  };

  const prevStation = async () => {
    if (!activeStation) return;
    try {
      const res = await safeFetch("/api/radio/stations");
      if (res.ok) {
        const stations: RadioStation[] = await res.json();
        const currentIndex = stations.findIndex(s => s.id === activeStation.id);
        if (currentIndex !== -1) {
          const prevIndex = currentIndex === 0 ? stations.length - 1 : currentIndex - 1;
          await tuneToStation(stations[prevIndex].id);
        }
      }
    } catch (err) {
      console.error("Error cycling to prev station:", err);
    }
  };

  const stopRadio = () => {
    setActiveStation(null);
    setIsPlayingRadio(false);
    setRadioTrack(null);
    setRadioOffsetSeconds(0);
  };

  // Video playback auto-pause/resume handler
  useEffect(() => {
    if (currentVideo && isPlayingRadio) {
      setIsPlayingRadio(false);
      setWasRadioPlayingBeforeVideo(true);
    } else if (!currentVideo && wasRadioPlayingBeforeVideo) {
      setWasRadioPlayingBeforeVideo(false);
      if (activeStation) {
        tuneToStation(activeStation.id);
      }
    }
  }, [currentVideo, isPlayingRadio, wasRadioPlayingBeforeVideo, activeStation]);

  // Initial loads
  useEffect(() => {
    fetchSetupStatus();
    fetchStatus();
    fetchProfiles();
  }, []);

  // Automatically fetch data on demand based on current profile and active view
  useEffect(() => {
    if (!currentProfile) return;

    if (activeView === "home" || activeView === "movies") {
      loadMovies();
    } else if (activeView === "music") {
      loadMusic();
    }
  }, [currentProfile, activeView]);

  useEffect(() => {
    fetchContinueWatching();
  }, [currentProfile]);

  return (
    <AppContext.Provider
      value={{
        activeView,
        setActiveView,
        movies,
        music,
        loading,
        error,
        refreshLibrary,
        triggerRescan,
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        currentVideo,
        setCurrentVideo,
        currentTrack,
        setCurrentTrack,
        playingQueue,
        setPlayingQueue,
        queueIndex,
        setQueueIndex,
        isPlayingAudio,
        setIsPlayingAudio,
        playTrack,
        playNextTrack,
        playPrevTrack,
        activeStation,
        isPlayingRadio,
        radioTrack,
        radioOffsetSeconds,
        radioVolume,
        tuneToStation,
        nextStation,
        prevStation,
        stopRadio,
        setRadioVolume,
        setIsPlayingRadio,
        status,
        fetchStatus,
        currentProfile,
        setCurrentProfile,
        profiles,
        loadingProfiles,
        fetchProfiles,
        createProfile,
        deleteProfile,
        clearProfileHistory,
        continueWatching,
        fetchContinueWatching,
        setupComplete,
        setSetupComplete,
        themeColor,
        setThemeColor,
        appName,
        setAppName,
        setupLoading,
        fetchSetupStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
