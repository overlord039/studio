"use client";

import type { HousieTicketGrid, HousieTicketNumber } from '@/types';
import { cn } from '@/lib/utils';
import React from 'react';

interface HousieTicketProps {
  ticketIndex: number;
  ticket: HousieTicketGrid;
  calledNumbers: number[];
  onNumberClick?: (number: number, rowIndex: number, colIndex: number) => void;
  markedNumbers?: Set<string>;
  className?: string;
}

export default function HousieTicket({ ticketIndex, ticket, calledNumbers, onNumberClick, markedNumbers, className }: HousieTicketProps) {
  const cols = ticket[0]?.length || 0;

  const getNumberStatus = (num: HousieTicketNumber, r: number, c: number): 'empty' | 'called-marked' | 'default' => {
    if (num === null) return 'empty';
    
    const currentNumberKey = `${ticketIndex}-${r}-${c}`;
    const isMarkedByPlayer = markedNumbers?.has(currentNumberKey);
    
    if (isMarkedByPlayer) {
      return 'called-marked';
    }
    return 'default';
  };

  return (
    <div className={cn("border-2 border-primary/50 rounded-lg shadow-md bg-card overflow-hidden flex flex-col", className)}>
      {ticket.map((row, r) => (
        <div key={`row-${r}`} className={cn("grid", `grid-cols-${cols}`)} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {row.map((number, c) => {
            const status = getNumberStatus(number, r, c);
            const cellKey = `${ticketIndex}-${r}-${c}`;
            
            return (
              <div
                key={cellKey}
                onClick={() => number && onNumberClick?.(number, r, c)}
                className={cn(
                  "aspect-square flex items-center justify-center p-1 text-base border-t border-l border-border/20 transition-all duration-150 ease-in-out",
                  // Checkerboard background for all cells
                  (r + c) % 2 === 0 ? 'bg-secondary/20' : 'bg-card',
                  
                  // Default styling for cells with numbers
                  number !== null && 'font-bold text-secondary-foreground cursor-pointer',

                  // Style for marked numbers (overrides default and checkerboard)
                  status === 'called-marked' ? 'bg-green-500 !text-white scale-105 shadow-lg ring-2 ring-white' : '',
                  
                  // Hover effect for clickable numbers that are not marked
                  status === 'default' && number !== null && onNumberClick ? 'hover:scale-105 hover:shadow-lg' : ''
                )}
                aria-label={number ? `Number ${number}` : "Empty cell"}
                role={number ? "button" : "cell"}
                tabIndex={number && status !== 'empty' ? 0 : -1}
              >
                {number !== null ? number : ''}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
