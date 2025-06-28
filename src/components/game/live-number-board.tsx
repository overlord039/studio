"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { NUMBERS_RANGE_MIN, NUMBERS_RANGE_MAX } from '@/lib/constants';

interface LiveNumberBoardProps {
  calledNumbers: number[];
  currentNumber: number | null;
}

export default function LiveNumberBoard({ calledNumbers, currentNumber }: LiveNumberBoardProps) {
  const numbers = Array.from({ length: NUMBERS_RANGE_MAX - NUMBERS_RANGE_MIN + 1 }, (_, i) => NUMBERS_RANGE_MIN + i);

  return (
    <div className="grid grid-cols-10 gap-1 p-2 border rounded-md bg-muted/20">
      {numbers.map(num => {
        const isCalled = calledNumbers.includes(num);
        const isCurrent = num === currentNumber;
        return (
          <div
            key={num}
            className={cn(
              "aspect-square flex items-center justify-center text-xs sm:text-sm rounded font-medium border transition-all",
              isCurrent ? "bg-primary text-primary-foreground scale-110 ring-2 ring-offset-2 ring-primary shadow-lg animate-pulse" : 
              isCalled ? "bg-accent text-accent-foreground" : "bg-card text-card-foreground opacity-70"
            )}
          >
            {num}
          </div>
        );
      })}
    </div>
  );
}
