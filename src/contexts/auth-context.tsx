
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
  signInWithCredential
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
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
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
  logout: () => void;
  loading: boolean;
  firebaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const firebaseConfigured = !!auth && !!db;

  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      return; // No auth object, so don't subscribe.
    }
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      try {
        if (user) {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          let userStats: UserStats;

          if (userDocSnap.exists()) {
              const docData = userDocSnap.data();
              const existingStats = docData.stats || {}; // Handle missing stats field safely
              
              userStats = {
                  matchesPlayed: existingStats.matchesPlayed || 0,
                  prizesWon: existingStats.prizesWon || {},
              };

              // Ensure all prize types are initialized in the stats object
              Object.values(PRIZE_TYPES).forEach(prize => {
                  if (userStats.prizesWon[prize] === undefined) {
                      userStats.prizesWon[prize] = 0;
                  }
              });
          } else {
              // Create a new stats document for the registered user
              userStats = {
                  matchesPlayed: 0,
                  prizesWon: Object.values(PRIZE_TYPES).reduce((acc, prize) => {
                      acc[prize] = 0;
                      return acc;
                  }, {} as Record<PrizeType, number>),
              };
              // Do not write guest stats to DB
              if (!user.isAnonymous) {
                  await setDoc(userDocRef, { stats: userStats });
              }
          }
          
          // User is signed in.
          const userToStore: User = {
            uid: user.uid,
            displayName: user.displayName || (user.isAnonymous ? `Guest#${user.uid.substring(0, 5)}` : 'Unnamed User'),
            email: user.email,
            isGuest: user.isAnonymous,
            createdAt: user.metadata.creationTime || new Date().toISOString(),
            stats: userStats,
          };
          setCurrentUser(userToStore);
        } else {
          // User is signed out.
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Error during auth state change handling:", error);
        toast({
          title: "Authentication Error",
          description: "There was a problem loading your user data. Please try logging in again.",
          variant: "destructive"
        });
        // If we can't load their data, we shouldn't leave them in a logged-in but broken state.
        if (auth) {
          await signOut(auth);
        }
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
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
      // Success is handled by onAuthStateChanged
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        toast({
          title: "Sign-in Cancelled",
          description: "The sign-in window was closed.",
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
      // Success is handled by onAuthStateChanged
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

    const provider = new GoogleAuthProvider();
    try {
        await linkWithPopup(auth.currentUser, provider);
        toast({
          title: "Account Linked!",
          description: "You've successfully upgraded your account with Google.",
        });
        // onAuthStateChanged will update the user state automatically.
    } catch (error: any) {
        if (error.code === 'auth/credential-already-in-use') {
            toast({
              title: "Account Exists",
              description: "This Google account is already in use. Switching to existing account.",
            });
            try {
              const credential = GoogleAuthProvider.credentialFromError(error);
              if (credential) {
                await signOut(auth);
                await signInWithCredential(auth, credential);
                 // onAuthStateChanged will handle the rest
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
                description: "The account linking window was closed.",
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
      // An error happened.
      console.error("Error signing out:", error);
      toast({
        title: "Logout Error",
        description: "An error occurred during sign out.",
        variant: "destructive"
      });
    });
  };

  return (
    <AuthContext.Provider value={{ currentUser, loginWithGoogle, loginAsGuest, linkGoogleAccount, logout, loading, firebaseConfigured }}>
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
