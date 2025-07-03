"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  UsersRound, 
  KeyRound, 
  Speaker,
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
    <div className="flex-grow flex flex-col items-center space-y-8 p-4">
      {/* Hero Section */}
      <section className="flex justify-center w-full py-4">
         <Image 
            src="/applogo.png" 
            alt="HousieHub Logo" 
            width={300} 
            height={300} 
            className="h-auto w-[200px] md:w-[300px]"
            priority 
          />
      </section>

      {/* Action Buttons */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        <Card 
          className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer rounded-2xl shadow-lg transform hover:-translate-y-1"
          onClick={handleCreateRoom}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCreateRoom() }}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <UsersRound className="h-12 w-12 mb-3" />
            <p className="text-xl font-bold">Create Multiplayer Room</p>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground p-6 rounded-2xl shadow-lg">
            <CardHeader className="p-0 mb-4 flex-row items-center justify-center gap-3">
              <KeyRound className="h-10 w-10 text-accent" />
              <CardTitle className="text-xl font-bold m-0 p-0">Join Room</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-sm text-muted-foreground mb-4 text-center">Enter a Room ID to join.</p>
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
                <Button variant="secondary" onClick={handleJoinRoom} disabled={loading}>
                  Join
                </Button>
              </div>
            </CardContent>
        </Card>
        
        <Card 
          className="bg-accent text-accent-foreground hover:bg-accent/90 transition-colors cursor-pointer rounded-2xl shadow-lg transform hover:-translate-y-1"
          onClick={() => router.push('/number-caller')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push('/number-caller') }}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <Speaker className="h-12 w-12 mb-3" />
            <p className="text-xl font-bold">Number Caller</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer rounded-2xl shadow-lg transform hover:-translate-y-1"
           onClick={() => router.push('/prize-calculator')}
           role="button"
           tabIndex={0}
           onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push('/prize-calculator') }}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <Calculator className="h-12 w-12 mb-3" />
            <p className="text-xl font-bold">Prize Calculator</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
