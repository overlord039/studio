
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation";
import { ClipboardCopy, Users, Play, LogOut, Gift, Ticket, Loader2, AlertTriangle } from "lucide-react";
import type { Room, GameSettings, PrizeType, BackendPlayerInRoom } from "@/types";
import { PRIZE_DEFINITIONS, PRIZE_DISTRIBUTION_PERCENTAGES, DEFAULT_GAME_SETTINGS, MIN_LOBBY_SIZE } from "@/lib/constants";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";

const MAX_TICKETS_PER_PLAYER = 6;

export default function LobbyPage() {
  const { toast } = useToast();
  const router = useRouter();
  const routeParams = useParams();
  const roomId = routeParams.id as string;
  const { currentUser, loading: authLoading } = useAuth();

  const [roomData, setRoomData] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedTicketsToBuy, setSelectedTicketsToBuy] = useState<number>(DEFAULT_GAME_SETTINGS.numberOfTicketsPerPlayer);
  const [isJoiningOrUpdating, setIsJoiningOrUpdating] = useState(false);

  const currentUserInRoom = roomData?.players.find(p => p.id === currentUser?.username);
  const isCurrentUserHost = roomData?.host.id === currentUser?.username;
  const doesCurrentUserHaveTickets = !!currentUserInRoom && currentUserInRoom.tickets.length > 0;

  const fetchRoomDetails = useCallback(async (isInitialLoad = false) => {
    if (!roomId) return;
    if(isInitialLoad) setIsLoading(true);
    // setError(null); // Keep error if already set on refresh
    try {
      const response = await fetch(`/api/rooms/${roomId}`);
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404) {
          setError("Room not found. It might have expired or never existed.");
        } else {
            setError(errorData.message || `Failed to fetch room details: ${response.statusText}`);
        }
        setRoomData(null); 
        if(isInitialLoad) setIsLoading(false);
        return; 
      }
      const data: Room = await response.json();
      setRoomData(data);
      // Initialize selectedTicketsToBuy based on room settings or existing tickets for current user
      const userInRoom = data.players.find(p => p.id === currentUser?.username);
      if (userInRoom && userInRoom.tickets.length > 0) {
        setSelectedTicketsToBuy(userInRoom.tickets.length);
      } else {
        setSelectedTicketsToBuy(data.settings.numberOfTicketsPerPlayer || DEFAULT_GAME_SETTINGS.numberOfTicketsPerPlayer);
      }

    } catch (err) {
      console.error(`Error fetching room ${roomId} details:`, err);
      if (isInitialLoad || !roomData) {
         setError((err as Error).message || "An unexpected error occurred while fetching room details.");
         setRoomData(null);
      }
    } finally {
      if(isInitialLoad) setIsLoading(false);
    }
  }, [roomId, currentUser?.username, roomData]); // Added roomData to dependencies

  useEffect(() => {
    if (currentUser && roomId) {
        fetchRoomDetails(true);
    } else if (!authLoading && !currentUser) {
        setIsLoading(false);
        setError("Please log in to access the lobby.");
    }
  }, [currentUser, roomId, authLoading, fetchRoomDetails]);

  useEffect(() => {
    if (!roomId || !currentUser || roomData?.isGameStarted || roomData?.isGameOver) return;
    const intervalId = setInterval(() => {
      if (!document.hidden) fetchRoomDetails(false);
    }, 5000);
    return () => clearInterval(intervalId);
  }, [roomId, currentUser, roomData?.isGameStarted, roomData?.isGameOver, fetchRoomDetails]);

  const handleConfirmOrJoinTickets = async () => {
    if (!currentUser || !roomData || roomData.isGameStarted) {
        toast({title: "Cannot proceed", description: "Game already started or user not logged in.", variant: "destructive"});
        return;
    }
    setIsJoiningOrUpdating(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerId: currentUser.username, 
          playerName: currentUser.username, 
          ticketsToBuy: selectedTicketsToBuy 
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to confirm tickets or join room.");
      }
      const updatedRoom: Room = await response.json();
      setRoomData(updatedRoom); // This will re-render and update doesCurrentUserHaveTickets
      toast({ title: "Tickets Confirmed!", description: `You now have ${selectedTicketsToBuy} ticket(s).` });
    } catch (err) {
      console.error("Error confirming/joining tickets:", err);
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsJoiningOrUpdating(false);
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
    if (!doesCurrentUserHaveTickets && isCurrentUserHost) {
        toast({ title: "Cannot Start", description: "Host must confirm their tickets before starting.", variant: "destructive"});
        return;
    }
     const minPlayersRequired = process.env.NODE_ENV === 'development' ? 1 : MIN_LOBBY_SIZE;
     if (roomData.players.length < minPlayersRequired) {
        toast({ title: "Cannot Start", description: `Need at least ${minPlayersRequired} player(s) (with tickets) to start.`, variant: "destructive" });
        return;
     }
     if (roomData.players.filter(p => p.tickets.length > 0).length < minPlayersRequired) {
        toast({ title: "Cannot Start", description: `At least ${minPlayersRequired} player(s) must have tickets.`, variant: "destructive" });
        return;
     }


    try {
      setIsJoiningOrUpdating(true); // Use same state for starting game to disable UI
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
      
      const ticketsToTake = updatedRoom.players.find(p => p.id === currentUser.username)?.tickets.length || 0;
      router.push(`/room/${roomId}/play?playerTickets=${ticketsToTake}`);
    } catch (err) {
      console.error("Error starting game:", err);
      toast({ title: "Error Starting Game", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsJoiningOrUpdating(false);
    }
  };

  const handleLeaveRoom = () => {
    router.push("/");
  };
  
  const handleGoToGame = () => {
    if (!roomData || !currentUser) return;
    const ticketsToTake = roomData.players.find(p => p.id === currentUser.username)?.tickets.length || 0;
    if (ticketsToTake > 0) {
      router.push(`/room/${roomId}/play?playerTickets=${ticketsToTake}`);
    } else {
      router.push(`/room/${roomId}/play?playerTickets=0`); // Spectate
    }
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
  
  if (!currentUser && !authLoading) { 
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-6">Please log in to access the lobby.</p>
        <Button onClick={() => router.push('/auth/login')} size="lg">Login</Button>
      </div>
    );
  }

  if (!roomData) { 
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
  
  const totalTicketsBoughtByPlayers = roomData.players.reduce((sum, player) => sum + (player.tickets?.length || 0), 0);
  const currentTotalPrizePool = gameSettings.ticketPrice * totalTicketsBoughtByPlayers;
  const minPlayersToStart = process.env.NODE_ENV === 'development' ? 1 : MIN_LOBBY_SIZE;

  // Show ticket selection if: game not started AND (user not in room OR user is in room but has 0 tickets)
  const showTicketSelectionUI = currentUser && !roomData.isGameStarted && (!currentUserInRoom || (currentUserInRoom && !doesCurrentUserHaveTickets));
  const buttonTextForConfirm = isCurrentUserHost && !doesCurrentUserHaveTickets ? "Confirm Host Tickets" : `Confirm and Join with ${selectedTicketsToBuy} ticket(s)`;
  const cardTitleForTickets = isCurrentUserHost && !doesCurrentUserHaveTickets ? "Buy Your Host Tickets" : (!currentUserInRoom ? "Join Game & Buy Tickets" : "Confirm Your Tickets");

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Lobby: #{roomData.id}</CardTitle>
          <CardDescription>
            {roomData.isGameStarted ? "Game has started." : roomData.isGameOver ? "Game is over." : "Waiting for players. The host can start the game once conditions are met."}
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

          {showTicketSelectionUI && (
            <Card className="bg-secondary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                    <Ticket className="mr-2 h-5 w-5 text-primary"/>
                    {cardTitleForTickets}
                </CardTitle>
                <CardDescription>Select how many tickets you want to buy.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                 <Select
                  value={String(selectedTicketsToBuy)}
                  onValueChange={(value) => setSelectedTicketsToBuy(Number(value))}
                  disabled={isJoiningOrUpdating}
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
                <Button onClick={handleConfirmOrJoinTickets} className="w-full sm:w-auto" disabled={isJoiningOrUpdating}>
                  {isJoiningOrUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {buttonTextForConfirm}
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
                  <span>
                    {player.name}
                    {player.id === currentUser?.username ? " (You)" : ""} 
                    {player.tickets?.length > 0 ? ` (${player.tickets.length} ticket${player.tickets.length === 1 ? '' : 's'})` : " (No tickets yet)"}
                  </span>
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
                   (Based on {totalTicketsBoughtByPlayers} ticket(s) confirmed by players in this lobby)
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
            <Button 
                onClick={handleStartGame} 
                size="lg" 
                className="w-full mt-4" 
                disabled={ 
                    isJoiningOrUpdating || // disable if any network op is in progress
                    roomData.players.length < minPlayersToStart || 
                    roomData.players.filter(p => p.tickets.length > 0).length < minPlayersToStart || // Ensure min players have tickets
                    (isCurrentUserHost && !doesCurrentUserHaveTickets) // Host must have tickets
                }
            >
              <Play className="mr-2 h-5 w-5" /> Start Game
            </Button>
          )}
          {isCurrentUserHost && !roomData.isGameStarted && 
            (roomData.players.length < minPlayersToStart || roomData.players.filter(p => p.tickets.length > 0).length < minPlayersToStart || (isCurrentUserHost && !doesCurrentUserHaveTickets)) && (
            <p className="text-center text-sm text-destructive mt-2">
              {isCurrentUserHost && !doesCurrentUserHaveTickets ? "Host must confirm their tickets first. " : ""}
              {roomData.players.filter(p => p.tickets.length > 0).length < minPlayersToStart && !(isCurrentUserHost && !doesCurrentUserHaveTickets) ? `At least ${minPlayersToStart} player(s) must have tickets. ` : ""}
              {roomData.players.length < minPlayersToStart ? `Need at least ${minPlayersToStart} player(s) in the room to start.` : ""}
            </p>
          )}

          {roomData.isGameStarted && !roomData.isGameOver && (
             <Button 
                onClick={handleGoToGame} 
                size="lg" 
                className="w-full mt-4"
              >
              <Play className="mr-2 h-5 w-5" /> Go to Game / Spectate
            </Button>
          )}
           {roomData.isGameOver && (
             <Button 
                onClick={() => router.push(`/room/${roomId}/play`)} // Go to results on play page
                size="lg" 
                className="w-full mt-4"
              >
              View Results
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    