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
      <CardContent className="p-4 text-center relative">
        <p className="text-sm uppercase tracking-wider mb-2">Called Number</p>
        {currentNumber !== null ? (
          <p className="text-7xl font-bold">{currentNumber}</p>
        ) : (
          <p className="text-4xl font-semibold text-primary-foreground/70">-</p>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleMute} 
          className="absolute top-2 right-2 text-primary-foreground hover:bg-primary/80"
          aria-label={isMuted ? "Unmute voice" : "Mute voice"}
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
      </CardContent>
    </Card>
  );
}
