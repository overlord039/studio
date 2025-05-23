
"use client";

import type { HousieTicketGrid, HousieTicketNumber } from '@/types';
import { cn } from '@/lib/utils';
import React from 'react';

interface HousieTicketProps {
  ticket: HousieTicketGrid;
  calledNumbers: number[];
  onNumberClick?: (number: number, rowIndex: number, colIndex: number) => void;
  markedNumbers?: Set<string>; // "row-col" format for marked numbers
  className?: string;
}

export default function HousieTicket({ ticket, calledNumbers, onNumberClick, markedNumbers, className }: HousieTicketProps) {
  const rows = ticket.length;
  const cols = ticket[0]?.length || 0;

  const getNumberStatus = (num: HousieTicketNumber, r: number, c: number) => {
    if (num === null) return 'empty';
    const isMarked = markedNumbers?.has(`${r}-${c}`);
    const isCalled = calledNumbers.includes(num);

    if (isMarked && isCalled) return 'called-marked'; // Green background
    if (isCalled) return 'called-unmarked'; // Highlighted or outlined
    return 'not-called'; // Greyed out or normal
  };

  return (
    <div className={cn("grid border border-primary rounded-lg shadow-md bg-card overflow-hidden", `grid-cols-${cols}`, className)} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {ticket.map((row, r) =>
        row.map((number, c) => {
          const status = getNumberStatus(number, r, c);
          const cellKey = `${r}-${c}`;
          
          return (
            <div
              key={cellKey}
              onClick={() => number && onNumberClick?.(number, r, c)}
              className={cn(
                "aspect-square flex items-center justify-center text-sm md:text-base lg:text-lg font-medium border border-border/50 transition-all duration-150 ease-in-out",
                status === 'empty' ? 'bg-muted/30' : 'cursor-pointer',
                status === 'called-marked' ? 'bg-green-500 text-white scale-105 ring-2 ring-green-300' : '',
                status === 'called-unmarked' ? 'bg-yellow-300 text-yellow-800 ring-1 ring-yellow-500 animate-pulse' : '',
                status === 'not-called' && number !== null ? 'bg-card hover:bg-secondary/50' : '',
                status !== 'empty' && onNumberClick ? 'hover:scale-110 hover:shadow-lg' : ''
              )}
              aria-label={number ? `Number ${number}` : "Empty cell"}
              role={number ? "button" : "cell"}
              tabIndex={number ? 0 : -1}
            >
              {number !== null ? number : ''}
            </div>
          );
        })
      )}
    </div>
  );
}
