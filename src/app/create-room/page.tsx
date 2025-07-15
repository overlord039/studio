
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Minus, Plus, Users, Gamepad2, KeyRound } from 'lucide-react';
import { playSound } from '@/lib/sounds';
import type { Player, GameSettings, Room } from '@/types';

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
      ticketPrice: ticketPrice as any, // Cast as it can be any number now
      lobbySize: lobbySize,
      numberOfTicketsPerPlayer: 1, // Defaulting to 1, can be changed in lobby
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
        "relative w-1/2 py-3 text-lg font-bold text-white transition-all duration-300 rounded-t-xl group",
        activeTab === tab 
          ? "bg-yellow-500 text-black" 
          : "bg-primary/80 hover:bg-primary"
      )}
    >
      <span className="relative z-10">{label}</span>
      {/* Glow effect */}
      <div
        className={cn(
          "absolute inset-0 rounded-t-xl blur-md transition-opacity duration-300",
          activeTab === tab
            ? "bg-yellow-500 opacity-50"
            : "bg-blue-500 opacity-0 group-hover:opacity-30"
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
        <CardContent className="bg-card p-6 rounded-b-xl border border-t-0 border-white/10">
          {activeTab === 'create' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-center text-xl font-bold text-white tracking-widest uppercase">SELECT LOBBY</h2>
              
              <div className="space-y-2 text-center">
                <label className="text-sm font-semibold text-white uppercase">Entry Fee</label>
                <div className="flex items-center justify-center gap-4">
                  <Button size="icon" className="rounded-full bg-blue-500 hover:bg-blue-600 w-10 h-10" onClick={() => handlePriceChange(-5)} disabled={ticketPrice <= 5}>
                    <Minus className="h-6 w-6 text-white" />
                  </Button>
                  <div className="flex flex-col items-center justify-center w-28 h-20 rounded-lg border-2 border-yellow-400 bg-yellow-500/10">
                    <span className="text-3xl font-bold text-white">₹{ticketPrice}</span>
                    <span className="text-xs text-yellow-300 uppercase">ticket prize</span>
                  </div>
                  <Button size="icon" className="rounded-full bg-blue-500 hover:bg-blue-600 w-10 h-10" onClick={() => handlePriceChange(5)}>
                    <Plus className="h-6 w-6 text-white" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-center">
                <label className="text-sm font-semibold text-white uppercase">Lobby Size</label>
                <div className="flex items-center justify-center gap-2">
                  {LOBBY_SIZES.map(size => (
                    <Button
                      key={size}
                      onClick={() => { playSound('cards.mp3'); setLobbySize(size); }}
                      variant={lobbySize === size ? 'default' : 'secondary'}
                      className={cn(
                          "rounded-full h-10 w-10 p-0 text-sm",
                          lobbySize === size ? 'bg-yellow-500 text-black font-bold' : 'bg-blue-500/30 text-white'
                      )}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>

              <Button onClick={handleCreateRoom} size="lg" className="w-full bg-green-600 hover:bg-green-700 text-lg font-bold" disabled={isSubmitting || authLoading}>
                {isSubmitting ? 'Creating...' : 'Create Room'}
              </Button>
            </div>
          )}
          
          {activeTab === 'join' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-center text-sm font-bold text-white tracking-widest uppercase">
                Enter the Room ID given by the host.
              </h2>
              
              <div className="flex w-full items-center space-x-2">
                <Input
                  id="join-room-input"
                  type="text"
                  placeholder="Enter Room ID"
                  className="h-12 text-lg text-center bg-black/30 text-white placeholder:text-gray-400 border-white/20 focus:border-yellow-400 tracking-widest"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                  disabled={authLoading}
                  maxLength={6}
                />
              </div>

              <Button onClick={handleJoinRoom} size="lg" className="w-full bg-green-600 hover:bg-green-700 text-lg font-bold" disabled={authLoading}>
                Join Room
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-8 w-full max-w-xl text-center">
        <Button variant="link" onClick={() => router.push('/')} className="text-white">
          Back to Home
        </Button>
      </div>
    </div>
  );
}
