import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Movie, Track, ServerStatus, SearchResults, Profile, WatchHistoryItem } from "../types";

export type ViewType = "home" | "movies" | "music" | "livetv" | "settings" | "search";

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<ViewType>("home");
  
  // Profile system states
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState<boolean>(true);
  const [continueWatching, setContinueWatching] = useState<WatchHistoryItem[]>([]);

  // Fetch all profiles
  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const res = await fetch("/api/profiles");
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

  // Create a new profile
  const createProfile = async (name: string, color: string, avatar: string): Promise<Profile> => {
    const res = await fetch("/api/profiles", {
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
    const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
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
    const res = await fetch(`/api/profiles/${currentProfile.id}/history`, { method: "DELETE" });
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
      const res = await fetch(`/api/profiles/${currentProfile.id}/continue`);
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

  // Server Status
  const [status, setStatus] = useState<ServerStatus | null>(null);

  const loadMovies = async (force = false) => {
    if (moviesLoaded && !force) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/movies");
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
      const res = await fetch("/api/music");
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
          fetch("/api/movies"),
          fetch("/api/music"),
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
      const res = await fetch("/api/status");
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
      const res = await fetch("/api/rescan", { method: "POST" });
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
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
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

  // Initial loads
  useEffect(() => {
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
