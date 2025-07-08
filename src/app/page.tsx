
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  PlusCircle, 
  Users,
  Speaker,
  Calculator
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { playSound } from '@/lib/sounds';

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, loading } = useAuth();
  const [joinRoomId, setJoinRoomId] = useState('');

  const handleJoinRoom = () => {
    playSound('cards.mp3');
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please sign in to join a room.",
        variant: "destructive",
      });
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
    playSound('cards.mp3');
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please sign in to create a room.",
        variant: "destructive",
      });
      return;
    }
    router.push('/create-room/private');
  };
  
  const handleNavigateWithSound = (path: string) => {
    playSound('cards.mp3');
    router.push(path);
  };

  return (
    <div className="flex-grow flex flex-col items-center space-y-2 p-2">
      {/* Hero Section */}
      <section className="flex justify-center w-full">
         <Image 
            src="/applogo.png" 
            alt="HousieHub Logo" 
            width={300} 
            height={300} 
            className="h-auto w-[200px] md:w-[300px]"
            priority 
          />
      </section>

      {currentUser && !loading && (
        <div className="text-center my-2">
          <p className="text-xl font-semibold text-white">Welcome, {currentUser.displayName || 'Guest'}!</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="w-full max-w-md space-y-4">
        <Card className="bg-card text-card-foreground p-4 rounded-2xl shadow-lg">
            <CardHeader className="p-2 text-center">
                <div className="flex justify-center items-center gap-3 mb-2">
                    <Users className="h-8 w-8 text-primary" />
                    <CardTitle className="text-2xl font-bold m-0 p-0">Play with Friends</CardTitle>
                </div>
                <CardDescription>Create a private room or join one with an ID.</CardDescription>
            </CardHeader>
            <CardContent className="p-2 space-y-4">
                <Button onClick={handleCreateRoom} className="w-full" size="lg" disabled={loading}>
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Create Room
                </Button>

                <div className="relative flex items-center justify-center">
                    <div className="flex-grow border-t"></div>
                    <span className="flex-shrink mx-4 text-xs text-muted-foreground uppercase">OR</span>
                    <div className="flex-grow border-t"></div>
                </div>

                <div>
                    <Label htmlFor="join-room-input" className="sr-only">Join Room</Label>
                    <div className="flex w-full items-center space-x-2">
                      <Input
                        id="join-room-input"
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
                </div>
            </CardContent>
        </Card>
        
        <section className="grid grid-cols-2 gap-4">
          <Card 
            className="bg-accent text-accent-foreground hover:bg-accent/90 transition-colors cursor-pointer rounded-2xl shadow-lg transform hover:-translate-y-1"
            onClick={() => handleNavigateWithSound('/number-caller')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNavigateWithSound('/number-caller') }}
          >
            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
              <Speaker className="h-10 w-10 mb-2" />
              <p className="text-lg font-bold">Number Caller</p>
            </CardContent>
          </Card>

          <Card 
            className="bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer rounded-2xl shadow-lg transform hover:-translate-y-1"
            onClick={() => handleNavigateWithSound('/prize-calculator')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNavigateWithSound('/prize-calculator') }}
          >
            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
              <Calculator className="h-10 w-10 mb-2" />
              <p className="text-lg font-bold">Prize Calculator</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
