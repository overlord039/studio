
"use client";

import type { ReactNode } from 'react';
import React, { useState, useEffect, useContext, createContext } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  signOut, 
  onAuthStateChanged, 
  signInAnonymously, 
  deleteUser,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, updateDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
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
  loginWithEmailLink: (email: string) => Promise<boolean>;
  linkGoogleAccount: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  loading: boolean;
  isSigningIn: null | 'guest' | 'google' | 'email';
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
  const [isSigningIn, setIsSigningIn] = useState<null | 'guest' | 'google' | 'email'>(null);
  const { toast } = useToast();
  const firebaseConfigured = !!auth && !!db;

  useEffect(() => {
    if (!firebaseConfigured) {
        setLoading(false);
        return;
    }
    
    // Handle the case where the user lands on the page with a sign-in link
    const handleEmailLinkSignIn = async () => {
      if (auth && isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
          toast({
            title: "Sign-in link error",
            description: "Please use the sign-in link on the same device and browser you used to request it.",
            variant: "destructive",
            duration: 7000,
          });
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        setIsSigningIn('email');
        try {
          await signInWithEmailLink(auth, email, window.location.href);
          window.localStorage.removeItem('emailForSignIn');
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error: any) {
          toast({ title: "Sign-in Failed", description: error.message, variant: "destructive" });
        } finally {
          setIsSigningIn(null);
        }
      }
    };
    
    if (!auth?.currentUser) {
      handleEmailLinkSignIn();
    }

    let userDocUnsubscribe: Unsubscribe | undefined;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (userDocUnsubscribe) {
            userDocUnsubscribe(); // Stop listening to the old user's doc
        }

        if (firebaseUser) {
            const userDocRef = doc(db, "users", firebaseUser.uid);
            
            // Listen for real-time updates to the user document
            userDocUnsubscribe = onSnapshot(userDocRef, async (docSnap) => {
                if (docSnap.exists()) {
                    setCurrentUser(docSnap.data() as User);
                } else {
                    // This logic runs if the user exists in Auth but not Firestore.
                    const newUserProfile: User = {
                        uid: firebaseUser.uid,
                        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || `User#${firebaseUser.uid.substring(0,5)}`,
                        email: firebaseUser.email,
                        isGuest: firebaseUser.isAnonymous,
                        createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
                        stats: createDefaultStats(),
                    };
                    if (!newUserProfile.isGuest) {
                      await writeUserProfileToDB(newUserProfile);
                    }
                    setCurrentUser(newUserProfile);
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
  }, [firebaseConfigured, toast]);

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
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      
      const firebaseUser = result.user;
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      let userProfile: User;
      if (userDoc.exists()) {
        userProfile = userDoc.data() as User;
      } else {
        userProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || `User#${firebaseUser.uid.substring(0,5)}`,
          email: firebaseUser.email,
          isGuest: false,
          createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
          stats: createDefaultStats(),
        };
        await writeUserProfileToDB(userProfile);
      }
      setCurrentUser(userProfile);
      toast({ title: "Signed In Successfully", description: `Welcome back, ${userProfile.displayName}!` });
    } catch (error: any) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        toast({ title: "Account Exists", description: "An account with this email already exists. Please sign in with the original method.", variant: "destructive" });
      } else if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Google Sign-In Error:", error);
        toast({ title: "Google Sign-in Failed", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsSigningIn(null);
    }
  };

  const loginWithEmailLink = async (email: string): Promise<boolean> => {
    if (!auth) {
      showFirebaseNotConfiguredToast();
      return false;
    }
    setIsSigningIn('email');
    const actionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: true,
    };
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      toast({
        title: "Check your email",
        description: `A sign-in link has been sent to ${email}.`,
        duration: 7000,
      });
      return true;
    } catch (error: any) {
      console.error("Error sending email link:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setIsSigningIn(null);
    }
  };

  const linkGoogleAccount = async () => {
    if (!auth?.currentUser?.isAnonymous || !db) {
      toast({ title: "Error", description: "You must be signed in as a guest to link an account.", variant: "destructive" });
      return;
    }
    const guestUser = auth.currentUser;
    setIsSigningIn('google');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await linkWithPopup(guestUser, provider);
      
      const firebaseUser = result.user;
      const guestStats = currentUser?.stats || createDefaultStats();
      
      const newUserProfile: User = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || `User#${firebaseUser.uid.substring(0,5)}`,
        email: firebaseUser.email,
        isGuest: false,
        createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
        stats: guestStats,
      };

      await writeUserProfileToDB(newUserProfile);
      setCurrentUser(newUserProfile);

      toast({ title: "Account Linked!", description: "Your guest progress has been saved to your Google account." });

    } catch (error: any) {
      if (error.code === 'auth/credential-already-in-use') {
        toast({ title: "Account Exists", description: "This Google account is already linked to another HousieHub profile.", variant: "destructive" });
      } else if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Google Account Linking Error:", error);
        toast({ title: "Link Failed", description: error.message, variant: "destructive" });
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
      loginWithEmailLink,
      linkGoogleAccount, 
      loginAsGuest, 
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
