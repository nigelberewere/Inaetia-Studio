import React, { useRef, useState, useEffect } from "react";
import { useApp, ViewType } from "../context/AppContext";
import { Search, Film, Music as MusicIcon, Tv as TvIcon, Settings, X, Users, Trash2, Radio as RadioIcon } from "lucide-react";
import { ProfileAvatar } from "./ProfileAvatar";

export default function Navbar() {
  const {
    activeView,
    setActiveView,
    searchQuery,
    setSearchQuery,
    currentProfile,
    setCurrentProfile,
    clearProfileHistory,
  } = useApp();

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [prevView, setPrevView] = useState<ViewType>("home");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowConfirmClear(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Track previous view to return to it if search is cleared
  useEffect(() => {
    if (activeView !== "search" && activeView !== "settings") {
      setPrevView(activeView);
    }
  }, [activeView]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim() && activeView !== "search") {
      setActiveView("search");
    } else if (!val.trim() && activeView === "search") {
      setActiveView(prevView);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    if (activeView === "search") {
      setActiveView(prevView);
    }
  };

  return (
    <nav className="sticky top-0 z-40 bg-cinema-bg/95 backdrop-blur-md border-b border-cinema-border px-4 md:px-8 py-3 flex items-center justify-between">
      {/* Brand Logo */}
      <div 
        className="flex items-center gap-2 cursor-pointer select-none group"
        onClick={() => {
          clearSearch();
          setActiveView("home");
        }}
        id="nav-logo"
      >
        <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-cinema-amber to-amber-600 flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-lg shadow-cinema-amber/20 group-hover:shadow-cinema-amber/30">
          <svg className="w-5 h-5 text-cinema-bg" viewBox="0 0 24 24" fill="currentColor">
            {/* Elegant cinematic stylized vertical stroke 'I' & play button */}
            <rect x="5" y="5" width="2.5" height="14" rx="0.75" />
            <path d="M10 5l9 7-9 7V5z" />
          </svg>
        </div>
        <span className="font-semibold text-lg tracking-wider hidden sm:inline-block">
          Inaetia<span className="text-cinema-amber font-light"> Studios</span>
        </span>
      </div>

      {/* Center Nav Links */}
      <div className="hidden md:flex items-center gap-1 bg-cinema-card/50 p-1 rounded-full border border-cinema-border">
        <button
          id="btn-nav-movies"
          onClick={() => { clearSearch(); setActiveView("movies"); }}
          className={`flex items-center gap-2 px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
            activeView === "movies"
              ? "bg-cinema-amber text-cinema-bg shadow-md"
              : "text-cinema-text hover:text-white hover:bg-white/5"
          }`}
        >
          <Film className="w-4 h-4" />
          Movies
        </button>
        <button
          id="btn-nav-livetv"
          onClick={() => { clearSearch(); setActiveView("livetv"); }}
          className={`flex items-center gap-2 px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
            activeView === "livetv"
              ? "bg-cinema-amber text-cinema-bg shadow-md"
              : "text-cinema-text hover:text-white hover:bg-white/5"
          }`}
        >
          <TvIcon className="w-4 h-4" />
          Live TV
        </button>
        <button
          id="btn-nav-radio"
          onClick={() => { clearSearch(); setActiveView("radio"); }}
          className={`flex items-center gap-2 px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
            activeView === "radio" || activeView === "radioguide"
              ? "bg-cinema-amber text-cinema-bg shadow-md"
              : "text-cinema-text hover:text-white hover:bg-white/5"
          }`}
        >
          <RadioIcon className="w-4 h-4" />
          Radio
        </button>
        <button
          id="btn-nav-music"
          onClick={() => { clearSearch(); setActiveView("music"); }}
          className={`flex items-center gap-2 px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
            activeView === "music"
              ? "bg-cinema-amber text-cinema-bg shadow-md"
              : "text-cinema-text hover:text-white hover:bg-white/5"
          }`}
        >
          <MusicIcon className="w-4 h-4" />
          Music
        </button>
      </div>

      {/* Right Tools: Search Bar & Settings & Avatar */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 justify-end md:flex-initial">
        {/* Search Input Box */}
        <div 
          className={`relative flex items-center rounded-full bg-cinema-card border transition-all duration-300 ${
            isSearchFocused || searchQuery 
              ? "w-full max-w-[280px] sm:max-w-[320px] border-cinema-amber/40 ring-1 ring-cinema-amber/30" 
              : "w-40 sm:w-48 border-cinema-border"
          }`}
        >
          <Search className="w-4 h-4 text-cinema-muted ml-3 absolute left-0 pointer-events-none" />
          <input
            type="text"
            placeholder="Search cinema..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full pl-9 pr-8 py-1.5 bg-transparent text-sm text-cinema-text placeholder-cinema-muted focus:outline-none"
            id="navbar-search"
          />
          {searchQuery && (
            <button 
              onClick={clearSearch}
              className="absolute right-2.5 p-0.5 rounded-full hover:bg-white/10 text-cinema-muted hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Small screen navigation shortcut buttons */}
        <div className="flex md:hidden items-center gap-1.5">
          <button
            onClick={() => { clearSearch(); setActiveView("movies"); }}
            className={`p-2 rounded-full ${activeView === "movies" ? "text-cinema-amber bg-white/5" : "text-cinema-muted hover:text-cinema-text"}`}
            title="Movies"
          >
            <Film className="w-5 h-5" />
          </button>
          <button
            onClick={() => { clearSearch(); setActiveView("livetv"); }}
            className={`p-2 rounded-full ${activeView === "livetv" ? "text-cinema-amber bg-white/5" : "text-cinema-muted hover:text-cinema-text"}`}
            title="Live TV"
          >
            <TvIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => { clearSearch(); setActiveView("radio"); }}
            className={`p-2 rounded-full ${activeView === "radio" || activeView === "radioguide" ? "text-cinema-amber bg-white/5" : "text-cinema-muted hover:text-cinema-text"}`}
            title="Radio"
          >
            <RadioIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => { clearSearch(); setActiveView("music"); }}
            className={`p-2 rounded-full ${activeView === "music" ? "text-cinema-amber bg-white/5" : "text-cinema-muted hover:text-cinema-text"}`}
            title="Music"
          >
            <MusicIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Settings button */}
        <button
          onClick={() => { clearSearch(); setActiveView("settings"); }}
          className={`p-2 rounded-full border border-cinema-border transition-all hover:bg-white/5 ${
            activeView === "settings" ? "text-cinema-amber border-cinema-amber/30 bg-cinema-card" : "text-cinema-muted hover:text-white"
          }`}
          id="btn-nav-settings"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Active Profile Avatar with Dropdown */}
        {currentProfile && (
          <div className="relative" ref={dropdownRef}>
            <div 
              onClick={() => {
                setShowDropdown(!showDropdown);
                setShowConfirmClear(false);
              }}
              style={{ backgroundColor: currentProfile.color }}
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm select-none shadow-md cursor-pointer hover:brightness-110 active:scale-95 transition-all"
              title={`${currentProfile.name}'s Profile`}
              id="navbar-profile-avatar"
            >
              <ProfileAvatar avatar={currentProfile.avatar} className="w-5 h-5 text-white" />
            </div>

            {showDropdown && (
              <div 
                className="absolute right-0 mt-2 w-52 bg-cinema-card border border-cinema-border rounded-xl shadow-2xl p-1.5 z-50 animate-fade-in text-sm text-zinc-300"
                id="navbar-profile-dropdown"
              >
                {!showConfirmClear ? (
                  <>
                    <div className="px-3 py-2 border-b border-cinema-border">
                      <p className="font-bold text-white truncate">{currentProfile.name}</p>
                      <p className="text-[10px] text-cinema-muted">Active Profile</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setCurrentProfile(null);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 hover:text-white rounded-lg transition-colors flex items-center gap-2"
                      id="btn-dropdown-switch"
                    >
                      <Users className="w-4 h-4 text-cinema-amber" /> Switch Profile
                    </button>

                    <button
                      onClick={() => setShowConfirmClear(true)}
                      className="w-full text-left px-3 py-2 hover:bg-red-950/40 hover:text-red-400 rounded-lg transition-colors flex items-center gap-2 text-red-500 font-medium"
                      id="btn-dropdown-clear-history-trigger"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" /> Clear My History
                    </button>
                  </>
                ) : (
                  <div className="p-3 text-center space-y-3">
                    <p className="text-xs font-semibold text-white leading-tight">Clear all watch history for {currentProfile.name}?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await clearProfileHistory();
                          setShowConfirmClear(false);
                          setShowDropdown(false);
                        }}
                        className="flex-1 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs"
                      >
                        Yes, Clear
                      </button>
                      <button
                        onClick={() => setShowConfirmClear(false)}
                        className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
