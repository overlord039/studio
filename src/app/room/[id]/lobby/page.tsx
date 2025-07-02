
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ClipboardCopy, Users, Play, LogOut, Gift, Ticket, Loader2, AlertTriangle, Edit, RotateCcw } from "lucide-react";
import type { Room, GameSettings, PrizeType, BackendPlayerInRoom } from "@/types";
import { PRIZE_DEFINITIONS, PRIZE_DISTRIBUTION_PERCENTAGES, DEFAULT_GAME_SETTINGS, MIN_LOBBY_SIZE } from "@/lib/constants";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { playSound } from "@/lib/sounds";

const MAX_TICKETS_PER_PLAYER = 4;

export default function LobbyPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { id: roomId } = useParams() as { id: string };
  const { currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams(); 

  const [roomData, setRoomData] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedTicketsToBuy, setSelectedTicketsToBuy] = useState<number>(DEFAULT_GAME_SETTINGS.numberOfTicketsPerPlayer);
  const [isJoiningOrUpdating, setIsJoiningOrUpdating] = useState(false);
  const [isEditingTickets, setIsEditingTickets] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const previousIsGameStartedRef = useRef<boolean | undefined>(undefined);
  const roomDataRef = useRef(roomData);

  useEffect(() => {
    roomDataRef.current = roomData;
  }, [roomData]);

  const currentUserInRoom = roomData?.players.find(p => p.id === currentUser?.username);
  const isCurrentUserHost = roomData?.host.id === currentUser?.username;
  const doesCurrentUserHaveTickets = !!currentUserInRoom && currentUserInRoom.tickets.length > 0;

  const fetchRoomDetails = useCallback(async (isInitialLoad = false) => {
    if (!roomId || !currentUser) {
        if (isInitialLoad) {
            setIsLoading(false);
            if (!currentUser && !authLoading) setError("Please log in to access the lobby.");
        }
        return;
    }
    if(isInitialLoad) {
        setIsLoading(true);
        setError(null);
    }
    
    try {
      const response = await fetch(`/api/rooms/${roomId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to parse error response" }));
        if (response.status === 404) {
          setError("Room not found. It might have expired or never existed.");
          setRoomData(null); 
        } else {
            setError(errorData.message || `Failed to fetch room details: ${response.statusText}`);
            if (isInitialLoad) setRoomData(null);
        }
        if(isInitialLoad) setIsLoading(false);
        return; 
      }
      const data: Room = await response.json();
      
      const oldPlayers = roomDataRef.current?.players;
      if (oldPlayers && data.players.length > oldPlayers.length && !isInitialLoad) {
        const oldPlayerIds = new Set(oldPlayers.map(p => p.id));
        const joinedPlayers = data.players.filter(p => !oldPlayerIds.has(p.id));
        
        joinedPlayers.forEach(player => {
            if (currentUser && player.id !== currentUser.username) {
                playSound('game notification.wav');
                toast({
                    title: "Player Joined",
                    description: `${player.name} has joined the lobby.`
                });
            }
        });
      }
      
      if (isInitialLoad) {
        const userInRoomData = data.players.find(p => p.id === currentUser.username);
        if (userInRoomData) {
          setSelectedTicketsToBuy(userInRoomData.tickets.length > 0 ? userInRoomData.tickets.length : data.settings.numberOfTicketsPerPlayer || DEFAULT_GAME_SETTINGS.numberOfTicketsPerPlayer);
        } else { 
          setSelectedTicketsToBuy(data.settings.numberOfTicketsPerPlayer || DEFAULT_GAME_SETTINGS.numberOfTicketsPerPlayer);
        }
      }
      
      const currentUserIsHostInFetchedData = data.host.id === currentUser?.username;
      if (data.isGameStarted && previousIsGameStartedRef.current === false && !currentUserIsHostInFetchedData) {
        const currentPlayerServerData = data.players.find(p => p.id === currentUser.username);
        const ticketsToTake = currentPlayerServerData?.tickets.length || 0; 
        playSound('gamestarting.wav');
        toast({ title: "Game Started!", description: "Joining the game..." });
        router.push(`/room/${roomId}/play?playerTickets=${ticketsToTake}`);
      }
      
      setRoomData(data);
      previousIsGameStartedRef.current = data.isGameStarted;

    } catch (err) {
      console.error(`Error fetching room ${roomId} details:`, err);
      if (isInitialLoad || !roomDataRef.current) { 
         setError((err as Error).message || "An unexpected error occurred while fetching room details.");
         if (isInitialLoad) setRoomData(null);
      } else {
        toast({
            title: "Lobby Update Failed",
            description: "Could not fetch latest lobby details. Retrying...",
            variant: "destructive",
            duration: 2000,
        });
        console.warn("Polling error fetching room details:", err);
      }
    } finally {
      if(isInitialLoad) setIsLoading(false);
    }
  }, [roomId, currentUser, authLoading, router, toast]); 

  useEffect(() => {
    if (currentUser && roomId && !authLoading) { 
        fetchRoomDetails(true).then(() => {
            if (roomDataRef.current) {
                previousIsGameStartedRef.current = roomDataRef.current.isGameStarted;
            }
        });
    } else if (!authLoading && !currentUser) {
        setIsLoading(false);
        setError("Please log in to access the lobby.");
    }
  }, [currentUser, roomId, authLoading, fetchRoomDetails]);

  useEffect(() => {
    // Poll if the game is not actively running (i.e., it's pre-game or post-game).
    // Stop polling only if the game is in progress, as the user will be on the /play page.
    if (!roomId || !currentUser || (roomData?.isGameStarted && !roomData.isGameOver) || isLoading) {
      return;
    }

    const intervalId = setInterval(() => {
      if (!document.hidden) fetchRoomDetails(false);
    }, 3000); 
    return () => clearInterval(intervalId);
  }, [roomId, currentUser, roomData?.isGameStarted, roomData?.isGameOver, fetchRoomDetails, isLoading]);

  const handleConfirmOrJoinTickets = async () => {
    if (!currentUser || !roomData || (roomData.isGameStarted && !roomData.isGameOver)) {
        toast({title: "Cannot proceed", description: "Game is active, user not logged in, or no room data.", variant: "destructive"});
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
      playSound('buy.mp3');
      const updatedRoom: Room = await response.json();
      setRoomData(updatedRoom); 
      const userInUpdatedRoom = updatedRoom.players.find(p => p.id === currentUser.username);
      const finalTicketCount = userInUpdatedRoom?.tickets.length || selectedTicketsToBuy;
      setSelectedTicketsToBuy(finalTicketCount);
      toast({ title: "Tickets Confirmed!", description: `You now have ${finalTicketCount} ${finalTicketCount === 1 ? 'ticket' : 'tickets'}.` });
      setIsEditingTickets(false);
    } catch (err) {
      console.error("Error confirming/joining tickets:", err);
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsJoiningOrUpdating(false);
    }
  };

  const handleStartGame = async () => {
    if (!roomData || !currentUser || !isCurrentUserHost) {
      toast({ title: "Error", description: "Only the host can start the game, or room data is missing.", variant: "destructive" });
      return;
    }

    playSound('gamestarting.wav');

    const hostPlayerWithTickets = roomData.players.find(p => p.id === currentUser.username && p.isHost && p.tickets.length > 0);
    if (!hostPlayerWithTickets) {
        toast({ title: "Cannot Start", description: "Host must confirm their tickets before starting.", variant: "destructive"});
        return;
    }

     const minPlayersRequired = process.env.NODE_ENV === 'development' ? 1 : MIN_LOBBY_SIZE;
     const playersWithTicketsCount = roomData.players.filter(p => p.tickets.length > 0).length;

     if (playersWithTicketsCount < minPlayersRequired) {
        toast({ title: "Cannot Start", description: `Need at least ${minPlayersRequired} player(s) with tickets to start. Currently: ${playersWithTicketsCount}`, variant: "destructive" });
        return;
     }

    try {
      setIsJoiningOrUpdating(true); 
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
      const ticketsToTake = updatedRoom.players.find(p => p.id === currentUser.username)?.tickets.length || 0;
      toast({ title: "Game Starting!", description: `Navigating to game room ${roomId}.` });
      router.push(`/room/${roomId}/play?playerTickets=${ticketsToTake}`);
    } catch (err) {
      console.error("Error starting game:", err);
      toast({ title: "Error Starting Game", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsJoiningOrUpdating(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentUser) {
      router.push("/");
      return;
    }
    try {
      await fetch(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: currentUser.username }),
      });
      toast({ title: "You have left the room." });
    } catch (err) {
      console.error("Error leaving room:", err);
      toast({ title: "Error", description: "Could not leave the room cleanly. Redirecting anyway.", variant: "destructive" });
    } finally {
      router.push("/");
    }
  };
  
  const handleGoToGame = () => {
    if (!roomData || !currentUser) return;
    const ticketsCount = roomData.players.find(p => p.id === currentUser.username)?.tickets.length || 0;
    router.push(`/room/${roomId}/play?playerTickets=${ticketsCount}`);
  };

  const handleResetGame = async () => {
    if (!currentUser || !isCurrentUserHost) {
      toast({ title: "Unauthorized", description: "Only the host can start a new game.", variant: "destructive" });
      return;
    }
    setIsResetting(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: currentUser.username }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reset the game.");
      }

      const updatedRoomData = await response.json();
      setRoomData(updatedRoomData);
      toast({ title: "New Game Ready!", description: "The lobby has been reset. Players can now confirm tickets." });
    } catch (err) {
      console.error("Error resetting game:", err);
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsResetting(false);
    }
  };


  let gameSettings: GameSettings | null = null;
  const ticketPriceParam = searchParams.get('ticketPrice');
  const lobbySizeParam = searchParams.get('lobbySize');
  const prizeFormatParam = searchParams.get('prizeFormat');
  const numTicketsPerPlayerParam = searchParams.get('numberOfTicketsPerPlayer');

  if (roomData?.settings) {
    gameSettings = roomData.settings;
  } else if (!isLoading && !roomData && !error) { 
    gameSettings = {
        ticketPrice: (ticketPriceParam && !isNaN(parseInt(ticketPriceParam)) ? parseInt(ticketPriceParam) : DEFAULT_GAME_SETTINGS.ticketPrice) as GameSettings['ticketPrice'],
        lobbySize: (lobbySizeParam && !isNaN(parseInt(lobbySizeParam)) ? parseInt(lobbySizeParam) : DEFAULT_GAME_SETTINGS.lobbySize),
        prizeFormat: (prizeFormatParam || DEFAULT_GAME_SETTINGS.prizeFormat) as GameSettings['prizeFormat'],
        numberOfTicketsPerPlayer: (numTicketsPerPlayerParam && !isNaN(parseInt(numTicketsPerPlayerParam)) ? parseInt(numTicketsPerPlayerParam) : DEFAULT_GAME_SETTINGS.numberOfTicketsPerPlayer),
    };
  }


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

  if (!roomData || !gameSettings) { 
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Room Not Found or Settings Unavailable</h2>
            <p className="text-muted-foreground mb-6">The room you are looking for does not exist, has expired, or settings could not be loaded.</p>
            <Button onClick={() => router.push('/')} size="lg">Go to Homepage</Button>
        </div>
    );
  }
  
  const currentPrizeFormat = gameSettings.prizeFormat;
  const prizesForFormat = PRIZE_DEFINITIONS[currentPrizeFormat] || [];
  const prizeDistribution = PRIZE_DISTRIBUTION_PERCENTAGES[currentPrizeFormat] || {};
  
  const totalTicketsBoughtByPlayers = roomData.players.reduce((sum, player) => sum + (player.tickets?.length || 0), 0);
  const currentTotalPrizePool = gameSettings.ticketPrice * totalTicketsBoughtByPlayers;
  const minPlayersToStart = process.env.NODE_ENV === 'development' ? 1 : MIN_LOBBY_SIZE;

  const showTicketSelectionUI = currentUser && !roomData.isGameStarted && 
    (!doesCurrentUserHaveTickets || isEditingTickets);
  
  const ticketsText = (count: number) => count === 1 ? 'ticket' : 'tickets';
  const buttonTextForConfirm = "Confirm";
  let cardTitleForTickets = "Join Game & Buy Tickets";

  if (doesCurrentUserHaveTickets && isEditingTickets) {
    cardTitleForTickets = "Update Your Tickets";
  } else if (isCurrentUserHost && !doesCurrentUserHaveTickets) {
    cardTitleForTickets = "Buy Your Host Tickets";
  } else if (currentUserInRoom && !doesCurrentUserHaveTickets) { 
    cardTitleForTickets = "Confirm Your Tickets";
  }


  return (
    <div className="p-2 md:p-4 md:pt-2 space-y-2 md:space-y-4">
      <Card className="shadow-xl">
        <CardHeader className="p-3 md:p-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl md:text-3xl font-bold">
              Lobby: <span className="text-accent">{roomData.id}</span>
            </CardTitle>
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
          <CardDescription className="text-xs">
            {roomData.isGameStarted && !roomData.isGameOver ? "Game has started." : roomData.isGameOver ? "Game is over. The host can start a new game." : "Waiting for players. The host can start the game once conditions are met."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-0 space-y-3 md:space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 md:gap-4">
            <div className="space-y-1 text-xs md:text-sm">
              <p><strong>Ticket Price:</strong> ₹{gameSettings.ticketPrice}</p>
              <p><strong>Max Players:</strong> {gameSettings.lobbySize}</p>
            </div>
            <div className="flex flex-col items-stretch gap-2 md:gap-3 w-full sm:max-w-xs">
              <Button onClick={handleLeaveRoom} variant="destructive" size="sm">
                <LogOut className="mr-2 h-4 w-4" /> Leave Room
              </Button>
            </div>
          </div>

          {showTicketSelectionUI && !roomData.isGameOver && (
            <Card className="bg-secondary/20">
              <CardHeader className="p-2 md:p-3 pb-2">
                <CardTitle className="text-base md:text-lg flex items-center">
                    <Ticket className="mr-2 h-5 w-5 text-primary"/>
                    {cardTitleForTickets}
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">Select how many tickets you want to buy for the next game.</CardDescription>
              </CardHeader>
              <CardContent className="p-2 md:p-3 pt-0 flex items-center gap-2 md:gap-4">
                 <Select
                  value={String(selectedTicketsToBuy)}
                  onValueChange={(value) => setSelectedTicketsToBuy(Number(value))}
                  disabled={isJoiningOrUpdating}
                >
                  <SelectTrigger className="w-auto sm:w-[180px] h-9 md:h-10 text-xs md:text-sm flex-1">
                    <SelectValue placeholder="Select tickets" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: MAX_TICKETS_PER_PLAYER }, (_, i) => i + 1).map(num => (
                      <SelectItem key={num} value={String(num)}>
                        {`${num} ${ticketsText(num)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleConfirmOrJoinTickets} className="w-auto text-xs md:text-sm h-9 md:h-10" disabled={isJoiningOrUpdating}>
                  {isJoiningOrUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {buttonTextForConfirm}
                </Button>
              </CardContent>
            </Card>
          )}

          {!showTicketSelectionUI && doesCurrentUserHaveTickets && !roomData.isGameStarted && !roomData.isGameOver && (
            <Card className="bg-secondary/20">
              <CardHeader className="p-2 md:p-3 pb-2">
                <CardTitle className="text-base md:text-lg flex items-center">
                  <Ticket className="mr-2 h-5 w-5 text-primary"/>
                  Your Confirmed Tickets
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 md:p-3 pt-0 flex flex-col sm:flex-row items-center justify-between gap-2 md:gap-4">
                <p className="font-medium text-xs md:text-sm">
                  You have {currentUserInRoom?.tickets.length} {ticketsText(currentUserInRoom?.tickets.length ?? 0)} confirmed.
                  {!isCurrentUserHost && " Waiting for host..."}
                </p>
                <Button onClick={() => setIsEditingTickets(true)} variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Change Tickets
                </Button>
              </CardContent>
            </Card>
          )}

          <div>
            <h3 className="text-base md:text-xl font-semibold mb-2 flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" /> Players ({roomData.players.length}/{gameSettings.lobbySize})
            </h3>
            <ul className="space-y-2 rounded-md border p-2 md:p-4 max-h-40 md:max-h-60 overflow-y-auto text-xs md:text-sm">
              {roomData.players.map(player => (
                <li key={player.id} className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                  <span>
                    {player.name}
                    {player.id === currentUser?.username ? " (You)" : ""} 
                    {player.tickets?.length > 0 ? ` (${player.tickets.length} ticket${player.tickets.length === 1 ? '' : 's'})` : (roomData.isGameOver ? " (Game Over)" : " (No tickets yet)")}
                  </span>
                  {player.isHost && <span className="text-xs font-semibold text-primary">(Host)</span>}
                </li>
              ))}
              {roomData.players.length === 0 && <li className="text-muted-foreground">No players yet. Join in!</li>}
            </ul>
          </div>
          
           <div>
            <h3 className="text-base md:text-xl font-semibold mb-2 flex items-center">
                <Gift className="mr-2 h-5 w-5 text-primary" /> Prize Distribution
            </h3>
            <Card className="bg-secondary/30">
              <CardContent className="p-2 md:p-4 space-y-2 text-xs md:text-sm">
                 <p className="font-semibold">Potential Prize Pool: ₹{currentTotalPrizePool.toFixed(2)}</p>
                 <p className="text-xs text-muted-foreground">
                   (Based on {totalTicketsBoughtByPlayers} {ticketsText(totalTicketsBoughtByPlayers)} confirmed by players for this round)
                 </p>
                {prizesForFormat.map((prizeName) => {
                  const percentage = prizeDistribution[prizeName as PrizeType] || 0;
                  const prizeAmount = (currentTotalPrizePool * percentage) / 100;
                  return (
                    <div key={prizeName} className="flex justify-between items-center text-xs md:text-sm">
                      <span>{prizeName}:</span>
                      <span className="font-semibold">₹{prizeAmount.toFixed(2)} ({percentage}%)</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
          
          {isCurrentUserHost && !roomData.isGameStarted && !roomData.isGameOver &&(
            <Button 
                onClick={handleStartGame} 
                className="w-full mt-2 md:mt-4 h-10 md:h-12 text-sm md:text-base" 
                disabled={ 
                    isJoiningOrUpdating || 
                    roomData.players.filter(p => p.tickets.length > 0).length < minPlayersToStart || 
                    !doesCurrentUserHaveTickets // Host must have tickets
                }
            >
              <Play className="mr-2 h-5 w-5" /> Start Game
            </Button>
          )}

          {isCurrentUserHost && !roomData.isGameStarted && !roomData.isGameOver &&
            (roomData.players.filter(p => p.tickets.length > 0).length < minPlayersToStart || !doesCurrentUserHaveTickets) && (
            <p className="text-center text-xs md:text-sm text-destructive mt-2">
              {!doesCurrentUserHaveTickets ? "Host must confirm their tickets first. " : ""}
              {roomData.players.filter(p => p.tickets.length > 0).length < minPlayersToStart && doesCurrentUserHaveTickets && `At least ${minPlayersToStart} player(s) must have tickets. `}
            </p>
          )}

          {roomData.isGameStarted && !roomData.isGameOver && (
             <Button 
                onClick={handleGoToGame} 
                className="w-full mt-2 md:mt-4 h-10 md:h-12"
              >
              <Play className="mr-2 h-5 w-5" /> Go to Game / Spectate
            </Button>
          )}

          {roomData.isGameOver && isCurrentUserHost && (
            <Button onClick={handleResetGame} className="w-full mt-2 md:mt-4 h-10 md:h-12" disabled={isResetting}>
              {isResetting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RotateCcw className="mr-2 h-5 w-5" />}
              {isResetting ? "Resetting Lobby..." : "Start New Game"}
            </Button>
          )}

          {roomData.isGameOver && !isCurrentUserHost && (
            <div className="text-center mt-2 md:mt-4 p-2 md:p-4 bg-secondary/40 rounded-md">
              <p className="font-semibold text-sm md:text-base">Game Over!</p>
              <p className="text-muted-foreground text-xs md:text-sm">Waiting for the host to start a new game.</p>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
