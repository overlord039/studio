
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  loginWithGoogle: () => void;
  loginAsGuest: () => void;
  linkGoogleAccount: () => void;
  logout: () => void;
  loading: boolean;
  firebaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
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
        return;
    }
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("Signed in user:", user);
      router.push('/');
    } catch (error) {
        console.error("Full error object during Google sign-in:", error);
        
        let errorCode = "UNKNOWN_ERROR";
        let errorMessage = "An unexpected error occurred. Please try again.";

        if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
            errorCode = String((error as any).code);
            errorMessage = String((error as any).message);
        }

        if (errorCode === 'auth/popup-closed-by-user' || errorCode === 'auth/cancelled-popup-request') {
            toast({
                title: "Sign-in Cancelled",
                description: "The sign-in window was closed.",
            });
        } else {
            toast({
              title: "Sign-in Error",
              description: `[${errorCode}] ${errorMessage}`,
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
        const result = await signInAnonymously(auth);
        const user = result.user;
        console.log("Signed in as guest:", user.uid);
        router.push('/');
    } catch (error) {
        console.error("Full error object during Guest sign-in:", error);

        let errorCode = "UNKNOWN_ERROR";
        let errorMessage = "An unexpected error occurred. Please try again.";

        if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
            errorCode = String((error as any).code);
            errorMessage = String((error as any).message);
        }

        toast({
          title: "Guest Sign-in Error",
          description: `[${errorCode}] ${errorMessage}`,
          variant: "destructive"
        });
    }
  };
  
  const linkGoogleAccount = async () => {
    if (!auth || !auth.currentUser) {
      toast({
        title: "Error",
        description: "No user is currently signed in to link.",
        variant: "destructive",
      });
      return;
    }

    const provider = new GoogleAuthProvider();
    try {
        const result = await linkWithPopup(auth.currentUser, provider);
        const user = result.user;
        console.log("Account linked successfully", user);
        toast({
          title: "Account Linked!",
          description: "You've successfully upgraded your account with Google.",
        });
        // onAuthStateChanged will update the user state automatically.
      } catch (error) {
        console.error("Full error object during account linking:", error);

        let errorCode = "UNKNOWN_ERROR";
        let errorMessage = "An unexpected error occurred. Please try again.";
        let credential = null;

        if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
            errorCode = String((error as any).code);
            errorMessage = String((error as any).message);
            if(errorCode === 'auth/credential-already-in-use') {
                try {
                    credential = GoogleAuthProvider.credentialFromError(error);
                } catch(e) {
                    console.error("Could not extract credential from error", e);
                }
            }
        }
        
        if (errorCode === 'auth/popup-closed-by-user' || errorCode === 'auth/cancelled-popup-request') {
            toast({
                title: "Linking Cancelled",
                description: "The account linking window was closed.",
            });
        } else if (errorCode === 'auth/credential-already-in-use') {
          if (!credential) {
            toast({
              title: "Sign-in Error",
              description: "Could not retrieve credentials. Please try signing in directly.",
              variant: "destructive",
            });
            return;
          }

          toast({
            title: "Account Exists",
            description: "Switching to your existing Google account.",
          });
          
          try {
            await signOut(auth);
            const signInResult = await signInWithCredential(auth, credential);
            console.log("Successfully switched to existing account:", signInResult.user.uid);
            router.push('/');
          } catch(signInError) {
              console.error("Error signing in with existing credential:", signInError);
              toast({
                title: "Sign-in Failed",
                description: "Could not switch to your existing account. Please try logging in again.",
                variant: "destructive",
              });
          }
        } else {
          toast({
            title: "Link Error",
            description: `[${errorCode}] ${errorMessage}`,
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
    signOut(auth).then(() => {
      // Sign-out successful.
      router.push('/');
    }).catch((error) => {
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
