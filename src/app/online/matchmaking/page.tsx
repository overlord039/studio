
"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { OnlineGameTier, TierConfig, Player, Room } from '@/types';
import { Loader2, Users, Search, ArrowLeft, AlertTriangle, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSound } from '@/contexts/sound-context';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const TIERS: Record<OnlineGameTier, TierConfig> = {
    quick: {
        name: "Quick Play", ticketPrice: 5, roomSize: 4, matchmakingTime: 15,
        unlockRequirements: { matches: 0, coins: 0 },
    },
    classic: {
        name: "Classic", ticketPrice: 10, roomSize: 6, matchmakingTime: 30,
        unlockRequirements: { matches: 5, coins: 50 },
    },
    tournament: {
        name: "Tournament", ticketPrice: 20, roomSize: 10, matchmakingTime: 60,
        unlockRequirements: { matches: 15, coins: 150 },
    }
};

function MatchmakingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { currentUser, updateUserStats } = useAuth();
    const { toast } = useToast();
    const { playSound } = useSound();
    
    const [tier, setTier] = useState<OnlineGameTier | null>(null);
    const [tickets, setTickets] = useState(1);
    const [tierConfig, setTierConfig] = useState<TierConfig | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isFindingMatch, setIsFindingMatch] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);

    useEffect(() => {
        const tierParam = searchParams.get('tier') as OnlineGameTier;
        const ticketsParam = searchParams.get('tickets');
        if (tierParam && TIERS[tierParam] && ticketsParam) {
            setTier(tierParam);
            const config = TIERS[tierParam];
            setTierConfig(config);
            setCountdown(config.matchmakingTime);
            setTickets(parseInt(ticketsParam, 10));
        } else {
            setError("Invalid game tier or ticket count specified.");
        }
    }, [searchParams]);

    const findMatch = useCallback(async () => {
      if (!currentUser || !tier) return;
      
      setIsFindingMatch(true);
      playSound('start.wav');

      const player: Player & { isGuest?: boolean } = {
        id: currentUser.uid,
        name: currentUser.displayName || 'Guest',
        email: currentUser.email,
        isGuest: currentUser.isGuest,
      };

      try {
        const response = await fetch('/api/online/join-or-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player, tier, tickets }),
        });
        
        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.message || 'Failed to create online match.');
        }
        
        const newCoinBalance = responseData.newCoinBalance;
        if (typeof newCoinBalance === 'number') {
            updateUserStats({ coins: newCoinBalance });
        }

        const newRoom: Room = responseData;
        setCreatedRoomId(newRoom.id);
        
        // This brief delay ensures the state update has time to propagate before navigation
        setTimeout(() => {
            toast({ title: "Match Found!", description: "Let's check the prize pool..." });
            router.push(`/online/pre-game?roomId=${newRoom.id}`);
        }, 100);


      } catch (err) {
        setError((err as Error).message);
        setIsFindingMatch(false);
      }

    }, [currentUser, tier, tickets, router, toast, playSound, updateUserStats]);
    
    useEffect(() => {
        if (countdown === null || error || isFindingMatch) return;

        if (countdown <= 0) {
            findMatch();
            return;
        }

        const timer = setInterval(() => {
            setCountdown(prev => (prev !== null ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [countdown, error, findMatch, isFindingMatch]);

    const handleCancel = async () => {
        if (createdRoomId && currentUser) {
             try {
                const response = await fetch(`/api/rooms/${createdRoomId}/leave`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ playerId: currentUser.uid }),
                });
                 if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || "Failed to leave room.");
                }
            } catch (err) {
                console.error("Error leaving created room on cancel:", err);
            }
        }
        router.push('/online');
    };
    
    if (!currentUser || !tierConfig) {
        return <Loader2 className="h-8 w-8 animate-spin text-white" />;
    }

    if (error) {
        return (
            <Card className="w-full max-w-md shadow-xl border-destructive">
                <CardHeader className="text-center">
                    <div className="flex justify-center items-center gap-2 text-destructive mb-2">
                        <AlertTriangle className="h-10 w-10"/>
                    </div>
                    <CardTitle>Matchmaking Failed</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-muted-foreground">{error}</p>
                    <Button onClick={() => router.push('/online')} className="mt-4">Back to Tiers</Button>
                </CardContent>
            </Card>
        );
    }

    const formatTime = (seconds: number | null) => {
        if (seconds === null) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const progressPercentage = countdown !== null ? (countdown / tierConfig.matchmakingTime) * 100 : 0;

    return (
        <Card className="w-full max-w-md shadow-xl bg-card/80 backdrop-blur-sm border-accent/20">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl text-foreground">Finding a Match...</CardTitle>
                <CardDescription className="text-foreground/80">Tier: {tierConfig.name} ({tickets} {tickets === 1 ? 'ticket' : 'tickets'})</CardDescription>
                <div className="flex items-center justify-center gap-2 pt-2">
                    <span className="text-sm font-semibold">Your Coins:</span>
                     <div className="flex items-center gap-1 font-bold text-lg text-amber-500">
                        <Image src="/coin.png" alt="Coins" width={20} height={20} />
                        <span>{currentUser.stats.coins}</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 flex flex-col items-center">
                 <div className="relative h-40 w-40">
                    <svg className="h-full w-full" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle
                            className="text-accent/20"
                            strokeWidth="7"
                            stroke="currentColor"
                            fill="transparent"
                            r="45"
                            cx="50"
                            cy="50"
                        />
                        {/* Progress circle */}
                        <circle
                            className="text-accent"
                            strokeWidth="7"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="45"
                            cx="50"
                            cy="50"
                            strokeDasharray={2 * Math.PI * 45}
                            strokeDashoffset={(2 * Math.PI * 45) * (1 - progressPercentage / 100)}
                            style={{ transition: 'stroke-dashoffset 1s linear' }}
                            transform="rotate(-90 50 50)"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold font-mono text-foreground">
                            {formatTime(countdown)}
                        </span>
                        <p className="text-xs uppercase text-foreground/70">Estimated Time</p>
                    </div>
                </div>

                 <div className="flex justify-center items-center gap-2 text-foreground/90">
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    <span className="text-lg font-semibold">Searching for players...</span>
                </div>
                <div className="text-center text-sm text-foreground/70">
                    <Users className="inline-block h-4 w-4 mr-2" />
                    <span>Looking for {tierConfig.roomSize} players</span>
                </div>
                {isFindingMatch ? (
                     <Button variant="secondary" disabled className="w-full">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining Match...
                    </Button>
                ) : (
                    <Button variant="outline" onClick={handleCancel} className="w-full">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}


export default function MatchmakingPage() {
    return (
        <div className="flex flex-col items-center justify-center flex-grow p-4">
             <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-white" />}>
                <MatchmakingContent />
            </Suspense>
        </div>
    );
}
