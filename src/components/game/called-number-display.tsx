"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalledNumberDisplayProps {
  currentNumber: number | null;
  calledNumbers: number[];
  isMuted: boolean;
  onToggleMute: () => void;
}

export default function CalledNumberDisplay({ currentNumber, calledNumbers, isMuted, onToggleMute }: CalledNumberDisplayProps) {
    // Get the last 3 numbers from the list, *excluding* the current one.
  const recentThree = calledNumbers.filter(n => n !== currentNumber).slice(-3).reverse();
  
  // Pad for consistent layout
  const displayNumbers = [...recentThree];
  while (displayNumbers.length < 3) {
    displayNumbers.push(null);
  }

  return (
    <Card className="shadow-lg bg-primary text-primary-foreground">
      <CardContent className="p-4 flex items-center justify-between">
        {/* Main Number Section */}
        <div className="flex flex-col items-center text-center">
          <p className="text-xs uppercase tracking-wider mb-1">Called Number</p>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onToggleMute} 
              className="text-primary-foreground hover:bg-primary/80 h-8 w-8"
              aria-label={isMuted ? "Unmute voice" : "Mute voice"}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
            {currentNumber !== null ? (
                <p className="text-6xl font-bold">{currentNumber}</p>
            ) : (
                <p className="text-4xl font-semibold text-primary-foreground/70">-</p>
            )}
          </div>
        </div>

        {/* Vertical Separator */}
        <div className="h-16 w-px bg-primary-foreground/30 mx-4"></div>

        {/* Recent Numbers Section */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs uppercase tracking-wider mb-1">Recent</p>
          <div className="flex gap-2">
            {displayNumbers.map((num, index) => (
              <div
                key={num !== null ? `recent-${num}` : `empty-${index}`}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border text-sm font-bold",
                  num !== null ? "bg-card text-card-foreground opacity-70 border-primary" : "border-dashed bg-muted/50 border-primary-foreground/30",
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
