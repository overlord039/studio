"use client";

import React, { type FormEvent } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, Calendar, Mail, LogOut, X, Fingerprint, Gamepad2, Award, Loader2 } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import type { PrizeType } from '@/types';
import { Input } from '@/components/ui/input';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.854 3.187-1.782 4.133-1.147 1.147-2.933 2.4-5.11 2.4-4.333 0-7.84-3.52-7.84-7.84s3.507-7.84 7.84-7.84c2.44 0 4.007 1.013 4.907 1.947l2.6-2.6C18.067.733 15.447 0 12.48 0 5.867 0 .333 5.393.333 12s5.534 12 12.147 12c3.553 0 6.227-1.173 8.24-3.253 2.133-2.133 2.84-5.24 2.84-7.667 0-.76-.053-1.467-.173-2.133H12.48z" />
    </svg>
);

export default function ProfilePage() {
  const { currentUser, loading, logout, linkGoogleAccount, isSigningIn, linkWithEmailLink } = useAuth();
  const router = useRouter();

  const [emailForLink, setEmailForLink] = React.useState('');
  const [linkSent, setLinkSent] = React.useState(false);

  const handleLinkEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (emailForLink && !linkSent) {
      const success = await linkWithEmailLink(emailForLink);
      if (success) {
        setLinkSent(true);
      }
    }
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
                onClick={() => router.push('/')}
                aria-label="Close profile"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
              <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-6 sm:p-8">
                  <div className="flex flex-col items-center gap-2 text-center">
                       <div className="text-xs text-muted-foreground font-mono bg-background/50 px-2 py-1 rounded-full mb-2">ID: {currentUser.uid}</div>
                       <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shadow-lg">
                          <AvatarImage src={`https://placehold.co/128x128.png?text=${avatarFallback}`} alt={displayName} data-ai-hint="profile avatar"/>
                          <AvatarFallback className="text-3xl sm:text-4xl">{avatarFallback}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1 mt-2">
                          <h1 className="text-3xl sm:text-4xl font-bold">{displayName}</h1>
                          {currentUser.isGuest && <Badge variant="secondary">Guest Account</Badge>}
                      </div>
                  </div>
              </div>
              <CardContent className="p-6 space-y-6 bg-card">
                   {currentUser.isGuest ? (
                     <div className="text-center p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-500/30">
                        <p className="font-semibold">You are playing as a guest.</p>
                        <p className="text-sm text-muted-foreground mb-3">
                            Link your account to save your stats and play on any device.
                        </p>
                        <div className="space-y-3">
                            <Button
                                onClick={linkGoogleAccount}
                                disabled={!!isSigningIn}
                                className="bg-white text-black hover:bg-gray-200 w-full"
                            >
                                {isSigningIn === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                                Link Google Account
                            </Button>

                            <div className="relative flex items-center justify-center my-2">
                                <div className="flex-grow border-t border-yellow-400/50"></div>
                                <span className="flex-shrink mx-2 text-xs text-muted-foreground">OR</span>
                                <div className="flex-grow border-t border-yellow-400/50"></div>
                            </div>
                            
                            <form onSubmit={handleLinkEmailSubmit} className="space-y-2">
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={emailForLink}
                                        onChange={(e) => setEmailForLink(e.target.value)}
                                        disabled={!!isSigningIn || linkSent}
                                        required
                                        className="bg-background/50 border-input pl-9 text-sm h-10 focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                                <Button type="submit" variant="secondary" className="w-full" disabled={!!isSigningIn || !emailForLink || linkSent}>
                                    {isSigningIn === 'email' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {linkSent ? 'Link Sent! Check your inbox.' : 'Link with Email'}
                                </Button>
                            </form>
                        </div>
                    </div>
                   ) : (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Account Details</h3>
                          <dl className="mt-2 divide-y divide-border">
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
