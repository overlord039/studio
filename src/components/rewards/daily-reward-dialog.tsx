

"use client";

import React from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { User } from '@/contexts/auth-context';
import { WEEKLY_REWARDS, PERFECT_STREAK_BONUS } from '@/lib/rewards';
import { cn } from '@/lib/utils';
import { CheckCircle, Gift, Star, X } from 'lucide-react';

interface DailyRewardDialogProps {
  user: User;
  onClaim: (day: number) => void;
  onClose: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DailyRewardDialog({ user, onClaim, onClose, open, onOpenChange }: DailyRewardDialogProps) {
  const streak = user.stats.loginStreak || 1;
  const lastClaimed = user.stats.lastClaimedDay || 0;
  
  const canClaimToday = streak > lastClaimed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[90vw] p-0" onInteractOutside={(e) => { if (canClaimToday && open) e.preventDefault() }}>
        <div className="relative p-6">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-2">
                <Gift className="h-12 w-12 text-primary"/>
            </div>
            <DialogTitle className="text-2xl">Daily Login Reward</DialogTitle>
            <DialogDescription>
              Log in every day to earn rewards. Complete the week for a bonus!
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-2 my-6">
            {WEEKLY_REWARDS.slice(0, 4).map((reward, i) => (
              <RewardCard key={i} day={i + 1} reward={reward} streak={streak} lastClaimed={lastClaimed} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 my-6">
            {WEEKLY_REWARDS.slice(4).map((reward, i) => (
              <RewardCard key={i + 4} day={i + 5} reward={reward} streak={streak} lastClaimed={lastClaimed} />
            ))}
          </div>

          <div className="text-center p-3 bg-yellow-400/20 border-2 border-dashed border-yellow-500/50 rounded-lg">
            <h4 className="font-bold flex items-center justify-center gap-2"><Star className="text-yellow-500"/> Perfect Week Bonus</h4>
            <p className="text-sm">Log in all 7 days for an extra <span className="font-bold">{PERFECT_STREAK_BONUS} coins!</span></p>
          </div>

          <DialogFooter className="mt-6">
            {canClaimToday ? (
              <Button onClick={() => onClaim(streak)} className="w-full" size="lg">
                Claim Day {streak} Reward
              </Button>
            ) : (
               <Button onClick={onClose} variant="outline" className="w-full">
                Come back tomorrow!
              </Button>
            )}
          </DialogFooter>
        </div>
         {!canClaimToday && (
            <button onClick={onClose} className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted">
                <X className="h-5 w-5"/>
            </button>
        )}
      </DialogContent>
    </Dialog>
  );
}


const RewardCard = ({ day, reward, streak, lastClaimed }: { day: number, reward: number, streak: number, lastClaimed: number }) => {
    const isClaimed = day <= lastClaimed;
    const isCurrentDay = day === streak;
    const isFutureDay = day > streak;

    return (
        <div className={cn(
            "p-2 rounded-lg text-center border-2 flex flex-col items-center justify-center aspect-square transition-all",
            isClaimed && "bg-green-600/20 border-green-500 text-green-700",
            isCurrentDay && "bg-primary/20 border-primary shadow-lg scale-105",
            isFutureDay && "bg-muted/50 border-border/50 opacity-60"
        )}>
            <p className="text-xs font-semibold uppercase">Day {day}</p>
            <Image src="/coin.png" alt="Coin" width={24} height={24} className="my-1"/>
            <p className="text-sm font-bold">{reward}</p>
            {isClaimed && <CheckCircle className="absolute h-4 w-4 text-green-500 top-1 right-1" />}
        </div>
    )
}
