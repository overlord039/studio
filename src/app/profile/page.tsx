
"use client";

import React, { type FormEvent, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Calendar, Mail, LogOut, X, Fingerprint, Gamepad2, Award, Loader2, Pencil, Check, Star, Shield, Badge as BadgeIcon, Medal, Trophy, CheckCircle } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import type { PrizeType, UserStats } from '@/types';
import { PRIZE_DEFINITIONS, DEFAULT_GAME_SETTINGS, getXpForNextLevel } from '@/lib/constants';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { BADGE_DEFINITIONS, type Badge as BadgeType } from '@/lib/badges';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';


const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.854 3.187-1.782 4.133-1.147 1.147-2.933 2.4-5.11 2.4-4.333 0-7.84-3.52-7.84-7.84s3.507-7.84 7.84-7.84c2.44 0 4.007 1.013 4.907 1.947l2.6-2.6C18.067.733 15.447 0 12.48 0 5.867 0 .333 5.393.333 12s5.534 12 12.147 12c3.553 0 6.227-1.173 8.24-3.253 2.133-2.133 2.84-5.24 2.84-7.667 0-.76-.053-1.467-.173-2.133H12.48z" />
    </svg>
);

const AVATAR_IMAGES = Array.from({ length: 8 }, (_, i) => `/userimages/ui${i + 1}.png`);

const BadgeImageDialog = ({ src, alt }: { src: string, alt: string }) => (
    <DialogContent className="p-0 bg-transparent border-none shadow-none w-auto flex items-center justify-center">
        <Image src={src} alt={alt} width={256} height={256} className="rounded-lg" />
    </DialogContent>
);

