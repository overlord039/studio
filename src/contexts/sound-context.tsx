
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const SFX_MUTED_KEY = 'housiehub-sfx-muted';
const BGM_ENABLED_KEY = 'housiehub-bgm-enabled';

const ALL_SOUND_EFFECTS = [
    'buy.mp3',
    'cards.mp3',
    'error.wav',
    'gameover.wav',
    'gamestarting.wav',
    'marking number.wav',
    'notification.wav',
    'start.wav',
    'win.wav'
];

interface SoundContextType {
  isSfxMuted: boolean;
  toggleSfxMute: () => void;
  isBgmEnabled: boolean;
  toggleBgm: () => void;
  playSound: (soundFile: string) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [isSfxMuted, setIsSfxMuted] = useState(false);
  const [isBgmEnabled, setIsBgmEnabled] = useState(true);
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Preload all sound effects on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
        ALL_SOUND_EFFECTS.forEach(soundFile => {
            const audio = new Audio(`/${soundFile}`);
            audio.preload = 'auto';
            audio.load();
            audioCache.current.set(soundFile, audio);
        });
    }
  }, []);

  useEffect(() => {
    try {
      const storedSfxMuteState = localStorage.getItem(SFX_MUTED_KEY);
      if (storedSfxMuteState !== null) {
        setIsSfxMuted(storedSfxMuteState === 'true');
      }
      const storedBgmEnabledState = localStorage.getItem(BGM_ENABLED_KEY);
      if (storedBgmEnabledState !== null) {
        setIsBgmEnabled(storedBgmEnabledState === 'true');
      }
    } catch (error) {
      console.error("Could not read sound settings from localStorage", error);
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

  const playSound = useCallback((soundFile: string) => {
    if (isSfxMuted) return;

    const audio = audioCache.current.get(soundFile);
    if (audio) {
        audio.currentTime = 0; // Rewind to start
        audio.volume = 0.5;
        audio.play().catch(error => {
            console.warn(`Sound playback for "${soundFile}" was prevented by the browser.`, error);
        });
    } else {
        console.warn(`Sound "${soundFile}" not found in cache.`);
    }
  }, [isSfxMuted]);


  const value = React.useMemo(() => ({ 
    isSfxMuted, 
    toggleSfxMute,
    isBgmEnabled,
    toggleBgm,
    playSound
  }), [isSfxMuted, toggleSfxMute, isBgmEnabled, toggleBgm, playSound]);

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
