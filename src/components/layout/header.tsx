"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { User, LogIn, UserPlus, Moon, Sun, HelpCircle, Settings } from 'lucide-react';
import { useTheme } from "next-themes";
import { useAuth } from '@/contexts/auth-context';
import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSound } from '@/contexts/sound-context';

export default function Header() {
  const { currentUser, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const { isMuted, toggleMute } = useSound();
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  const controlNavbar = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (window.scrollY > lastScrollY && window.scrollY > 50) { // if scroll down and past 50px
        setIsHidden(true);
      } else { // if scroll up
        setIsHidden(false);
      }
      setLastScrollY(window.scrollY); 
    }
  }, [lastScrollY]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavbar);

      return () => {
        window.removeEventListener('scroll', controlNavbar);
      };
    }
  }, [controlNavbar]);

  return (
    <header className={cn(
      "bg-primary text-primary-foreground shadow-md sticky top-0 z-50 transition-transform duration-300 ease-in-out",
      isHidden && "-translate-y-full"
    )}>
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold tracking-tight">
          HousieHub
        </Link>
        <nav className="flex items-center space-x-2 md:space-x-3">
          <Link href="/how-to-play" passHref>
              <Button variant="secondary" className="px-2 md:px-3">
                  <HelpCircle className="mr-0 md:mr-2 h-4 w-4" /> <span className="hidden md:inline">How to Play</span>
              </Button>
          </Link>
          {loading ? (
            <div className="h-8 w-20 bg-primary/50 animate-pulse rounded-md"></div> 
          ) : currentUser ? (
            <>
              <Link href="/profile" passHref>
                <Button variant="secondary" className="px-2 md:px-3">
                  <User className="mr-0 md:mr-2 h-4 w-4" /> <span className="hidden md:inline">{currentUser.username}</span>
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/login" passHref>
                <Button variant="ghost" className="text-primary-foreground hover:bg-primary/80 px-2 md:px-3">
                  <LogIn className="mr-0 md:mr-2 h-4 w-4" /> <span className="hidden md:inline">Login</span>
                </Button>
              </Link>
              <Link href="/auth/register" passHref>
                <Button variant="ghost" className="text-primary-foreground hover:bg-primary/80 px-2 md:px-3">
                  <UserPlus className="mr-0 md:mr-2 h-4 w-4" /> <span className="hidden md:inline">Register</span>
                </Button>
              </Link>
            </>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                <Settings className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Settings</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center justify-between cursor-pointer">
                <Label htmlFor="sound-toggle" className="pr-2 cursor-pointer">Sound</Label>
                <Switch id="sound-toggle" checked={!isMuted} onCheckedChange={toggleMute} />
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="ml-2">Theme</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                    <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
