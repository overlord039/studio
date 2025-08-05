
"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AnimatedCoinProps {
  id: number;
  onAnimationEnd: (id: number) => void;
}

export default function AnimatedCoin({ id, onAnimationEnd }: AnimatedCoinProps) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    // Randomize starting position and animation trajectory
    const startX = Math.random() * 80 + 10; // % of width
    const endY = -200 - Math.random() * 100; // end position above the screen
    const duration = 1.5 + Math.random(); // seconds
    const delay = Math.random() * 0.5; // seconds
    const rotation = (Math.random() - 0.5) * 720; // degrees

    setStyle({
      left: `${startX}%`,
      bottom: '-10%',
      transition: `transform ${duration}s cubic-bezier(0.5, 1, 0.89, 1) ${delay}s, opacity ${duration * 0.5}s linear ${delay + duration * 0.5}s`,
      transform: 'scale(0.8)',
    });

    const timeoutId = setTimeout(() => {
      setStyle(prevStyle => ({
        ...prevStyle,
        transform: `translateY(${endY}px) rotate(${rotation}deg) scale(0.5)`,
        opacity: 0,
      }));
    }, 50);

    const animationEndTimeoutId = setTimeout(() => {
      onAnimationEnd(id);
    }, (duration + delay) * 1000 + 100);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(animationEndTimeoutId);
    };
  }, [id, onAnimationEnd]);

  return (
    <div
      className="absolute z-[100] pointer-events-none"
      style={style}
    >
      <Image
        src="/coin.png"
        alt="coin"
        width={28}
        height={28}
        className="drop-shadow-lg"
      />
    </div>
  );
}
