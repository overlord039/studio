
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
  signInWithCredential,
  deleteUser
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserStats, PrizeType } from '@/types';
import { PRIZE_TYPES } from '@/types';


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
  firebaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          let stats = await fetchUserDocument(user.uid);
          if (!stats) {
            stats = await createUserDocument(user);
          }
          
          setCurrentUser({
            uid: user.uid,
            displayName: user.displayName || (user.isAnonymous ? `Guest#${user.uid.substring(0, 5)}` : 'Unnamed User'),
            email: user.email,
            isGuest: user.isAnonymous,
            createdAt: user.metadata.creationTime || new Date().toISOString(),
            stats: stats,
          });
           setUserStats(stats);
        } else {
          setCurrentUser(null);
          setUserStats(null);
        }
      } catch (error) {
        console.error("Error during auth state change handling:", error);
        toast({
          title: "Authentication Error",
          description: "There was a problem loading your user data. Please try logging in again.",
          variant: "destructive"
        });
        if (auth) {
          await signOut(auth);
        }
        setCurrentUser(null);
        setUserStats(null);
      } finally {
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
      // onAuthStateChanged handles success
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        toast({
          title: "Sign-in Cancelled",
          description: "You closed the sign-in window before completion.",
        });
      } else {
        console.error("Error during Google sign-in:", error);
        toast({
          title: "Sign-in Error",
          description: error.message || "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
      }
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
    if (!auth || !auth.currentUser) {
      toast({ title: "Error", description: "No user is currently signed in to link.", variant: "destructive" });
      return;
    }
    
    if (!auth.currentUser.isAnonymous) {
        toast({ title: "Already Linked", description: "This account is not a guest account.", variant: "destructive"});
        return;
    }

    const provider = new GoogleAuthProvider();
    const guestUser = auth.currentUser;
    const guestStats = await fetchUserDocument(guestUser.uid);

    try {
        const result = await linkWithPopup(guestUser, provider);
        const linkedUser = result.user;
        
        try {
            if (!db) throw new Error("Database not available");
            const linkedUserDocRef = doc(db, "users", linkedUser.uid);
            const batch = writeBatch(db);
            
            batch.set(linkedUserDocRef, {
                uid: linkedUser.uid,
                email: linkedUser.email,
                displayName: linkedUser.displayName,
                createdAt: linkedUser.metadata.creationTime,
                stats: guestStats || { matchesPlayed: 0, prizesWon: {}}
            }, { merge: true });

            await batch.commit();

            toast({
              title: "Account Linked!",
              description: "You've successfully upgraded your guest account.",
            });
        } catch (dbError) {
            console.error("Database error after linking:", dbError);
            toast({
                title: "Account Linked, Data Error",
                description: "Your account is linked, but we couldn't transfer your guest stats.",
                variant: "destructive"
            });
        }

    } catch (error: any) {
        if (error.code === 'auth/credential-already-in-use') {
            toast({
              title: "Account Exists",
              description: "This Google account is already in use. We will now sign you into that account. Your guest progress will not be transferred.",
              duration: 5000,
            });
            try {
              const credential = GoogleAuthProvider.credentialFromError(error);
              if (credential) {
                await signOut(auth);
                await signInWithCredential(auth, credential);
              } else {
                 throw new Error("Could not extract credential on conflict.");
              }
            } catch (signInError: any) {
                console.error("Error signing in with existing credential:", signInError);
                toast({
                  title: "Sign-in Failed",
                  description: "Could not switch to your existing account. Please try logging in again.",
                  variant: "destructive",
                });
            }
        } else if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
            toast({
              title: "Linking Cancelled",
              description: "You closed the sign-in window.",
            });
        } else {
            console.error("Error linking account:", error);
            toast({
              title: "Link Error",
              description: error.message || "An unknown error occurred.",
              variant: "destructive",
            });
        }
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

  return (
    <AuthContext.Provider value={{ currentUser, userStats, updateUserStats, loginWithGoogle, loginAsGuest, linkGoogleAccount, logout, deleteAccount, loading, firebaseConfigured }}>
      {children}
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
