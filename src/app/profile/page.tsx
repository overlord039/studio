"use client";

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, Calendar, Mail } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Mock data - replace with actual data fetching for a logged-in user
const userStats = {
  joinDate: "2024-05-20T12:00:00.000Z",
};


export default function ProfilePage() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="animate-fade-in max-w-lg mx-auto">
        <Card className="shadow-xl overflow-hidden">
          <div className="bg-muted p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <Skeleton className="h-32 w-32 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
              </div>
            </div>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-5 w-40" />
            </div>
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
        <p className="text-muted-foreground mb-6">Please log in to view your profile.</p>
        <Link href="/auth/login" passHref>
          <Button size="lg">Login</Button>
        </Link>
      </div>
    );
  }

  const avatarFallback = currentUser.username.substring(0, 2).toUpperCase();
  const joinDateFormatted = new Date(userStats.joinDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace(/ /g, '-');


  return (
    <div className="animate-fade-in max-w-lg mx-auto">
        <Card className="shadow-xl overflow-hidden border-2 border-primary/20">
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-8">
                <div className="flex flex-col items-center gap-4 text-center">
                     <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                        <AvatarImage src={`https://placehold.co/128x128.png?text=${avatarFallback}`} alt={currentUser.username} data-ai-hint="profile avatar"/>
                        <AvatarFallback className="text-4xl">{avatarFallback}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <h1 className="text-4xl font-bold">{currentUser.username}</h1>
                    </div>
                </div>
            </div>
            <CardContent className="p-6 space-y-4 bg-card">
                 <div className="flex items-center gap-3 text-base">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{currentUser.email}</span>
                </div>
                <div className="flex items-center gap-3 text-base">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                     <span className="text-muted-foreground">Joined:</span>
                    <span className="font-medium">{joinDateFormatted}</span>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
