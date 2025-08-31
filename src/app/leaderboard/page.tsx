
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Trophy, Star, AlertTriangle, ArrowLeft } from 'lucide-react';
import type { User } from '@/types';
import { BADGE_DEFINITIONS } from '@/lib/badges';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface LeaderboardPlayer extends User {
    rank: number;
}

const fetchLeaderboard = async (): Promise<LeaderboardPlayer[]> => {
    const res = await fetch('/api/leaderboard');
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch leaderboard data.');
    }
    return res.json();
};

const LeaderboardRowSkeleton = () => (
    <TableRow>
        <TableCell className="w-12 text-center"><Skeleton className="h-5 w-5 rounded-full" /></TableCell>
        <TableCell className="font-medium">
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                </div>
            </div>
        </TableCell>
        <TableCell className="text-center hidden sm:table-cell"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
    </TableRow>
);

export default function LeaderboardPage() {
    const { data: players, error, isLoading } = useQuery<LeaderboardPlayer[], Error>({
        queryKey: ['leaderboard'],
        queryFn: fetchLeaderboard,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const getPlayerBadge = (player: LeaderboardPlayer) => {
        const badgeOrder = ['PLATINUM_PLAYER', 'GOLD_MASTER', 'SILVER_VETERAN', 'BRONZE_COMPETITOR', 'NOVICE'];
        const highestBadge = badgeOrder.map(key => BADGE_DEFINITIONS[key]).find(badge => player.stats.badges?.includes(badge.name));
        return highestBadge;
    }

    return (
        <div className="container mx-auto py-8">
            <Card className="shadow-lg">
                <CardHeader className="text-center">
                    <div className="flex justify-center items-center gap-2 text-primary mb-2">
                        <Trophy className="h-10 w-10" />
                    </div>
                    <CardTitle className="text-3xl font-bold">Leaderboard</CardTitle>
                    <CardDescription>See who is leading the pack in HousieHub!</CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>
                                {error.message || "Could not load the leaderboard. Please try again later."}
                            </AlertDescription>
                        </Alert>
                    )}
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12 text-center">Rank</TableHead>
                                    <TableHead>Player</TableHead>
                                    <TableHead className="text-center hidden sm:table-cell">Level</TableHead>
                                    <TableHead className="text-right">XP</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 10 }).map((_, i) => <LeaderboardRowSkeleton key={i} />)
                                ) : (
                                    players?.map((player, index) => {
                                        const badge = getPlayerBadge(player);
                                        return (
                                            <TableRow key={player.uid} className={cn(
                                                index === 0 && 'bg-yellow-400/20',
                                                index === 1 && 'bg-gray-400/20',
                                                index === 2 && 'bg-orange-400/20',
                                            )}>
                                                <TableCell className="w-12 text-center font-bold text-lg">
                                                    {player.rank}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10 border-2">
                                                            <AvatarImage src={player.photoURL || undefined} alt={player.displayName || 'Player'} />
                                                            <AvatarFallback>{player.displayName?.charAt(0) || 'P'}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold">{player.displayName}</span>
                                                            {badge && (
                                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                    <Image src={badge.icon} alt={badge.name} width={14} height={14} />
                                                                    <span>{badge.name}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center hidden sm:table-cell">
                                                    <div className="font-bold text-primary">{player.stats.level}</div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="font-bold flex items-center justify-end gap-1">
                                                        <Star className="h-4 w-4 text-yellow-500" />
                                                        {player.stats.xp.toLocaleString()}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                         { !isLoading && !players?.length && (
                            <div className="text-center p-8 text-muted-foreground">
                                The leaderboard is empty. Be the first to make your mark!
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
             <div className="mt-8 text-center">
                <Link href="/" passHref>
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4"/>
                        Back to Home
                    </Button>
                </Link>
            </div>
        </div>
    );
}

