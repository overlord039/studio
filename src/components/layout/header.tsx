
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { User, LogIn, UserPlus, Moon, Sun, LogOut as LogOutIcon } from 'lucide-react'; // Added LogOutIcon
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/contexts/auth-context';
import React from 'react';

export default function Header() {
  const { currentUser, logout, loading } = useAuth();
  const { setTheme } = useTheme();

  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold tracking-tight">
          HousieHub
        </Link>
        <nav className="flex items-center space-x-2 md:space-x-4">
          {loading ? (
            <div className="h-8 w-20 bg-primary/50 animate-pulse rounded-md"></div> // Skeleton loader
          ) : currentUser ? (
            <>
              <Link href="/profile" passHref>
                <Button variant="ghost" className="text-primary-foreground hover:bg-primary/80">
                  <User className="mr-0 md:mr-2 h-4 w-4" /> <span className="hidden md:inline">Profile</span>
                </Button>
              </Link>
              <Button variant="ghost" className="text-primary-foreground hover:bg-primary/80" onClick={logout}>
                <LogOutIcon className="mr-0 md:mr-2 h-4 w-4" /> <span className="hidden md:inline">Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login" passHref>
                <Button variant="ghost" className="text-primary-foreground hover:bg-primary/80">
                  <LogIn className="mr-0 md:mr-2 h-4 w-4" /> <span className="hidden md:inline">Login</span>
                </Button>
              </Link>
              <Link href="/auth/register" passHref>
                <Button variant="ghost" className="text-primary-foreground hover:bg-primary/80">
                  <UserPlus className="mr-0 md:mr-2 h-4 w-4" /> <span className="hidden md:inline">Register</span>
                </Button>
              </Link>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
