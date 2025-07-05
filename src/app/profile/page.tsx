
"use client";

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, Calendar, Mail, LogOut, X, Fingerprint, Gamepad2, Award } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import type { PrizeType } from '@/types';

export default function ProfilePage() {
  const { currentUser, loading, logout, linkGoogleAccount } = useAuth();
  const router = useRouter();

  const handleLinkAccount = async () => {
    // The context now handles all outcomes, including toasts for errors or success.
    await linkGoogleAccount();
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="animate-fade-in max-w-lg w-full">
          <Card className="shadow-xl overflow-hidden">
            <div className="bg-muted p-6 sm:p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-7 sm:h-8 w-32 sm:w-48" />
                </div>
              </div>
            </div>
            <CardContent className="p-6 space-y-6">
                <div className="space-y-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-8 w-full" />
                </div>
                 <div className="space-y-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-8 w-full" />
                </div>
                <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!currentUser) {
      return (
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mb-4 mx-auto" />
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">Please sign in to view your profile.</p>
        </div>
      );
    }

    const displayName = currentUser.displayName || 'Guest';
    const avatarFallback = displayName.substring(0, 2).toUpperCase();
    const joinDateFormatted = new Date(currentUser.createdAt).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).replace(/ /g, '-');
    
    const prizesWonArray = currentUser.stats?.prizesWon 
      ? Object.entries(currentUser.stats.prizesWon).filter(([_, count]) => count > 0)
      : [];


    return (
      <div className="animate-fade-in max-w-lg w-full">
          <Card className="shadow-xl overflow-hidden border-2 border-primary/20 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full z-10"
                onClick={() => router.back()}
                aria-label="Close profile"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
              <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-6 sm:p-8">
                  <div className="flex flex-col items-center gap-4 text-center">
                       <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shadow-lg">
                          <AvatarImage src={`https://placehold.co/128x128.png?text=${avatarFallback}`} alt={displayName} data-ai-hint="profile avatar"/>
                          <AvatarFallback className="text-3xl sm:text-4xl">{avatarFallback}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                          <h1 className="text-3xl sm:text-4xl font-bold">{displayName}</h1>
                          {currentUser.isGuest && <Badge variant="secondary">Guest Account</Badge>}
                      </div>
                  </div>
              </div>
              <CardContent className="p-6 space-y-6 bg-card">
                   {currentUser.isGuest ? (
                     <div className="text-center p-4 bg-secondary/30 rounded-lg">
                          <p className="font-semibold">You are playing as a guest.</p>
                          <p className="text-sm text-muted-foreground">Sign in to save your stats and progress!</p>
                          <Button className="mt-4" size="sm" onClick={handleLinkAccount}>Sign in with Google</Button>
                      </div>
                   ) : (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Account Details</h3>
                          <dl className="mt-2 divide-y divide-border">
                            <div className="py-3 flex justify-between items-center text-sm font-medium">
                              <dt className="text-muted-foreground flex items-center gap-2"><Fingerprint className="h-4 w-4" /> User ID</dt>
                              <dd className="text-foreground break-all text-right">{currentUser.uid}</dd>
                            </div>
                             <div className="py-3 flex justify-between items-center text-sm font-medium">
                              <dt className="text-muted-foreground flex items-center gap-2"><Mail className="h-4 w-4" /> Email</dt>
                              <dd className="text-foreground break-all text-right">{currentUser.email || 'No email provided'}</dd>
                            </div>
                             <div className="py-3 flex justify-between items-center text-sm font-medium">
                              <dt className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> Joined</dt>
                              <dd className="text-foreground">{joinDateFormatted}</dd>
                            </div>
                          </dl>
                        </div>

                        <div>
                            <h3 className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Statistics</h3>
                             <Card className="bg-secondary/30 mt-2">
                                <CardContent className="p-4 space-y-3">
                                  <div className="flex justify-between items-center text-sm">
                                      <div className="flex items-center gap-2 text-muted-foreground"><Gamepad2 className="h-4 w-4" /> Matches Played</div>
                                      <span className="font-bold text-lg">{currentUser.stats?.matchesPlayed ?? 0}</span>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-muted-foreground text-sm"><Award className="h-4 w-4" /> Prizes Won</div>
                                     {prizesWonArray.length > 0 ? (
                                      <ul className="space-y-1 pl-6 text-sm">
                                        {prizesWonArray.map(([prize, count]) => (
                                          <li key={prize} className="flex justify-between">
                                            <span className="text-muted-foreground">{prize}:</span>
                                            <span className="font-medium">{count}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-muted-foreground text-sm text-center pt-2">No prizes won yet. Keep playing!</p>
                                    )}
                                  </div>
                                </CardContent>
                             </Card>
                        </div>
                      </div>
                   )}
              </CardContent>
              <CardFooter className="bg-card pt-0 p-6">
                  <Button onClick={logout} variant="destructive" className="w-full">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                  </Button>
              </CardFooter>
          </Card>
      </div>
    );
  }

  return (
    <div className="flex-grow flex items-center justify-center p-4">
      {renderContent()}
    </div>
  );
}
