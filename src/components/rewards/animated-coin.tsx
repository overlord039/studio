
"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AnimatedCoinProps {
  id: number;
  onAnimationEnd: (id: number) => void;
  isDeduction?: boolean;
}

export default function AnimatedCoin({ id, onAnimationEnd, isDeduction = false }: AnimatedCoinProps) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    // Animation logic for coin deduction (spending)
    if (isDeduction) {
        const startX = 5 + Math.random() * 10; // Start from top-left
        const startY = 5 + Math.random() * 5; 
        const endX = 50 + (Math.random() - 0.5) * 40; // End near center
        const endY = 50 + (Math.random() - 0.5) * 20; 
        const duration = 1 + Math.random() * 0.5;
        const delay = Math.random() * 0.5;
        const rotation = (Math.random() - 0.5) * 360;

        // Set initial style (top-left)
        setStyle({
            left: `${startX}%`,
            top: `${startY}%`,
            transition: `all ${duration}s cubic-bezier(0.5, 0, 0.75, 0.75) ${delay}s`,
            transform: 'scale(1)',
        });

        // After a short delay, set the target style to animate to
        const timeoutId = setTimeout(() => {
            setStyle(prevStyle => ({
                ...prevStyle,
                left: `${endX}%`,
                top: `${endY}%`,
                transform: `rotate(${rotation}deg) scale(0.5)`,
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

    // Original animation logic for coin reward (gaining)
    } else {
        const startX = Math.random() * 80 + 10;
        const endY = -200 - Math.random() * 100;
        const duration = 1.5 + Math.random();
        const delay = Math.random() * 0.5;
        const rotation = (Math.random() - 0.5) * 720;

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
    }
  }, [id, onAnimationEnd, isDeduction]);

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
