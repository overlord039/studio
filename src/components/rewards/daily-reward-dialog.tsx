

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
import { Progress } from '@/components/ui/progress';

interface DailyRewardDialogProps {
  user: User;
  onClaim: (day: number) => Promise<{claimedAmount: number} | null>;
}

export default function DailyRewardDialog({ user, onClaim }: DailyRewardDialogProps) {
  const { setIsRewardDialogOpen } = useAuth();
  const { triggerAnimation } = useCoinAnimation();
  const streak = user.stats.loginStreak || 0;
  const lastClaimedDay = user.stats.lastClaimedDay || 0;
  
  const canClaimToday = streak > lastClaimedDay && lastClaimedDay < 7;
  const nextDayToClaim = lastClaimedDay + 1;
  const progressPercentage = (streak / 7) * 100;

  const handleClaimAndAnimate = async () => {
      const result = await onClaim(nextDayToClaim);
      if (result && result.claimedAmount > 0) {
        triggerAnimation(result.claimedAmount);
        setTimeout(() => {
            handleClose();
        }, 1500); // Close dialog after animation has a moment to start
      }
  };

  const handleClose = () => {
    setIsRewardDialogOpen(false);
  }

  return (
    <DialogContent className="max-w-md w-[90vw] p-0 overflow-hidden" onInteractOutside={(e) => { if (canClaimToday) e.preventDefault() }}>
      <div className="relative p-6">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl">Daily Bonus</DialogTitle>
          <DialogDescription>
            Log in every day to earn rewards. Complete the week for a bonus!
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2 my-6">
          {WEEKLY_REWARDS.slice(0, 4).map((reward, i) => (
            <RewardCard key={i} day={i + 1} reward={reward} lastClaimedDay={lastClaimedDay} streak={streak} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 my-6">
          {WEEKLY_REWARDS.slice(4).map((reward, i) => (
            <RewardCard key={i + 4} day={i + 5} reward={reward} lastClaimedDay={lastClaimedDay} streak={streak}/>
          ))}
        </div>

        <div className="text-center p-3 bg-yellow-400/20 border-2 border-dashed border-yellow-500/50 rounded-lg space-y-2">
          <h4 className="font-bold flex items-center justify-center gap-2"><Star className="text-yellow-500"/> Perfect Week Bonus</h4>
            <div className="space-y-1">
                <Progress value={progressPercentage} className="h-2" variant="segmented" />
                <div className="flex justify-between text-xs font-medium text-muted-foreground px-1">
                    <span>Streak: {streak} Day{streak === 1 ? '' : 's'}</span>
                    <span>{streak} / 7</span>
                </div>
            </div>
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


const RewardCard = ({ day, reward, lastClaimedDay, streak }: { day: number, reward: number, lastClaimedDay: number, streak: number }) => {
    const isClaimed = day <= lastClaimedDay;
    const isNextToClaim = day === lastClaimedDay + 1 && streak > lastClaimedDay;

    return (
        <div className={cn(
            "p-2 rounded-lg text-center border-2 flex flex-col items-center justify-center aspect-square transition-all relative shadow-inner",
            isClaimed && "bg-green-600/20 border-green-500/70 text-green-800 dark:text-green-200",
            isNextToClaim && "bg-primary/10 border-primary shadow-lg scale-105 ring-2 ring-primary/50 text-primary-foreground",
            !isClaimed && !isNextToClaim && "bg-card/50 dark:bg-black/20 border-border opacity-60"
        )}>
             {isClaimed && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-0.5">
                    <CheckCircle className="h-4 w-4" />
                </div>
            )}
            <p className={cn(
                "text-xs font-semibold uppercase",
                isClaimed ? "text-green-700 dark:text-green-300/80" : "text-muted-foreground"
            )}>Day {day}</p>
            <Image src="/coin.png" alt="Coin" width={24} height={24} className="my-1"/>
            <p className={cn(
                "text-sm font-bold",
                isNextToClaim ? "text-primary dark:text-primary-foreground" : isClaimed ? "" : "text-card-foreground"
            )}>{reward}</p>
        </div>
    )
}
