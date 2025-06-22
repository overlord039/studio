"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  username: string;
  email: string;
  // Add other user properties here if needed
}

interface AuthContextType {
  currentUser: User | null;
  login: (userData: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // To handle initial load
  const router = useRouter();

  useEffect(() => {
    // Mock: Check if user was "logged in" from a previous session (e.g., localStorage)
    // This is a very basic example. Real auth is more complex.
    try {
      const storedUser = localStorage.getItem('housiehub-user');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error reading user from localStorage", error);
      localStorage.removeItem('housiehub-user');
    }
    setLoading(false);
  }, []);

  const login = (userData: User) => {
    setCurrentUser(userData);
    localStorage.setItem('housiehub-user', JSON.stringify(userData));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('housiehub-user');
    router.push('/'); // Redirect to home on logout
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading }}>
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
