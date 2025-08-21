
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Minus, Plus, LogOut, Zap, Users } from 'lucide-react';
import { useSound } from '@/contexts/sound-context';
import type { Player, GameSettings, Room } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const LOBBY_SIZES = [3, 5, 10, 20];
type GameType = 'classic' | 'rush';

export default function CreateOrJoinRoomPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { playSound } = useSound();

  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  
  // Create Room State
  const [ticketPrice, setTicketPrice] = useState(0);
  const [lobbySize, setLobbySize] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNoCoinsDialog, setShowNoCoinsDialog] = useState(false);
  const [gameType, setGameType] = useState<GameType>('classic');

  // Join Room State
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (gameType === 'rush') {
      setTicketPrice(0);
    }
  }, [gameType]);


  const handlePriceChange = (increment: number) => {
    playSound('cards.mp3');
    setTicketPrice(prev => {
      const newPrice = prev + increment;
      return newPrice < 0 ? 0 : newPrice;
    });
  };

  const handleCreateRoom = async () => {
     if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please sign in to create a room.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if the user has enough coins to create the room (at least for one ticket)
    if (ticketPrice > 0 && currentUser.stats.coins < ticketPrice) {
      playSound('error.wav');
      setShowNoCoinsDialog(true);
      return;
    }

    setIsSubmitting(true);
    playSound('start.wav');

    const hostPlayer: Player = {
      id: currentUser.uid, 
      name: currentUser.displayName || 'Guest',
      email: currentUser.email,
      isHost: true,
    };

    const roomSettings: Partial<GameSettings> = {
      ticketPrice: ticketPrice,
      lobbySize: lobbySize,
      isPublic: false,
      gameMode: gameType,
    };

    try {
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: hostPlayer, settings: roomSettings }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to create room: ${response.statusText}`);
      }

      const newRoom: Room = await response.json(); 
      
      playSound('notification.wav');
      toast({
        title: "Room Created!",
        description: `Room ID: ${newRoom.id}. Share this ID with friends!`,
      });
      router.push(`/room/${newRoom.id}/lobby`);

    } catch (error) {
      console.error("Error creating room:", error);
      toast({
        title: "Error",
        description: (error as Error).message || "Could not create room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleJoinRoom = async () => {
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
    if (!trimmedRoomId) {
      toast({
        title: "Room ID Required",
        description: "Please enter a Room ID to join.",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    try {
        const response = await fetch(`/api/rooms/${trimmedRoomId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerId: currentUser.uid,
                playerName: currentUser.displayName || 'Guest',
                // We don't pass tickets here, allowing the backend to use defaults
                // or handle modes like 'rush' appropriately.
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to join room.");
        }
        
        router.push(`/room/${trimmedRoomId}/lobby`);

    } catch (error) {
        toast({
            title: "Could Not Join Room",
            description: (error as Error).message,
            variant: "destructive",
        });
    } finally {
        setIsJoining(false);
    }
  };

  const TabButton = ({ tab, label }: { tab: 'create' | 'join'; label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={cn(
        "relative w-1/2 py-3 text-lg font-bold transition-all duration-300 rounded-t-xl group",
        activeTab === tab 
          ? "bg-accent text-accent-foreground border-b-2 border-accent" 
          : "bg-primary/80 text-primary-foreground hover:bg-primary"
      )}
    >
      <span className="relative z-10">{label}</span>
      {/* Glow effect */}
      <div
        className={cn(
          "absolute inset-0 rounded-t-xl blur-md transition-opacity duration-300",
          activeTab === tab
            ? "bg-accent opacity-50"
            : "bg-primary opacity-0 group-hover:opacity-30"
        )}
      ></div>
    </button>
  );

  const GameTypeSelector = () => (
    <div className="bg-secondary/30 p-2 rounded-lg flex items-center gap-2">
        <Button
            onClick={() => setGameType('classic')}
            className={cn(
                "w-1/2 transition-all",
                gameType === 'classic' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-transparent text-muted-foreground'
            )}
        >
            <Users className="mr-2 h-4 w-4" /> Classic
        </Button>
        <Button
            onClick={() => setGameType('rush')}
            className={cn(
                "w-1/2 transition-all",
                gameType === 'rush' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-transparent text-muted-foreground'
            )}
        >
            <Zap className="mr-2 h-4 w-4" /> Rush
        </Button>
    </div>
  );

  return (
    <>
    <div className="flex flex-col items-center justify-center flex-grow p-4">
      <Card className="w-full max-w-md bg-transparent border-none shadow-none">
        <div className="flex">
          <TabButton tab="create" label="Create" />
          <TabButton tab="join" label="Join" />
        </div>
        <CardContent className="bg-card p-6 rounded-b-xl border-2 border-accent">
          {activeTab === 'create' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-center text-xl font-bold text-foreground tracking-widest uppercase">SELECT LOBBY</h2>
              
              <GameTypeSelector />

              {gameType === 'classic' && (
                <div className="bg-secondary/30 p-4 rounded-lg animate-fade-in">
                  <div className="space-y-2 text-center">
                    <label className="text-sm font-semibold text-muted-foreground uppercase">Entry Fee</label>
                    <div className="flex items-center justify-center gap-4">
                      <Button size="icon" variant="secondary" className="rounded-full w-10 h-10" onClick={() => handlePriceChange(-5)} disabled={ticketPrice <= 0}>
                        <Minus className="h-6 w-6" />
                      </Button>
                      <div className="flex flex-col items-center justify-center w-28 h-20 rounded-lg border-2 border-accent bg-accent/10">
                        <div className="flex items-center gap-1">
                          <Image src="/coin.png" alt="Coins" width={32} height={32} data-ai-hint="gold coin" />
                          <span className="text-3xl font-bold text-foreground">{ticketPrice}</span>
                        </div>
                        <span className="text-xs text-accent uppercase">ticket prize</span>
                      </div>
                      <Button size="icon" variant="secondary" className="rounded-full w-10 h-10" onClick={() => handlePriceChange(5)}>
                        <Plus className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
               {gameType === 'rush' && (
                <div className="text-center p-3 bg-secondary/30 rounded-lg animate-fade-in">
                  <p className="font-semibold">Rush Mode!</p>
                  <p className="text-sm text-muted-foreground">Entry fee is free. All players get random tickets (1-4).</p>
                </div>
              )}


              <div className="bg-secondary/30 p-4 rounded-lg">
                <div className="space-y-2 text-center">
                  <label className="text-sm font-semibold text-muted-foreground uppercase">Lobby Size</label>
                  <div className="flex items-center justify-center gap-2">
                    {LOBBY_SIZES.map(size => (
                      <Button
                        key={size}
                        onClick={() => { playSound('cards.mp3'); setLobbySize(size); }}
                        variant={lobbySize === size ? 'default' : 'secondary'}
                        className={cn(
                            "rounded-full h-10 w-10 p-0 text-sm",
                            lobbySize === size ? 'bg-accent text-accent-foreground font-bold' : ''
                        )}
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <Button onClick={handleCreateRoom} variant="default" size="lg" className="w-full text-lg font-bold" disabled={isSubmitting || authLoading}>
                {isSubmitting ? 'Creating...' : 'Create Room'}
              </Button>
            </div>
          )}
          
          {activeTab === 'join' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-center text-sm font-bold text-muted-foreground tracking-widest uppercase">
                Enter the Room ID given by the host.
              </h2>
              
              <div className="flex w-full items-center space-x-2">
                <Input
                  id="join-room-input"
                  type="text"
                  placeholder="Enter Room ID"
                  className="h-12 text-lg text-center bg-background border-input focus:border-accent tracking-widest"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                  disabled={authLoading || isJoining}
                  maxLength={6}
                />
              </div>

              <Button onClick={handleJoinRoom} variant="default" size="lg" className="w-full text-lg font-bold" disabled={authLoading || isJoining}>
                {isJoining ? 'Joining...' : 'Join Room'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-8 w-full max-w-xl text-left">
        <Link href="/" passHref>
          <Button variant="destructive" size="icon">
            <LogOut className="h-4 w-4 rotate-180" />
          </Button>
        </Link>
      </div>
    </div>
     <AlertDialog open={showNoCoinsDialog} onOpenChange={setShowNoCoinsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Not Enough Coins</AlertDialogTitle>
            <AlertDialogDescription>
              You don't have enough coins to create a room with this entry fee. Play offline games against bots to earn more!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push('/play-with-computer')}>
              Play Offline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
