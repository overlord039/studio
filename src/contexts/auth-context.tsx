

"use client";

import type { ReactNode } from 'react';
import React, { useState, useEffect, useContext, createContext, useCallback, useRef } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  signOut, 
  onAuthStateChanged, 
  signInAnonymously, 
  deleteUser,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, updateDoc, onSnapshot, type Unsubscribe, runTransaction, writeBatch, increment } from 'firebase/firestore';
import { auth, db, allConfigValuesPresent } from '@/lib/firebase/config';
import { useToast } from '@/hooks/use-toast';
import type { User, UserStats, PrizeType } from '@/types';
import { PRIZE_TYPES } from '@/types';
import LoginSelectionScreen from '@/components/auth/login-selection-screen';
import { Loader2, AlertTriangle } from 'lucide-react';
import { ToastAction } from '@/components/ui/toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { isSameDay, subDays, startOfDay } from 'date-fns';
import { WEEKLY_REWARDS, PERFECT_STREAK_BONUS, getCoinsForLevelUp } from '@/lib/rewards';
import AnimatedCoin from '@/components/rewards/animated-coin';
import { useRouter } from 'next/navigation';
import LevelUpDialog from '@/components/rewards/level-up-dialog';


export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isGuest: boolean;
  createdAt: string;
  stats: UserStats;
}

