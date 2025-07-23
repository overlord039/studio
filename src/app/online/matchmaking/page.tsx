
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { OnlineGameTier, TierConfig } from '@/types';
import { Loader2, Users, Clock, ArrowLeft } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    
    const [tier, setTier] = useState<OnlineGameTier | null>(null);
    const [tierConfig, setTierConfig] = useState<TierConfig | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const tierParam = searchParams.get('tier') as OnlineGameTier;
        if (tierParam && TIERS[tierParam]) {
            setTier(tierParam);
            const config = TIERS[tierParam];
            setTierConfig(config);
            setTimeLeft(config.matchmakingTime);
        } else {
            setError("Invalid game tier specified.");
        }
    }, [searchParams]);

    useEffect(() => {
        if (error || !tierConfig) return;

        if (timeLeft <= 0) {
            // Here you would typically make an API call to a matchmaking service
            // and get a room ID. For this example, we'll simulate it.
            console.log("Matchmaking time ended. Starting game...");
            // In a real app: const roomId = await joinOrCreateOnlineRoom(tier);
            // router.push(`/room/${roomId}/play`);
            setError("Matchmaking service not implemented. This is a placeholder.");
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prevTime => prevTime - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, tier, tierConfig, error, router]);

    const progressPercentage = tierConfig ? ((tierConfig.matchmakingTime - timeLeft) / tierConfig.matchmakingTime) * 100 : 0;

    if (error) {
        return (
            <div className="text-center text-destructive">
                <p>{error}</p>
                <Button onClick={() => router.push('/online')} className="mt-4">Back to Tiers</Button>
            </div>
        );
    }
    
    if (!currentUser || !tierConfig) {
        return <Loader2 className="h-8 w-8 animate-spin" />;
    }

    return (
        <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Finding a Match...</CardTitle>
                <p className="text-muted-foreground">Tier: {tierConfig.name}</p>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex justify-center items-end gap-2">
                    <Clock className="h-10 w-10 text-primary" />
                    <span className="text-5xl font-bold">{timeLeft}s</span>
                </div>
                <Progress value={progressPercentage} className="w-full" />
                <div className="text-center text-sm text-muted-foreground">
                    <Users className="inline-block h-4 w-4 mr-2" />
                    <span>Looking for {tierConfig.roomSize} players</span>
                </div>
                <Button variant="outline" onClick={() => router.push('/online')} className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
                </Button>
            </CardContent>
        </Card>
    );
}


export default function MatchmakingPage() {
    return (
        <div className="flex flex-col items-center justify-center flex-grow p-4">
             <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                <MatchmakingContent />
            </Suspense>
        </div>
    );
}

