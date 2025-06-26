"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';

interface CalledNumberDisplayProps {
  currentNumber: number | null;
  isMuted: boolean;
  onToggleMute: () => void;
}

export default function CalledNumberDisplay({ currentNumber, isMuted, onToggleMute }: CalledNumberDisplayProps) {
  return (
    <Card className="shadow-lg bg-primary text-primary-foreground">
      <CardContent className="p-4 text-center">
        <p className="text-sm uppercase tracking-wider mb-2">Called Number</p>
        {currentNumber !== null ? (
          <div className="flex items-center justify-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onToggleMute} 
              className="text-primary-foreground hover:bg-primary/80"
              aria-label={isMuted ? "Unmute voice" : "Mute voice"}
            >
              {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
            </Button>
            <p className="text-7xl font-bold">{currentNumber}</p>
          </div>
        ) : (
          <p className="text-4xl font-semibold text-primary-foreground/70">-</p>
        )}
      </CardContent>
    </Card>
  );
}
