"use client";

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, Pencil, Calendar, Hash, ClipboardCopy } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/hooks/use-toast";

// Mock data - replace with actual data fetching for a logged-in user
const userStats = {
  joinDate: "2024-05-20T12:00:00.000Z",
  playerId: "1F7666CD4199D647",
};


export default function ProfilePage() {
  const { currentUser, loading } = useAuth();
  const { toast } = useToast();

  const handleCopyId = () => {
    navigator.clipboard.writeText(userStats.playerId);
    toast({
      title: "Player ID Copied!",
      description: "You can now share your ID with friends.",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full rounded-lg" /> 
        <Card className="shadow-lg">
          <CardHeader className="flex flex-col items-center space-y-4 text-center">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-5 w-48" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-2">
            <Skeleton className="h-6 w-64" />
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

  const username = currentUser.username;
  const avatarFallback = username.substring(0, 2).toUpperCase();
  const joinDateFormatted = new Date(userStats.joinDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace(/ /g, '-');


  return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-primary text-primary-foreground text-center py-4 rounded-lg shadow-lg relative overflow-hidden">
            <h1 className="text-4xl font-extrabold tracking-wider" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>My Profile</h1>
        </div>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-col items-center space-y-4 text-center">
          <Avatar className="h-24 w-24 ring-4 ring-primary ring-offset-2 ring-offset-background">
            <AvatarImage src={`https://placehold.co/100x100.png?text=${avatarFallback}`} alt={username} data-ai-hint="profile avatar" />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <div className="relative">
            <CardTitle className="text-4xl font-bold flex items-center gap-2">
              {username}
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <Pencil className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription className="flex items-center justify-center gap-1 text-base">
              <Calendar className="h-4 w-4" /> Joined on: {joinDateFormatted}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-2">
            <div className="flex items-center gap-2 rounded-md bg-secondary p-2 border">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm">Player ID: {userStats.playerId}</span>
                <Button variant="ghost" size="icon" onClick={handleCopyId} className="h-7 w-7">
                    <ClipboardCopy className="h-4 w-4" />
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
