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
      router.push('/auth/login');
      return;
    }
    router.push('/create-room');
  };

  return (
    <div className="py-8 md:py-12 space-y-16 md:space-y-24">
      {/* Hero Section */}
      <section className="text-center py-16 md:py-24 bg-gradient-to-br from-primary via-purple-600 to-accent rounded-xl shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-primary-foreground mb-6 tracking-tight animate-fade-in-down" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.3)'}}>
          Welcome to HousieHub!
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-10 max-w-3xl mx-auto animate-fade-in-up">
          Play Housie anytime, anywhere with family and friends. Create rooms, join games, and enjoy winning together!
          </p>
          {!loading && !currentUser && (
            <div className="space-x-4 animate-fade-in">
              <Link href="/auth/login" passHref>
                <Button size="lg" variant="secondary" className="text-lg px-8 py-3 transform transition-all hover:scale-105 shadow-md hover:shadow-lg">
                  <LogInIcon className="mr-2 h-5 w-5" /> Login
                </Button>
              </Link>
              <Link href="/auth/register" passHref>
                <Button size="lg" variant="secondary" className="text-lg px-8 py-3 transform transition-all hover:scale-105 shadow-md hover:shadow-lg">
                  <UserPlus className="mr-2 h-5 w-5" /> Register
                </Button>
              </Link>
            </div>
          )}
          {currentUser && (
            <p className="text-lg text-primary-foreground/90 animate-fade-in">Logged in as: <span className="font-semibold">{currentUser.username}</span></p>
          )}
        </div>
      </section>

      {/* Main Options */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 group rounded-lg overflow-hidden">
          <CardHeader className="text-center items-center">
            <div className="p-3 bg-primary/10 group-hover:bg-primary/20 transition-colors rounded-full mb-4 inline-block">
              <UsersRound className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Create Multiplayer Room</CardTitle>
            <CardDescription>Host a game for your friends.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button className="w-full" size="lg" onClick={handleCreateRoom} disabled={loading}>
              Create Room
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 group rounded-lg overflow-hidden">
          <CardHeader className="text-center items-center">
            <div className="p-3 bg-accent/10 group-hover:bg-accent/20 transition-colors rounded-full mb-4 inline-block">
             <KeyRound className="h-10 w-10 text-accent" />
            </div>
            <CardTitle className="text-2xl font-bold">Join Room</CardTitle>
            <CardDescription>Enter a Room ID to join a game.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input 
              type="text" 
              placeholder="Enter Room ID" 
              className="text-center h-12 text-base"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
              disabled={loading}
              maxLength={6}
            />
            <Button variant="outline" className="w-full" size="lg" onClick={handleJoinRoom} disabled={loading}>
              Join Game
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 group rounded-lg overflow-hidden">
          <CardHeader className="text-center items-center">
            <div className="p-3 bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors rounded-full mb-4 inline-block">
              <Speaker className="h-10 w-10 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Number Caller</CardTitle>
            <CardDescription>System auto-call or manual calling</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/number-caller" passHref>
              <Button className="w-full" size="lg">
                Open Caller
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 group rounded-lg overflow-hidden">
          <CardHeader className="text-center items-center">
            <div className="p-3 bg-green-500/10 group-hover:bg-green-500/20 transition-colors rounded-full mb-4 inline-block">
              <Calculator className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Prize Calculator</CardTitle>
            <CardDescription>Calculate prize money distribution.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/prize-calculator" passHref>
              <Button className="w-full" size="lg">
                Open Calculator
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
