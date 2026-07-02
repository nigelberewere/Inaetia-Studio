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
import SetupWizard from "./components/SetupWizard";

function MainLayout() {
  const { 
    activeView, 
    currentVideo, 
    currentProfile, 
    setupComplete, 
    setupLoading, 
    themeColor 
  } = useApp();

  if (setupLoading) {
    return (
      <div className="min-h-screen bg-[#080810] text-cinema-text flex flex-col justify-center items-center font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-400"></div>
        <p className="mt-4 text-[10px] font-mono tracking-widest text-zinc-500 uppercase animate-pulse">
          Starting Inaetia Studios...
        </p>
      </div>
    );
  }

  if (!setupComplete) {
    return <SetupWizard />;
  }

  if (!currentProfile) {
    return (
      <div style={{ "--color-cinema-amber": themeColor } as any}>
        <WhosWatching />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-cinema-bg text-cinema-text flex flex-col font-sans selection:bg-cinema-amber selection:text-cinema-bg"
      style={{ "--color-cinema-amber": themeColor } as any}
    >
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
