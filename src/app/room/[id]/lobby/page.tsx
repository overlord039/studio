
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation"; // removed useSearchParams as it's not directly used for settings anymore
import { ClipboardCopy, Users, Play, LogOut, Gift, Ticket, Loader2, AlertTriangle } from "lucide-react";
import type { Player, GameSettings, PrizeType, Room, BackendPlayerInRoom } from "@/types"; // Added BackendPlayerInRoom
import { PRIZE_DEFINITIONS, PRIZE_DISTRIBUTION_PERCENTAGES, DEFAULT_GAME_SETTINGS, MIN_LOBBY_SIZE } from "@/lib/constants";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Input } from "@/components/ui/input";


const MAX_TICKETS_PER_PLAYER = 6; // This can be a global constant if used elsewhere

export default function LobbyPage() {
  const { toast } = useToast();
  const router = useRouter();
  const routeParams = useParams();
  const roomId = routeParams.id as string;
  const { currentUser, loading: authLoading } = useAuth();

  const [roomData, setRoomData] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedTicketsForJoin, setSelectedTicketsForJoin] = useState<number>(DEFAULT_GAME_SETTINGS.numberOfTicketsPerPlayer);
  const [isJoining, setIsJoining] = useState(false);

  const isCurrentUserInRoom = roomData?.players.find(p => p.id === currentUser?.username);
  const isCurrentUserHost = roomData?.host.id === currentUser?.username;

  const fetchRoomDetails = useCallback(async (isInitialLoad = false) => {
    if (!roomId) return;
    if(isInitialLoad) setIsLoading(true); // only set loading true on initial full fetch
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${roomId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Room not found. It might have expired or never existed.");
        } else {
            const errorData = await response.json();
            setError(errorData.message || `Failed to fetch room details: ${response.statusText}`);
        }
        setRoomData(null); 
        if(isInitialLoad) setIsLoading(false);
        return; 
      }
      const data: Room = await response.json();
      setRoomData(data);
    } catch (err) {
      console.error(`Error fetching room ${roomId} details:`, err);
      setError((err as Error).message || "An unexpected error occurred while fetching room details.");
      setRoomData(null);
    } finally {
      if(isInitialLoad) setIsLoading(false);
    }
  }, [roomId]); 

  useEffect(() => {
    if (currentUser && roomId) { // Ensure currentUser and roomId are available
        fetchRoomDetails(true); // Pass true for initial load
    } else if (!authLoading && !currentUser) {
        setIsLoading(false); // Not logged in, stop loading
        setError("Please log in to access the lobby.");
    }
    // Intentionally not including fetchRoomDetails in deps to control its execution
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, roomId, authLoading]);

  // Periodic refresh (basic polling)
  useEffect(() => {
    if (!roomId || !currentUser || roomData?.isGameStarted || roomData?.isGameOver) return; // Stop polling if game started/over

    const intervalId = setInterval(() => {
      fetchRoomDetails(false); // Subsequent fetches are not "initial load"
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(intervalId);
  }, [roomId, currentUser, roomData?.isGameStarted, roomData?.isGameOver, fetchRoomDetails]);


  const handleJoinRoom = async () => {
    if (!currentUser || !roomData || roomData.isGameStarted) return;
    setIsJoining(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerId: currentUser.username, 
          playerName: currentUser.username,
          ticketsToBuy: selectedTicketsForJoin 
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to join room.");
      }
      const updatedRoom: Room = await response.json();
      setRoomData(updatedRoom);
      toast({ title: "Joined Room!", description: `Welcome, ${currentUser.username}!` });
    } catch (err) {
      console.error("Error joining room:", err);
      toast({ title: "Error Joining", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsJoining(false);
    }
  };


  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Invite Link Copied!", description: "Share it with your friends." });
  };

  const handleStartGame = async () => {
    if (!roomData || !currentUser || !isCurrentUserHost) {
      toast({ title: "Error", description: "Only the host can start the game.", variant: "destructive" });
      return;
    }
    
    const minPlayersRequired = process.env.NODE_ENV === 'development' ? 1 : MIN_LOBBY_SIZE;
    if (roomData.players.length < minPlayersRequired) {
       toast({ title: "Cannot Start", description: `Need at least ${minPlayersRequired} player(s) to start the game.`, variant: "destructive" });
       return;
    }

    try {
      const response = await fetch(`/api/rooms/${roomId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: currentUser.username }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to start game.");
      }
      const updatedRoom: Room = await response.json();
      setRoomData(updatedRoom); 
      toast({ title: "Game Starting!", description: `Navigating to game room ${roomId}.` });
      router.push(`/room/${roomId}/play`); // Player tickets will be fetched on play page
    } catch (err) {
      console.error("Error starting game:", err);
      toast({ title: "Error Starting Game", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleLeaveRoom = () => {
    // Future: Call API to remove player from room
    toast({ title: "Left Room", description: "You have left the lobby." });
    router.push("/");
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl">Loading Room...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Error Loading Room</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => router.push('/')} size="lg">Go to Homepage</Button>
      </div>
    );
  }
  
  if (!roomData && !currentUser && !authLoading) { // Added check for currentUser
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-6">Please log in to access the lobby.</p>
        <Button onClick={() => router.push('/auth/login')} size="lg">Login</Button>
      </div>
    );
  }

  if (!roomData) { // If still no roomData after loading and auth checks
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Room Not Found</h2>
            <p className="text-muted-foreground mb-6">The room you are looking for does not exist or has expired.</p>
            <Button onClick={() => router.push('/')} size="lg">Go to Homepage</Button>
        </div>
    );
  }
  
  const gameSettings: GameSettings = roomData.settings || DEFAULT_GAME_SETTINGS;
  const currentPrizeFormat = gameSettings.prizeFormat;
  const prizesForFormat = PRIZE_DEFINITIONS[currentPrizeFormat];
  const prizeDistribution = PRIZE_DISTRIBUTION_PERCENTAGES[currentPrizeFormat];
  
  const totalTicketsBought = roomData.players.reduce((sum, player) => sum + (player.tickets?.length || 0), 0);
  const currentTotalPrizePool = gameSettings.ticketPrice * totalTicketsBought;
  const minPlayersToStart = process.env.NODE_ENV === 'development' ? 1 : MIN_LOBBY_SIZE;


  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Lobby: #{roomData.id}</CardTitle>
          <CardDescription>
            {roomData.isGameStarted ? "Game has started." : "Waiting for players. The host can start the game."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <p><strong>Ticket Price:</strong> ₹{gameSettings.ticketPrice}</p>
              <p><strong>Max Players:</strong> {gameSettings.lobbySize}</p>
              <p><strong>Prize Format:</strong> {gameSettings.prizeFormat}</p>
              <p><strong>Default Tickets/Player:</strong> {gameSettings.numberOfTicketsPerPlayer}</p>
            </div>
            <div className="flex flex-col items-stretch gap-3 w-full sm:max-w-xs">
              <div className="flex items-center justify-between gap-2 p-2 border rounded-md bg-secondary/20">
                <div className="flex items-baseline">
                  <span className="text-sm font-medium mr-1">Room ID:</span>
                  <span className="text-lg font-bold text-primary select-all">{roomData.id}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(roomData.id);
                    toast({ title: "Room ID Copied!", description: "You can now share this ID with your friends." });
                  }}
                  className="h-8 w-8"
                  aria-label="Copy Room ID"
                >
                  <ClipboardCopy className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={handleCopyInviteLink} variant="outline">
                <ClipboardCopy className="mr-2 h-4 w-4" /> Copy Invite Link
              </Button>
              <Button onClick={handleLeaveRoom} variant="destructive">
                <LogOut className="mr-2 h-4 w-4" /> Leave Room
              </Button>
            </div>
          </div>

          {!isCurrentUserInRoom && !roomData.isGameStarted && currentUser && (
            <Card className="bg-secondary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center"><Ticket className="mr-2 h-5 w-5 text-primary"/>Join Game</CardTitle>
                <CardDescription>Select how many tickets you want to buy.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                 <Select
                  value={String(selectedTicketsForJoin)}
                  onValueChange={(value) => setSelectedTicketsForJoin(Number(value))}
                  disabled={isJoining}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select tickets" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: MAX_TICKETS_PER_PLAYER }, (_, i) => i + 1).map(num => (
                      <SelectItem key={num} value={String(num)}>
                        {num} ticket(s)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleJoinRoom} className="w-full sm:w-auto" disabled={isJoining}>
                  {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Confirm and Join with {selectedTicketsForJoin} ticket(s)
                </Button>
              </CardContent>
            </Card>
          )}


          <div>
            <h3 className="text-xl font-semibold mb-2 flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" /> Players ({roomData.players.length}/{gameSettings.lobbySize})
            </h3>
            <ul className="space-y-2 rounded-md border p-4 max-h-60 overflow-y-auto">
              {roomData.players.map(player => (
                <li key={player.id} className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                  <span>{player.name}{player.id === currentUser?.username ? " (You)" : ""} ({player.tickets?.length || 0} ticket{ (player.tickets?.length || 0) === 1 ? '' : 's'})</span>
                  {player.isHost && <span className="text-xs font-semibold text-primary">(Host)</span>}
                </li>
              ))}
              {roomData.players.length === 0 && <li className="text-muted-foreground">No players yet. Join in!</li>}
            </ul>
          </div>
          
           <div>
            <h3 className="text-xl font-semibold mb-2 flex items-center">
                <Gift className="mr-2 h-5 w-5 text-primary" /> Prize Distribution
            </h3>
            <Card className="bg-secondary/30">
              <CardContent className="p-4 space-y-2">
                 <p className="text-sm font-semibold">Current Total Prize Pool: ₹{currentTotalPrizePool.toFixed(2)}</p>
                 <p className="text-xs text-muted-foreground">
                   (Based on {totalTicketsBought} ticket(s) confirmed by players in this lobby)
                 </p>
                {prizesForFormat.map((prizeName) => {
                  const percentage = prizeDistribution[prizeName as PrizeType] || 0;
                  const prizeAmount = (currentTotalPrizePool * percentage) / 100;
                  return (
                    <div key={prizeName} className="flex justify-between items-center text-sm">
                      <span>{prizeName}:</span>
                      <span className="font-semibold">₹{prizeAmount.toFixed(2)} ({percentage}%)</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {isCurrentUserHost && !roomData.isGameStarted && (
            <Button onClick={handleStartGame} size="lg" className="w-full mt-4" disabled={ roomData.players.length < minPlayersToStart || totalTicketsBought === 0}>
              <Play className="mr-2 h-5 w-5" /> Start Game
            </Button>
          )}
          {isCurrentUserHost && !roomData.isGameStarted && (roomData.players.length < minPlayersToStart || totalTicketsBought === 0) && (
            <p className="text-center text-sm text-destructive mt-2">
              {totalTicketsBought === 0 ? "At least one player needs to have tickets to start." : `Need at least ${minPlayersToStart} player(s) to start the game.`}
            </p>
          )}

          {roomData.isGameStarted && (
             <Button 
                onClick={() => router.push(`/room/${roomId}/play`)} 
                size="lg" 
                className="w-full mt-4"
              >
              <Play className="mr-2 h-5 w-5" /> Go to Game / Spectate
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
