
'use client';

import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { Room, PrizeType, GameSettings, OnlineGameTier, TierConfig, Player, FirestoreRoom, FirestorePlayer } from '@/types';
import { PRIZE_DEFINITIONS, PRIZE_DISTRIBUTION_PERCENTAGES, DEFAULT_GAME_SETTINGS } from '@/lib/constants';
import { Loader2, AlertTriangle, Gift, Users, Trophy, Bot, Ticket as TicketIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSound } from '@/contexts/sound-context';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase/config';
import { doc, collection, onSnapshot, runTransaction, Timestamp, getDoc } from 'firebase/firestore';


function calculatePrizes(totalPool: number, settings: GameSettings): Record<PrizeType, number> {
    const prizeFormat = settings.prizeFormat || 'Format 1';
    const prizeDefs = PRIZE_DEFINITIONS[prizeFormat] || [];
    const distPercentages = PRIZE_DISTRIBUTION_PERCENTAGES[prizeFormat] || {};
    
    const calculatedPrizes: Record<PrizeType, number> = {} as any;
    let sumOfPrizes = 0;
    
    // Calculate all prizes except Full House
    for (const prize of prizeDefs) {
        if (prize !== 'Full House') {
            const percentage = distPercentages[prize] || 0;
            const amount = Math.floor((totalPool * percentage) / 100);
            calculatedPrizes[prize] = amount;
            sumOfPrizes += amount;
        }
    }
    
    // Full House gets the remainder to ensure the total matches the pool
    if (prizeDefs.includes('Full House')) {
      calculatedPrizes['Full House'] = totalPool - sumOfPrizes;
    }

    return calculatedPrizes;
}


function PreGameContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const { playSound } = useSound();
    
    const [roomData, setRoomData] = useState<FirestoreRoom | null>(null);
    const [players, setPlayers] = useState<FirestorePlayer[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [countdown, setCountdown] = useState<number | null>(null);
    const navigatedRef = useRef(false);
    const startGameCalledRef = useRef(false);

    const roomId = searchParams.get('roomId');

    // This effect listens for real-time updates on the room and players
    useEffect(() => {
        if (!roomId || !db) {
            setError("No room ID provided or DB not configured.");
            setIsLoading(false);
            return;
        }

        playSound('notification.wav');

        const roomRef = doc(db, "rooms", roomId);
        const playersRef = collection(db, "rooms", roomId, "players");

        const unsubRoom = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as FirestoreRoom;
                setRoomData(data);
                
                // Server-authoritative navigation trigger
                if (data.status === 'in-progress' && !navigatedRef.current) {
                    navigatedRef.current = true;
                    toast({ title: "Match Starting!", description: "Let's go!" });
                    // **FIX**: The navigation now includes the search params to pass ticket info
                    router.push(`/room/${roomId}/play`);
                }
                
                // Set initial countdown value from server timestamp
                if (data.preGameEndTime && countdown === null) {
                    const endTime = data.preGameEndTime.toMillis();
                    const now = Date.now();
                    const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
                    setCountdown(remaining);
                }

            } else {
                setError("This room no longer exists.");
                toast({title: "Room Closed", description: "The game room is no longer available.", variant: "destructive"});
                if (!navigatedRef.current) {
                    router.push("/online");
                }
            }
            setIsLoading(false);
        });

        const unsubPlayers = onSnapshot(playersRef, (querySnapshot) => {
            const playersList = querySnapshot.docs.map(doc => doc.data() as FirestorePlayer);
            playersList.sort((a, b) => (a.joinedAt?.toMillis() || 0) - (b.joinedAt?.toMillis() || 0));
            setPlayers(playersList);
        });

        return () => {
            unsubRoom();
            unsubPlayers();
        };

    }, [roomId, playSound, router, toast]);

    // This effect handles the local ticking of the countdown and triggers the game start
    useEffect(() => {
        if (countdown === null) return;

        if (countdown <= 0 && !startGameCalledRef.current) {
            startGameCalledRef.current = true;
            
            // Best-effort: tell server to start the game
            fetch(`/api/online/start-game`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId }),
            }).catch((err) => {
                console.error('Failed to trigger start-game, but listening for server state change:', err);
                // Fallback navigation if API fails, though listener should still catch it.
                if (!navigatedRef.current) {
                    setTimeout(() => {
                        if (!navigatedRef.current) router.push(`/room/${roomId}/play`);
                    }, 1500);
                }
            });
            return; // Stop the interval
        }

        const interval = setInterval(() => {
            setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(interval);
    }, [countdown, router, roomId]);
    
    if (isLoading || !currentUser) {
        return <Loader2 className="h-8 w-8 animate-spin text-white" />;
    }

    if (error) {
        return (
            <Card className="w-full max-w-md shadow-xl border-destructive">
                <CardHeader className="text-center">
                    <div className="flex justify-center items-center gap-2 text-destructive mb-2">
                        <AlertTriangle className="h-10 w-10"/>
                    </div>
                    <CardTitle>Error</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-muted-foreground">{error}</p>
                    <Button onClick={() => router.push('/online')} className="mt-4">Back to Tiers</Button>
                </CardContent>
            </Card>
        );
    }
    
    if (!roomData) return <Loader2 className="h-8 w-8 animate-spin text-white" />;

    const gameSettings = roomData.settings || DEFAULT_GAME_SETTINGS;
    
    const totalTicketsSold = players.reduce((acc, p) => acc + (p.tickets || 1), 0);
    const totalPrizePool = roomData.settings.ticketPrice * totalTicketsSold;
    
    const finalPrizes = calculatePrizes(totalPrizePool, gameSettings);
    const prizesForFormat = PRIZE_DEFINITIONS[gameSettings.prizeFormat || 'Format 1'] || [];

    const formatCoins = (amount: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

    return (
        <Card className="w-full max-w-md shadow-xl bg-card/80 backdrop-blur-sm border-accent/20">
            <CardHeader className="text-center">
                <div className="flex justify-center items-center gap-2 text-accent mb-2">
                    <Trophy className="h-12 w-12"/>
                </div>
                <CardTitle className="text-2xl text-foreground">Match Ready!</CardTitle>
                <CardDescription className="text-foreground/80">Here's what you're playing for. Game starts in...</CardDescription>
                 <div className="text-5xl font-bold text-primary">{countdown !== null ? countdown : '--'}</div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="text-center p-3 rounded-lg bg-primary/10">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Total Prize Pool</h3>
                    <div className="text-3xl font-bold flex items-center justify-center gap-2">
                        <Image src="/coin.png" alt="Coins" width={32} height={32}/>
                        {formatCoins(totalPrizePool)}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                         <h3 className="text-sm font-semibold text-center mb-2 flex items-center justify-center uppercase tracking-wider">
                            <Gift className="mr-2 h-4 w-4"/> Prizes
                        </h3>
                        {prizesForFormat.map(prizeName => {
                            const prizeAmount = finalPrizes[prizeName as PrizeType] || 0;
                            return (
                                <div key={prizeName} className="flex justify-between items-center text-xs p-1.5 bg-secondary/20 rounded-md">
                                    <span className="font-semibold text-secondary-foreground">{prizeName}</span>
                                    <div className="font-bold flex items-center gap-1">
                                        <Image src="/coin.png" alt="Coins" width={14} height={14} />
                                        <span>{formatCoins(prizeAmount)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                     <div>
                        <h3 className="text-sm font-semibold text-center mb-2 flex items-center justify-center uppercase tracking-wider">
                            <Users className="mr-2 h-4 w-4"/> Players ({players.length}/{gameSettings.lobbySize})
                        </h3>
                        <ScrollArea className="h-36 w-full rounded-md border p-1">
                            <div className="space-y-1">
                                {players.map((player) => (
                                    <div key={player.id} className="flex justify-between items-center text-xs p-1.5 bg-secondary/20 rounded-md">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <span className={cn("font-semibold truncate", player.id === currentUser.uid && "text-primary")}>
                                                {player.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 font-medium text-muted-foreground flex-shrink-0">
                                            <TicketIcon className="h-3.5 w-3.5" />
                                            <span>{player.tickets}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function PreGamePage() {
    return (
        <div className="flex flex-col items-center justify-center flex-grow p-4">
             <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-white" />}>
                <PreGameContent />
            </Suspense>
        </div>
    );
}
