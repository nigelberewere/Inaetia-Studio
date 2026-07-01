import React, { useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";

export default function RadioAudioEngine() {
  const { 
    activeStation, 
    isPlayingRadio, 
    radioTrack, 
    radioOffsetSeconds, 
    radioVolume,
    tuneToStation,
    setIsPlayingRadio
  } = useApp();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackIdRef = useRef<string | null>(null);

  // Sync volume with active state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = radioVolume;
    }
  }, [radioVolume]);

  // Handle play/pause, source changes, and seeking to current UTC live offset
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlayingRadio && activeStation && radioTrack) {
      const streamUrl = `/api/radio/stations/${activeStation.id}/stream?_t=${Date.now()}`;
      
      const isCurrentStationStream = audio.src.includes(`/api/radio/stations/${activeStation.id}/stream`);
      const isSameTrack = currentTrackIdRef.current === radioTrack.id;
      
      if (!isCurrentStationStream || !isSameTrack) {
        currentTrackIdRef.current = radioTrack.id;
        audio.src = streamUrl;
        audio.load();
        
        const handleCanPlay = () => {
          // Seek to live position
          audio.currentTime = radioOffsetSeconds;
          audio.play().catch(err => {
            console.error("Autoplay/Play blocked or failed:", err);
            setIsPlayingRadio(false);
          });
          audio.removeEventListener("canplay", handleCanPlay);
        };
        audio.addEventListener("canplay", handleCanPlay);
      } else {
        if (audio.paused) {
          audio.play().catch(err => {
            console.error("Failed to resume playback:", err);
            setIsPlayingRadio(false);
          });
        }
      }
    } else {
      audio.pause();
    }
  }, [isPlayingRadio, activeStation, radioTrack, radioOffsetSeconds, setIsPlayingRadio]);

  // When track ends, transition to the next track on the station
  const handleEnded = async () => {
    if (!activeStation) return;
    try {
      // Re-tune to current station to synchronize track and offset
      await tuneToStation(activeStation.id);
      
      // Dispatch custom event to notify bottom player/toast
      window.dispatchEvent(new CustomEvent("radio-toast-notify", {
        detail: {
          title: "Track Transitioned",
          message: "Transitioning to next live track..."
        }
      }));
    } catch (err) {
      console.error("Error handling track transition:", err);
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    window.dispatchEvent(new CustomEvent("radio-timeupdate", {
      detail: {
        currentTime: audio.currentTime,
        duration: audio.duration || 0
      }
    }));
  };

  return (
    <audio
      ref={audioRef}
      onEnded={handleEnded}
      onTimeUpdate={handleTimeUpdate}
      preload="none"
      style={{ display: "none" }}
    />
  );
}
