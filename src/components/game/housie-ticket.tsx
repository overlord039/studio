"use client";

import type { HousieTicketGrid, HousieTicketNumber } from '@/types';
import { cn } from '@/lib/utils';
import React from 'react';

interface HousieTicketProps {
  ticketIndex: number; // Added to identify the ticket
  ticket: HousieTicketGrid;
  calledNumbers: number[];
  onNumberClick?: (number: number, rowIndex: number, colIndex: number) => void;
  markedNumbers?: Set<string>; // Expects "ticketIndex-rowIndex-colIndex" format for marked numbers
  className?: string;
}

export default function HousieTicket({ ticketIndex, ticket, calledNumbers, onNumberClick, markedNumbers, className }: HousieTicketProps) {
  const rows = ticket.length;
  const cols = ticket[0]?.length || 0;

  const getNumberStatus = (num: HousieTicketNumber, r: number, c: number): 'empty' | 'called-marked' | 'default' => {
    if (num === null) return 'empty';
    
    const currentNumberKey = `${ticketIndex}-${r}-${c}`;
    // markedNumbers comes from parent state, updated when player clicks a *called* number.
    // So, if isMarkedByPlayer is true, it implies the number was also in calledNumbers at the time of marking.
    const isMarkedByPlayer = markedNumbers?.has(currentNumberKey);
    
    if (isMarkedByPlayer) {
      return 'called-marked'; // Player has marked this (it must have been a called number)
    }
    return 'default'; // Number is not marked by player (could be called or not-called by system)
  };

  return (
    <div className={cn("grid border border-primary rounded-lg shadow-md bg-card overflow-hidden", `grid-cols-${cols}`, className)} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {ticket.map((row, r) =>
        row.map((number, c) => {
          const status = getNumberStatus(number, r, c);
          const cellKey = `${ticketIndex}-${r}-${c}`; // Unique key for React rendering
          
          return (
            <div
              key={cellKey}
              onClick={() => number && onNumberClick?.(number, r, c)}
              className={cn(
                "aspect-square flex items-center justify-center p-1 text-xl md:text-2xl lg:text-3xl font-medium border border-border/50 transition-colors duration-150 ease-in-out",
                status === 'empty' ? 'bg-muted/30 text-transparent' : 'cursor-pointer', // Make empty cells non-interactive text-wise
                status === 'called-marked' ? 'bg-green-500 text-white' : '', // Player marked: green, static
                status === 'default' && number !== null ? 'bg-card text-card-foreground hover:bg-secondary/50' : '', // Default state for un-marked numbers
                // Apply hover effects only if clickable and not already marked green
                status === 'default' && number !== null && onNumberClick ? 'hover:scale-105 hover:shadow-lg' : ''
              )}
              aria-label={number ? `Number ${number}` : "Empty cell"}
              role={number ? "button" : "cell"}
              tabIndex={number && status !== 'empty' ? 0 : -1}
            >
              {number !== null ? number : ''}
            </div>
          );
        })
      )}
    </div>
  );
}
