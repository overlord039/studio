
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
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [firebaseConfigured]);

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
        throw new Error("Firebase not configured");
    }
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // onAuthStateChanged will handle the rest
  };

  const loginAsGuest = async () => {
     if (!auth) {
        showFirebaseNotConfiguredToast();
        throw new Error("Firebase not configured");
    }
    await signInAnonymously(auth);
    // onAuthStateChanged will handle the rest
  };
  
  const linkGoogleAccount = async () => {
    if (!auth || !auth.currentUser) {
      throw new Error("No user is currently signed in to link.");
    }

    const provider = new GoogleAuthProvider();
    try {
        await linkWithPopup(auth.currentUser, provider);
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
                // Re-throw to be caught by the component
                throw signInError;
            }
        } else {
            // Re-throw other errors for the component to handle (e.g., popup closed)
            throw error;
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

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

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
