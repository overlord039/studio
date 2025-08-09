

"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { OnlineGameTier, TierConfig, Player, FirestoreRoom, FirestorePlayer } from '@/types';
import { Loader2, Users, Search, ArrowLeft, AlertTriangle, Bot } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSound } from '@/contexts/sound-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase/config';
import { onSnapshot, doc, collection } from "firebase/firestore";

const TIERS: Record<OnlineGameTier, TierConfig> = {
    quick: {
        name: "Quick", ticketPrice: 5, roomSize: 4, matchmakingTime: 15,
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
    
    const [roomData, setRoomData] = useState<FirestoreRoom | null>(null);
    const [players, setPlayers] = useState<FirestorePlayer[]>([]);
    const [roomId, setRoomId] = useState<string | null>(null);

    // Set initial tier/ticket config from URL params
    useEffect(() => {
        const tierParam = searchParams.get('tier') as OnlineGameTier;
        const ticketsParam = searchParams.get('tickets');
        if (tierParam && TIERS[tierParam] && ticketsParam) {
            setTier(tierParam);
            setTierConfig(TIERS[tierParam]);
            setTickets(parseInt(ticketsParam, 10));
        } else {
            setError("Invalid game tier or ticket count specified.");
        }
    }, [searchParams]);

    const findMatch = useCallback(async () => {
        if (!currentUser || !tier || isFindingMatch) return;
        
        setIsFindingMatch(true);
        playSound('start.wav');

        const player: Player = { id: currentUser.uid, name: currentUser.displayName || 'Guest' };

        try {
            const response = await fetch('/api/online/join-or-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player, tier, tickets }),
            });
            
            const responseData = await response.json();
            if (!response.ok) throw new Error(responseData.message || 'Failed to find a match.');
            
            if (typeof responseData.newCoinBalance === 'number') {
                updateUserStats({ coins: responseData.newCoinBalance });
            }
            setRoomId(responseData.roomId);
            
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsFindingMatch(false);
        }
    }, [currentUser, tier, tickets, isFindingMatch, playSound, updateUserStats]);

    useEffect(() => {
        if (tier && currentUser && !roomId && !isFindingMatch) {
            findMatch();
        }
    }, [tier, currentUser, roomId, isFindingMatch, findMatch]);

    // Firestore listener
    useEffect(() => {
        if (!roomId || !db) return;

        const roomRef = doc(db, "rooms", roomId);
        const playersRef = collection(db, "rooms", roomId, "players");

        const unsubRoom = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as FirestoreRoom;
                setRoomData(data);
                if(data.status === 'pre-game') {
                    router.push(`/online/pre-game?roomId=${roomId}`);
                }
            } else {
                setError("Room was deleted or could not be found.");
            }
        });
        
        const unsubPlayers = onSnapshot(playersRef, (querySnapshot) => {
            const playersList = querySnapshot.docs.map(doc => doc.data() as FirestorePlayer);
            setPlayers(playersList);
        });

        return () => {
            unsubRoom();
            unsubPlayers();
        };
    }, [roomId, router]);

    // This effect is responsible for triggering the bot-fill when the timer expires
    useEffect(() => {
        if (roomData?.status === 'waiting' && roomData.timerEnd) {
            const timerEndMs = roomData.timerEnd.toMillis();
            const timeNowMs = Date.now();

            if (timeNowMs >= timerEndMs) {
                // Timer is up, any client can trigger the fill
                fetch(`/api/online/start-game`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId: roomData.id }),
                }).catch(err => console.error("Failed to trigger start-game:", err));
            }
        }
    }, [roomData]);

    const handleCancel = async () => {
        // Implement cancellation logic if needed (e.g., removing player from room)
        router.push('/online');
    };
    
    if (!currentUser || !tierConfig) {
        return <Loader2 className="h-8 w-8 animate-spin text-white" />;
    }

    if (error) {
        return (
            <Card className="w-full max-w-md shadow-xl border-destructive">
                <CardHeader className="text-center">
                    <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-2"/>
                    <CardTitle>Matchmaking Failed</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-muted-foreground">{error}</p>
                    <Button onClick={() => router.push('/online')} className="mt-4">Back to Tiers</Button>
                </CardContent>
            </Card>
        );
    }
    
    const timerEndMs = roomData?.timerEnd?.toMillis() ?? (Date.now() + tierConfig.matchmakingTime * 1000);
    const countdown = Math.max(0, Math.round((timerEndMs - Date.now()) / 1000));
    const progressPercentage = roomData ? ((tierConfig.matchmakingTime - countdown) / tierConfig.matchmakingTime) * 100 : 0;
    const playersFound = roomData?.playersCount || (isFindingMatch || roomId ? 1 : 0);

    return (
        <Card className="w-full max-w-md shadow-xl bg-card/80 backdrop-blur-sm border-accent/20">
            <CardHeader className="text-center">
                <Search className="h-10 w-10 mx-auto mb-2 text-primary"/>
                <CardTitle className="text-2xl text-foreground">Finding a Match...</CardTitle>
                <CardDescription className="text-foreground/80">Tier: {tierConfig.name} ({tickets} {tickets === 1 ? 'ticket' : 'tickets'})</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex flex-col items-center">
                <div className="w-full space-y-2">
                    <Progress value={progressPercentage} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Searching...</span>
                        <span>Est. time: {countdown}s</span>
                    </div>
                </div>

                <div className="w-full space-y-2 text-center">
                    <div className="text-lg text-foreground/90 font-semibold flex items-center justify-center gap-2">
                        <Users className="h-5 w-5" />
                        <span>{playersFound} / {tierConfig.roomSize} players found</span>
                    </div>
                    {players.length > 0 && (
                        <ScrollArea className="h-24 w-full rounded-md border bg-secondary/30 p-2">
                            <div className="space-y-1.5">
                                {players.map((player) => (
                                     <div key={player.id} className={cn("text-sm font-medium text-left px-2 flex items-center gap-2", player.id === currentUser.uid && "text-primary")}>
                                        {player.type === 'bot' && <Bot className="h-4 w-4" />}
                                        <span>{player.name}</span>
                                     </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
                
                <Button variant="outline" onClick={handleCancel} className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Cancel Search
                </Button>
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
