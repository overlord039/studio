

"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Play, Users, ArrowLeft, Loader2, Link as LinkIcon, Ticket, LogOut, Info, Star, Plus, Minus } from 'lucide-react';
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
import Link from 'next/link';

const TIERS: Record<OnlineGameTier, TierConfig & { description: string }> = {
    quick: {
        name: "Quick",
        ticketPrice: 5,
        roomSize: 4,
        matchmakingTime: 10,
        unlockRequirements: { level: 1, matches: 0, coins: 0 },
        description: "A fast-paced game for a quick dose of fun. Perfect for when you're short on time."
    },
    classic: {
        name: "Classic",
        ticketPrice: 10,
        roomSize: 6,
        matchmakingTime: 10,
        unlockRequirements: { level: 5, matches: 10, coins: 25 },
        description: "The standard Housie experience. A bigger room for more competition and larger prizes."
    },
    tournament: {
        name: "Tournament",
        ticketPrice: 20,
        roomSize: 10,
        matchmakingTime: 10,
        unlockRequirements: { level: 10, matches: 25, coins: 100 },
        description: "The ultimate challenge. Compete in a large lobby for the biggest prize pool."
    }
};

const TierCard = ({ tierKey, tierConfig }: { tierKey: OnlineGameTier; tierConfig: TierConfig & { description: string } }) => {
    const router = useRouter();
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const { playSound } = useSound();
    const [selectedTickets, setSelectedTickets] = useState(1);
    const [showNoCoinsDialog, setShowNoCoinsDialog] = useState(false);

    if (!currentUser) return null;

    const { level: requiredLevel, matches: requiredMatches, coins: requiredCoins } = tierConfig.unlockRequirements;
    const { level: userLevel, matchesPlayed: userMatches, coins: userCoins } = currentUser.stats;

    const isUnlocked = userLevel >= requiredLevel && userMatches >= requiredMatches && userCoins >= requiredCoins;
    
    const totalCost = tierConfig.ticketPrice * selectedTickets;
    const hasEnoughCoins = userCoins >= totalCost;

    const handleJoinTier = () => {
        playSound('cards.mp3');

        if (!isUnlocked) {
            toast({
                title: "Tier Locked",
                description: `Reach Level ${requiredLevel}, play ${requiredMatches} matches, and have ${requiredCoins} coins to unlock.`,
                variant: "destructive"
            });
            return;
        }

        if (!hasEnoughCoins) {
            playSound('notification.wav');
            setShowNoCoinsDialog(true);
            return;
        }

        router.push(`/online/matchmaking?tier=${tierKey}&tickets=${selectedTickets}`);
    };

    const handleTicketChange = (ticketCount: number) => {
        playSound('cards.mp3');
        setSelectedTickets(ticketCount);
    };

    const Requirement = ({ label, required, current }: { label: string, required: number, current: number }) => (
        <div className={cn("flex items-center justify-center gap-1", current >= required ? "text-green-600" : "text-destructive")}>
            {label}: {current} / {required}
        </div>
    );

    return (
        <>
            <Card 
                key={tierKey} 
                className={cn(
                    "shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 h-full flex flex-col border-2",
                    isUnlocked ? "bg-card border-primary/20 hover:border-primary/50" : "bg-muted text-muted-foreground opacity-80 cursor-not-allowed border-border"
                )}
            >
                <CardHeader className="p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl font-bold">{tierConfig.name}</CardTitle>
                            <CardDescription className="text-xs">{tierConfig.description}</CardDescription>
                        </div>
                        {!isUnlocked && <Lock className="h-5 w-5 text-destructive" />}
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4 flex-grow flex flex-col justify-between">
                     <div className="space-y-2">
                        <div className="flex justify-around text-center text-xs bg-secondary/30 p-2 rounded-lg">
                            <div>
                                <p className="font-bold text-base">{tierConfig.roomSize}</p>
                                <p className="text-muted-foreground">Players</p>
                            </div>
                            <div>
                                <p className="font-bold text-base flex items-center justify-center gap-1">
                                    <Image src="/coin.png" alt="Coins" width={14} height={14} />
                                    {tierConfig.ticketPrice}
                                </p>
                                <p className="text-muted-foreground">Per Ticket</p>
                            </div>
                             <div>
                                <p className="font-bold text-base">{tierConfig.matchmakingTime}s</p>
                                <p className="text-muted-foreground">Wait Time</p>
                            </div>
                        </div>
                         {isUnlocked ? (
                            <div className="space-y-3 pt-2">
                                <Label className="text-sm font-semibold text-center block">How many tickets?</Label>
                                <div className="flex items-center justify-center gap-2">
                                     {Array.from({ length: 4 }, (_, i) => i + 1).map(ticketCount => (
                                        <Button
                                            key={ticketCount}
                                            variant={selectedTickets === ticketCount ? 'default' : 'outline'}
                                            onClick={() => handleTicketChange(ticketCount)}
                                            className={cn(
                                                "h-12 w-12 flex-col",
                                                selectedTickets === ticketCount && "ring-2 ring-primary-foreground"
                                            )}
                                        >
                                            <span className="font-bold text-lg">{ticketCount}</span>
                                            <span className="text-[8px] uppercase tracking-wider">{ticketCount === 1 ? 'Ticket' : 'Tickets'}</span>
                                        </Button>
                                     ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-center p-2 rounded-lg bg-destructive/10 border border-destructive/20 space-y-1">
                                <p className="font-semibold text-destructive">Unlock Requirements:</p>
                                <Requirement label="Level" required={requiredLevel} current={userLevel} />
                                <Requirement label="Matches" required={requiredMatches} current={userMatches} />
                                <Requirement label="Coins" required={requiredCoins} current={userCoins} />
                            </div>
                        )}
                    </div>
                    {isUnlocked && (
                         <Button className="w-full" onClick={handleJoinTier}>
                            <Play className="mr-2 h-4 w-4" />
                            {hasEnoughCoins ? `Join for ${totalCost} Coins` : "Not enough coins"}
                        </Button>
                    )}
                </CardContent>
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
        <div className="flex flex-col w-full flex-grow p-4">
            <div className="text-center mb-8 flex-shrink-0">
                <h1 className="text-3xl font-bold text-white">Online</h1>
                <p className="text-white/80 mt-2">Join a game and play with others online!</p>
            </div>
            <div className="w-full flex-grow flex items-center justify-center">
                 <div className="flex md:grid md:grid-cols-3 gap-6 md:gap-8 max-w-7xl mx-auto overflow-x-auto md:overflow-x-visible pb-4 scrollbar-hide">
                    {Object.entries(TIERS).map(([tierKey, tierConfig]) => (
                        <div key={tierKey} className="flex-shrink-0 w-[90vw] max-w-sm snap-center md:w-auto">
                            <TierCard tierKey={tierKey as OnlineGameTier} tierConfig={tierConfig} />
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-8 w-full max-w-md self-center flex-shrink-0">
                <Link href="/" passHref>
                <Button variant="destructive" size="icon">
                    <LogOut className="h-4 w-4 rotate-180" />
                </Button>
                </Link>
            </div>
        </div>
    );
}
