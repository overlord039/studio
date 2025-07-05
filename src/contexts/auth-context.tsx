
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User as FirebaseUser } from 'firebase/auth';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Simplified user object to store in context
export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  isGuest: boolean;
  createdAt: string;
}

interface AuthContextType {
  currentUser: User | null;
  loginWithGoogle: () => void;
  loginAsGuest: () => void;
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
  const firebaseConfigured = !!auth;

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return; // No auth object, so don't subscribe.
    }
    const unsubscribe = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
      if (user) {
        // User is signed in.
        const userToStore: User = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          isGuest: user.isAnonymous,
          createdAt: user.metadata.creationTime || new Date().toISOString(),
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

  const loginWithGoogle = () => {
    if (!auth) {
        showFirebaseNotConfiguredToast();
        return;
    }
    const provider = new GoogleAuthProvider();
    // Optional: Add scopes to request additional user data from Google.
    // provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
    
    // Optional: Add custom parameters to the sign-in request.
    // provider.setCustomParameters({
    //   'login_hint': 'user@example.com'
    // });

    signInWithPopup(auth, provider)
      .then((result) => {
        // This gives you a Google Access Token. You can use it to access the Google API.
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;
        // The signed-in user info.
        const user = result.user;
        console.log("Signed in user:", user, "with token:", token);
        // onAuthStateChanged will handle setting the user, but we can still redirect here
        router.push('/');
      }).catch((error) => {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        // The email of the user's account used.
        const email = error.customData?.email;
        // The AuthCredential type that was used.
        const credential = GoogleAuthProvider.credentialFromError(error);
        
        console.error("Error during Google sign-in:", { errorCode, errorMessage, email, credential });

        toast({
          title: "Sign-in Error",
          description: errorMessage || "Could not sign in with Google. Please try again.",
          variant: "destructive"
        });
      });
  };

  const loginAsGuest = () => {
     if (!auth) {
        showFirebaseNotConfiguredToast();
        return;
    }
    signInAnonymously(auth)
      .then((result) => {
        console.log("Signed in as guest:", result.user);
        router.push('/');
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error("Error during guest sign-in:", { errorCode, errorMessage });
        toast({
          title: "Guest Sign-in Error",
          description: errorMessage || "Could not sign in as a guest. Please try again.",
          variant: "destructive"
        });
      });
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
    <AuthContext.Provider value={{ currentUser, loginWithGoogle, loginAsGuest, logout, loading, firebaseConfigured }}>
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
