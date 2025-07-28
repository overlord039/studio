
"use client";

// This file is now a proxy for the useSound hook.
// The actual playSound implementation is now in the SoundContext
// to allow for pre-loading and caching of audio files.

/**
 * DEPRECATED: Plays a sound file from the /public directory.
 * This function is kept for backward compatibility in existing components,
 * but it's recommended to use the `playSound` function from the `useSound` hook instead.
 *
 * @param soundFile The path to the sound file (e.g., 'win.wav').
 */
export function playSound(soundFile: string) {
    if (typeof window !== 'undefined') {
        // Dispatch a custom event that the SoundProvider can listen to.
        // This is a workaround to call the context's function from outside a React component.
        const event = new CustomEvent('playSound', { detail: soundFile });
        window.dispatchEvent(event);
    }
}
