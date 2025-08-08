

"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { User } from '@/contexts/auth-context';
import { WEEKLY_REWARDS, PERFECT_STREAK_BONUS } from '@/lib/rewards';
import { cn } from '@/lib/utils';
import { CheckCircle, Gift, Star, X } from 'lucide-react';
import { useAuth, useCoinAnimation } from '@/contexts/auth-context';
import AnimatedCoin from './animated-coin';

interface DailyRewardDialogProps {
  user: User;
  onClaim: (day: number) => Promise<{claimedAmount: number} | null>;
}

export default function DailyRewardDialog({ user, onClaim }: DailyRewardDialogProps) {
  const { setIsRewardDialogOpen } = useAuth();
  const { triggerAnimation } = useCoinAnimation();
  const streak = user.stats.loginStreak || 0;
  const lastClaimedDay = user.stats.lastClaimedDay || 0;
  
  const canClaimToday = streak > 0 && lastClaimedDay < 7;
  const nextDayToClaim = lastClaimedDay + 1;

  const handleClaimAndAnimate = async () => {
      const result = await onClaim(nextDayToClaim);
      if (result && result.claimedAmount > 0) {
        triggerAnimation(result.claimedAmount);
        setTimeout(() => {
            handleClose();
        }, 500); // Close dialog after animation has a moment to start
      }
  };

  const handleClose = () => {
    setIsRewardDialogOpen(false);
  }

  return (
    <DialogContent className="max-w-md w-[90vw] p-0 overflow-hidden" onInteractOutside={(e) => { if (canClaimToday) e.preventDefault() }}>
      <div className="relative p-6">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-2">
              <Gift className="h-12 w-12 text-primary"/>
          </div>
          <DialogTitle className="text-2xl">Daily Login Reward</DialogTitle>
          <DialogDescription>
            Log in every day to earn rewards. Complete the week for a bonus! Current Streak: {streak} day(s)
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2 my-6">
          {WEEKLY_REWARDS.slice(0, 4).map((reward, i) => (
            <RewardCard key={i} day={i + 1} reward={reward} lastClaimedDay={lastClaimedDay} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 my-6">
          {WEEKLY_REWARDS.slice(4).map((reward, i) => (
            <RewardCard key={i + 4} day={i + 5} reward={reward} lastClaimedDay={lastClaimedDay} />
          ))}
        </div>

        <div className="text-center p-3 bg-yellow-400/20 border-2 border-dashed border-yellow-500/50 rounded-lg">
          <h4 className="font-bold flex items-center justify-center gap-2"><Star className="text-yellow-500"/> Perfect Week Bonus</h4>
          <p className="text-sm">Claim all 7 days for an extra <span className="font-bold">{PERFECT_STREAK_BONUS} coins!</span></p>
        </div>

        <DialogFooter className="mt-6">
          {canClaimToday ? (
            <Button onClick={handleClaimAndAnimate} className="w-full" size="lg">
              Claim Day {nextDayToClaim} Reward
            </Button>
          ) : (
             <Button onClick={handleClose} variant="outline" className="w-full">
              {lastClaimedDay >= 7 ? "All rewards claimed for this cycle!" : "Come back tomorrow!"}
            </Button>
          )}
        </DialogFooter>
      </div>
       {!canClaimToday && (
          <DialogClose asChild>
              <button onClick={handleClose} className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted">
                  <X className="h-5 w-5"/>
              </button>
          </DialogClose>
      )}
    </DialogContent>
  );
}


const RewardCard = ({ day, reward, lastClaimedDay }: { day: number, reward: number, lastClaimedDay: number }) => {
    const isClaimed = day <= lastClaimedDay;
    const isNextToClaim = day === lastClaimedDay + 1;

    return (
        <div className={cn(
            "p-2 rounded-lg text-center border-2 flex flex-col items-center justify-center aspect-square transition-all relative",
            isClaimed && "bg-green-600/20 border-green-500 text-green-700",
            isNextToClaim && "bg-primary/20 border-primary shadow-lg scale-105",
            !isClaimed && !isNextToClaim && "bg-muted/50 border-border/50 opacity-60"
        )}>
            <p className="text-xs font-semibold uppercase">Day {day}</p>
            <Image src="/coin.png" alt="Coin" width={24} height={24} className="my-1"/>
            <p className="text-sm font-bold">{reward}</p>
        </div>
    )
}
