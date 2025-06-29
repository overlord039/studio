
"use client";

import { useEffect, useRef, useState } from 'react';
import { useSound } from '@/contexts/sound-context';

export default function BackgroundMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isBgmEnabled } = useSound();
  const [hasInteracted, setHasInteracted] = useState(false);

  // Set volume once the audio element is available.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.5;
    }
  }, []);

  // This effect handles playing/pausing the audio based on the context and user interaction.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // We only try to play if BGM is enabled AND the user has interacted with the page.
    if (isBgmEnabled && hasInteracted) {
      // The play() method returns a promise which can be rejected if autoplay is blocked.
      audio.play().catch(error => {
        console.warn("Background music playback was prevented by the browser:", error);
      });
    } else {
      // If BGM is disabled or no interaction yet, we ensure it's paused.
      audio.pause();
    }
  }, [isBgmEnabled, hasInteracted]);
  
  // This effect sets up a one-time listener for the user's first interaction.
  useEffect(() => {
    const handleFirstInteraction = () => {
      setHasInteracted(true);
    };

    // Listen for click or keydown to trigger the music.
    // The `once: true` option automatically removes the listener after it's called.
    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      // Cleanup listeners if component unmounts before interaction.
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []); // Empty dependency array means this runs only once on mount.

  // The audio element is rendered but not played until user interaction and isBgmEnabled is true.
  // We don't use the `autoPlay` attribute to avoid browser blocking issues.
  return (
    <audio ref={audioRef} src="/bgm.mp3" loop />
  );
}
