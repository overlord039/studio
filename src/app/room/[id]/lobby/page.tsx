
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ClipboardCopy, Users, Play, LogOut, Gift, Ticket, Loader2, AlertTriangle } from "lucide-react";
import type { Player, GameSettings, PrizeType, Room } from "@/types";
import { PRIZE_DEFINITIONS, PRIZE_DISTRIBUTION_PERCENTAGES, DEFAULT_TICKET_PRICE, DEFAULT_LOBBY_SIZE, DEFAULT_PRIZE_FORMAT } from "@/lib/constants";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";

const MAX_TICKETS_PER_PLAYER = 6;

export default function LobbyPage() {
  const { toast } = useToast();
  const router = useRouter();
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const roomId = routeParams.id as string;
  const { currentUser, loading: authLoading } = useAuth();

  const [roomData, setRoomData] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [myTicketSelection, setMyTicketSelection] = useState<number>(1); 
  const [displayPlayers, setDisplayPlayers] = useState<Player[]>([]);

  const isCurrentUserHost = roomData?.host.id === currentUser?.username;
  const currentPlayerInRoom = displayPlayers.find(p => p.id === currentUser?.username);


  const fetchRoomDetails = useCallback(async () => {
    if (!roomId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${roomId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Room not found. It might have expired or never existed.");
          setRoomData(null); // Explicitly set roomData to null
          setIsLoading(false); // Stop loading
          return; 
        }
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          errorData = { message: `Failed to fetch room details: ${response.statusText}` };
        }
        throw new Error(errorData.message || `Failed to fetch room details: ${response.statusText}`);
      }
      const data: Room = await response.json();
      setRoomData(data);

      const newDisplayPlayers = data.players.map(backendPlayer => {
        const existingFrontendPlayer = displayPlayers.find(dp => dp.id === backendPlayer.id);
        return {
          ...backendPlayer,
          ticketsToBuy: existingFrontendPlayer?.ticketsToBuy || 1 
        };
      });
      setDisplayPlayers(newDisplayPlayers);

      const me = newDisplayPlayers.find(p => p.id === currentUser?.username);
      if (me && typeof me.ticketsToBuy === 'number') {
        setMyTicketSelection(me.ticketsToBuy);
      } else if (currentUser) {
        // If user is present but not in displayPlayers (e.g. after a fresh fetch before auto-join)
        // or if their ticketsToBuy is undefined, default to 1.
        setMyTicketSelection(1);
      }

    } catch (err) {
      console.error(`Error fetching room ${roomId} details:`, err);
      setError((err as Error).message || "An unexpected error occurred while fetching room details.");
      setRoomData(null);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, currentUser, displayPlayers]); // Added currentUser and displayPlayers to dependencies

  useEffect(() => {
    fetchRoomDetails();
  }, [fetchRoomDetails]);


  const handleConfirmMyTickets = () => {
     if (!currentUser || !roomData || !currentPlayerInRoom) return;
    
    setDisplayPlayers(prevPlayers =>
        prevPlayers.map(p =>
          p.id === currentUser.username ? { ...p, ticketsToBuy: myTicketSelection } : p
        )
      );
    toast({
      title: "Tickets Updated",
      description: `You will play with ${myTicketSelection} ticket(s).`,
    });
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
    
    const minPlayersRequired = process.env.NODE_ENV === 'development' ? 1 : 2;
    if (displayPlayers.length < minPlayersRequired) {
       toast({ title: "Cannot Start", description: `Need at least ${minPlayersRequired} player(s) to start the game.`, variant: "destructive" });
       return;
    }
    const totalTicketsConfirmed = displayPlayers.reduce((sum, p) => sum + (p.ticketsToBuy || 0), 0);
    if (totalTicketsConfirmed === 0) {
        toast({ title: "Cannot Start", description: "At least one player needs to have tickets.", variant: "destructive" });
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
      
      const myTickets = displayPlayers.find(p => p.id === currentUser.username)?.ticketsToBuy || 1;
      router.push(`/room/${roomId}/play?playerTickets=${myTickets}`);
    } catch (err) {
      console.error("Error starting game:", err);
      toast({ title: "Error Starting Game", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleLeaveRoom = () => {
    toast({ title: "Left Room", description: "You have left the lobby." });
    router.push("/");
  };
  
  useEffect(() => {
    const joinRoomIfNeeded = async () => {
      if (roomData && currentUser && !authLoading && !roomData.players.find(p => p.id === currentUser.username) && !roomData.isGameStarted) {
        console.log(`Attempting to auto-join room ${roomId} for user ${currentUser.username}`);
        try {
          const playerToJoin: Player = { id: currentUser.username, name: currentUser.username };
          const response = await fetch(`/api/rooms/${roomId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(playerToJoin),
          });
          if (response.ok) {
            const updatedRoomData: Room = await response.json();
            setRoomData(updatedRoomData); // This will re-trigger the effect if roomData is a dependency
            
            // Update displayPlayers based on new roomData.players
            const newDisplayPlayers = updatedRoomData.players.map(backendPlayer => {
                // Preserve existing ticketsToBuy if player was already in displayPlayers (e.g. host)
                const existingFrontendPlayer = displayPlayers.find(dp => dp.id === backendPlayer.id);
                return { 
                    ...backendPlayer, 
                    ticketsToBuy: existingFrontendPlayer?.ticketsToBuy || 1 
                };
            });
            setDisplayPlayers(newDisplayPlayers);

            const me = newDisplayPlayers.find(p => p.id === currentUser.username);
            if (me) { // Set myTicketSelection based on the (potentially new) displayPlayers list
                setMyTicketSelection(me.ticketsToBuy || 1);
            }

            toast({ title: "Joined Room!", description: `Welcome to room ${roomId}, ${currentUser.name || currentUser.username}!`});
          } else {
            const errorData = await response.json();
            const errorMessage = errorData.message || "Failed to automatically join the room.";
            // Only show toast for critical join errors, not for expected ones like "Room full" or "Game started"
            if (response.status !== 400 || (errorMessage !== "Room is full." && errorMessage !== "Game has already started." && errorMessage !== "Player already in room.")) {
                 toast({ title: "Could Not Join", description: errorMessage, variant: "destructive"});
            }
             if (errorMessage === "Room is full." || errorMessage === "Game has already started.") {
                // Set UI error for these cases as they are terminal for joining
                setError(`Cannot join: ${errorMessage}`);
            }
          }
        } catch (err) {
          console.error("Error auto-joining room:", err);
          // Avoid setting general error state if it was a specific non-join like "Room full"
        }
      }
    };
    // Only attempt to join if not loading, no current error, roomData exists, and currentUser is identified
    if(!isLoading && !error && roomData && currentUser) { 
        joinRoomIfNeeded();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [roomData, currentUser, authLoading, roomId, toast, isLoading, error]); // Removed displayPlayers from here to avoid potential loops on its update. 
                                                                           // Auto-join should primarily depend on roomData from server and currentUser.


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
  
  // Extract search param values once
  const ticketPriceParam = searchParams.get('ticketPrice');
  const lobbySizeParam = searchParams.get('lobbySize');
  const prizeFormatParam = searchParams.get('prizeFormat');

  const gameSettings: GameSettings = {
    ticketPrice: roomData.settings.ticketPrice || parseInt(ticketPriceParam || String(DEFAULT_TICKET_PRICE), 10) as GameSettings['ticketPrice'],
    lobbySize: roomData.settings.lobbySize || parseInt(lobbySizeParam || String(DEFAULT_LOBBY_SIZE), 10),
    prizeFormat: roomData.settings.prizeFormat || (prizeFormatParam || DEFAULT_PRIZE_FORMAT) as GameSettings['prizeFormat'],
  };

  const currentPrizeFormat = gameSettings.prizeFormat;
  const prizesForFormat = PRIZE_DEFINITIONS[currentPrizeFormat];
  const prizeDistribution = PRIZE_DISTRIBUTION_PERCENTAGES[currentPrizeFormat];
  
  const totalTicketsBought = displayPlayers.reduce((sum, player) => sum + (player.ticketsToBuy || 0), 0);
  const currentTotalPrizePool = gameSettings.ticketPrice * totalTicketsBought;
  const minPlayersToStart = process.env.NODE_ENV === 'development' ? 1 : 2;


  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Lobby: #{roomData.id}</CardTitle>
          <CardDescription>
            {roomData.isGameStarted ? "Game has started." : "Waiting for players. Set your tickets and the host can start the game."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <p><strong>Ticket Price:</strong> ₹{gameSettings.ticketPrice}</p>
              <p><strong>Max Players:</strong> {gameSettings.lobbySize}</p>
              <p><strong>Prize Format:</strong> {gameSettings.prizeFormat}</p>
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

          {currentPlayerInRoom && !roomData.isGameStarted && (
            <Card className="bg-secondary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center"><Ticket className="mr-2 h-5 w-5 text-primary"/>Your Tickets</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                <Select
                  value={String(myTicketSelection)}
                  onValueChange={(value) => setMyTicketSelection(Number(value))}
                  disabled={roomData.isGameStarted}
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
                <Button onClick={handleConfirmMyTickets} className="w-full sm:w-auto" disabled={roomData.isGameStarted}>
                  Confirm My Tickets
                </Button>
              </CardContent>
            </Card>
          )}

          <div>
            <h3 className="text-xl font-semibold mb-2 flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" /> Players ({displayPlayers.length}/{gameSettings.lobbySize})
            </h3>
            <ul className="space-y-2 rounded-md border p-4 max-h-60 overflow-y-auto">
              {displayPlayers.map(player => (
                <li key={player.id} className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                  <span>{player.name}{player.id === currentUser?.username ? " (You)" : ""} ({player.ticketsToBuy || 0} ticket{ (player.ticketsToBuy || 0) === 1 ? '' : 's'})</span>
                  {player.isHost && <span className="text-xs font-semibold text-primary">(Host)</span>}
                </li>
              ))}
              {displayPlayers.length === 0 && <li className="text-muted-foreground">No players yet. Join in!</li>}
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
            <Button onClick={handleStartGame} size="lg" className="w-full mt-4" disabled={ displayPlayers.length < minPlayersToStart || totalTicketsBought === 0}>
              <Play className="mr-2 h-5 w-5" /> Start Game
            </Button>
          )}
          {isCurrentUserHost && !roomData.isGameStarted && (displayPlayers.length < minPlayersToStart || totalTicketsBought === 0) && (
            <p className="text-center text-sm text-destructive mt-2">
              {totalTicketsBought === 0 ? "At least one player needs to have tickets to start." : `Need at least ${minPlayersToStart} player(s) to start the game.`}
            </p>
          )}

          {roomData.isGameStarted && currentPlayerInRoom && (
             <Button 
                onClick={() => {
                    const myTickets = currentPlayerInRoom?.ticketsToBuy || 1;
                    router.push(`/room/${roomId}/play?playerTickets=${myTickets}`);
                }} 
                size="lg" 
                className="w-full mt-4"
              >
              <Play className="mr-2 h-5 w-5" /> Go to Game
            </Button>
          )}
           {roomData.isGameStarted && !currentPlayerInRoom && ( // Spectator case
             <Button 
                onClick={() => {
                    router.push(`/room/${roomId}/play?playerTickets=0`); // Spectators get 0 tickets
                }} 
                size="lg" 
                className="w-full mt-4"
              >
              <Play className="mr-2 h-5 w-5" /> Spectate Game
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
    

    

    