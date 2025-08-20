
"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { useSound } from '@/contexts/sound-context';

interface LevelUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oldLevel: number;
  newLevel: number;
}

export default function LevelUpDialog({ open, onOpenChange, oldLevel, newLevel }: LevelUpDialogProps) {
  const [displayLevel, setDisplayLevel] = useState(oldLevel);
  const { playSound } = useSound();

  useEffect(() => {
    if (open) {
      playSound('win.wav'); // Play a level up sound
      setDisplayLevel(oldLevel); // Reset on open
      const duration = 1000; // Animation duration in ms
      const startTime = Date.now();

      const animate = () => {
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < duration) {
          const progress = elapsedTime / duration;
          setDisplayLevel(Math.floor(oldLevel + (newLevel - oldLevel) * progress));
          requestAnimationFrame(animate);
        } else {
          setDisplayLevel(newLevel);
        }
      };
      
      const timer = setTimeout(() => {
         requestAnimationFrame(animate);
      }, 300); // Small delay before starting animation

      return () => clearTimeout(timer);
    }
  }, [open, oldLevel, newLevel, playSound]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Star className="h-16 w-16 text-yellow-400 animate-pulse" style={{ animationDuration: '2s' }}/>
          </div>
          <DialogTitle className="text-2xl font-bold">Level Up!</DialogTitle>
          <DialogDescription>
            Congratulations! You've reached a new level.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center gap-4 my-6">
            <div className="text-4xl font-bold text-muted-foreground">Lv {oldLevel}</div>
            <div className="text-2xl font-bold text-muted-foreground">&rarr;</div>
            <div className="text-6xl font-extrabold text-primary animate-scale-in-pop">Lv {displayLevel}</div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Awesome!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
