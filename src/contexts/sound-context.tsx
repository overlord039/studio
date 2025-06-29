"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LOCAL_STORAGE_KEY = 'housiehub-sound-muted';

interface SoundContextType {
  isMuted: boolean;
  toggleMute: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(true); // Default to muted until client loads
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedMuteState = localStorage.getItem(LOCAL_STORAGE_KEY);
      // Default to not muted if no setting is found
      setIsMuted(storedMuteState === 'true');
    } catch (error) {
      console.error("Could not read sound settings from localStorage", error);
      setIsMuted(false); // Default to not muted on error
    }
    setHasLoaded(true);
  }, []);

  const toggleMute = useCallback(() => {
    if (!hasLoaded) return;
    setIsMuted(prevMuted => {
      const newMutedState = !prevMuted;
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, String(newMutedState));
      } catch (error) {
        console.error("Could not save sound settings to localStorage", error);
      }
      return newMutedState;
    });
  }, [hasLoaded]);

  const value = React.useMemo(() => ({ isMuted: hasLoaded ? isMuted : true, toggleMute }), [isMuted, toggleMute, hasLoaded]);

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
}
