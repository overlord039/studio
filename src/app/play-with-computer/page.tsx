

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
import type { Player, Room, PrizeType } from '@/types';
import { PRIZE_TYPES } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const OFFLINE_REWARDS: Record<'easy' | 'medium' | 'hard', Record<PrizeType, number>> = {
  easy: {
    [PRIZE_TYPES.EARLY_5]: 1,
    [PRIZE_TYPES.FIRST_LINE]: 1,
    [PRIZE_TYPES.SECOND_LINE]: 1,
    [PRIZE_TYPES.THIRD_LINE]: 1,
    [PRIZE_TYPES.FULL_HOUSE]: 2,
  },
  medium: {
    [PRIZE_TYPES.EARLY_5]: 1,
    [PRIZE_TYPES.FIRST_LINE]: 2,
    [PRIZE_TYPES.SECOND_LINE]: 2,
    [PRIZE_TYPES.THIRD_LINE]: 2,
    [PRIZE_TYPES.FULL_HOUSE]: 3,
  },
  hard: {
    [PRIZE_TYPES.EARLY_5]: 2,
    [PRIZE_TYPES.FIRST_LINE]: 3,
    [PRIZE_TYPES.SECOND_LINE]: 3,
    [PRIZE_TYPES.THIRD_LINE]: 3,
    [PRIZE_TYPES.FULL_HOUSE]: 5,
  }
};
const prizeOrder = [PRIZE_TYPES.EARLY_5, PRIZE_TYPES.FIRST_LINE, PRIZE_TYPES.SECOND_LINE, PRIZE_TYPES.THIRD_LINE, PRIZE_TYPES.FULL_HOUSE];
const PARTICIPATION_REWARD = 1;


const RewardInfoTab = ({ mode, title }: { mode: 'easy' | 'medium' | 'hard', title: string }) => {
    const rewards = OFFLINE_REWARDS[mode];
    const maxReward = prizeOrder.reduce((sum, prize) => sum + rewards[prize], 0) + PARTICIPATION_REWARD;

    return (
        <div className="space-y-1">
            {prizeOrder.map(prize => (
                <div key={prize} className="flex justify-between items-center p-1.5 bg-secondary/30 rounded-md">
                    <p className="font-semibold text-xs">{prize}</p>
                    <div className="flex items-center gap-1 font-bold text-sm">
                        <Image src="/coin.png" alt="Coin" width={16} height={16} />
                        <span>{rewards[prize]}</span>
                    </div>
                </div>
            ))}
             <div className="flex justify-between items-center p-1.5 bg-green-500/10 rounded-md border border-green-500/20">
                <div>
                    <p className="font-semibold text-xs">Participation Reward</p>
                    <p className="text-xs text-muted-foreground">(Awarded for every game played)</p>
                </div>
                <div className="flex items-center gap-1 font-bold text-sm text-green-600">
                    <Image src="/coin.png" alt="Coin" width={16} height={16} />
                    <span>{PARTICIPATION_REWARD}</span>
                </div>
            </div>
             <div className="flex justify-between items-center p-1.5 mt-2 bg-primary/20 rounded-md border border-primary/30">
                <p className="font-bold text-xs">Max Reward</p>
                <div className="flex items-center gap-1 font-bold text-sm text-primary">
                    <Image src="/coin.png" alt="Coin" width={16} height={16} />
                    <span>{maxReward}</span>
                </div>
            </div>
        </div>
    );
};

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
                    <Button variant="ghost" size="icon" className="text-white hover:text-white/80 h-10 w-10">
                        <Info className="h-7 w-7" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md p-4">
                    <DialogHeader className="p-2">
                        <DialogTitle className="flex items-center gap-2"><Award className="text-primary"/>Offline Game Rewards</DialogTitle>
                        <DialogDescription>
                            Earn coins by playing against bots. Use coins to join online games with entry fees.
                        </DialogDescription>
                    </DialogHeader>
                     <Tabs defaultValue="medium" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-12">
                            <TabsTrigger value="easy">Easy</TabsTrigger>
                            <TabsTrigger value="medium">Classic</TabsTrigger>
                            <TabsTrigger value="hard">Rush</TabsTrigger>
                        </TabsList>
                        <TabsContent value="easy" className="p-1">
                           <RewardInfoTab mode="easy" title="Easy Mode Rewards" />
                        </TabsContent>
                        <TabsContent value="medium" className="p-1">
                           <RewardInfoTab mode="medium" title="Classic Mode Rewards" />
                        </TabsContent>
                        <TabsContent value="hard" className="p-1">
                           <RewardInfoTab mode="hard" title="Rush Mode Rewards" />
                        </TabsContent>
                    </Tabs>
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
