
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smile, Zap, Scaling, LogOut, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { playSound } from '@/lib/sounds';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { Player, Room } from '@/types';

export default function PlayWithComputerModesPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isCreatingHardGame, setIsCreatingHardGame] = useState(false);

  const handleModeSelection = (path: string) => {
    if (path === '/play-with-computer/hard') {
      handleStartHardGame();
    } else {
      playSound('cards.mp3');
      router.push(path);
    }
  };

  const handleStartHardGame = async () => {
    if (!currentUser) {
      toast({ title: "Login Required", variant: "destructive" });
      return;
    }
    setIsCreatingHardGame(true);
    playSound('start.wav');

    const hostPlayer: Player = {
      id: currentUser.uid, 
      name: currentUser.displayName || 'Guest',
      email: currentUser.email,
    };

    try {
      const response = await fetch('/api/bot-game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: hostPlayer, mode: 'hard' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create bot game.");
      }

      const newRoom: Room = await response.json();
      toast({ title: "Hard Game Starting!", description: "Ticket counts are random. Good luck!" });
      
      const hostPlayerInRoom = newRoom.players.find(p => p.id === currentUser.uid);
      const hostTicketCount = hostPlayerInRoom?.tickets.length || 1;

      router.push(`/room/${newRoom.id}/play?playerTickets=${hostTicketCount}`);

    } catch (error) {
      console.error("Error creating bot game:", error);
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsCreatingHardGame(false);
    }
  };

  if (!currentUser) {
    // This will be handled by the AuthProvider, but as a fallback:
    return <div className="text-center p-8">Please log in to play.</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center flex-grow p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white">Play with Computer</h1>
        <p className="text-white/80 mt-2">Choose your difficulty.</p>
      </div>
      <div className="w-full max-w-md space-y-6">
        <Card
          onClick={() => handleModeSelection('/play-with-computer/easy')}
          className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer"
        >
          <CardHeader className="flex flex-row items-center gap-4 p-6">
            <div className="p-3 rounded-full bg-green-500/20">
              <Smile className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Easy</CardTitle>
              <CardDescription>You choose how many tickets you want. Play at your pace.</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card
          onClick={() => handleModeSelection('/play-with-computer/medium')}
          className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer"
        >
          <CardHeader className="flex flex-row items-center gap-4 p-6">
            <div className="p-3 rounded-full bg-yellow-500/20">
              <Scaling className="h-8 w-8 text-yellow-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Classic</CardTitle>
              <CardDescription>You choose your tickets, bots get random tickets for a balanced match.</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card
          onClick={() => handleModeSelection('/play-with-computer/hard')}
          className={cn(
            "shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer",
            isCreatingHardGame && "opacity-50 cursor-not-allowed"
          )}
        >
          <CardHeader className="flex flex-row items-center gap-4 p-6">
            <div className="p-3 rounded-full bg-red-500/20">
              {isCreatingHardGame ? <Loader2 className="h-8 w-8 text-red-500 animate-spin" /> : <Zap className="h-8 w-8 text-red-500" />}
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Rush</CardTitle>
              <CardDescription>Ticket counts are random for everyone. Fast-paced and challenging!</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
       <div className="mt-8 w-full max-w-md">
        <Link href="/" passHref>
          <Button variant="destructive" size="icon">
            <LogOut className="h-4 w-4 rotate-180" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
