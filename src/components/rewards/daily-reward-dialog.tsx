
"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { User } from '@/contexts/auth-context';
import { WEEKLY_REWARDS, PERFECT_STREAK_BONUS } from '@/lib/rewards';
import { cn } from '@/lib/utils';
import { CheckCircle, Gift, Star, X, Loader2 } from 'lucide-react';
import { useAuth, useCoinAnimation } from '@/contexts/auth-context';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { QUEST_DEFINITIONS } from '@/lib/quests';
import type { QuestName } from '@/types';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '../ui/separator';

interface DailyRewardDialogProps {
  user: User;
  onClaim: (day: number) => Promise<{claimedAmount: number} | null>;
  fetchUser: () => Promise<void>;
}

const QuestItem = ({ questName, user, fetchUser }: { questName: QuestName, user: User, fetchUser: () => Promise<void> }) => {
    const { toast } = useToast();
    const [isClaiming, setIsClaiming] = useState(false);
    const questData = user.stats.dailyQuests.quests[questName];
    const questDef = QUEST_DEFINITIONS[questName];
    const progress = Math.min(100, (questData.progress / questData.target) * 100);

    const handleClaimQuest = async () => {
        if (!user || !db || isClaiming || !questData.completed || questData.claimed) return;
        setIsClaiming(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                [`stats.dailyQuests.quests.${questName}.claimed`]: true,
                'stats.coins': increment(questData.reward),
            });
            await fetchUser();
            toast({
                title: "Reward Claimed!",
                description: `You earned ${questData.reward} coins for completing "${questDef.title}".`
            });
        } catch (error) {
            console.error("Error claiming quest reward:", error);
            toast({ title: "Error", description: "Could not claim your reward.", variant: "destructive" });
        } finally {
            setIsClaiming(false);
        }
    };
    
    return (
        <Card className={cn(
            "transition-all w-full",
            questData.claimed ? "bg-green-600/10 border-green-500/30" : "bg-secondary/30"
        )}>
            <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-grow space-y-2">
                    <div className="flex justify-between items-start">
                        <p className="font-bold text-sm">{questDef.title}</p>
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-700 dark:text-amber-400">
                            <Image src="/coin.png" alt="Coin" width={14} height={14} />
                            <span>{questData.reward}</span>
                        </div>
                    </div>
                    <div className="space-y-1 pt-1">
                        <Progress value={progress} className="h-1.5" />
                        <p className="text-xs font-medium text-muted-foreground">{questData.progress} / {questData.target}</p>
                    </div>
                </div>
                <div className="flex-shrink-0">
                    {questData.claimed ? (
                        <div className="flex flex-col items-center justify-center h-10 w-16 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            <span className="text-xs font-bold">Claimed</span>
                        </div>
                    ) : (
                        <Button
                            onClick={handleClaimQuest}
                            disabled={!questData.completed || isClaiming}
                            size="sm"
                            className="h-10 w-16"
                        >
                            {isClaiming ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Claim'}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default function DailyRewardDialog({ user, onClaim, fetchUser }: DailyRewardDialogProps) {
  const { setIsRewardDialogOpen } = useAuth();
  const { triggerAnimation } = useCoinAnimation();
  const streak = user.stats.loginStreak || 0;
  const lastClaimedDay = user.stats.lastClaimedDay || 0;
  
  const canClaimToday = streak > lastClaimedDay && lastClaimedDay < 7;
  const nextDayToClaim = lastClaimedDay + 1;
  const progressPercentage = (streak / 7) * 100;
  const quests = user.stats.dailyQuests?.quests;

  const handleClaimAndAnimate = async () => {
      const result = await onClaim(nextDayToClaim);
      if (result && result.claimedAmount > 0) {
        triggerAnimation(result.claimedAmount);
        // Do not close dialog automatically
      }
  };

  const handleClose = () => {
    setIsRewardDialogOpen(false);
  }

  return (
    <DialogContent className="max-w-md w-[90vw] p-0 overflow-hidden">
      <div className="relative p-4 sm:p-6">
        <DialogHeader className="text-center mb-4">
          <DialogTitle className="text-2xl">Daily Rewards</DialogTitle>
          <DialogDescription>
            Log in daily and complete quests to earn bonus coins!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {/* Daily Login Section */}
            <div className="space-y-4">
                <h3 className="font-bold text-center text-lg">Login Streak</h3>
                <div className="grid grid-cols-4 gap-2">
                {WEEKLY_REWARDS.slice(0, 4).map((reward, i) => (
                    <RewardCard key={i} day={i + 1} reward={reward} lastClaimedDay={lastClaimedDay} streak={streak} />
                ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
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
                 {canClaimToday && (
                    <Button onClick={handleClaimAndAnimate} className="w-full" size="lg">
                        Claim Day {nextDayToClaim} Reward
                    </Button>
                )}
            </div>
            
            <Separator />

            {/* Daily Quests Section */}
            <div className="space-y-4">
                <h3 className="font-bold text-center text-lg">Daily Quests</h3>
                <div className="space-y-2">
                    {quests && Object.keys(quests).map(questKey => (
                        <QuestItem 
                            key={questKey} 
                            questName={questKey as QuestName} 
                            user={user} 
                            fetchUser={fetchUser} 
                        />
                    ))}
                </div>
            </div>
        </div>

        <DialogFooter className="mt-6 sm:mt-4">
             <Button onClick={handleClose} variant="outline" className="w-full">
              {canClaimToday ? "Close" : (lastClaimedDay >= 7 ? "All rewards claimed!" : "Come back tomorrow!")}
            </Button>
        </DialogFooter>
      </div>
      <DialogClose asChild>
          <button onClick={handleClose} className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted">
              <X className="h-5 w-5"/>
          </button>
      </DialogClose>
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
