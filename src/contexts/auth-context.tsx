
"use client";

import type { ReactNode } from 'react';
import React, from 'react';
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
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  loading: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

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
      }, { merge: true });
    }

    return defaultStats;
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [userStats, setUserStats] = React.useState<UserStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();
  const firebaseConfigured = !!auth && !!db;

  const updateUserStats = async (newStats: Partial<UserStats>) => {
    if (!currentUser || !db || currentUser.isGuest) return;
    const userDocRef = doc(db, "users", currentUser.uid);
    await updateDoc(userDocRef, { stats: newStats });
    setUserStats(prevStats => ({ ...prevStats!, ...newStats })); 
  };
  
  React.useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // This listener now primarily handles session persistence on page refresh
        const stats = await fetchUserDocument(user.uid);
        const appUser: User = {
          uid: user.uid,
          displayName: user.displayName || (user.isAnonymous ? `Guest#${user.uid.substring(0, 5)}` : 'Unnamed User'),
          email: user.email,
          isGuest: user.isAnonymous,
          createdAt: user.metadata.creationTime || new Date().toISOString(),
          stats: stats || { matchesPlayed: 0, prizesWon: {} as Record<PrizeType, number> },
        };
        setCurrentUser(appUser);
        setUserStats(appUser.stats);
      } else {
        setCurrentUser(null);
        setUserStats(null);
      }
      setLoading(false);
    });

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
    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      let stats = await fetchUserDocument(user.uid);
      if (!stats) {
        stats = await createUserDocument(user);
      }

      const appUser: User = {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        isGuest: user.isAnonymous,
        createdAt: user.metadata.creationTime || new Date().toISOString(),
        stats: stats,
      };

      setCurrentUser(appUser);
      setUserStats(stats);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        console.error("Google Sign-In Error:", error);
        toast({
          title: "Sign-In Failed",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Sign-in Cancelled" });
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
      const user = result.user;

      const defaultStats: UserStats = {
        matchesPlayed: 0,
        prizesWon: Object.values(PRIZE_TYPES).reduce((acc, prize) => {
          acc[prize] = 0;
          return acc;
        }, {} as Record<PrizeType, number>),
      };
      
      const guestUser: User = {
        uid: user.uid,
        displayName: `Guest#${user.uid.substring(0, 5)}`,
        email: null,
        isGuest: true,
        createdAt: user.metadata.creationTime || new Date().toISOString(),
        stats: defaultStats,
      };
      setCurrentUser(guestUser);
      setUserStats(defaultStats);
    } catch (error: any) {
      console.error("Error during guest sign-in:", error);
      toast({
        title: "Guest Sign-in Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
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
      const linkedUser = result.user;
      
      // Since the user was a guest, create their document now.
      const stats = await createUserDocument(linkedUser);

      const appUser: User = {
        uid: linkedUser.uid,
        displayName: linkedUser.displayName,
        email: linkedUser.email,
        isGuest: false,
        createdAt: linkedUser.metadata.creationTime || new Date().toISOString(),
        stats: stats,
      };
      setCurrentUser(appUser);
      setUserStats(stats);
      
      toast({
        title: "Account Linked!",
        description: "Your guest account is now saved to Google.",
      });

    } catch (error: any) {
      if (error.code === 'auth/credential-already-in-use') {
         toast({ title: "Account Exists", description: "That Google account is already in use. Please log out and sign in with Google directly.", variant: 'destructive'});
         await signOut(auth);
      } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        console.error("Account Linking Error:", error);
        toast({ title: "Linking Failed", description: "An unexpected error occurred. If the pop-up closes automatically, check your Firebase domain authorizations.", variant: "destructive" });
      } else {
        toast({ title: "Linking Cancelled" });
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
        setUserStats(null);
    } catch(error) {
      console.error("Error signing out:", error);
      toast({
        title: "Logout Error",
        description: "An error occurred during sign out.",
        variant: "destructive"
      });
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
          description: error.message || "An unexpected error occurred.",
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
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
