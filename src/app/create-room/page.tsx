
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Minus, Plus, LogOut, Coins } from 'lucide-react';
import { playSound } from '@/lib/sounds';
import type { Player, GameSettings, Room } from '@/types';
import Link from 'next/link';

const LOBBY_SIZES = [5, 10, 15, 20, 25, 50];

export default function CreateOrJoinRoomPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  
  // Create Room State
  const [ticketPrice, setTicketPrice] = useState(10);
  const [lobbySize, setLobbySize] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Join Room State
  const [joinRoomId, setJoinRoomId] = useState('');


  const handlePriceChange = (increment: number) => {
    playSound('cards.mp3');
    setTicketPrice(prev => {
      const newPrice = prev + increment;
      return newPrice < 5 ? 5 : newPrice;
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
      gameMode: 'multiplayer',
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

  return (
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
              
              <div className="bg-secondary/30 p-4 rounded-lg">
                <div className="space-y-2 text-center">
                  <label className="text-sm font-semibold text-muted-foreground uppercase">Entry Fee</label>
                  <div className="flex items-center justify-center gap-4">
                    <Button size="icon" variant="secondary" className="rounded-full w-10 h-10" onClick={() => handlePriceChange(-5)} disabled={ticketPrice <= 5}>
                      <Minus className="h-6 w-6" />
                    </Button>
                    <div className="flex flex-col items-center justify-center w-28 h-20 rounded-lg border-2 border-accent bg-accent/10">
                      <div className="flex items-center gap-1">
                        <Coins className="h-7 w-7 text-yellow-500" />
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
                  disabled={authLoading}
                  maxLength={6}
                />
              </div>

              <Button onClick={handleJoinRoom} variant="default" size="lg" className="w-full text-lg font-bold" disabled={authLoading}>
                Join Room
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
  );
}
