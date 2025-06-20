
"use client";

import React from 'react'; // Removed useState as it's now controlled by parent
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MinusSquare, PlusSquare, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NUMBERS_RANGE_MIN, NUMBERS_RANGE_MAX } from '@/lib/constants';

interface LiveNumberBoardProps {
  calledNumbers: number[];
  currentNumber: number | null;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}

export default function LiveNumberBoard({ calledNumbers, currentNumber, isMinimized, onToggleMinimize }: LiveNumberBoardProps) {
  const numbers = Array.from({ length: NUMBERS_RANGE_MAX - NUMBERS_RANGE_MIN + 1 }, (_, i) => NUMBERS_RANGE_MIN + i);

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center">
          <ListOrdered className="mr-2 h-5 w-5 text-primary" />
          Number Board
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onToggleMinimize} aria-label={isMinimized ? "Expand board" : "Minimize board"}>
          {isMinimized ? <PlusSquare className="h-5 w-5" /> : <MinusSquare className="h-5 w-5" />}
        </Button>
      </CardHeader>
      {!isMinimized && (
        <CardContent className="pt-0">
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
        </CardContent>
      )}
    </Card>
  );
}

    