

"use client";

import type { ReactNode } from 'react';
import React, { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { WEEKLY_REWARDS, PERFECT_STREAK_BONUS } from '@/lib/rewards';


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
  handleClaimReward: (day: number) => Promise<void>;
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
        usernameChanged: false,
        coins: 0,
        lastLogin: new Date(0).toISOString(),
        loginStreak: 0,
        lastClaimedDay: 0,
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
        a.stats.usernameChanged !== b.stats.usernameChanged ||
        a.stats.coins !== b.stats.coins ||
        a.stats.lastLogin !== b.stats.lastLogin ||
        a.stats.loginStreak !== b.stats.loginStreak ||
        a.stats.lastClaimedDay !== b.stats.lastClaimedDay
    ) {
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
  
  const canClaimReward = currentUser ? (currentUser.stats.loginStreak || 0) > (currentUser.stats.lastClaimedDay || 0) : false;

  const fetchUser = useCallback(async () => {
    if (!auth || !auth.currentUser) return;
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
        setCurrentUser(prevUser => areUsersEqual(prevUser, newUser) ? prevUser : newUser);
      }
    } catch (error) {
      console.error("Error manually fetching user data:", error);
      toast({title: "Sync Error", description: "Could not refresh user data.", variant: "destructive"});
    }
  }, [toast]);


  const checkDailyLogin = useCallback(async (user: User) => {
    const today = startOfDay(new Date());
    const lastLoginDate = startOfDay(new Date(user.stats.lastLogin || 0));

    if (isSameDay(today, lastLoginDate)) {
        return user; // Already logged in today
    }

    const yesterday = startOfDay(subDays(today, 1));
    let newStreak = user.stats.loginStreak || 0;
    
    if (isSameDay(lastLoginDate, yesterday)) {
        newStreak++; // Continued streak
    } else {
        newStreak = 1; // Streak broken, reset to 1
    }
    
    // If the streak was 7 yesterday and we are continuing, it rolls over to 1 today.
    // If it was less than 7, it just increments.
    if (newStreak > 7) {
        newStreak = 1;
    }

    const userDocRef = doc(db, "users", user.uid);
    try {
        await updateDoc(userDocRef, {
            'stats.loginStreak': newStreak,
            'stats.lastLogin': today.toISOString(),
        });

        const updatedUser = { ...user, stats: { ...user.stats, loginStreak: newStreak, lastLogin: today.toISOString() }};
        return updatedUser;

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
                    const isNewGuest = firebaseUser.isAnonymous;
                    const displayName = isNewGuest 
                        ? `Guest#${firebaseUser.uid.substring(0,5)}` 
                        : firebaseUser.displayName || `User#${firebaseUser.uid.substring(0,5)}`;

                    const today = new Date();
                    const newUserProfile: User = {
                        uid: firebaseUser.uid,
                        displayName: displayName,
                        email: firebaseUser.email,
                        photoURL: firebaseUser.photoURL,
                        isGuest: isNewGuest,
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
                        setReward({ amount: 10, message: 'Welcome! Here are some coins to start.' });

                    } catch (error) {
                        console.error("Error creating new user profile:", error);
                        toast({title: "Setup Error", description: "Could not create your user profile.", variant: "destructive"});
                    }
                }

                if (userForLoginCheck) {
                    const finalUser = await checkDailyLogin(userForLoginCheck);
                    setCurrentUser(prevUser => areUsersEqual(prevUser, finalUser) ? prevUser : finalUser);

                    const canClaim = (finalUser.stats.loginStreak || 0) > (finalUser.stats.lastClaimedDay || 0);
                    if (canClaim) {
                        setTimeout(() => setIsRewardDialogOpen(true), 1500); // Open dialog after a short delay
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

  const handleClaimReward = async (day: number) => {
    if (!currentUser) return;
    
    // Safety check to prevent claiming future days
    if (day > (currentUser.stats.loginStreak || 0)) {
        toast({ title: "Error", description: "Cannot claim a future reward.", variant: "destructive" });
        return;
    }
    
    const rewardAmount = WEEKLY_REWARDS[day - 1];
    let totalReward = rewardAmount;
    let message = `You claimed ${rewardAmount} coins for Day ${day}!`;

    // A perfect week is when the streak is 7 AND they are claiming day 7.
    if (day === 7 && currentUser.stats.loginStreak === 7) {
        totalReward += PERFECT_STREAK_BONUS;
        message = `You completed the week and earned a bonus! Total reward: ${totalReward} coins!`;
    }

    const userDocRef = doc(db, "users", currentUser.uid);
    try {
        await updateDoc(userDocRef, {
            'stats.coins': increment(totalReward),
            'stats.lastClaimedDay': day,
        });
        toast({ title: "Reward Claimed!", description: message });
    } catch (error) {
        console.error("Failed to claim reward:", error);
        toast({ title: "Error", description: "Could not claim your reward.", variant: "destructive" });
    }
  };


  const setLocalGuestAvatar = async (url: string) => {
    if (currentUser) {
       await updateUserProfile({ photoURL: url });
    }
  };

  const setLocalGuestUsername = async (name: string) => {
    if (currentUser) {
       await updateUserProfile({ displayName: name });
    }
  };

  const updateUserProfile = async (data: Partial<Pick<User, 'displayName' | 'photoURL'>>) => {
    if (!currentUser || !db) return;

    const userDocRef = doc(db, "users", currentUser.uid);
    const updates: { [key: string]: any } = { ...data };
    
    if (data.displayName && currentUser.stats?.usernameChanged !== true) {
        updates['stats.usernameChanged'] = true;
    }

    try {
      await updateDoc(userDocRef, updates);
    } catch (err) {
      console.error("Failed to update user profile:", err);
      toast({
        title: "Update Failed",
        description: "Your profile could not be updated.",
        variant: "destructive",
      });
    }
  };

  const updateUserStats = (newStats: Partial<UserStats>) => {
    if (!currentUser) return;
    
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
        return {
            ...prevUser,
            stats: updatedStats
        };
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
    if (!auth || !auth.currentUser?.isAnonymous) {
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
      const newDisplayName = firebaseUser.displayName || oldGuestUsername;
      
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
       <Dialog open={!!reward} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">Reward!</DialogTitle>
            <DialogDescription className="text-center pt-2">
                {reward?.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center gap-2 p-4">
              <Image src="/coin.png" alt="Coins" width={40} height={40} />
              <span className="text-4xl font-bold text-yellow-500">+{reward?.amount}</span>
          </div>
          <DialogFooter>
            <Button onClick={() => setReward(null)} className="w-full">Claim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {loading ? (
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
