
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { NUMBERS_RANGE_MIN, NUMBERS_RANGE_MAX } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MinusSquare, PlusSquare } from 'lucide-react';

interface LiveNumberBoardProps {
  calledNumbers: number[];
  currentNumber: number | null;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  remainingCount?: number;
  calledCount?: number;
}

export default function LiveNumberBoard({ calledNumbers, currentNumber, isMinimized, onToggleMinimize, remainingCount, calledCount }: LiveNumberBoardProps) {
  const numbers = Array.from({ length: NUMBERS_RANGE_MAX - NUMBERS_RANGE_MIN + 1 }, (_, i) => NUMBERS_RANGE_MIN + i);

  const Board = () => (
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

  const InfoText = () => {
    if (typeof remainingCount !== 'number' || typeof calledCount !== 'number') {
      return null;
    }
    return (
      <p className="text-center text-xs text-muted-foreground pt-2">
        {remainingCount} numbers remaining. Total Called: {calledCount}.
      </p>
    );
  };
  
  if (typeof onToggleMinimize !== 'undefined' && typeof isMinimized !== 'undefined') {
    return (
       <Card>
            <CardHeader className="flex flex-row items-center justify-between p-3">
              <CardTitle className="text-lg">Number Board</CardTitle>
              <Button variant="ghost" size="sm" onClick={onToggleMinimize} aria-label={isMinimized ? "Expand Number Board" : "Minimize Number Board"}>
                {isMinimized ? <PlusSquare className="h-5 w-5" /> : <MinusSquare className="h-5 w-5" />}
              </Button>
            </CardHeader>
            {!isMinimized && (
              <CardContent className="p-3 pt-0">
                <Board />
                <InfoText />
              </CardContent>
            )}
          </Card>
    )
  }

  return (
    <>
      <Board />
      <InfoText />
    </>
  );
}
