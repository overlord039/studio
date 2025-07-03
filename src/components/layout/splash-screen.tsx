'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function SplashScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Check sessionStorage only on the client
    if (sessionStorage.getItem('splashShown')) {
      setShowSplash(false);
      return;
    }

    // If not shown before, show it and set a timer to hide it
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      // After fade out animation (500ms), hide completely
      setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem('splashShown', 'true');
      }, 500);
    }, 5000); // Splash screen duration

    return () => clearTimeout(timer);
  }, []);

  if (!showSplash) {
    return null;
  }

  return (
    <div
      className={cn(
        'splash-screen fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-[#121212] to-[#0a0a23] transition-opacity duration-500 ease-in-out',
        isFadingOut ? 'opacity-0' : 'opacity-100'
      )}
    >
      <div className="text-center animate-splash-entry">
        <Image
          src="/applogo.png" // Assumes applogo.png is in the /public directory
          alt="HousieHub Logo"
          width={250}
          height={250}
          className="mx-auto h-auto w-[150px] md:w-[250px]"
          priority
        />
        <div className="mt-4 animate-fade-in-delay-1 flex items-center justify-center gap-2">
          <p className="text-sm text-neutral-400">Powered by</p>
          <Image
            src="/logonew.png"
            alt="HousieHub Logo"
            width={80}
            height={22}
            className="h-auto"
          />
        </div>
        <p className="mt-8 text-lg text-neutral-300 animate-fade-in-delay-2 tracking-widest">
          Loading<span className="animate-dot-1">.</span><span className="animate-dot-2">.</span><span className="animate-dot-3">.</span>
        </p>
      </div>
    </div>
  );
}
