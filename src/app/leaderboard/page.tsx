
"use client";

import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Trophy, Star, AlertTriangle, ArrowLeft, Coins, Award, Info } from 'lucide-react';
import type { User } from '@/types';
import { BADGE_DEFINITIONS } from '@/lib/badges';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import type { RankingType } from '@/app/api/leaderboard/route';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
        <TableCell className="w-12 text-center p-2"><Skeleton className="h-5 w-5 rounded-full" /></TableCell>
        <TableCell className="font-medium p-2">
            <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                </div>
            </div>
        </TableCell>
        <TableCell className="text-right p-2"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
        <TableCell className="text-right p-2 hidden sm:table-cell"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
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
        <div className={cn("border overflow-hidden", isActive && "border-amber-400 shadow-md")}>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12 text-center p-2 text-xs sm:text-sm">Rank</TableHead>
                        <TableHead className="p-2 text-xs sm:text-sm">Player</TableHead>
                        {type === 'xp' && <TableHead className="text-right p-2 text-xs sm:text-sm">Total Wins</TableHead>}
                        {type === 'xp' && <TableHead className="text-right p-2 text-xs sm:text-sm" suppressHydrationWarning>Total Coins</TableHead>}
                        {type === 'wins' && <TableHead className="text-right p-2 text-xs sm:text-sm">Total Wins</TableHead>}
                        {type === 'coins' && <TableHead className="text-right p-2 text-xs sm:text-sm">Total Coins</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        Array.from({ length: 10 }).map((_, i) => <LeaderboardRowSkeleton key={i} />)
                    ) : (
                        players?.map((player, index) => {
                            const badge = getPlayerBadge(player);
                            const isCurrentUser = player.uid === currentUser?.uid;

                            const getRankClass = () => {
                                if (isCurrentUser) {
                                    if (index === 0) return 'bg-yellow-400/20';
                                    if (index === 1) return 'bg-gray-400/20';
                                    if (index === 2) return 'bg-orange-400/20';
                                    return 'bg-primary/20 border-y-2 border-primary';
                                }
                                if (index === 0) return 'bg-yellow-400/20';
                                if (index === 1) return 'bg-gray-400/20';
                                if (index === 2) return 'bg-orange-400/20';
                                return '';
                            };
                            return (
                                <TableRow key={player.uid} className={getRankClass()}>
                                    <TableCell className="w-12 text-center font-bold text-sm sm:text-lg p-2">
                                        {player.rank}
                                    </TableCell>
                                    <TableCell className="font-medium p-2 text-xs sm:text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{player.displayName}</span>
                                                {badge && (
                                                    <Image src={badge.icon} alt={badge.name} width={16} height={16} />
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    {type === 'xp' && <TableCell className="text-right font-bold p-2 text-xs sm:text-sm">{player.stats.totalPrizesWon || 0}</TableCell>}
                                    {type === 'xp' && <TableCell className="text-right font-bold p-2 text-xs sm:text-sm">
                                        <div className="flex items-center justify-end gap-1">
                                            <Image src="/coin.png" alt="Coins" width={14} height={14} data-ai-hint="gold coin" />
                                            <span>{player.stats.coins || 0}</span>
                                        </div>
                                    </TableCell>}
                                    {type === 'wins' && <TableCell className="text-right font-bold p-2 text-xs sm:text-sm">{player.stats.totalPrizesWon || 0}</TableCell>}
                                    {type === 'coins' && <TableCell className="text-right font-bold p-2 text-xs sm:text-sm">
                                        <div className="flex items-center justify-end gap-1">
                                            <Image src="/coin.png" alt="Coins" width={14} height={14} data-ai-hint="gold coin" />
                                            <span>{player.stats.coins || 0}</span>
                                        </div>
                                    </TableCell>}
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
    
    const RankingInfo = () => {
        switch (activeTab) {
            case 'xp':
                return (
                    <>
                        <DialogTitle>Top Players Ranking</DialogTitle>
                        <DialogDescription>
                            This leaderboard uses a normalized score to rank players, providing a balanced view of performance.
                            <br/><br/>
                            <strong>Score = (0.7 * Player Wins / Max Wins) + (0.3 * Player Coins / Max Coins)</strong>
                            <br/><br/>
                            This ensures that both wins and coins contribute fairly to the rank.
                        </DialogDescription>
                    </>
                );
            case 'wins':
                return (
                    <>
                        <DialogTitle>Most Wins Ranking</DialogTitle>
                        <DialogDescription>
                            This leaderboard ranks players based on their total number of prizes won. In case of a tie, the player with the higher level is ranked first.
                        </DialogDescription>
                    </>
                );
            case 'coins':
                 return (
                    <>
                        <DialogTitle>Coin Masters Ranking</DialogTitle>
                        <DialogDescription>
                           This leaderboard ranks players based on their total number of coins. In case of a tie, the player with the higher level is ranked first.
                        </DialogDescription>
                    </>
                );
            default:
                return null;
        }
    };

    const TabButton = ({ tab, label }: { tab: RankingType, label: string }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={cn(
                "relative flex-1 py-3 text-sm sm:text-base font-bold transition-all duration-300 group",
                activeTab === tab 
                    ? "bg-accent text-accent-foreground" 
                    : "bg-primary/80 text-primary-foreground hover:bg-primary"
            )}
        >
            <span className="relative z-10">{label}</span>
            <div
                className={cn(
                    "absolute inset-0 blur-md transition-opacity duration-300",
                    activeTab === tab
                        ? "bg-accent opacity-50"
                        : "bg-primary opacity-0 group-hover:opacity-30"
                )}
            ></div>
        </button>
    );
    
    return (
        <div className="container mx-auto py-8">
            <Card className="shadow-lg">
                <CardHeader className="text-center relative p-4">
                    <Link href="/" passHref className="absolute top-2 left-2">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <CardTitle className="text-3xl font-bold">Leaderboard</CardTitle>
                    <CardDescription>See who's leading the pack in HousieHub!</CardDescription>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="absolute top-2 right-2">
                                <Info className="h-5 w-5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <RankingInfo />
                            </DialogHeader>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent className="p-0 sm:p-4">
                    <div className="flex bg-muted overflow-hidden border-b-2 border-accent">
                        <TabButton tab="xp" label="Top Players" />
                        <TabButton tab="wins" label="Most Wins" />
                        <TabButton tab="coins" label="Coin Masters" />
                    </div>
                    {activeTab === 'xp' && <LeaderboardTable type="xp" title="Top Players" isActive={activeTab === 'xp'} />}
                    {activeTab === 'wins' && <LeaderboardTable type="wins" title="Most Wins" isActive={activeTab === 'wins'} />}
                    {activeTab === 'coins' && <LeaderboardTable type="coins" title="Coin Masters" isActive={activeTab === 'coins'} />}
                </CardContent>
            </Card>
        </div>
    );
}
