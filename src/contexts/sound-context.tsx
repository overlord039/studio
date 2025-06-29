
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
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    try {
      const storedMuteState = localStorage.getItem(LOCAL_STORAGE_KEY);
      // On the client, set the actual state from localStorage. Default to un-muted (false) if nothing is stored.
      setIsMuted(storedMuteState === 'true');
    } catch (error) {
      console.error("Could not read sound settings from localStorage", error);
      setIsMuted(false); // Default to not muted on error
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prevMuted => {
      const newMutedState = !prevMuted;
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, String(newMutedState));
      } catch (error) {
        console.error("Could not save sound settings to localStorage", error);
      }
      return newMutedState;
    });
  }, []);

  const value = React.useMemo(() => ({ isMuted, toggleMute }), [isMuted, toggleMute]);

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
