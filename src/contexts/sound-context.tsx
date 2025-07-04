
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
  const [isSfxMuted, setIsSfxMuted] = useState(false); // Default to not muted (SFX on)
  const [isBgmEnabled, setIsBgmEnabled] = useState(true); // Default to enabled (BGM on)

  useEffect(() => {
    // This effect runs only on the client to sync with localStorage
    try {
      // For SFX: default is ON (muted is false). This is set if localStorage is empty.
      const storedSfxMuteState = localStorage.getItem(SFX_MUTED_KEY);
      setIsSfxMuted(storedSfxMuteState === 'true');

      // For BGM: default is ON (enabled is true). This is set if localStorage is empty.
      const storedBgmEnabledState = localStorage.getItem(BGM_ENABLED_KEY);
      setIsBgmEnabled(storedBgmEnabledState !== 'false');

    } catch (error) {
      console.error("Could not read sound settings from localStorage", error);
      // On error, the component will use the default useState values: SFX on, BGM on.
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
