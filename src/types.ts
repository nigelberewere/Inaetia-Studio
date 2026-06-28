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

export interface Photo {
  id: string;
  filename: string;
  filepath: string;
  thumbnail: string;
  size: number;
  date: string;
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
  photos: number;
}

export interface SearchResults {
  movies: Movie[];
  music: Track[];
  photos: Photo[];
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

