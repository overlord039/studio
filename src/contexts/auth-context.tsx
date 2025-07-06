
"use client";

import type { ReactNode } from 'react';
import React, { useState, useEffect, useContext, createContext } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  GoogleAuthProvider,
  signInWithPopup,
  signOut, 
  onAuthStateChanged, 
  signInAnonymously, 
  linkWithPopup,
  deleteUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { useToast } from '@/hooks/use-toast';
import type { User, UserStats, PrizeType } from '@/types';
import { PRIZE_TYPES } from '@/types';
import LoginSelectionScreen from '@/components/auth/login-selection-screen';
import { Loader2 } from 'lucide-react';

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  isGuest: boolean;
  createdAt: string;
  stats: UserStats;
}

interface AuthContextType {
  currentUser: User | null;
  userStats: UserStats | null;
  updateUserStats: (newStats: Partial<UserStats>) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  loading: boolean;
  isSigningIn: null | 'google' | 'guest';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const createDefaultStats = (): UserStats => {
    return {
        matchesPlayed: 0,
        prizesWon: Object.values(PRIZE_TYPES).reduce((acc, prize) => {
            acc[prize] = 0;
            return acc;
        }, {} as Record<PrizeType, number>),
    };
};

const writeUserProfileToDB = async (appUser: User): Promise<void> => {
    if (!db || appUser.isGuest) return; 
    const userDocRef = doc(db, "users", appUser.uid);
    await setDoc(userDocRef, appUser, { merge: true });
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState<null | 'google' | 'guest'>(null);
  const { toast } = useToast();
  const firebaseConfigured = !!auth && !!db;

  useEffect(() => {
    if (!firebaseConfigured) {
        setLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                setCurrentUser(userDoc.data() as User);
            } else if (!firebaseUser.isAnonymous) {
                // This case handles a user who is logged in via Firebase but not in our DB yet.
                // This can happen if they signed up but the DB write failed.
                const newUserProfile: User = {
                    uid: firebaseUser.uid,
                    displayName: firebaseUser.displayName || `User#${firebaseUser.uid.substring(0,5)}`,
                    email: firebaseUser.email,
                    isGuest: false,
                    createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
                    stats: createDefaultStats(),
                };
                await writeUserProfileToDB(newUserProfile);
                setCurrentUser(newUserProfile);
            } else {
                 const guestUser: User = {
                    uid: firebaseUser.uid,
                    displayName: `Guest#${firebaseUser.uid.substring(0, 5)}`,
                    email: null,
                    isGuest: true,
                    createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
                    stats: createDefaultStats(),
                };
                // For guests, we don't write to DB, just set in-memory state.
                setCurrentUser(guestUser);
            }
        } else {
            setCurrentUser(null);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseConfigured]);

  const updateUserStats = async (newStats: Partial<UserStats>) => {
    if (!currentUser || !db || currentUser.isGuest) return;
    const userDocRef = doc(db, "users", currentUser.uid);
    await updateDoc(userDocRef, { stats: newStats });
    setCurrentUser(prevUser => prevUser ? { ...prevUser, stats: { ...prevUser.stats, ...newStats } } : null);
  };
  
  const showFirebaseNotConfiguredToast = () => {
    toast({
        title: "Firebase Not Configured",
        description: "Please add your Firebase credentials to the .env file to enable this feature.",
        variant: "destructive"
    });
  }

  const loginWithGoogle = async () => {
    if (!auth || !db) {
      showFirebaseNotConfiguredToast();
      return;
    }
    setIsSigningIn('google');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      let appUser: User;
      if (userDoc.exists()) {
        appUser = userDoc.data() as User;
      } else {
        const newUserProfile: User = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || `User#${firebaseUser.uid.substring(0,5)}`,
            email: firebaseUser.email,
            isGuest: false,
            createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
            stats: createDefaultStats(),
        };
        await writeUserProfileToDB(newUserProfile);
        appUser = newUserProfile;
      }
      setCurrentUser(appUser);
      
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        toast({ title: "Sign-in Cancelled", description: "You closed the sign-in window." });
      } else {
        console.error("Google Sign-In Error:", error);
        toast({ title: "Sign-In Failed", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsSigningIn(null);
    }
  };

  const loginAsGuest = async () => {
    if (!auth) {
      showFirebaseNotConfiguredToast();
      return;
    }
    setIsSigningIn('guest');
    try {
        const result = await signInAnonymously(auth);
        const firebaseUser = result.user;
        const guestUser: User = {
            uid: firebaseUser.uid,
            displayName: `Guest#${firebaseUser.uid.substring(0, 5)}`,
            email: null,
            isGuest: true,
            createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
            stats: createDefaultStats(),
        };
        setCurrentUser(guestUser);
    } catch (error: any) {
        console.error("Guest Sign-In Error:", error);
        toast({ title: "Guest Sign-in Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSigningIn(null);
    }
  };

  const linkGoogleAccount = async () => {
    if (!auth?.currentUser?.isAnonymous || !db) {
      toast({ title: "Not a Guest", description: "This account is already permanent." });
      return;
    }
    setIsSigningIn('google');
    const provider = new GoogleAuthProvider();
    const guestFirebaseUser = auth.currentUser;
    const oldGuestProfile = currentUser; 

    try {
      const result = await linkWithPopup(guestFirebaseUser, provider);
      const permanentFirebaseUser = result.user;

      const newUserProfile: User = {
        uid: permanentFirebaseUser.uid,
        displayName: permanentFirebaseUser.displayName || `User#${permanentFirebaseUser.uid.substring(0,5)}`,
        email: permanentFirebaseUser.email,
        isGuest: false,
        createdAt: permanentFirebaseUser.metadata.creationTime || new Date().toISOString(),
        stats: oldGuestProfile?.stats || createDefaultStats(),
      };

      await writeUserProfileToDB(newUserProfile);
      // The onAuthStateChanged listener will handle setting the new user state automatically
      
      toast({
        title: "Account Linked!",
        description: "Your guest stats have been saved to your Google account.",
      });

    } catch (error: any) {
      if (error.code === 'auth/credential-already-in-use') {
         toast({ title: "Account Exists", description: "That Google account is already in use. Please sign out and sign in with Google directly.", duration: 5000, variant: "destructive" });
      } else if (error.code === 'auth/popup-closed-by-user') {
          toast({ title: "Linking Cancelled" });
      } else {
        console.error("Account Linking Error:", error);
        toast({ title: "Linking Failed", description: error.message, variant: "destructive" });
      }
    } finally {
        setIsSigningIn(null);
    }
  };

  const logout = async () => {
     if (!auth) {
        showFirebaseNotConfiguredToast();
        return;
    }
    await signOut(auth);
    setCurrentUser(null);
  };
  
  const deleteAccount = async () => {
    if (!auth || !db || !auth.currentUser) {
        toast({ title: "Error", description: "No user is currently signed in to delete.", variant: "destructive"});
        return;
    }
    
    const userToDelete = auth.currentUser;

    try {
      if (!userToDelete.isAnonymous) {
        const userDocRef = doc(db, "users", userToDelete.uid);
        await deleteDoc(userDocRef);
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
      userStats: currentUser?.stats || null, 
      updateUserStats, 
      loginWithGoogle,
      loginAsGuest, 
      linkGoogleAccount, 
      logout, 
      deleteAccount, 
      loading,
      isSigningIn
  };

  return (
    <AuthContext.Provider value={value}>
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
