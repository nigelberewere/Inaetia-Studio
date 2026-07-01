export interface Movie {
  id: string;
  title: string;
  filename: string;
  filepath: string;
  size: number;
  duration: number;
  thumbnail: string;
  extension: string;
  added: string;
  category?: string;
  subcategory?: string;
  type?: "movie" | "episode" | "video";
  showName?: string;
  seasonName?: string;
  episodeTitle?: string;
  hasSubtitles?: boolean;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  filename: string;
  filepath: string;
  duration: number;
  size: number;
}

export interface StorageInfo {
  total: number;
  used: number;
  free: number;
}

export interface ServerStatus {
  uptime: number;
  storage: StorageInfo;
  movies: number;
  music: number;
}

export interface SearchResults {
  movies: Movie[];
  music: Track[];
}

export interface Channel {
  id: string;
  name: string;
  color: string;
  channelNumber: number;
  sourceFolder: string;
  currentProgram: {
    id: string;
    title: string;
    filename: string;
    duration: number;
    startedAt: string;
    endsAt: string;
    offsetSeconds: number;
  } | null;
}

export interface ChannelProgram {
  id: string;
  title: string;
  filename: string;
  duration: number;
}

export interface EPGItem {
  program: ChannelProgram;
  startTime: string; // ISO timestamp
  endTime: string;   // ISO timestamp
}

export interface WatchHistoryDetails {
  position: number;
  duration: number;
  lastWatched: string;
  completed: boolean;
}

export interface WatchHistoryItem extends WatchHistoryDetails {
  movieId: string;
  movie: Movie | null;
  id?: string;
  title?: string;
  filename?: string;
  filepath?: string;
  size?: number;
  thumbnail?: string;
  extension?: string;
  added?: string;
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  color: string;
  createdAt: string;
  watchHistory: Record<string, WatchHistoryDetails>;
  preferences: {
    defaultSort: string;
    defaultView: string;
  };
}

export interface RadioStation {
  id: string;
  name: string;
  stationNumber: number;
  color: string;
  type: "smart" | "folder";
  sourceFolder?: string;
  trackCount: number;
  currentTrack: Track | null;
  nowPlayingArtist: string;
  nowPlayingTitle: string;
}

export interface RadioNowPlaying {
  station: RadioStation;
  currentTrack: Track;
  offsetSeconds: number;
  startedAt: string;
  endsAt: string;
  nextTrack: {
    title: string;
    artist: string;
    startsAt: string;
  } | null;
  progress: number;
}

export interface RadioEPGItem {
  track: Track;
  startTime: string; // ISO
  endTime: string;   // ISO
}


