
"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { OnlineGameTier, TierConfig, Player, Room } from '@/types';
import { Loader2, Users, Clock, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSound } from '@/contexts/sound-context';

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
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const { playSound } = useSound();
    
    const [tier, setTier] = useState<OnlineGameTier | null>(null);
    const [tickets, setTickets] = useState(1);
    const [tierConfig, setTierConfig] = useState<TierConfig | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isFindingMatch, setIsFindingMatch] = useState(false);

    useEffect(() => {
        const tierParam = searchParams.get('tier') as OnlineGameTier;
        const ticketsParam = searchParams.get('tickets');
        if (tierParam && TIERS[tierParam] && ticketsParam) {
            setTier(tierParam);
            const config = TIERS[tierParam];
            setTierConfig(config);
            setTimeLeft(config.matchmakingTime);
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
        
        const newRoom: Room = await response.json();

        if (!response.ok) {
          throw new Error(newRoom.message || 'Failed to create online match.');
        }

        toast({ title: "Match Found!", description: "Joining the game..." });
        router.push(`/room/${newRoom.id}/play?playerTickets=${tickets}`);

      } catch (err) {
        setError((err as Error).message);
        setIsFindingMatch(false);
      }

    }, [currentUser, tier, tickets, router, toast, playSound]);

    useEffect(() => {
        if (error || !tierConfig || isFindingMatch) return;

        if (timeLeft <= 0) {
            findMatch();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prevTime => prevTime - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, tierConfig, error, findMatch, isFindingMatch]);

    const progressPercentage = tierConfig ? ((tierConfig.matchmakingTime - timeLeft) / tierConfig.matchmakingTime) * 100 : 0;
    
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

    return (
        <Card className="w-full max-w-md shadow-xl bg-card/80 backdrop-blur-sm border-primary/20">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl text-white">Finding a Match...</CardTitle>
                <CardDescription className="text-white/80">Tier: {tierConfig.name} ({tickets} {tickets === 1 ? 'ticket' : 'tickets'})</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex justify-center items-end gap-2 text-white">
                    <Clock className="h-10 w-10 text-primary" />
                    <span className="text-5xl font-bold">{timeLeft}s</span>
                </div>
                <Progress value={progressPercentage} className="w-full" />
                <div className="text-center text-sm text-white/70">
                    <Users className="inline-block h-4 w-4 mr-2" />
                    <span>Looking for {tierConfig.roomSize} players</span>
                </div>
                {isFindingMatch ? (
                     <Button variant="secondary" disabled className="w-full">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining Match...
                    </Button>
                ) : (
                    <Button variant="outline" onClick={() => router.push('/online')} className="w-full">
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
