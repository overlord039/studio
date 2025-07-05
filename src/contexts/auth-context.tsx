
"use client";

import type { ReactNode } from 'react';
import React, { useState, useEffect, useContext, createContext } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  GoogleAuthProvider,
  FacebookAuthProvider, 
  signInWithPopup,
  signInWithCredential,
  signOut, 
  onAuthStateChanged, 
  signInAnonymously, 
  linkWithPopup,
  deleteUser,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { UserStats, PrizeType } from '@/types';
import { PRIZE_TYPES } from '@/types';
import LoginSelectionScreen from '@/components/auth/login-selection-screen';
import { Loader2 } from 'lucide-react';


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
  loginWithFacebook: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  loading: boolean;
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

const createUserProfileInDB = async (firebaseUser: FirebaseUser): Promise<User> => {
      if (!db) throw new Error("Database not configured.");
      
      const appUser: User = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || `User#${firebaseUser.uid.substring(0,5)}`,
        email: firebaseUser.email,
        isGuest: firebaseUser.isAnonymous,
        createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
        stats: createDefaultStats(),
      };
      
      // Only write to DB for non-guest users
      if (!firebaseUser.isAnonymous) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        await setDoc(userDocRef, appUser);
      }

      return appUser;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const firebaseConfigured = !!auth && !!db;

  useEffect(() => {
    if (!firebaseConfigured) {
        setLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            // User is signed in (session restored). Fetch their full profile from DB.
            const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
            if (userDoc.exists()) {
                setCurrentUser(userDoc.data() as User);
            } else if (!firebaseUser.isAnonymous) {
                // This can happen if user signed up but doc creation failed.
                console.warn(`User ${firebaseUser.uid} authenticated but has no document. Recreating...`);
                const appUser = await createUserProfileInDB(firebaseUser);
                setCurrentUser(appUser);
            } else {
                 // Guest user session restored
                 const guestUser: User = {
                    uid: firebaseUser.uid,
                    displayName: `Guest#${firebaseUser.uid.substring(0, 5)}`,
                    email: null,
                    isGuest: true,
                    createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
                    stats: createDefaultStats(),
                };
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
    setLoading(true);

    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      let appUser: User;
      if (userDocSnap.exists()) {
        appUser = userDocSnap.data() as User;
      } else {
        appUser = await createUserProfileInDB(firebaseUser);
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
      setLoading(false);
    }
  };

  const loginWithFacebook = async () => {
    if (!auth || !db) {
      showFirebaseNotConfiguredToast();
      return;
    }
    setLoading(true);
    const provider = new FacebookAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      let appUser: User;
      if (userDocSnap.exists()) {
        appUser = userDocSnap.data() as User;
      } else {
        appUser = await createUserProfileInDB(firebaseUser);
      }
      
      setCurrentUser(appUser);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        toast({ title: "Sign-in Cancelled", description: "You closed the sign-in window." });
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        toast({
          title: "Account Exists",
          description: "An account with this email already exists using a different sign-in method.",
          variant: "destructive",
          duration: 7000,
        });
      } else {
        console.error("Facebook Sign-In Error:", error);
        toast({ title: "Sign-In Failed", description: error.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const loginAsGuest = async () => {
    if (!auth) {
      showFirebaseNotConfiguredToast();
      return;
    }
    setLoading(true);
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
      setLoading(false);
    }
  };

  const linkGoogleAccount = async () => {
    if (!auth?.currentUser?.isAnonymous) {
      toast({ title: "Not a Guest", description: "This account is already permanent." });
      return;
    }
    setLoading(true);
    const provider = new GoogleAuthProvider();
    const guestUser = auth.currentUser;

    try {
      const result = await linkWithPopup(guestUser, provider);
      const permanentUser = await createUserProfileInDB(result.user);
      setCurrentUser(permanentUser);

      toast({
        title: "Account Linked!",
        description: "Your guest account is now saved to Google.",
      });

    } catch (error: any) {
      if (error.code === 'auth/credential-already-in-use') {
         toast({ title: "Account Exists", description: "Switching to your existing Google account. Guest progress will not be transferred.", duration: 5000 });
         const credential = GoogleAuthProvider.credentialFromError(error);
         if (credential) {
            await signOut(auth);
            await signInWithCredential(auth, credential);
         }
      } else if (error.code === 'auth/popup-closed-by-user') {
          toast({ title: "Linking Cancelled", description: "You closed the sign-in window." });
      } else {
        console.error("Account Linking Error:", error);
        toast({ title: "Linking Failed", description: error.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
     if (!auth) {
        showFirebaseNotConfiguredToast();
        return;
    }
    try {
        await signOut(auth);
        setCurrentUser(null);
    } catch(error) {
      console.error("Error signing out:", error);
      toast({ title: "Logout Error", description: "An error occurred during sign out.", variant: "destructive" });
    }
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
      loginWithFacebook, 
      loginAsGuest, 
      linkGoogleAccount, 
      logout, 
      deleteAccount, 
      loading 
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
