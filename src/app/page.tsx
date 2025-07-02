"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  LogIn as LogInIcon, 
  UserPlus, 
  Speaker,
  UsersRound, 
  KeyRound, 
  Zap,
  Shuffle,
  ShieldCheck,
  Smartphone,
  SunMoon,
  ChevronRight,
  Calculator
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, loading } = useAuth();
  const [joinRoomId, setJoinRoomId] = useState('');

  const handleJoinRoom = () => {
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please log in to join a room.",
        variant: "destructive",
      });
      router.push('/auth/login');
      return;
    }
    const trimmedRoomId = joinRoomId.trim();
    if (trimmedRoomId) {
      router.push(`/room/${trimmedRoomId}/lobby`);
    } else {
      toast({
        title: "Room ID Required",
        description: "Please enter a Room ID to join.",
        variant: "destructive",
      });
    }
  };

  const handleCreateRoom = () => {
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please log in to create a room.",
        variant: "destructive",
      });
      router.push('/create-room');
      return;
    }
    router.push('/create-room');
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center space-y-6">
      {/* Hero Section */}
      <section className="text-center py-2 bg-gradient-to-br from-primary via-purple-600 to-accent rounded-xl shadow-2xl relative overflow-hidden w-full">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="relative z-10 px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary-foreground mb-4 tracking-tight animate-fade-in-down" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.3)'}}>
            {currentUser ? `Welcome, ${currentUser.username}!` : 'Welcome to HousieHub!'}
          </h1>
          
          {!loading && !currentUser && (
            <div className="flex flex-row justify-center items-center gap-4 animate-fade-in">
              <Link href="/auth/login" passHref>
                <Button size="lg" variant="secondary" className="w-auto px-8 py-3 transform transition-all hover:scale-105 shadow-md hover:shadow-lg">
                  <LogInIcon className="mr-2 h-5 w-5" /> Login
                </Button>
              </Link>
              <Link href="/auth/register" passHref>
                <Button size="lg" variant="secondary" className="w-auto px-8 py-3 transform transition-all hover:scale-105 shadow-md hover:shadow-lg">
                  <UserPlus className="mr-2 h-5 w-5" /> Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Main Options */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 w-full">
        <Card 
          className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 group rounded-lg overflow-hidden cursor-pointer flex flex-col"
          onClick={handleCreateRoom}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCreateRoom() }}
        >
          <CardHeader className="flex-grow flex flex-row items-center p-4 gap-4">
            <div className="p-3 bg-primary/10 group-hover:bg-primary/20 transition-colors rounded-full inline-block">
              <UsersRound className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Create Multiplayer Room</CardTitle>
              <CardDescription className="text-sm">Host a game for your friends.</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 group rounded-lg overflow-hidden">
          <CardHeader className="flex flex-row items-center p-4 gap-4">
            <div className="p-3 bg-accent/10 group-hover:bg-accent/20 transition-colors rounded-full inline-block">
             <KeyRound className="h-8 w-8 text-accent" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Join Room</CardTitle>
              <CardDescription className="text-sm">Enter a Room ID to join.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex w-full items-center space-x-2">
              <Input
                type="text"
                placeholder="Enter Room ID"
                className="h-10 text-sm"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                disabled={loading}
                maxLength={6}
              />
              <Button variant="outline" onClick={handleJoinRoom} disabled={loading}>
                Join
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 group rounded-lg overflow-hidden cursor-pointer flex flex-col"
          onClick={() => router.push('/number-caller')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push('/number-caller') }}
        >
          <CardHeader className="flex-grow flex flex-row items-center p-4 gap-4">
            <div className="p-3 bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors rounded-full inline-block">
              <Speaker className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Number Caller</CardTitle>
              <CardDescription className="text-sm">Manual or auto calling.</CardDescription>
            </div>
          </CardHeader>
        </Card>
        
        <Card 
          className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 group rounded-lg overflow-hidden cursor-pointer flex flex-col"
          onClick={() => router.push('/prize-calculator')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push('/prize-calculator') }}
        >
          <CardHeader className="flex-grow flex flex-row items-center p-4 gap-4">
            <div className="p-3 bg-green-500/10 group-hover:bg-green-500/20 transition-colors rounded-full inline-block">
              <Calculator className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Prize Calculator</CardTitle>
              <CardDescription className="text-sm">Plan prize distribution.</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </section>
    </div>
  );
}
