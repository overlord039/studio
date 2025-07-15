
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
  // Default to SFX on (not muted) and BGM on. Client-side useEffect will override this.
  const [isSfxMuted, setIsSfxMuted] = useState(false);
  const [isBgmEnabled, setIsBgmEnabled] = useState(true);

  useEffect(() => {
    // This effect runs only on the client to sync with localStorage
    try {
      // For SFX: default is ON (muted is false). We check if a setting is stored.
      const storedSfxMuteState = localStorage.getItem(SFX_MUTED_KEY);
      if (storedSfxMuteState !== null) {
        setIsSfxMuted(storedSfxMuteState === 'true');
      }

      // For BGM: default is ON (enabled is true). We check if a setting is stored.
      const storedBgmEnabledState = localStorage.getItem(BGM_ENABLED_KEY);
      if (storedBgmEnabledState !== null) {
        setIsBgmEnabled(storedBgmEnabledState === 'true');
      }

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
