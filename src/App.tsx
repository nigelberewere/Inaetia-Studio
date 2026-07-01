import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Movies from "./pages/Movies";
import Music from "./pages/Music";
import LiveTV from "./pages/LiveTV";
import Radio from "./pages/Radio";
import RadioGuide from "./pages/RadioGuide";
import Settings from "./pages/Settings";
import SearchResults from "./components/SearchResults";
import MusicPlayer from "./components/MusicPlayer";
import RadioPlayer from "./components/RadioPlayer";
import RadioAudioEngine from "./components/RadioAudioEngine";
import VideoPlayer from "./components/VideoPlayer";
import WhosWatching from "./components/WhosWatching";

function MainLayout() {
  const { activeView, currentVideo, currentProfile } = useApp();

  if (!currentProfile) {
    return <WhosWatching />;
  }

  return (
    <div className="min-h-screen bg-cinema-bg text-cinema-text flex flex-col font-sans selection:bg-cinema-amber selection:text-cinema-bg">
      {/* Navigation Header */}
      <Navbar />

      {/* Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 md:py-8">
        {activeView === "home" && <Home />}
        {activeView === "movies" && <Movies />}
        {activeView === "music" && <Music />}
        {activeView === "livetv" && <LiveTV />}
        {activeView === "radio" && <Radio />}
        {activeView === "radioguide" && <RadioGuide />}
        {activeView === "settings" && <Settings />}
        {activeView === "search" && <SearchResults />}
      </main>

      {/* Persistent Mini Audio Playbar */}
      <MusicPlayer />

      {/* Persistent Headless Radio Audio Tag */}
      <RadioAudioEngine />

      {/* Persistent Mini Radio Playbar */}
      <RadioPlayer />

      {/* Fullscreen Cinematic Video Player Overlay */}
      {currentVideo && <VideoPlayer movie={currentVideo} />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
