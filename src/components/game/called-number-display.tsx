
"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface CalledNumberDisplayProps {
  currentNumber: number | null;
  calledNumbers: number[];
  isMuted: boolean;
  onToggleMute: () => void;
  animationKey: number;
}

export default function CalledNumberDisplay({ currentNumber, calledNumbers, isMuted, onToggleMute, animationKey }: CalledNumberDisplayProps) {
  const recentThree = calledNumbers.slice(0, 3);
  const displayNumbers: (number | null)[] = [...recentThree];
  while (displayNumbers.length < 3) {
    displayNumbers.push(null);
  }

  return (
    <Card className="shadow-lg bg-primary text-primary-foreground overflow-hidden">
      <CardContent className="p-4 flex items-end justify-center gap-6">
        <div className="flex flex-col items-center text-center">
          <p className="text-xs uppercase tracking-wider mb-2">Called Number</p>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleMute}
              className="text-primary-foreground hover:bg-primary/80 h-8 w-8"
              aria-label={isMuted ? "Unmute voice" : "Mute voice"}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
            <div key={`current-${animationKey}`} className="relative size-20">
              <div className={cn("flex items-center justify-center size-20 rounded-full border-4 shadow-lg", currentNumber !== null ? "bg-card text-card-foreground border-primary-foreground/50 animate-scale-in-pop" : "bg-card/50 text-card-foreground/70 border-dashed border-primary-foreground/20")}>
                <span className="text-4xl font-extrabold">{currentNumber ?? '-'}</span>
              </div>
              {currentNumber !== null && (
                <svg key={`progress-${animationKey}`} className="absolute inset-0 size-20 -rotate-90">
                  <circle
                    r="34"
                    cx="40"
                    cy="40"
                    fill="transparent"
                    stroke="hsl(var(--accent))"
                    strokeWidth="4"
                    strokeDasharray="214"
                    strokeDashoffset="214"
                    className="animate-progress-ring"
                  ></circle>
                </svg>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-xs uppercase tracking-wider mb-2">Recent</p>
          <div key={`recent-${animationKey}`} className="flex items-end gap-2 animate-slide-in-recent">
            {displayNumbers.map((num, index) => (
              <div
                key={num !== null ? `recent-${num}-${index}` : `empty-${index}`}
                className={cn(
                  "flex size-10 items-center justify-center rounded-full border-2 text-base font-bold",
                  num !== null ? "bg-card text-card-foreground opacity-80 border-primary" : "border-dashed bg-muted/50 border-primary-foreground/30",
                )}
              >
                {num}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
