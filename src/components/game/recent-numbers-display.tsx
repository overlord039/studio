"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { History } from 'lucide-react';

interface RecentNumbersDisplayProps {
  calledNumbers: number[];
}

const RecentNumbersDisplay: React.FC<RecentNumbersDisplayProps> = ({ calledNumbers }) => {
  const recentFive = calledNumbers.slice(-5).reverse();

  // Pad the array to always have 5 elements for consistent layout
  const displayNumbers = [...recentFive];
  while (displayNumbers.length < 5) {
    displayNumbers.push(null);
  }

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3">
            <CardTitle className="text-lg flex items-center"><History className="mr-2 h-5 w-5 text-primary"/>Recent</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
            <div className="flex h-12 items-center justify-center gap-2 overflow-hidden">
                {displayNumbers.map((num, index) => {
                    const isMostRecent = index === 0 && num !== null;
                    const isOlderNumber = index > 0 && num !== null;
                    const isEmptySlot = num === null;
                    
                    return (
                        <div
                        key={num !== null ? `recent-${num}` : `empty-${index}`}
                        className={cn(
                            "flex size-9 items-center justify-center rounded-full border text-base font-bold transition-all duration-300",
                            isMostRecent && "bg-accent text-accent-foreground ring-2 ring-accent/50 animate-scale-in-pop",
                            isOlderNumber && "bg-card text-card-foreground opacity-60 border-primary",
                            isEmptySlot && "border-dashed bg-muted/50",
                            !isMostRecent && "scale-100"
                        )}
                        >
                        {num}
                        </div>
                    );
                })}
            </div>
        </CardContent>
    </Card>
  );
};

export default RecentNumbersDisplay;
