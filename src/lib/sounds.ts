
"use client";

const SFX_MUTED_KEY = 'housiehub-sfx-muted';

/**
 * Plays a sound file from the /public directory, respecting the user's mute preference.
 * @param soundFile The path to the sound file (e.g., 'win.wav').
 */
export function playSound(soundFile: string) {
  if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
    try {
        const isMuted = localStorage.getItem(SFX_MUTED_KEY) === 'true';
        if (isMuted) {
            return;
        }
    } catch (error) {
        console.warn("Could not check sound preference from localStorage. Sound will be played by default.", error);
    }
    
    const audio = new Audio(`/${soundFile}`);
    audio.volume = 0.5; // Set volume to 50%
    audio.play().catch(error => {
        // This error is common in browsers that block autoplay.
        // It's not critical, so we'll log it as a warning.
        console.warn(`Sound playback for "${soundFile}" was prevented by the browser. This can happen if the user hasn't interacted with the page yet. Error:`, error);
    });
  }
}