const AvatarSelectionDialog = ({ onSelect, children, disabled }: { onSelect: (src: string) => void; children: React.ReactNode, disabled?: boolean }) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (src: string) => {
    onSelect(src);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild disabled={disabled}>{children}</DialogTrigger>
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

const USERNAME_CHANGE_COSTS = [0, 100, 500]; // 1st change free, 2nd is 100, 3rd is 500

export default function ProfilePage() {
  const { currentUser, loading, logout, linkGoogleAccount, isSigningIn, updateUserProfile, setLocalGuestAvatar, setLocalGuestUsername } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isEditingName, setIsEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(currentUser?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);


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

  const handleInitiateNameChange = () => {
    if (!currentUser) return;
    const changeCount = currentUser.stats?.usernameChangeCount || 0;
    const cost = USERNAME_CHANGE_COSTS[changeCount] || 500;
    const userCoins = currentUser.stats.coins || 0;

    if (cost > 0 && userCoins < cost) {
      toast({
        title: "Not Enough Coins",
        description: `You need ${cost} coins to change your username.`,
        variant: "destructive"
      });
      return;
    }
    
    // If there is a cost, the dialog will be shown. If free, this just proceeds.
    // The actual state change to show the input is now in the onConfirm function for the dialog.
    setIsEditingName(true); 
    setNewDisplayName(currentUser.displayName || ''); 
    setUsernameError(null);
  };


  const handleNameChange = async () => {
    const trimmedName = newDisplayName.trim();
    if (!currentUser || !trimmedName || trimmedName === currentUser.displayName) {
        setIsEditingName(false);
        setUsernameError(null);
        return;
    }

    if (trimmedName.length < 4 || trimmedName.length > 12) {
        setUsernameError("Name must be between 4 and 12 characters.");
        return;
    }

    const changeCount = currentUser.stats?.usernameChangeCount || 0;
    const cost = USERNAME_CHANGE_COSTS[changeCount] || 500;
    const userCoins = currentUser.stats.coins || 0;

    if (userCoins < cost) {
        setUsernameError(`You need ${cost} coins to change your name again.`);
        return;
    }
    
    setIsSavingName(true);
    setUsernameError(null);

    try {
      if (currentUser.isGuest) {
        setLocalGuestUsername(trimmedName);
      } else {
          const checkResponse = await fetch('/api/users/check-username', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: trimmedName }),
          });
          const checkData = await checkResponse.json();

          if (!checkResponse.ok || !checkData.isAvailable) {
              throw new Error(checkData.message || "This username is already taken.");
          }

          const updateResponse = await fetch('/api/users/check-username', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  username: trimmedName, 
                  userId: currentUser.uid, 
                  oldUsername: currentUser.displayName,
              }),
          });

          const updateData = await updateResponse.json();
          if (!updateResponse.ok || !updateData.success) {
              throw new Error(updateData.message || "Could not reserve username.");
          }
          
          await updateUserProfile({ displayName: trimmedName });
      }
      
      setIsEditingName(false);
      toast({ title: "Name Updated", description: `Your name has been changed to ${trimmedName}.`});

    } catch (error) {
      console.error("Error updating username:", error);
      setUsernameError((error as Error).message);
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
    
    const prizesWon = currentUser.stats?.prizesWon;
    const orderedPrizeTypes = PRIZE_DEFINITIONS[DEFAULT_GAME_SETTINGS.prizeFormat];

    const prizesWonArray = prizesWon
        ? orderedPrizeTypes
            .map(prize => [prize, prizesWon[prize] ?? 0] as [string, number])
        : [];
    
    const totalPrizesWon = currentUser.stats?.totalPrizesWon || 0;
    
    const usernameChangeCount = currentUser.stats.usernameChangeCount || 0;
    const changeCost = USERNAME_CHANGE_COSTS[usernameChangeCount] || 500;

    const currentLevel = currentUser.stats?.level || 1;
    const currentXp = currentUser.stats?.xp || 0;
    const xpForNextLevel = getXpForNextLevel(currentLevel);
    const xpProgressPercentage = Math.min(100, (currentXp / xpForNextLevel) * 100);

    const badgeOrder = ['PLATINUM_PLAYER', 'GOLD_MASTER', 'SILVER_VETERAN', 'BRONZE_COMPETITOR', 'NOVICE'];
    const highestBadge = badgeOrder.map(key => BADGE_DEFINITIONS[key]).find(badge => currentUser.stats.badges?.includes(badge.name));


    const EditButtonWrapper = ({ children }: { children: React.ReactNode }) => {
        if (changeCost > 0) {
            return (
                <AlertDialog>
                    <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Change Username?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will cost <span className="font-bold">{changeCost} coins</span>. This action cannot be undone. Are you sure you want to continue?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleInitiateNameChange}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            );
        }
        return <div onClick={handleInitiateNameChange}>{children}</div>;
    };


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
                <div className="flex flex-col items-center gap-4">
                   <div className="flex items-center gap-2">
                      {currentUser.isGuest && <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-auto">Guest</Badge>}
                      <div className="text-xs text-muted-foreground font-mono bg-background/50 px-2 py-1 rounded-full">ID: {currentUser.uid}</div>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-center w-full">
                      <div className="relative flex-shrink-0">
                          <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-lg">
                              <AvatarImage src={currentUser.photoURL || `https://placehold.co/128x128.png?text=${avatarFallback}`} alt={displayName} data-ai-hint="profile avatar"/>
                              <AvatarFallback className="text-3xl">{avatarFallback}</AvatarFallback>
                          </Avatar>
                           <AvatarSelectionDialog onSelect={handleAvatarSelect}>
                            <Button 
                              size="icon" 
                              variant="secondary" 
                              className="absolute bottom-0 right-0 rounded-full h-7 w-7 border-2 border-background"
                              title="Change avatar"
                            >
                              <Pencil className="h-3.5 w-3.5"/>
                              <span className="sr-only">Edit profile picture</span>
                            </Button>
                          </AvatarSelectionDialog>
                      </div>

                      <div className="flex flex-col items-start gap-2">
                          {isEditingName ? (
                            <div className="w-full flex flex-col items-start">
                                <div className="flex w-full max-w-xs items-center gap-2">
                                  <Input 
                                      value={newDisplayName}
                                      onChange={(e) => {
                                          setNewDisplayName(e.target.value);
                                          if (usernameError) setUsernameError(null);
                                      }}
                                      className={cn(
                                          "text-2xl font-bold h-12",
                                          usernameError && "border-destructive focus-visible:ring-destructive"
                                      )}
                                      maxLength={12}
                                  />
                                  <Button size="icon" onClick={handleNameChange} disabled={isSavingName}>
                                      {isSavingName ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4"/>}
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)}>
                                      <X className="h-4 w-4"/>
                                  </Button>
                                </div>
                                {usernameError && <p className="text-xs text-destructive mt-1">{usernameError}</p>}
                                {changeCost > 0 && <p className="text-xs text-muted-foreground mt-1">This change will cost {changeCost} coins.</p>}
                            </div>
                          ) : (
                            <div className="flex flex-col items-start gap-2">
                              <div className="flex items-baseline gap-1">
                                <h1 className="text-2xl sm:text-3xl font-bold">{displayName}</h1>
                                 <EditButtonWrapper>
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-5 w-5 sm:h-6 sm:w-6" 
                                        title={changeCost > 0 ? `Edit username for ${changeCost} coins` : 'Edit username for free'}
                                    >
                                        <Pencil className="h-3.5 w-3.5"/>
                                    </Button>
                                </EditButtonWrapper>
                              </div>
                               <div className="flex items-center gap-2">
                                  <div className="bg-amber-400/20 border border-amber-500/30 text-amber-800 dark:text-amber-300 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full flex items-center gap-2">
                                    <Image src="/coin.png" alt="Coins" width={16} height={16} className="sm:w-5 sm:h-5" />
                                    <span className="font-bold text-base sm:text-lg">{currentUser.stats?.coins || 0}</span>
                                  </div>
                                   {highestBadge && (
                                    <Dialog>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <DialogTrigger asChild>
                                              <button className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring rounded-full">
                                                <div className="bg-secondary p-1 rounded-full border">
                                                  <Image src={highestBadge.icon} alt={highestBadge.name} width={28} height={28} />
                                                </div>
                                              </button>
                                            </DialogTrigger>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="font-semibold">{highestBadge.name}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                      <BadgeImageDialog src={highestBadge.icon} alt={highestBadge.name} />
                                    </Dialog>
                                  )}
                               </div>
                            </div>
                          )}
                      </div>
                  </div>
                </div>
              </div>
              <CardContent className="p-6 space-y-6 bg-card">
                   <div className="space-y-6">
                        <div>
                             <h3 className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-2">Level Progress</h3>
                             <Card className="bg-secondary p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <Star className="h-5 w-5 text-yellow-500" />
                                        <span className="font-bold text-lg">Level {currentLevel}</span>
                                    </div>
                                    <span className="text-sm font-medium text-muted-foreground">{Math.floor(currentXp)} / {Math.floor(xpForNextLevel)} XP</span>
                                </div>
                                <Progress value={xpProgressPercentage} className="h-2" variant="solid" />
                             </Card>
                        </div>
                        <div>
                            <h3 className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Statistics</h3>
                            <div className="mt-2 space-y-3">
                                <Card className="bg-secondary">
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Gamepad2 className="h-4 w-4 text-primary" />
                                            <span className="font-semibold text-sm">Games Played</span>
                                        </div>
                                        <span className="font-bold text-lg text-primary">{currentUser.stats?.matchesPlayed || 0}</span>
                                    </CardContent>
                                </Card>
                                
                                {prizesWonArray.length > 0 ? (
                                    <Card className="bg-secondary">
                                        <CardHeader className="p-3">
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Award className="h-4 w-4" /> Prizes Won
                                                </div>
                                                <span className="font-bold text-lg">{totalPrizesWon}</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-3 pt-0">
                                            <div className="grid grid-cols-2 gap-2 mt-1">
                                                {prizesWonArray.map(([prize, count]) => (
                                                    <div key={prize} className="bg-background/50 rounded-md p-2 flex justify-between items-center">
                                                        <span className="text-xs font-medium text-muted-foreground">{prize}</span>
                                                        <span className="font-bold text-sm text-foreground">{count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <p className="text-sm text-center text-muted-foreground pt-4">No prizes won yet. Keep playing!</p>
                                )}
                            </div>
                        </div>
                   </div>

                   {currentUser.isGuest && (
                     <div className="text-center p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-500/30">
                        <p className="font-semibold text-sm">Store your game progress and prizes!</p>
                        <p className="text-xs text-muted-foreground mb-2">
                            Linking an account saves your progress permanently.
                        </p>
                        <div className="space-y-2">
                            <Button
                                onClick={linkGoogleAccount}
                                disabled={!!isSigningIn}
                                className="bg-white text-black hover:bg-gray-200 w-full h-9 text-sm"
                            >
                                {isSigningIn === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-5 w-5" />}
                                Continue with Google
                            </Button>
                        </div>
                    </div>
                   )}
              </CardContent>
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
