
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SFX_MUTED_KEY = 'housiehub-sfx-muted';
const BGM_ENABLED_KEY = 'housiehub-bgm-enabled';

interface SoundContextType {
  isSfxMuted: boolean;
  toggleSfxMute: () => void;
  isBgmEnabled: boolean;
  toggleBgm: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [isSfxMuted, setIsSfxMuted] = useState(true); // Default to muted on server
  const [isBgmEnabled, setIsBgmEnabled] = useState(false); // Default to disabled on server

  useEffect(() => {
    // This effect runs only on the client
    try {
      const storedSfxMuteState = localStorage.getItem(SFX_MUTED_KEY);
      // Default to not muted if nothing is stored
      setIsSfxMuted(storedSfxMuteState === 'true');

      const storedBgmEnabledState = localStorage.getItem(BGM_ENABLED_KEY);
      // Default to disabled (false) if nothing is stored
      setIsBgmEnabled(storedBgmEnabledState === 'true');

    } catch (error) {
      console.error("Could not read sound settings from localStorage", error);
      // Sensible defaults on error
      setIsSfxMuted(false); 
      setIsBgmEnabled(false);
    }
  }, []);

  const toggleSfxMute = useCallback(() => {
    setIsSfxMuted(prevMuted => {
      const newMutedState = !prevMuted;
      try {
        localStorage.setItem(SFX_MUTED_KEY, String(newMutedState));
      } catch (error) {
        console.error("Could not save SFX mute settings to localStorage", error);
      }
      return newMutedState;
    });
  }, []);

  const toggleBgm = useCallback(() => {
    setIsBgmEnabled(prevEnabled => {
        const newEnabledState = !prevEnabled;
        try {
            localStorage.setItem(BGM_ENABLED_KEY, String(newEnabledState));
        } catch (error) {
            console.error("Could not save BGM settings to localStorage", error);
        }
        return newEnabledState;
    });
  }, []);

  const value = React.useMemo(() => ({ 
    isSfxMuted, 
    toggleSfxMute,
    isBgmEnabled,
    toggleBgm
  }), [isSfxMuted, toggleSfxMute, isBgmEnabled, toggleBgm]);

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
