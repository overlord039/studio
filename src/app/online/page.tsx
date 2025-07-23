
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins, Lock, Play, Users, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { OnlineGameTier, TierConfig } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { playSound } from '@/lib/sounds';

const TIERS: Record<OnlineGameTier, TierConfig> = {
    quick: {
        name: "Quick Play",
        ticketPrice: 5,
        roomSize: 4,
        matchmakingTime: 15,
        unlockRequirements: { matches: 0, coins: 0 },
    },
    classic: {
        name: "Classic",
        ticketPrice: 10,
        roomSize: 6,
        matchmakingTime: 30,
        unlockRequirements: { matches: 5, coins: 50 },
    },
    tournament: {
        name: "Tournament",
        ticketPrice: 20,
        roomSize: 10,
        matchmakingTime: 60,
        unlockRequirements: { matches: 15, coins: 150 },
    }
};

export default function OnlineModePage() {
    const router = useRouter();
    const { currentUser, loading } = useAuth();
    const { toast } = useToast();

    const handleJoinTier = (tier: OnlineGameTier) => {
        if (!currentUser) return;
        
        playSound('cards.mp3');

        const tierConfig = TIERS[tier];
        const isUnlocked = 
            currentUser.stats.matchesPlayed >= tierConfig.unlockRequirements.matches &&
            currentUser.stats.coins >= tierConfig.unlockRequirements.coins;
        
        const hasEnoughCoinsForTicket = currentUser.stats.coins >= tierConfig.ticketPrice;

        if (!isUnlocked) {
            toast({
                title: "Tier Locked",
                description: `Play ${tierConfig.unlockRequirements.matches} matches and have ${tierConfig.unlockRequirements.coins} coins to unlock.`,
                variant: "destructive"
            });
            return;
        }

        if (!hasEnoughCoinsForTicket) {
            toast({
                title: "Not Enough Coins",
                description: `You need ${tierConfig.ticketPrice} coins to buy a ticket for this tier.`,
                variant: "destructive"
            });
            return;
        }

        router.push(`/online/matchmaking?tier=${tier}`);
    };
    
    if (loading || !currentUser) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col items-center justify-center flex-grow p-4">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white">Online Play</h1>
                <p className="text-white/80 mt-2">Join a game and play with others online!</p>
            </div>
            <div className="w-full max-w-md space-y-4">
                {Object.entries(TIERS).map(([tierKey, tierConfig]) => {
                    const isUnlocked = 
                        currentUser.stats.matchesPlayed >= tierConfig.unlockRequirements.matches &&
                        currentUser.stats.coins >= tierConfig.unlockRequirements.coins;
                    const hasEnoughCoins = currentUser.stats.coins >= tierConfig.ticketPrice;

                    return (
                        <Card 
                            key={tierKey} 
                            className={cn(
                                "shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1",
                                isUnlocked ? "cursor-pointer bg-card" : "bg-muted text-muted-foreground opacity-70 cursor-not-allowed"
                            )}
                            onClick={() => isUnlocked && handleJoinTier(tierKey as OnlineGameTier)}
                        >
                            <CardHeader className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-xl font-bold">{tierConfig.name}</CardTitle>
                                        <CardDescription>
                                            <div className="flex items-center gap-4 text-xs mt-1">
                                                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {tierConfig.roomSize} Players</span>
                                                <span className="flex items-center gap-1"><Coins className="h-3 w-3" /> {tierConfig.ticketPrice} / ticket</span>
                                            </div>
                                        </CardDescription>
                                    </div>
                                    {!isUnlocked && <Lock className="h-5 w-5 text-destructive" />}
                                </div>
                            </CardHeader>
                            {isUnlocked && (
                                <CardContent className="p-4 pt-0">
                                    <Button className="w-full" disabled={!hasEnoughCoins}>
                                        <Play className="mr-2 h-4 w-4" />
                                        {hasEnoughCoins ? "Join" : "Not enough coins"}
                                    </Button>
                                </CardContent>
                            )}
                            {!isUnlocked && (
                                <CardContent className="p-4 pt-0 text-xs">
                                    <p>
                                        Requires: {tierConfig.unlockRequirements.matches} matches played & {tierConfig.unlockRequirements.coins} coins.
                                    </p>
                                    <p>
                                        Your progress: {currentUser.stats.matchesPlayed} matches & {currentUser.stats.coins} coins.
                                    </p>
                                </CardContent>
                            )}
                        </Card>
                    );
                })}
            </div>
             <div className="mt-8 w-full max-w-md">
                <Button variant="outline" onClick={() => router.push('/')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                </Button>
            </div>
        </div>
    );
}
