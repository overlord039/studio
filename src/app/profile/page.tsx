
"use client";

import React, { type FormEvent, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Calendar, Mail, LogOut, X, Fingerprint, Gamepad2, Award, Loader2, Pencil, Check } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import type { PrizeType } from '@/types';
import { Input } from '@/components/ui/input';
import { PRIZE_DEFINITIONS, DEFAULT_GAME_SETTINGS } from '@/lib/constants';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';


const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.854 3.187-1.782 4.133-1.147 1.147-2.933 2.4-5.11 2.4-4.333 0-7.84-3.52-7.84-7.84s3.507-7.84 7.84-7.84c2.44 0 4.007 1.013 4.907 1.947l2.6-2.6C18.067.733 15.447 0 12.48 0 5.867 0 .333 5.393.333 12s5.534 12 12.147 12c3.553 0 6.227-1.173 8.24-3.253 2.133-2.133 2.84-5.24 2.84-7.667 0-.76-.053-1.467-.173-2.133H12.48z" />
    </svg>
);

const AVATAR_IMAGES = Array.from({ length: 8 }, (_, i) => `/userimages/ui${i + 1}.png`);

const AvatarSelectionDialog = ({ onSelect, children }: { onSelect: (src: string) => void; children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (src: string) => {
    onSelect(src);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose your Avatar</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-5 gap-4 py-4">
          {AVATAR_IMAGES.map((src) => (
            <button key={src} onClick={() => handleSelect(src)} className="aspect-square w-full rounded-full overflow-hidden border-2 border-transparent hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring">
              <Image src={src} alt={`Avatar option`} width={96} height={96} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};


export default function ProfilePage() {
  const { currentUser, loading, logout, linkGoogleAccount, isSigningIn, linkWithEmailLink, updateUserProfile, setLocalGuestAvatar, setLocalGuestUsername } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [emailForLink, setEmailForLink] = React.useState('');
  const [linkSent, setLinkSent] = React.useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(currentUser?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);


  const handleLinkEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (emailForLink && !linkSent) {
      const success = await linkWithEmailLink(emailForLink);
      if (success) {
        setLinkSent(true);
      }
    }
  };

  const handleAvatarSelect = async (src: string) => {
    if (currentUser) {
      if (currentUser.isGuest) {
        setLocalGuestAvatar(src);
      } else {
        await updateUserProfile({ photoURL: src });
      }
      toast({
        title: "Avatar Updated!",
        description: "Your new profile picture has been saved.",
      });
    }
  };

  const handleNameChange = async () => {
    const trimmedName = newDisplayName.trim();
    if (!currentUser || !trimmedName || trimmedName === currentUser.displayName) {
        setIsEditingName(false);
        return;
    }

    if (trimmedName.length < 3 || trimmedName.length > 20) {
        toast({ title: "Invalid Name", description: "Name must be between 3 and 20 characters.", variant: "destructive"});
        return;
    }
    
    setIsSavingName(true);

    try {
      if (!currentUser.isGuest) {
        const response = await fetch('/api/users/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: trimmedName }),
        });

        const data = await response.json();
        if (!response.ok || !data.isAvailable) {
          throw new Error(data.message || "This username is already taken.");
        }
      }

      // If username is available or user is a guest, proceed with the update
      if (currentUser.isGuest) {
        setLocalGuestUsername(trimmedName);
      } else {
        await updateUserProfile({ displayName: trimmedName });
      }
      
      setIsEditingName(false);
      toast({ title: "Name Updated", description: `Your name has been changed to ${trimmedName}.`});

    } catch (error) {
      console.error("Error updating username:", error);
      toast({
        title: "Update Failed",
        description: (error as Error).message || "Could not update your username.",
        variant: "destructive",
      });
    } finally {
      setIsSavingName(false);
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
    
    const prizesWon = currentUser.stats?.prizesWon;
    const orderedPrizeTypes = PRIZE_DEFINITIONS[DEFAULT_GAME_SETTINGS.prizeFormat];

    const prizesWonArray = prizesWon
        ? orderedPrizeTypes
            .map(prize => [prize, prizesWon[prize] ?? 0] as [string, number])
            .filter(([_, count]) => count > 0)
        : [];
    
    const canChangeName = currentUser.isGuest ? !currentUser.stats.usernameChanged : !currentUser.stats.usernameChanged;

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
                       <div className="relative">
                          <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shadow-lg">
                              <AvatarImage src={currentUser.photoURL || `https://placehold.co/128x128.png?text=${avatarFallback}`} alt={displayName} data-ai-hint="profile avatar"/>
                              <AvatarFallback className="text-3xl sm:text-4xl">{avatarFallback}</AvatarFallback>
                          </Avatar>
                           <AvatarSelectionDialog onSelect={handleAvatarSelect}>
                            <Button 
                              size="icon" 
                              variant="secondary" 
                              className="absolute bottom-0 right-0 rounded-full h-8 w-8 sm:h-10 sm:w-10 border-2 border-background"
                              title="Change avatar"
                            >
                              <Pencil className="h-4 w-4 sm:h-5 sm:w-5"/>
                              <span className="sr-only">Edit profile picture</span>
                            </Button>
                          </AvatarSelectionDialog>
                       </div>
                      <div className="space-y-1 mt-2 min-h-[4rem]">
                        {isEditingName ? (
                          <div className="flex items-center gap-2">
                              <Input 
                                  value={newDisplayName}
                                  onChange={(e) => setNewDisplayName(e.target.value)}
                                  className="text-2xl font-bold text-center h-12"
                                  maxLength={20}
                              />
                              <Button size="icon" onClick={handleNameChange} disabled={isSavingName}>
                                  {isSavingName ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4"/>}
                              </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h1 className="text-3xl sm:text-4xl font-bold">{displayName}</h1>
                            {canChangeName && (
                              <Button size="icon" variant="ghost" onClick={() => { setIsEditingName(true); setNewDisplayName(displayName); }}>
                                <Pencil className="h-5 w-5"/>
                              </Button>
                            )}
                          </div>
                        )}
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
                                <CardContent className="p-4 text-center text-muted-foreground">
                                  <p className="font-semibold">Coming Soon!</p>
                                  <p className="text-sm">Game statistics will be available here in a future update.</p>
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
