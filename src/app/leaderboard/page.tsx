
"use client";

import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Trophy, Star, AlertTriangle, ArrowLeft, Coins, Award } from 'lucide-react';
import type { User } from '@/types';
import { BADGE_DEFINITIONS } from '@/lib/badges';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import type { RankingType } from '@/app/api/leaderboard/route';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


interface LeaderboardPlayer extends User {
    rank: number;
}

const fetchLeaderboard = async (type: RankingType): Promise<LeaderboardPlayer[]> => {
    const res = await fetch(`/api/leaderboard?type=${type}`);
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
        <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
    </TableRow>
);


const LeaderboardTable = ({ type, title, isActive }: { type: RankingType, title: string, isActive: boolean }) => {
    const { currentUser } = useAuth();
    const { data: players, error, isLoading } = useQuery<LeaderboardPlayer[], Error>({
        queryKey: ['leaderboard', type],
        queryFn: () => fetchLeaderboard(type),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const getPlayerBadge = (player: LeaderboardPlayer) => {
        const badgeOrder = ['PLATINUM_PLAYER', 'GOLD_MASTER', 'SILVER_VETERAN', 'BRONZE_COMPETITOR', 'NOVICE'];
        const highestBadge = badgeOrder.map(key => BADGE_DEFINITIONS[key]).find(badge => player.stats.badges?.includes(badge.name));
        return highestBadge;
    };
    
    const getStatForType = (player: LeaderboardPlayer) => {
        switch(type) {
            case 'wins':
                return { value: player.stats.totalPrizesWon || 0, icon: <Award className="h-4 w-4 text-primary" /> };
            case 'coins':
                return { value: player.stats.coins, icon: <Image src="/coin.png" alt="Coins" width={16} height={16} data-ai-hint="gold coin" /> };
            case 'xp':
            default:
                return { value: player.stats.level || 0, icon: <Star className="h-4 w-4 text-primary" /> };
        }
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error loading {title}</AlertTitle>
                <AlertDescription>
                    {error.message || "Could not load the leaderboard. Please try again later."}
                </AlertDescription>
            </Alert>
        );
    }
    
    return (
        <div className={cn("border rounded-lg transition-all", isActive && "border-accent shadow-md")}>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12 text-center">Rank</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead className="text-right">{title}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        Array.from({ length: 10 }).map((_, i) => <LeaderboardRowSkeleton key={i} />)
                    ) : (
                        players?.map((player, index) => {
                            const badge = getPlayerBadge(player);
                            const isCurrentUser = player.uid === currentUser?.uid;
                            const stat = getStatForType(player);
                            return (
                                <TableRow key={player.uid} className={cn(
                                    isCurrentUser ? 'bg-primary/20' : '',
                                    !isCurrentUser && index === 0 && 'bg-yellow-400/20',
                                    !isCurrentUser && index === 1 && 'bg-gray-400/20',
                                    !isCurrentUser && index === 2 && 'bg-orange-400/20',
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
                                    <TableCell className="text-right">
                                        <div className="font-bold flex items-center justify-end gap-1">
                                            {stat.icon}
                                            {stat.value}
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
    );
};


export default function LeaderboardPage() {
    const [activeTab, setActiveTab] = useState<RankingType>('xp');
    
    return (
        <div className="container mx-auto py-8">
            <Card className="shadow-lg">
                <CardHeader className="text-center">
                    <div className="flex justify-center items-center gap-2 text-primary mb-2">
                        <Trophy className="h-10 w-10" />
                    </div>
                    <CardTitle className="text-3xl font-bold">Leaderboards</CardTitle>
                    <CardDescription>See who's leading the pack in HousieHub!</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="xp" className="w-full" onValueChange={(value) => setActiveTab(value as RankingType)}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="xp" className="data-[state=active]:border-b-2 data-[state=active]:border-accent">Top Players</TabsTrigger>
                            <TabsTrigger value="wins" className="data-[state=active]:border-b-2 data-[state=active]:border-accent">Most Wins</TabsTrigger>
                            <TabsTrigger value="coins" className="data-[state=active]:border-b-2 data-[state=active]:border-accent">Coin Masters</TabsTrigger>
                        </TabsList>
                        <TabsContent value="xp" className="mt-4">
                            <LeaderboardTable type="xp" title="Level" isActive={activeTab === 'xp'} />
                        </TabsContent>
                        <TabsContent value="wins" className="mt-4">
                           <LeaderboardTable type="wins" title="Total Wins" isActive={activeTab === 'wins'} />
                        </TabsContent>
                        <TabsContent value="coins" className="mt-4">
                           <LeaderboardTable type="coins" title="Coins" isActive={activeTab === 'coins'} />
                        </TabsContent>
                    </Tabs>
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
