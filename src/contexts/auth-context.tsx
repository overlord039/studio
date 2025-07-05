
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  signInAnonymously, 
  linkWithPopup,
  deleteUser,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { UserStats, PrizeType } from '@/types';
import { PRIZE_TYPES } from '@/types';
import { Loader2 } from 'lucide-react';
import LoginSelectionScreen from '@/components/auth/login-selection-screen';


// Simplified user object to store in context
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
  logout: () => void;
  deleteAccount: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fetchUserDocument = async (uid: string): Promise<UserStats | null> => {
    if (!db) return null;
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        const docData = userDocSnap.data();
        const existingStats = docData.stats || {};
        const stats: UserStats = {
            matchesPlayed: existingStats.matchesPlayed || 0,
            prizesWon: existingStats.prizesWon || {},
        };
        Object.values(PRIZE_TYPES).forEach(prize => {
            if (stats.prizesWon[prize] === undefined) {
                stats.prizesWon[prize] = 0;
            }
        });
        return stats;
    }
    return null;
  };

const createUserDocument = async (user: FirebaseUser): Promise<UserStats> => {
    if (!db) throw new Error("Database not configured.");
    const userDocRef = doc(db, "users", user.uid);
    
    const defaultStats: UserStats = {
      matchesPlayed: 0,
      prizesWon: Object.values(PRIZE_TYPES).reduce((acc, prize) => {
        acc[prize] = 0;
        return acc;
      }, {} as Record<PrizeType, number>),
    };
    
    // Only write to DB for non-guest users
    if (!user.isAnonymous) {
      await setDoc(userDocRef, { 
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          createdAt: user.metadata.creationTime,
          stats: defaultStats 
      });
    }

    return defaultStats;
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const firebaseConfigured = !!auth && !!db;

  const updateUserStats = async (newStats: Partial<UserStats>) => {
    if (!currentUser || !db) return;
    const userDocRef = doc(db, "users", currentUser.uid);
    await setDoc(userDocRef, { stats: newStats }, { merge: true });
    // No need to fetch, just update local state for immediate UI response
    setUserStats(prevStats => ({ ...prevStats!, ...newStats })); 
  };
  
  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(true);
      if (user) {
        // Immediately set a local version of the user to log them in.
        const defaultStats: UserStats = {
          matchesPlayed: 0,
          prizesWon: Object.values(PRIZE_TYPES).reduce((acc, prize) => {
            acc[prize] = 0;
            return acc;
          }, {} as Record<PrizeType, number>),
        };

        const localUser: User = {
          uid: user.uid,
          displayName: user.displayName || (user.isAnonymous ? `Guest#${user.uid.substring(0, 5)}` : 'Unnamed User'),
          email: user.email,
          isGuest: user.isAnonymous,
          createdAt: user.metadata.creationTime || new Date().toISOString(),
          stats: defaultStats,
        };
        
        setCurrentUser(localUser);
        setUserStats(defaultStats);
        setLoading(false); // Render the app immediately

        // In the background, sync with Firestore without blocking the UI
        (async () => {
          try {
            let stats = await fetchUserDocument(user.uid);
            if (!stats) {
              stats = await createUserDocument(user);
            }
            // If successful, update the user state with persisted data
            setCurrentUser(prev => prev ? { ...prev, stats: stats! } : null);
            setUserStats(stats);
          } catch (dbError) {
            console.error("Firestore sync error after login:", dbError);
            toast({
              title: "Sync Warning",
              description: "You are logged in, but we couldn't load your saved progress.",
              variant: "destructive"
            });
            // Importantly, we DO NOT sign the user out.
          }
        })();

      } else {
        // No user is signed in
        setCurrentUser(null);
        setUserStats(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [firebaseConfigured, toast]);

  const showFirebaseNotConfiguredToast = () => {
    toast({
        title: "Firebase Not Configured",
        description: "Please add your Firebase credentials to the .env file to enable this feature.",
        variant: "destructive"
    });
  }

  const loginWithGoogle = async () => {
    if (!auth) {
      showFirebaseNotConfiguredToast();
      return;
    }

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle the rest.
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.log("Sign-in cancelled by user.");
        toast({ title: "Sign-in Cancelled" });
        return;
      }
      console.error("Google Sign-In Error:", error);
      toast({
        title: "Sign-In Failed",
        description: "An unexpected error occurred during sign-in. Please try again.",
        variant: "destructive",
      });
    }
  };

  const loginAsGuest = async () => {
    if (!auth) {
      showFirebaseNotConfiguredToast();
      return;
    }
    try {
      await signInAnonymously(auth);
      // onAuthStateChanged handles success
    } catch (error: any) {
      console.error("Error during guest sign-in:", error);
      toast({
        title: "Guest Sign-in Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  const linkGoogleAccount = async () => {
    if (!auth?.currentUser?.isAnonymous) {
      toast({ 
        title: "Not a Guest", 
        description: "This account is already permanent.",
      });
      return;
    }

    const provider = new GoogleAuthProvider();
    const guestUser = auth.currentUser;

    try {
      const result = await linkWithPopup(guestUser, provider);
      const linkedUser = result.user;
      
      if (db) {
        const userDocRef = doc(db, "users", linkedUser.uid);
        await updateDoc(userDocRef, {
            email: linkedUser.email,
            displayName: linkedUser.displayName,
        });
      }
      
      toast({
        title: "Account Linked!",
        description: "Your progress is now saved to your Google account.",
      });

    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        toast({ 
          title: "Linking Cancelled", 
          description: "You closed the sign-in window.",
        });
        return;
      }

      if (error.code === 'auth/credential-already-in-use') {
        toast({
          title: "Account Already Exists",
          description: "This Google account is already linked to another profile. Please sign out and sign in with Google directly.",
          variant: "destructive",
          duration: 8000
        });
        return;
      }
      
      console.error("Account Linking Error:", error);
      toast({
        title: "Linking Failed",
        description: "An unexpected error occurred. If the pop-up closes automatically, check your Firebase domain authorizations.",
        variant: "destructive",
      });
    }
  };

  const logout = () => {
     if (!auth) {
        showFirebaseNotConfiguredToast();
        return;
    }
    signOut(auth).catch((error) => {
      console.error("Error signing out:", error);
      toast({
        title: "Logout Error",
        description: "An error occurred during sign out.",
        variant: "destructive"
      });
    });
  };
  
  const deleteAccount = async () => {
    if (!auth || !db || !auth.currentUser) {
        toast({ title: "Error", description: "No user is currently signed in to delete.", variant: "destructive"});
        return;
    }
    
    const userToDelete = auth.currentUser;

    try {
      const userDocRef = doc(db, "users", userToDelete.uid);
      await deleteDoc(userDocRef);
      
      await deleteUser(userToDelete);
      
      toast({ title: "Account Deleted", description: "Your account and all associated data have been permanently deleted." });
      
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        console.log("Account deletion failed: requires recent login.");
        toast({
          title: "Action Required",
          description: "For security, please sign in again before deleting your account.",
          variant: "destructive",
          duration: 5000
        });
      } else {
        console.error("Error deleting account:", error);
        toast({
          title: "Deletion Error",
          description: error.message || "An unexpected error occurred while deleting your account.",
          variant: "destructive"
        });
      }
    }
  };

  const value = { currentUser, userStats, updateUserStats, loginWithGoogle, loginAsGuest, linkGoogleAccount, logout, deleteAccount, loading };

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
