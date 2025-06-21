
"use client";

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, BarChart2, Percent, Crown, TrendingUp, AlertTriangle } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Mock data - replace with actual data fetching for a logged-in user
const defaultUserStats = {
  totalMatchesPlayed: 150,
  matchesWon: {
    jaldi5: 25,
    topLine: 15,
    middleLine: 12,
    bottomLine: 10,
    fullHouse: 13,
  },
  currentWinningStreak: 3,
  winRate: 45, // Percentage
};

export default function ProfilePage() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="space-y-8">
        <Card className="shadow-xl">
          <CardHeader className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
            <Skeleton className="h-24 w-24 rounded-full mb-4 sm:mb-0 sm:mr-6" />
            <div>
              <Skeleton className="h-10 w-48 mb-2" />
              <Skeleton className="h-6 w-64" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-xl">
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-6">Please log in to view your profile and game statistics.</p>
        <Link href="/auth/login" passHref>
          <Button size="lg">Login</Button>
        </Link>
      </div>
    );
  }

  // Use defaultUserStats for now, in a real app, this would be fetched for currentUser
  const userStats = defaultUserStats; 
  const totalWins = Object.values(userStats.matchesWon).reduce((sum, count) => sum + count, 0);
  const username = currentUser.username;
  const avatarFallback = username.substring(0, 2).toUpperCase();

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
          <Avatar className="h-24 w-24 mb-4 sm:mb-0 sm:mr-6 ring-4 ring-primary ring-offset-2 ring-offset-background">
            {/* In a real app, user.avatarUrl would come from currentUser */}
            <AvatarImage src={`https://placehold.co/100x100.png?text=${avatarFallback}`} alt={username} data-ai-hint="profile avatar" />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-4xl font-bold">{username}</CardTitle>
            <CardDescription className="text-lg">Your Housie Journey and Achievements</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            <StatCard icon={<BarChart2 />} title="Total Matches Played" value={userStats.totalMatchesPlayed.toString()} />
            <StatCard icon={<Crown />} title="Total Wins" value={totalWins.toString()} />
            <StatCard icon={<Percent />} title="Win Rate" value={`${userStats.winRate}%`} />
            <StatCard icon={<TrendingUp />} title="Current Winning Streak" value={userStats.currentWinningStreak.toString()} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex items-center"><Award className="mr-2 text-accent" /> Wins Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(userStats.matchesWon).map(([prize, count]) => (
            <PrizeStatCard key={prize} prizeName={formatPrizeName(prize)} count={count} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
}

function StatCard({ icon, title, value }: StatCardProps) {
  return (
    <Card className="bg-secondary/30 p-4 rounded-lg flex items-center space-x-4">
      <div className="text-primary p-3 bg-primary/10 rounded-full">
        {React.cloneElement(icon as React.ReactElement, { className: "h-6 w-6" })}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </Card>
  );
}

interface PrizeStatCardProps {
  prizeName: string;
  count: number;
}
function PrizeStatCard({ prizeName, count }: PrizeStatCardProps) {
    return (
      <div className="p-4 bg-background rounded-lg border border-border flex justify-between items-center">
        <span className="font-medium text-foreground/80">{prizeName}</span>
        <span className="font-bold text-lg text-primary">{count}</span>
      </div>
    );
}

function formatPrizeName(prizeKey: string): string {
  // Adjusted to better match PRIZE_TYPES format (e.g. "Jaldi 5", "Full House")
  if (prizeKey === "jaldi5") return "Jaldi 5";
  if (prizeKey === "fullHouse") return "Full House";

  return prizeKey
    .replace(/([A-Z])/g, ' $1') // Add space before uppercase letters
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
