

"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Play, Users, ArrowLeft, Loader2, Link as LinkIcon, Ticket, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { OnlineGameTier, TierConfig } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useSound } from '@/contexts/sound-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const TIERS: Record<OnlineGameTier, TierConfig> = {
    quick: {
        name: "Quick",
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

const TierCard = ({ tierKey, tierConfig }: { tierKey: OnlineGameTier; tierConfig: TierConfig }) => {
    const router = useRouter();
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const { playSound } = useSound();
    const [selectedTickets, setSelectedTickets] = useState(1);
    const [showNoCoinsDialog, setShowNoCoinsDialog] = useState(false);

    if (!currentUser) return null;

    const isUnlocked = currentUser.stats.matchesPlayed >= tierConfig.unlockRequirements.matches &&
        currentUser.stats.coins >= tierConfig.unlockRequirements.coins;
    
    const totalCost = tierConfig.ticketPrice * selectedTickets;
    const hasEnoughCoins = currentUser.stats.coins >= totalCost;

    const handleJoinTier = () => {
        playSound('cards.mp3');

        if (!isUnlocked) {
            toast({
                title: "Tier Locked",
                description: `Play ${tierConfig.unlockRequirements.matches} matches and have ${tierConfig.unlockRequirements.coins} coins to unlock.`,
                variant: "destructive"
            });
            return;
        }

        if (!hasEnoughCoins) {
            playSound('error.wav');
            setShowNoCoinsDialog(true);
            return;
        }

        router.push(`/online/matchmaking?tier=${tierKey}&tickets=${selectedTickets}`);
    };

    return (
        <>
            <Card 
                key={tierKey} 
                className={cn(
                    "shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1",
                    isUnlocked ? "bg-card" : "bg-muted text-muted-foreground opacity-70 cursor-not-allowed"
                )}
            >
                <CardHeader className="p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-xl font-bold">{tierConfig.name}</CardTitle>
                            <CardDescription>
                                <div className="flex items-center gap-4 text-xs mt-1">
                                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {tierConfig.roomSize} Players</span>
                                    <span className="flex items-center gap-1"><Image src="/coin.png" alt="Coins" width={14} height={14} /> {tierConfig.ticketPrice} / ticket</span>
                                </div>
                            </CardDescription>
                        </div>
                        {!isUnlocked && <Lock className="h-5 w-5 text-destructive" />}
                    </div>
                </CardHeader>
                {isUnlocked && (
                    <CardContent className="p-4 pt-0 space-y-3">
                        <div className="flex items-center gap-2">
                            <Label htmlFor={`tickets-${tierKey}`} className="flex-shrink-0 text-sm flex items-center gap-1">
                                <Ticket className="h-4 w-4"/> Tickets
                            </Label>
                            <Select
                                value={String(selectedTickets)}
                                onValueChange={(value) => setSelectedTickets(Number(value))}
                            >
                                <SelectTrigger id={`tickets-${tierKey}`} className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4].map(num => (
                                        <SelectItem key={num} value={String(num)}>
                                            {num} {num === 1 ? 'ticket' : 'tickets'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="w-full" onClick={handleJoinTier}>
                            <Play className="mr-2 h-4 w-4" />
                            {hasEnoughCoins ? `Join for ${totalCost} Coins` : "Not enough coins"}
                        </Button>
                    </CardContent>
                )}
                {!isUnlocked && (
                    <CardContent className="p-4 pt-0 text-xs">
                        <p>
                            Requires: {tierConfig.unlockRequirements.matches} played & {tierConfig.unlockRequirements.coins} coins.
                        </p>
                        <p>
                            Your progress: {currentUser.stats.matchesPlayed} matches & {currentUser.stats.coins} coins.
                        </p>
                    </CardContent>
                )}
            </Card>
            <AlertDialog open={showNoCoinsDialog} onOpenChange={setShowNoCoinsDialog}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Not Enough Coins</AlertDialogTitle>
                    <AlertDialogDescription>
                    You don't have enough coins to join this match. Play offline games against bots to earn more!
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => router.push('/play-with-computer')}>
                    Play Offline
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};


export default function OnlineModePage() {
    const router = useRouter();
    const { currentUser, loading } = useAuth();
    
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
                <h1 className="text-3xl font-bold text-white">Online</h1>
                <p className="text-white/80 mt-2">Join a game and play with others online!</p>
            </div>
            <div className="w-full max-w-md space-y-4">
                {Object.entries(TIERS).map(([tierKey, tierConfig]) => (
                    <TierCard key={tierKey} tierKey={tierKey as OnlineGameTier} tierConfig={tierConfig} />
                ))}
            </div>
        </div>
    );
}
