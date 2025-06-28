
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
                {displayNumbers.map((num, index) => (
                    <div
                    key={num !== null ? num : `empty-${index}`}
                    className={cn(
                        "flex size-9 items-center justify-center rounded-full border text-base font-bold transition-all duration-300",
                        index === 0 && num !== null ? "bg-accent text-accent-foreground scale-110 ring-2 ring-accent/50" : "bg-card text-card-foreground opacity-60",
                        num === null ? "border-dashed bg-muted/50" : "",
                        // Add animation only to the newest number when it appears
                        index === 0 && num !== null ? "animate-fade-in-down" : ""
                    )}
                    >
                    {num}
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
  );
};

export default RecentNumbersDisplay;
