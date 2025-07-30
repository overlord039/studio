
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smile, Zap, Target, LogOut, Loader2, Bot, Skull, Info, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useSound } from '@/contexts/sound-context';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { Player, Room } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from 'next/image';

const OFFLINE_REWARDS = [
    { name: "Early 5", coins: 2 },
    { name: "First Line", coins: 2 },
    { name: "Second Line", coins: 2 },
    { name: "Third Line", coins: 2 },
    { name: "Full House", coins: 3 },
    { name: "Participation", coins: 1, note: "(if no other prize is won)" },
];

export default function PlayWithComputerModesPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { playSound } = useSound();
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
        <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-bold text-white">Play with Computer</h1>
             <Dialog>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:text-white/80 h-8 w-8">
                        <Info className="h-6 w-6" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Award className="text-primary"/>Offline Game Rewards</DialogTitle>
                        <DialogDescription>
                            Earn coins by playing against bots. Use coins to join online games with entry fees.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        {OFFLINE_REWARDS.map(reward => (
                            <div key={reward.name} className="flex justify-between items-center p-2 bg-secondary/30 rounded-md">
                                <div>
                                  <p className="font-semibold">{reward.name}</p>
                                  {reward.note && <p className="text-xs text-muted-foreground">{reward.note}</p>}
                                </div>
                                <div className="flex items-center gap-1 font-bold text-lg">
                                    <Image src="/coin.png" alt="Coin" width={20} height={20} />
                                    <span>{reward.coins}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
        <p className="text-white/80 mt-2">Choose your difficulty.</p>
      </div>
      <div className="w-full max-w-md space-y-4">
        <Card
          onClick={() => handleModeSelection('/play-with-computer/easy')}
          className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer border-2 border-green-500/50 hover:border-green-500 bg-card"
        >
          <CardHeader className="p-4 flex flex-row items-center gap-4">
            <Smile className="h-10 w-10 text-green-500 flex-shrink-0" />
            <div>
              <CardTitle className="text-xl font-bold">Easy</CardTitle>
              <CardDescription>You choose how many tickets you want. Play at your pace.</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card
          onClick={() => handleModeSelection('/play-with-computer/medium')}
          className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer border-2 border-yellow-500/50 hover:border-yellow-500 bg-card"
        >
          <CardHeader className="p-4 flex flex-row items-center gap-4">
            <Target className="h-10 w-10 text-yellow-500 flex-shrink-0" />
            <div>
              <CardTitle className="text-xl font-bold">Classic</CardTitle>
              <CardDescription>You choose your tickets, bots get random tickets for a balanced match.</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card
          onClick={() => handleModeSelection('/play-with-computer/hard')}
          className={cn(
            "shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer border-2 border-destructive/50 hover:border-destructive bg-card",
            isCreatingHardGame && "opacity-50 cursor-not-allowed"
          )}
        >
          <CardHeader className="p-4 flex flex-row items-center gap-4 relative">
            {isCreatingHardGame && <Loader2 className="absolute top-2 right-2 h-5 w-5 animate-spin" />}
            <Skull className="h-10 w-10 text-destructive flex-shrink-0" />
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
