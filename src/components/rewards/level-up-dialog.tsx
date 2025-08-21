
"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { useSound } from '@/contexts/sound-context';
import Image from 'next/image';

interface LevelUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oldLevel: number;
  newLevel: number;
  reward: number;
}

export default function LevelUpDialog({ open, onOpenChange, oldLevel, newLevel, reward }: LevelUpDialogProps) {
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
      <DialogContent className="text-center">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">Level Up!</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center gap-4 my-4">
            <div className="text-4xl font-bold text-muted-foreground">Lv {oldLevel}</div>
            <div className="text-2xl font-bold text-muted-foreground">&rarr;</div>
            <div className="text-6xl font-extrabold text-primary animate-scale-in-pop">Lv {displayLevel}</div>
        </div>
        <div className="text-center p-3 bg-yellow-400/20 border-2 border-dashed border-yellow-500/50 rounded-lg space-y-1">
            <h4 className="font-bold text-yellow-600 dark:text-yellow-300">Level Up Reward</h4>
            <div className="flex items-center justify-center gap-2 text-2xl font-bold">
                <Image src="/coin.png" alt="Coins" width={28} height={28} />
                <span>+{reward} Coins</span>
            </div>
        </div>
        <DialogFooter className="mt-4">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Awesome!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
