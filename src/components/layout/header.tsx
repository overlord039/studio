
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, User, LogIn, UserPlus, Moon, Sun } from 'lucide-react';
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock authentication state
// In a real app, this would come from context or a session
const useUser = () => {
  // const [user, setUser] = React.useState(null); // Replace with actual auth state
  // For now, let's assume a user is logged in for demonstration
  // return { user: { username: "DemoUser" }, loading: false };
  // Or no user logged in:
  return { user: null, loading: false };
};


export default function Header() {
  const { user } = useUser(); // Replace with actual user state
  const { setTheme } = useTheme();

  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold tracking-tight">
          HousieHub
        </Link>
        <nav className="flex items-center space-x-4">
          <Link href="/" passHref>
            <Button variant="ghost" className="text-primary-foreground hover:bg-primary/80">
              <Home className="mr-2 h-4 w-4" /> Home
            </Button>
          </Link>
          {user ? (
            <>
              <Link href="/profile" passHref>
                <Button variant="ghost" className="text-primary-foreground hover:bg-primary/80">
                  <User className="mr-2 h-4 w-4" /> Profile
                </Button>
              </Link>
              <Button variant="ghost" className="text-primary-foreground hover:bg-primary/80" onClick={() => alert('Logout clicked')}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login" passHref>
                <Button variant="ghost" className="text-primary-foreground hover:bg-primary/80">
                  <LogIn className="mr-2 h-4 w-4" /> Login
                </Button>
              </Link>
              <Link href="/auth/register" passHref>
                <Button variant="ghost" className="text-primary-foreground hover:bg-primary/80">
                  <UserPlus className="mr-2 h-4 w-4" /> Register
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
