
"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation";
import { ClipboardCopy, Users, Play, LogOut, Gift, Ticket, Loader2, AlertTriangle, Edit, RotateCcw, Crown, UserX, Bot, Coins } from "lucide-react";
import type { Room, GameSettings, PrizeType, BackendPlayerInRoom } from "@/types";
import { PRIZE_DEFINITIONS, PRIZE_DISTRIBUTION_PERCENTAGES, DEFAULT_GAME_SETTINGS, MIN_LOBBY_SIZE } from "@/lib/constants";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { playSound } from "@/lib/sounds";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const MAX_TICKETS_PER_PLAYER = 4;

export default function LobbyPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const roomIdParam = params.id;
  const roomId = Array.isArray(roomIdParam) ? roomIdParam[0] ?? '' : roomIdParam ?? '';
  const { currentUser, loading: authLoading } = useAuth();

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

  const fetchRoomDetails = useCallback(async (isInitialLoad = false) => {
    if (!roomId || !currentUser) {
        if (isInitialLoad) {
            setIsLoading(false);
            if (!currentUser && !authLoading) setError("Please sign in to access the lobby.");
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
            if (currentUser && player.id !== currentUser.uid) {
                playSound('notification.wav');
                toast({
                    title: "Player Joined",
                    description: `${player.name} has joined the lobby.`
                });
            }
        });
      }
      
      if (isInitialLoad) {
        const userInRoomData = data.players.find(p => p.id === currentUser.uid);
        if (userInRoomData) {
          setSelectedTicketsToBuy(userInRoomData.tickets.length > 0 ? userInRoomData.tickets.length : data.settings.numberOfTicketsPerPlayer || DEFAULT_GAME_SETTINGS.numberOfTicketsPerPlayer);
        } else { 
          setSelectedTicketsToBuy(data.settings.numberOfTicketsPerPlayer || DEFAULT_GAME_SETTINGS.numberOfTicketsPerPlayer);
        }
      }
      
      const currentUserIsHostInFetchedData = data.host.id === currentUser?.uid;
      if (data.isGameStarted && previousIsGameStartedRef.current === false && !currentUserIsHostInFetchedData) {
        const currentPlayerServerData = data.players.find(p => p.id === currentUser.uid);
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
        setError("Please sign in to access the lobby.");
    }
  }, [currentUser, roomId, authLoading, fetchRoomDetails]);

  useEffect(() => {
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
          playerId: currentUser.uid, 
          playerName: currentUser.displayName || 'Guest',
          playerEmail: currentUser.email,
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
      const userInUpdatedRoom = updatedRoom.players.find(p => p.id === currentUser.uid);
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

    playSound('start.wav');

    const hostPlayerWithTickets = roomData.players.find(p => p.id === currentUser.uid && p.isHost && p.tickets.length > 0);
    if (!hostPlayerWithTickets) {
        toast({ title: "Cannot Start", description: "Host must confirm their tickets before starting.", variant: "destructive"});
        return;
    }

     const minPlayersRequired = roomData.settings.gameMode !== 'multiplayer' ? 1 : MIN_LOBBY_SIZE;
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
        body: JSON.stringify({ hostId: currentUser.uid }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to start game.");
      }
      const updatedRoom: Room = await response.json();
      const ticketsToTake = updatedRoom.players.find(p => p.id === currentUser.uid)?.tickets.length || 0;
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
        body: JSON.stringify({ playerId: currentUser.uid }),
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
    const ticketsCount = roomData.players.find(p => p.id === currentUser.uid)?.tickets.length || 0;
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
        body: JSON.stringify({ hostId: currentUser.uid }),
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

  const handleCopyRoomId = () => {
    if (!roomData) return;
    navigator.clipboard.writeText(roomData.id);
    toast({ title: "Room ID Copied!", description: "You can now share this ID with your friends." });
  };
  
  const handleTransferHost = async (newHostId: string) => {
    if (!currentUser || !isCurrentUserHost) {
        toast({ title: "Unauthorized", description: "Only the host can transfer ownership.", variant: "destructive" });
        return;
    }
    try {
        const response = await fetch(`/api/rooms/${roomId}/transfer-host`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hostId: currentUser.uid, newHostId }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to transfer host.");
        }
        const updatedRoom = await response.json();
        setRoomData(updatedRoom);
        playSound('notification.wav');
        toast({ title: "Host Transferred", description: `${updatedRoom.host.name} is the new host.` });
    } catch (err) {
        console.error("Error transferring host:", err);
        toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleKickPlayer = async (playerIdToKick: string) => {
    if (!currentUser || !isCurrentUserHost) {
        toast({ title: "Unauthorized", description: "Only the host can kick players.", variant: "destructive" });
        return;
    }
    try {
        const response = await fetch(`/api/rooms/${roomId}/kick-player`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hostId: currentUser.uid, playerIdToKick }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to kick player.");
        }
        const updatedRoom = await response.json();
        setRoomData(updatedRoom);
        playSound('notification.wav');
        toast({ title: "Player Kicked", description: "The player has been removed from the lobby." });
    } catch (err) {
        console.error("Error kicking player:", err);
        toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };


  let gameSettings: GameSettings | null = null;
  if (roomData?.settings) {
    gameSettings = roomData.settings;
  }

  if (isLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-xl">Loading Room...</p>
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
  
  if (!currentUser || !roomData || !gameSettings) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Room Data Unavailable</h2>
        <p className="text-muted-foreground mb-6">Could not load room details. Please try again or ensure you are signed in.</p>
        <Button onClick={() => router.push('/')} size="lg">Go to Homepage</Button>
      </div>
    );
  }
  
  const currentUserInRoom = roomData?.players.find(p => p.id === currentUser?.uid);
  const isCurrentUserHost = roomData?.host.id === currentUser?.uid;
  const doesCurrentUserHaveTickets = !!currentUserInRoom && currentUserInRoom.tickets.length > 0;

  if (roomData.isGameStarted && !roomData.isGameOver && !currentUserInRoom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Game in Progress</h2>
        <p className="text-muted-foreground mb-6">This game has already started. You cannot join or spectate at this time.</p>
        <Button onClick={() => router.push('/')} size="lg">Go to Homepage</Button>
      </div>
    );
  }

  const currentPrizeFormat = gameSettings.prizeFormat;
  const prizesForFormat = PRIZE_DEFINITIONS[currentPrizeFormat] || [];
  const prizeDistribution = PRIZE_DISTRIBUTION_PERCENTAGES[currentPrizeFormat] || {};
  
  const totalTicketsBoughtByPlayers = roomData.players.reduce((sum, player) => sum + (player.tickets?.length || 0), 0);
  const currentTotalPrizePool = gameSettings.ticketPrice * totalTicketsBoughtByPlayers;
  const minPlayersToStart = gameSettings.gameMode !== 'multiplayer' ? 1 : MIN_LOBBY_SIZE;

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
    <div className="flex flex-grow flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="p-2 md:p-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg md:text-2xl font-bold flex items-center gap-2">
              <span>Lobby:</span>
              <div className="flex items-center gap-1 bg-muted p-1.5 rounded-lg border">
                <span className="font-mono text-accent tracking-widest">{roomData.id}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyRoomId}
                  className="h-6 w-6"
                  aria-label="Copy Room ID"
                >
                  <ClipboardCopy className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon" className="h-8 w-8" aria-label="Leave Room">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to leave?</AlertDialogTitle>
                    <AlertDialogDescription>
                      If you are the host, another player will become the host. You can rejoin later if the game hasn't started.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLeaveRoom} className={buttonVariants({ variant: "destructive" })}>Leave</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <CardDescription className="text-xs">
            {roomData.isGameStarted && !roomData.isGameOver ? "Game has started." : roomData.isGameOver ? "Game is over. The host can start a new game." : "Waiting for players. The host can start the game once conditions are met."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-0 space-y-4 md:space-y-6">
          <div className="flex flex-row justify-between items-center text-base md:text-lg">
            <div className="flex items-center gap-1">
              <strong>Ticket Price:</strong>
              <Coins className="h-4 w-4 text-yellow-500" />
              <span>{gameSettings.ticketPrice}</span>
            </div>
            <p><strong>Room Size:</strong> {gameSettings.lobbySize}</p>
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
              <CardContent className="p-2 md:p-3 pt-0 flex flex-row items-stretch gap-2 md:gap-4">
                 <Select
                  value={String(selectedTicketsToBuy)}
                  onValueChange={(value) => setSelectedTicketsToBuy(Number(value))}
                  disabled={isJoiningOrUpdating}
                >
                  <SelectTrigger className="flex-grow sm:flex-grow-0 sm:w-[180px] h-9 md:h-10 text-xs md:text-sm">
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
                <Button onClick={handleConfirmOrJoinTickets} className="flex-shrink-0 text-xs md:text-sm h-9 md:h-10" disabled={isJoiningOrUpdating}>
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
              <CardContent className="p-2 md:p-3 pt-0 flex flex-row items-center justify-between gap-2 md:gap-4">
                <p className="font-medium text-xs md:text-sm">
                  You have {currentUserInRoom?.tickets.length} {ticketsText(currentUserInRoom?.tickets.length ?? 0)} confirmed.
                  {!isCurrentUserHost && " Waiting for host..."}
                </p>
                <Button onClick={() => setIsEditingTickets(true)} variant="outline" className="text-xs md:text-sm h-9 md:h-10">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
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
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <span className={cn("font-medium", player.id === currentUser?.uid && "text-primary font-bold")}>{player.name}</span>
                      {player.isBot && <Bot className="ml-1.5 h-4 w-4 text-muted-foreground" />}
                      {player.isHost && <span className="text-xs font-semibold text-primary ml-1.5">(Host)</span>}
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {player.tickets?.length > 0 
                        ? <>
                            <span>{player.tickets.length} ticket{player.tickets.length === 1 ? '' : 's'}</span>
                            <div className="flex items-center gap-0.5">(<Coins className="h-3 w-3 text-yellow-500" />{player.tickets.length * gameSettings.ticketPrice})</div>
                          </>
                        : (roomData.isGameOver ? "Game Over" : "No tickets yet")}
                    </span>
                  </div>
                  
                  {isCurrentUserHost && !player.isBot && player.id !== currentUser?.uid && !roomData.isGameStarted && (
                    <div className="flex items-center gap-1">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Make ${player.name} host`}>
                            <Crown className="h-4 w-4 text-yellow-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Transfer Host?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to make {player.name} the new host? You will lose host privileges.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleTransferHost(player.id)}>Confirm</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Kick ${player.name}`}>
                            <UserX className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Kick Player?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {player.name} from the lobby?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleKickPlayer(player.id)} className={buttonVariants({ variant: "destructive" })}>Kick</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
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
                 <div className="font-semibold flex items-center gap-1">
                  <span>Potential Prize Pool:</span>
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span>{currentTotalPrizePool.toFixed(0)}</span>
                 </div>
                 <p className="text-xs text-muted-foreground">
                   (Based on {totalTicketsBoughtByPlayers} {ticketsText(totalTicketsBoughtByPlayers)} confirmed by players for this round)
                 </p>
                {prizesForFormat.map((prizeName) => {
                  const percentage = prizeDistribution[prizeName as PrizeType] || 0;
                  const prizeAmount = (currentTotalPrizePool * percentage) / 100;
                  return (
                    <div key={prizeName} className="flex justify-between items-center text-xs md:text-sm">
                      <span>{prizeName}:</span>
                      <div className="font-semibold flex items-center gap-1">
                        <Coins className="h-4 w-4 text-yellow-500" />
                        <span>{prizeAmount.toFixed(0)} ({percentage}%)</span>
                      </div>
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
