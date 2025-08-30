

"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Award } from 'lucide-react';
import type { Badge } from '@/lib/badges';
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useSound } from '@/contexts/sound-context';
import { useEffect } from 'react';


interface BadgeUnlockedDialogProps {
  badges: Badge[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BadgeUnlockedDialog({ badges, open, onOpenChange }: BadgeUnlockedDialogProps) {
  const { playSound } = useSound();
  
  useEffect(() => {
    if (open && badges.length > 0) {
      playSound('win.wav');
    }
  }, [open, badges, playSound]);

  if (!badges || badges.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-center max-w-sm w-[90vw]">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <Award className="h-12 w-12 text-primary animate-pulse" />
          </div>
          <DialogTitle className="text-2xl font-bold">Achievement Unlocked!</DialogTitle>
           <DialogDescription>
            Congratulations! You've earned a new badge.
          </DialogDescription>
        </DialogHeader>
        
        <Carousel className="w-full max-w-xs mx-auto">
          <CarouselContent>
            {badges.map((badge, index) => (
              <CarouselItem key={index}>
                <div className="p-1">
                  <div className="flex flex-col items-center gap-2 p-4 bg-secondary/30 rounded-lg">
                    <Image src={badge.icon} alt={badge.name} width={64} height={64} />
                    <h3 className="font-bold text-lg">{badge.name}</h3>
                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                    <div className="mt-2 flex items-center justify-center gap-2 text-lg font-bold text-yellow-600 dark:text-yellow-400 bg-amber-400/20 px-3 py-1 rounded-full">
                        <Image src="/coin.png" alt="Coins" width={20} height={20} />
                        <span>{badge.reward} Coins</span>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
           {badges.length > 1 && (
                <>
                    <CarouselPrevious />
                    <CarouselNext />
                </>
            )}
        </Carousel>

        <DialogFooter className="mt-4">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Awesome!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
