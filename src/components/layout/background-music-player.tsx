"use client";

import { useEffect, useRef, useState } from 'react';
import { useSound } from '@/contexts/sound-context';

export default function BackgroundMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isMuted } = useSound();
  const [hasInteracted, setHasInteracted] = useState(false);

  // This effect will run on the client after hydration, and when isMuted changes.
  // It syncs the audio element's muted property with our context state.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // This effect handles playing the audio after the first user interaction.
  useEffect(() => {
    const audio = audioRef.current;
    if (hasInteracted && audio && audio.paused) {
      // The play() method returns a promise which can be rejected if autoplay is blocked.
      audio.play().catch(error => {
        console.warn("Background music playback was prevented by the browser:", error);
      });
    }
  }, [hasInteracted]);
  
  // This effect sets up a one-time listener for the user's first interaction.
  useEffect(() => {
    const handleFirstInteraction = () => {
      setHasInteracted(true);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    // Listen for click or keydown to trigger the music.
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    return () => {
      // Cleanup listeners when the component unmounts.
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []); // Empty dependency array means this runs only once on mount.

  // The audio element is rendered but not played until user interaction.
  // We don't use the `autoPlay` attribute to avoid browser blocking issues.
  // The `muted` property is controlled via useEffect to avoid hydration issues.
  return (
    <audio ref={audioRef} src="/bgm.mp3" loop />
  );
}