interface AuthContextType {
  currentUser: User | null;
  updateUserProfile: (data: Partial<Pick<User, 'displayName' | 'photoURL'>>) => Promise<void>;
  updateUserStats: (newStats: Partial<UserStats>) => void;
  fetchUser: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  loading: boolean;
  isSigningIn: null | 'guest' | 'google';
  setLocalGuestAvatar: (url: string) => void;
  setLocalGuestUsername: (name: string) => void;
  handleClaimReward: (day: number) => Promise<{claimedAmount: number} | null>;
  isRewardDialogOpen: boolean;
  setIsRewardDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  canClaimReward: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const createDefaultStats = (): UserStats => {
    return {
        matchesPlayed: 0,
        prizesWon: Object.values(PRIZE_TYPES).reduce((acc, prize) => {
            acc[prize] = 0;
            return acc;
        }, {} as Record<PrizeType, number>),
        totalPrizesWon: 0,
        usernameChangeCount: 0,
        coins: 0,
        level: 1,
        xp: 0,
        lastLogin: new Date(0).toISOString(),
        loginStreak: 0,
        lastClaimedDay: 0,
        badges: [],
    };
};

// A robust, order-insensitive comparison for the prizes object
const arePrizesEqual = (a: Record<PrizeType, number>, b: Record<PrizeType, number>): boolean => {
    const allPrizeKeys = Object.values(PRIZE_TYPES); // Canonical list of prizes

    for (const key of allPrizeKeys) {
        // Use `|| 0` to handle cases where a prize might not be in the object yet
        if ((a[key] || 0) !== (b[key] || 0)) {
            return false;
        }
    }
    return true;
};

// A robust comparison for the entire user object
function areUsersEqual(a: User | null, b: User | null): boolean {
    if (!a && !b) return true; // Both are null
    if (!a || !b) return false; // One is null, the other isn't

    // Compare primitive fields first for a fast exit
    if (
        a.uid !== b.uid ||
        a.displayName !== b.displayName ||
        a.email !== b.email ||
        a.photoURL !== b.photoURL ||
        a.isGuest !== b.isGuest ||
        a.createdAt !== b.createdAt ||
        a.stats.matchesPlayed !== b.stats.matchesPlayed ||
        a.stats.totalPrizesWon !== b.stats.totalPrizesWon ||
        a.stats.usernameChangeCount !== b.stats.usernameChangeCount ||
        a.stats.coins !== b.stats.coins ||
        a.stats.level !== b.stats.level ||
        a.stats.xp !== b.stats.xp ||
        a.stats.lastLogin !== b.stats.lastLogin ||
        a.stats.loginStreak !== b.stats.loginStreak ||
        a.stats.lastClaimedDay !== b.stats.lastClaimedDay
    ) {
        return false;
    }
    
    // Compare badges array
    const badgesA = a.stats.badges || [];
    const badgesB = b.stats.badges || [];
    if (badgesA.length !== badgesB.length || !badgesA.every(b => badgesB.includes(b))) {
        return false;
    }

    // Use the dedicated function to compare the prizes object
    if (!arePrizesEqual(a.stats.prizesWon, b.stats.prizesWon)) {
        return false;
    }

    // If all checks pass, the objects are considered equal
    return true;
}

const FirebaseConfigErrorScreen = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md text-center shadow-lg border-destructive">
            <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2 text-destructive">
                    <AlertTriangle /> Configuration Error
                </CardTitle>
                <CardDescription>
                    Firebase API keys are missing.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm">
                    Please add your project credentials to the <strong>.env</strong> file to enable authentication and other Firebase features.
                </p>
                <p className="text-xs text-muted-foreground bg-muted p-2 rounded-md">
                    You can find these keys in your Firebase Console: <br/>
                    Project Settings &gt; General &gt; Your apps &gt; Web app.
                </p>
            </CardContent>
        </Card>
    </div>
);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState<null | 'guest' | 'google'>(null);
  const { toast } = useToast();
  const router = useRouter();
  const [reward, setReward] = useState<{ amount: number; message: string } | null>(null);
  const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false);
  
  const canClaimReward = currentUser ? (currentUser.stats.loginStreak || 0) > (currentUser.stats.lastClaimedDay || 0) && (currentUser.stats.lastClaimedDay || 0) < 7 : false;
  const sessionWelcomedRef = useRef(false);
  const previousUserRef = useRef<User | null>(null);

  const [levelUpInfo, setLevelUpInfo] = useState<{ oldLevel: number; newLevel: number; reward: number; } | null>(null);


  useEffect(() => {
    previousUserRef.current = currentUser;
  }, [currentUser]);


  const fetchUser = useCallback(async () => {
    if (!auth || !auth.currentUser || !db) return;
    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const firestoreData = docSnap.data();
        const newUser: User = {
          uid: firestoreData.uid,
          displayName: firestoreData.displayName,
          email: firestoreData.email,
          photoURL: firestoreData.photoURL || null,
          isGuest: firestoreData.isGuest,
          createdAt: firestoreData.createdAt?.toDate ? firestoreData.createdAt.toDate().toISOString() : firestoreData.createdAt,
          stats: firestoreData.stats || createDefaultStats(),
        };
        // This is a more performant way to update state only if it has changed.
        setCurrentUser(prevUser => areUsersEqual(prevUser, newUser) ? prevUser : newUser);
      }
    } catch (error) {
      console.error("Error manually fetching user data:", error);
      toast({title: "Sync Error", description: "Could not refresh user data.", variant: "destructive"});
    }
  }, [toast]);


  const checkDailyLogin = useCallback(async (user: User) => {
    if (!db) return user;
    const today = startOfDay(new Date());
    const lastLoginDate = startOfDay(new Date(user.stats.lastLogin || 0));

    if (isSameDay(today, lastLoginDate)) {
        return user; // Already logged in today.
    }
    
    const yesterday = subDays(today, 1);
    const lastClaimed = user.stats.lastClaimedDay || 0;

    let newStreak: number;
    let newLastClaimedDay = lastClaimed;

    if (isSameDay(lastLoginDate, yesterday)) {
        newStreak = (user.stats.loginStreak || 0) + 1;
    } else {
        newStreak = 1; // Streak is broken, reset to 1
        // **KEY CHANGE**: Do NOT reset `newLastClaimedDay`. Progress is paused, not reset.
    }
    
    // If the reward cycle was completed, reset it for the new login.
    if (newLastClaimedDay >= 7) {
        newLastClaimedDay = 0;
    }

    const updates: { [key: string]: any } = { 
        'stats.lastLogin': today.toISOString(),
        'stats.loginStreak': newStreak,
        'stats.lastClaimedDay': newLastClaimedDay,
    };
    
    const userDocRef = doc(db, "users", user.uid);
    try {
        await updateDoc(userDocRef, updates);
        
        return { 
            ...user, 
            stats: { 
                ...user.stats, 
                loginStreak: newStreak, 
                lastLogin: today.toISOString(),
                lastClaimedDay: newLastClaimedDay
            }
        };

    } catch (error) {
        console.error("Error updating daily login stats:", error);
        return user;
    }
  }, []);

  useEffect(() => {
    if (!auth || !db) {
        setLoading(false);
        return;
    }

    let userDocUnsubscribe: Unsubscribe | undefined;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (userDocUnsubscribe) {
            userDocUnsubscribe();
        }

        if (firebaseUser) {
            const isNewUser = firebaseUser.metadata.creationTime === firebaseUser.metadata.lastSignInTime;

            const userDocRef = doc(db, "users", firebaseUser.uid);
            
            userDocUnsubscribe = onSnapshot(userDocRef, async (docSnap) => {
                let userForLoginCheck: User | null = null;
                if (docSnap.exists()) {
                    const firestoreData = docSnap.data();
                    
                    const newUser: User = {
                        uid: firestoreData.uid,
                        displayName: firestoreData.displayName,
                        email: firestoreData.email,
                        photoURL: firestoreData.photoURL || null,
                        isGuest: firestoreData.isGuest,
                        createdAt: firestoreData.createdAt?.toDate ? firestoreData.createdAt.toDate().toISOString() : firestoreData.createdAt,
                        stats: firestoreData.stats || createDefaultStats(),
                    };
                    
                    userForLoginCheck = newUser;
                    
                } else {
                    const isGuest = firebaseUser.isAnonymous;
                    let displayName = isGuest ? `Guest#${firebaseUser.uid.substring(0,5)}` : (firebaseUser.displayName || `User#${firebaseUser.uid.substring(0,5)}`);
                    
                    // Truncate display name if it's too long
                    if (displayName.length > 12) {
                        displayName = displayName.substring(0, 12);
                    }
                    
                    const today = new Date();
                    const newUserProfile: User = {
                        uid: firebaseUser.uid,
                        displayName: displayName,
                        email: isGuest ? null : firebaseUser.email,
                        photoURL: isGuest ? null : firebaseUser.photoURL,
                        isGuest: isGuest,
                        createdAt: firebaseUser.metadata.creationTime || today.toISOString(),
                        stats: {
                            ...createDefaultStats(),
                            coins: 10,
                            lastLogin: today.toISOString(),
                            loginStreak: 1,
                        },
                    };
                    
                    try {
                        const batch = writeBatch(db);
                        const usernameRef = doc(db, "usernames", displayName.toLowerCase());
                        batch.set(userDocRef, newUserProfile);
                        batch.set(usernameRef, { userId: firebaseUser.uid, username: displayName });
                        await batch.commit();

                        userForLoginCheck = newUserProfile;
                         if (isNewUser && !sessionWelcomedRef.current) {
                           setReward({ amount: 10, message: 'Welcome! Here are some coins to start.' });
                           sessionWelcomedRef.current = true;
                         }

                    } catch (error) {
                        console.error("Error creating new user profile:", error);
                        toast({title: "Setup Error", description: "Could not create your user profile.", variant: "destructive"});
                    }
                }

                if (userForLoginCheck) {
                    const finalUser = await checkDailyLogin(userForLoginCheck);

                    // Check for level up
                    const prevUser = previousUserRef.current;
                    if (prevUser && finalUser.stats.level > prevUser.stats.level) {
                        let totalReward = 0;
                        for(let i = prevUser.stats.level + 1; i <= finalUser.stats.level; i++) {
                            totalReward += getCoinsForLevelUp(i);
                        }
                       setLevelUpInfo({ oldLevel: prevUser.stats.level, newLevel: finalUser.stats.level, reward: totalReward });
                    }
                    
                    setCurrentUser(prevUser => areUsersEqual(prevUser, finalUser) ? prevUser : finalUser);

                    const canClaimNow = (finalUser.stats.loginStreak || 0) > (finalUser.stats.lastClaimedDay || 0) && (finalUser.stats.lastClaimedDay || 0) < 7;
                    if (canClaimNow && !sessionWelcomedRef.current) {
                        setIsRewardDialogOpen(true);
                        sessionWelcomedRef.current = true;
                    }
                }
                setLoading(false);
            }, (error) => {
                console.error("Error listening to user document:", error);
                toast({ title: "Error", description: "Could not load user profile.", variant: "destructive" });
                setLoading(false);
            });

        } else {
            setCurrentUser(null);
            setLoading(false);
        }
    });

    return () => {
        authUnsubscribe();
        if (userDocUnsubscribe) {
            userDocUnsubscribe();
        }
    };
  }, [toast, checkDailyLogin]);

  const handleClaimReward = async (dayToClaim: number) => {
    if (!currentUser || !db) return null;
    
    // Safety checks
    const streak = currentUser.stats.loginStreak || 0;
    const lastClaimed = currentUser.stats.lastClaimedDay || 0;

    if (streak <= lastClaimed) {
         toast({ title: "Already Claimed", description: "You've already claimed the reward for today's login.", variant: "destructive" });
        return null;
    }
    
    const rewardAmount = WEEKLY_REWARDS[lastClaimed];
    let totalReward = rewardAmount;
    let message = `You claimed ${rewardAmount} coins for Day ${lastClaimed + 1}!`;

    // Check for perfect week bonus
    if (lastClaimed + 1 === 7) {
        totalReward += PERFECT_STREAK_BONUS;
        message = `You completed the week and earned a bonus! Total reward: ${totalReward} coins!`;
    }
    
    const userDocRef = doc(db, "users", currentUser.uid);
    try {
        await updateDoc(userDocRef, {
            'stats.coins': increment(totalReward),
            'stats.lastClaimedDay': increment(1),
        });
        toast({ title: "Reward Claimed!", description: message });
        return { claimedAmount: totalReward };
    } catch (error) {
        console.error("Failed to claim reward:", error);
        toast({ title: "Error", description: "Could not claim your reward.", variant: "destructive" });
        return null;
    }
  };


  const setLocalGuestAvatar = (url: string) => {
    if (currentUser && currentUser.isGuest) {
        updateUserProfile({ photoURL: url });
    }
  };

  const setLocalGuestUsername = (name: string) => {
     if (currentUser && currentUser.isGuest) {
        updateUserProfile({ displayName: name });
    }
  };

  const updateUserProfile = async (data: Partial<Pick<User, 'displayName' | 'photoURL'>>) => {
    if (!currentUser || !db) return;

    const userDocRef = doc(db, "users", currentUser.uid);
    await updateDoc(userDocRef, data);
  };

  const updateUserStats = (newStats: Partial<UserStats>) => {
    if (!currentUser) return;
    
    // This function is now a proxy to call the server update endpoint.
    // It keeps the client-side state in sync optimistically but relies on server for truth.
    if (currentUser.isGuest) {
        console.warn("Direct stat update on client for guests is deprecated. Use server endpoints.");
    } else if (db) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const updates = Object.entries(newStats).reduce((acc, [key, value]) => {
            acc[`stats.${key}`] = value;
            return acc;
        }, {} as Record<string, any>);
        
        updateDoc(userDocRef, updates).catch(err => {
            console.error("Client-side stat sync failed:", err);
            toast({title: "Sync Error", description: "Could not sync some stats with the server."});
        });
    }

    // Optimistically update local state
    setCurrentUser(prevUser => {
        if (!prevUser) return null;
        const updatedStats: UserStats = {
          ...prevUser.stats,
          ...newStats,
          prizesWon: {
            ...(prevUser.stats.prizesWon || createDefaultStats().prizesWon),
            ...(newStats.prizesWon || {}),
          },
        };
        const updatedUser = { ...prevUser, stats: updatedStats };
        // Return previous state if they are identical to prevent re-renders
        return areUsersEqual(prevUser, updatedUser) ? prevUser : updatedUser;
    });
  };

  const loginWithGoogle = async () => {
    if (!auth || !db) return;
    setIsSigningIn('google');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Google Sign-In Error:", error);
        toast({ title: "Google Sign-in Failed", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsSigningIn(null);
    }
  };

  const linkGoogleAccount = async () => {
    if (!auth || !auth.currentUser?.isAnonymous || !db) {
      toast({ title: "Error", description: "You must be signed in as a guest to link an account.", variant: "destructive" });
      return;
    }
    const guestUser = auth.currentUser;
    const guestData = { ...currentUser };
    
    setIsSigningIn('google');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await linkWithPopup(guestUser, provider);
      
      const firebaseUser = result.user;
      
      const oldGuestUsername = guestData.displayName || '';
      let newDisplayName = firebaseUser.displayName || oldGuestUsername;
      
      // Truncate display name if it's too long
      if (newDisplayName.length > 12) {
          newDisplayName = newDisplayName.substring(0, 12);
      }

      const guestStats = guestData.stats || createDefaultStats();
      guestStats.coins = (guestStats.coins || 0) + 10; // Linking reward

      const batch = writeBatch(db);
      
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const usernameDocRef = doc(db, "usernames", newDisplayName.toLowerCase());
      const oldGuestUsernameRef = doc(db, "usernames", oldGuestUsername.toLowerCase());

      const newUserProfile: User = {
        uid: firebaseUser.uid,
        displayName: newDisplayName,
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL || guestData.photoURL,
        isGuest: false,
        createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
        stats: guestStats,
      };

      batch.set(userDocRef, newUserProfile);
      batch.delete(oldGuestUsernameRef);
      batch.set(usernameDocRef, { userId: firebaseUser.uid, username: newDisplayName });

      await batch.commit();

      setReward({ amount: 10, message: 'Thanks for linking your account!' });
      router.push('/profile');

    } catch (error: any) {
      if (error.code === 'auth/credential-already-in-use') {
        const handleSwitchAccount = async () => {
            await logout();
            await loginWithGoogle();
        };

        toast({
            title: "Account Already Exists",
            description: "That Google account is already in use. Switch to that account? Your guest progress will be lost.",
            variant: "destructive",
            duration: 10000,
            action: (
                <ToastAction altText="Switch to existing account" onClick={handleSwitchAccount}>
                    Switch
                </ToastAction>
            ),
        });
      } else if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Google Account Linking Error:", error);
        toast({ title: "Link Failed", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsSigningIn(null);
    }
  };


  const loginAsGuest = async () => {
    if (!auth) return;
    setIsSigningIn('guest');
    try {
        await signInAnonymously(auth);
        router.push('/');
    } catch (error: any) {
        console.error("Guest Sign-In Error:", error);
        toast({ title: "Guest Sign-in Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSigningIn(null);
    }
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
  };
  
  const deleteAccount = async () => {
    if (!auth || !auth.currentUser) {
        toast({ title: "Error", description: "No user is currently signed in to delete.", variant: "destructive"});
        return;
    }
    
    const userToDelete = auth.currentUser;
    const usernameToDelete = userToDelete.displayName;

    try {
      if (db) {
        const batch = writeBatch(db);
        const userDocRef = doc(db, "users", userToDelete.uid);
        batch.delete(userDocRef);
        if (usernameToDelete) {
            const usernameDocRef = doc(db, "usernames", usernameToDelete.toLowerCase());
            batch.delete(usernameDocRef);
        }
        await batch.commit();
      }
      
      await deleteUser(userToDelete);
      
      toast({ title: "Account Deleted", description: "Your account and all associated data have been permanently deleted." });
      
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        toast({ title: "Action Required", description: "For security, please sign in again before deleting your account.", variant: "destructive", duration: 5000 });
      } else {
        console.error("Error deleting account:", error);
        toast({ title: "Deletion Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
      }
    }
  };

  const value = { 
      currentUser, 
      updateUserProfile,
      updateUserStats, 
      fetchUser,
      loginWithGoogle,
      linkGoogleAccount, 
      loginAsGuest, 
      logout, 
      deleteAccount, 
      loading,
      isSigningIn,
      setLocalGuestAvatar,
      setLocalGuestUsername,
      handleClaimReward,
      isRewardDialogOpen,
      setIsRewardDialogOpen,
      canClaimReward
  };

  if (!allConfigValuesPresent && !loading) {
    return (
        <AuthContext.Provider value={value}>
            <FirebaseConfigErrorScreen />
        </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={value}>
       <Dialog open={!!reward} onOpenChange={(isOpen) => !isOpen && setReward(null)}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">Reward!</DialogTitle>
            <DialogDescription className="text-center pt-2">
                {reward?.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center gap-2 p-4">
              <Image src="/coin.png" alt="Coins" width={40} height={40} data-ai-hint="gold coin" />
              <span className="text-4xl font-bold text-yellow-500">{reward?.amount}</span>
          </div>
          <DialogFooter>
            <Button onClick={() => setReward(null)} className="w-full">Claim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {levelUpInfo && (
        <LevelUpDialog
          open={!!levelUpInfo}
          onOpenChange={() => setLevelUpInfo(null)}
          oldLevel={levelUpInfo.oldLevel}
          newLevel={levelUpInfo.newLevel}
          reward={levelUpInfo.reward}
        />
      )}
      {loading && !currentUser ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : currentUser ? (
        children
      ) : (
        <LoginSelectionScreen />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Coin Animation Context
interface CoinAnimationContextType {
  triggerAnimation: (count: number, isDeduction?: boolean) => void;
}

const CoinAnimationContext = createContext<CoinAnimationContextType | undefined>(undefined);

export function CoinAnimationProvider({ children }: { children: ReactNode }) {
  const [animatingCoins, setAnimatingCoins] = useState<{id: number; isDeduction: boolean}[]>([]);
  let coinIdCounter = 0;

  const triggerAnimation = useCallback((count: number, isDeduction = false) => {
    const coinsToAnimate = Math.min(20, count); // Max 20 coins at a time
    const newCoins = Array.from({ length: coinsToAnimate }, () => ({
        id: coinIdCounter++,
        isDeduction: isDeduction
    }));
    setAnimatingCoins(prev => [...prev, ...newCoins]);
  }, []);

  const handleAnimationEnd = useCallback((id: number) => {
    setAnimatingCoins(prev => prev.filter(coin => coin.id !== id));
  }, []);

  return (
    <CoinAnimationContext.Provider value={{ triggerAnimation }}>
      {children}
      {animatingCoins.map(coin => (
        <AnimatedCoin 
            key={coin.id} 
            id={coin.id} 
            onAnimationEnd={handleAnimationEnd}
            isDeduction={coin.isDeduction}
        />
      ))}
    </CoinAnimationContext.Provider>
  );
}

export function useCoinAnimation() {
  const context = useContext(CoinAnimationContext);
  if (!context) {
    throw new Error('useCoinAnimation must be used within a CoinAnimationProvider');
  }
  return context;
}
