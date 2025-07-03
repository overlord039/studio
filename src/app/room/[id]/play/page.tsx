
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import HousieTicket from '@/components/game/housie-ticket';
import CalledNumberDisplay from '@/components/game/called-number-display';
import type { HousieTicketGrid, PrizeType, Room, GameSettings, CallingMode } from '@/types';
import { PRIZE_TYPES } from '@/types';
import { announceCalledNumber } from '@/ai/flows/announce-called-number';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Award, Users, XCircle, CheckCircle2, PartyPopper, RotateCcw, LogOut, MinusSquare, PlusSquare, Loader2, X, Zap, Settings2, Play, Pause, Menu } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useSound } from '@/contexts/sound-context';
import { PRIZE_DEFINITIONS, PRIZE_DISTRIBUTION_PERCENTAGES, DEFAULT_GAME_SETTINGS, NUMBERS_RANGE_MAX } from '@/lib/constants';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import LiveNumberBoard from '@/components/game/live-number-board';
import { playSound } from '@/lib/sounds';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";


const MemoizedHousieTicket = React.memo(HousieTicket);
const MemoizedLiveNumberBoard = React.memo(LiveNumberBoard);
const MemoizedCalledNumberDisplay = React.memo(CalledNumberDisplay);


export default function GameRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const roomId = (params as { id: string }).id;
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();
  const { isSfxMuted, toggleSfxMute } = useSound();

  const [roomData, setRoomData] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [myTickets, setMyTickets] = useState<HousieTicketGrid[]>([]);
  const [markedNumbers, setMarkedNumbers] = useState<Set<string>>(new Set());
  const [gameMessage, setGameMessage] = useState<string | null>(null);
  const [isCallingNextNumber, setIsCallingNextNumber] = useState(false);
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const previousCurrentNumberRef = useRef<number | null>(null);
  const roomDataRef = useRef(roomData);
  const previousPrizeStatusRef = useRef<Room['prizeStatus'] | null>(null);

  useEffect(() => {
    roomDataRef.current = roomData;
  }, [roomData]);

  useEffect(() => {
    if (gameMessage) {
      const timer = setTimeout(() => {
        setGameMessage(null);
      }, 4000); // Disappear after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [gameMessage]);

  const fetchGameDetails = useCallback(async (isInitialLoad = false) => {
    if (!roomId || !currentUser?.username) {
      if (isInitialLoad) {
        setError("Room ID or User not available for fetching game details.");
        setIsLoading(false);
      }
      return;
    }

    if (isInitialLoad) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const response = await fetch(`/api/rooms/${roomId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to parse error response. Status: ${response.status}` }));
        if (response.status === 404) {
          setError("Room not found. It might have expired or never existed.");
          if (isInitialLoad) setRoomData(null);
        } else {
          setError(errorData.message || `Failed to fetch room details: ${response.statusText}`);
          if (isInitialLoad) setRoomData(null);
        }
        if (isInitialLoad) setIsLoading(false);
        return;
      }
      const data: Room = await response.json();
      
      if (data.isGameOver && !roomDataRef.current?.isGameOver) {
        playSound('game over.wav');
      }
      
      const oldPrizeStatus = previousPrizeStatusRef.current;
      const newPrizeStatus = data.prizeStatus;

      if (oldPrizeStatus && newPrizeStatus && !data.isGameOver) {
          const prizes = Object.keys(newPrizeStatus) as PrizeType[];
          for (const prize of prizes) {
              const newClaim = newPrizeStatus[prize];
              const oldClaim = oldPrizeStatus[prize];
              
              const newClaimants = newClaim?.claimedBy ?? [];
              const oldClaimants = oldClaim?.claimedBy ?? [];

              if (newClaimants.length > oldClaimants.length) {
                  const newlyAddedClaimants = newClaimants.filter(id => !oldClaimants.includes(id));
                  
                  if (newlyAddedClaimants.length > 0) {
                      playSound('win.wav');
                      const claimantNames = newlyAddedClaimants
                          .map(id => {
                              const player = data.players.find(p => p.id === id);
                              if (player?.id === currentUser?.username) return "You";
                              return player?.name || id;
                           })
                          .join(', ');
                      
                      const message = `🔔 ${claimantNames} claimed ${prize}!`;
                      setGameMessage(message);
                      
                      break; 
                  }
              }
          }
      }
      
      setRoomData(data);
      previousPrizeStatusRef.current = data.prizeStatus;

      const me = data.players.find(p => p.id === currentUser.username);
      if (me && me.tickets) {
        setMyTickets(me.tickets);
      } else if (isInitialLoad && (!me || !me.tickets || me.tickets.length === 0)) {
        const ticketsParam = searchParams.get('playerTickets');
        const numTickets = ticketsParam ? parseInt(ticketsParam, 10) : 0;
        if (numTickets === 0 && data.isGameStarted && !data.isGameOver) {
          if (!roomDataRef.current || !roomDataRef.current.isGameOver) { 
            setGameMessage(prev => prev && prev.includes("Game Over!") ? prev : "You are spectating. You don't have tickets in this game.");
          }
        }
        setMyTickets([]);
      }

      if (data.isGameOver) {
        const fhClaim = data.prizeStatus[PRIZE_TYPES.FULL_HOUSE];
        let gameOverMsg = "🎉 Game Over!";
        if (fhClaim && fhClaim.claimedBy.length > 0) {
          const winnerNames = fhClaim.claimedBy.map(winnerId => data.players.find(p => p.id === winnerId)?.name || winnerId).join(' & ');
          gameOverMsg = `🎉 ${winnerNames} won Full House! Game Over!`;
          if (fhClaim.timestamp) {
            const claimTimestamp = typeof fhClaim.timestamp === 'string' ? new Date(fhClaim.timestamp) : fhClaim.timestamp;
            gameOverMsg += ` at ${claimTimestamp.toLocaleTimeString()}`;
          }
        } else if (data.calledNumbers.length === NUMBERS_RANGE_MAX) {
          gameOverMsg = "All numbers called. No Full House winner.";
        }
        setGameMessage(prev => (!prev || !prev.includes("Game Over!")) ? gameOverMsg : prev);
      }

    } catch (err) {
      console.error("Error fetching game details:", err);
      if (isInitialLoad || !roomDataRef.current) {
        setError(`Failed to fetch game details: ${(err as Error).message}`);
        if (isInitialLoad) setRoomData(null);
      } else if (roomDataRef.current && !roomDataRef.current.isGameOver) {
        toast({
          title: "Game Update Failed",
          description: "Could not fetch latest game details. Retrying...",
          variant: "destructive",
          duration: 2000,
        });
      }
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  }, [roomId, currentUser, searchParams, toast]);

  useEffect(() => {
    if (currentUser && roomId && !authLoading) {
      fetchGameDetails(true);
    } else if (!authLoading && !currentUser) {
      setIsLoading(false);
      setError("Please log in to play or spectate.");
    }
  }, [currentUser, roomId, authLoading, fetchGameDetails]);

  // Polling for game updates
  useEffect(() => {
    if (!roomId || !currentUser || roomData?.isGameOver || isLoading) return;
    
    // In manual mode, poll less frequently unless host
    const isManualMode = roomData?.settings.callingMode === 'manual';
    const isHost = roomData?.host.id === currentUser.username;
    const pollInterval = isManualMode && !isHost ? 7000 : 3000;

    const intervalId = setInterval(() => {
      if (!document.hidden) { 
        fetchGameDetails(false);
      }
    }, pollInterval); 
    return () => clearInterval(intervalId);
  }, [roomId, currentUser, roomData?.isGameOver, roomData?.settings.callingMode, roomData?.host.id, isLoading, fetchGameDetails]);


  // Announce new numbers
  useEffect(() => {
    if (roomData && roomData.currentNumber !== null && roomData.currentNumber !== previousCurrentNumberRef.current) {
      if (!isSfxMuted && typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(String(roomData.currentNumber));
        window.speechSynthesis.speak(utterance);
        
        announceCalledNumber({ number: roomData.currentNumber })
          .then(() => console.log(`AI flow 'announceCalledNumber' invoked for: ${roomData.currentNumber}`))
          .catch(err => console.error("Error invoking announceCalledNumber AI flow:", err));
      }
      previousCurrentNumberRef.current = roomData.currentNumber;
    }
  }, [roomData?.currentNumber, isSfxMuted]);


  const handleNumberClick = (ticketIndex: number, numberValue: number, rowIndex: number, colIndex: number) => {
    if (!roomData || roomData.isGameOver || myTickets.length === 0) return;
    const key = `${ticketIndex}-${rowIndex}-${colIndex}`;

    if (markedNumbers.has(key)) {
      return; 
    }

    if (!roomData.calledNumbers.includes(numberValue)) {
      return;
    }
    playSound('marking number.wav');
    setMarkedNumbers(prev => {
      const newMarked = new Set(prev);
      newMarked.add(key);
      return newMarked;
    });
  };

  const handleClaimPrize = async (prizeType: PrizeType) => {
    if (!roomData || !currentUser) {
      toast({ title: "Cannot Claim", description: "Room data missing or not logged in.", variant: "destructive" });
      return;
    }
    
    const ticketIndex = 0;

    try {
      const response = await fetch(`/api/rooms/${roomId}/claim-prize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: currentUser.username, prizeType, ticketIndex }),
      });

      const result = await response.json();

      if (!response.ok) {
         playSound('game notification.wav');
         setGameMessage(prev => {
            if (roomDataRef.current && !roomDataRef.current.isGameOver && result.message) {
                return (!prev || !prev.includes("Game Over!")) ? result.message : prev;
            }
            return prev;
        });
        toast({ title: `${prizeType} Claim Invalid!`, description: result.message, variant: "destructive" });
      } else {
        const updatedRoom: Room = result;
        setRoomData(updatedRoom); 
        previousPrizeStatusRef.current = updatedRoom.prizeStatus;

        const claimStatus = updatedRoom.prizeStatus[prizeType];
        
        let toastMessageAlert = `Your claim for ${prizeType} has been submitted for validation.`;
        if (claimStatus?.claimedBy.includes(currentUser.username)) {
            toastMessageAlert = `You successfully claimed ${prizeType}!`;
        }

        if (updatedRoom.isGameOver) {
          toastMessageAlert = `You claimed Full House! Game Over.`
        }
        
        toast({
            title: "Claim Processed!",
            description: toastMessageAlert,
            className: (toastMessageAlert.includes("Bogey") || toastMessageAlert.includes("Invalid") || toastMessageAlert.includes("Failed")) ? "bg-destructive" : "bg-green-500 text-white"
        });
      }
    } catch (err) {
      console.error(`Error claiming ${prizeType}:`, err);
      setGameMessage(prev => {
        if (roomDataRef.current && !roomDataRef.current.isGameOver) {
            return (!prev || !prev.includes("Game Over!")) ? `Network error claiming ${prizeType}.` : prev;
        }
        return prev;
      });
      toast({ title: "Network Error", description: `Could not claim ${prizeType}.`, variant: "destructive" });
    }
  };

  const handleCallNextNumber = async () => {
    if (!currentUser || !roomData) return;
    setIsCallingNextNumber(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/call-number`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: currentUser.username }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to call next number.');
      }
      setRoomData(data);
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsCallingNextNumber(false);
    }
  };

  const handleToggleCallingMode = async () => {
    if (!currentUser || !isCurrentUserHost || !roomData || roomData.isGameOver || roomData.settings.isPublic) return;

    setIsUpdatingMode(true);
    const newMode = roomData.settings.callingMode === 'auto' ? 'manual' : 'auto';

    try {
        const response = await fetch(`/api/rooms/${roomId}/update-calling-mode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hostId: currentUser.username, callingMode: newMode }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Failed to switch to ${newMode} mode.`);
        }
        setRoomData(data);
        toast({
            title: "Mode Switched",
            description: `Number calling is now ${newMode}.`,
        });
    } catch (error) {
        toast({
            title: "Error Switching Mode",
            description: (error as Error).message,
            variant: "destructive",
        });
    } finally {
        setIsUpdatingMode(false);
    }
  };

  const isCurrentUserHost = roomData?.host.id === currentUser?.username;

  const handlePlayAgain = async () => {
    if (!currentUser) return;
    
    if (isCurrentUserHost) {
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
        router.push(`/room/${roomId}/lobby`);
        toast({ title: "New Game Ready!", description: "The lobby has been reset for all players." });
      } catch (err) {
        console.error("Error resetting game:", err);
        toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
        setIsResetting(false);
      }
    } else {
      router.push(`/room/${roomId}/lobby`);
      toast({ title: "Returning to Lobby", description: "Waiting for host to start a new game." });
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentUser) {
      router.push('/');
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
      router.push('/');
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl">Loading Game...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Error Loading Game</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => router.push('/')} size="lg">Go to Homepage</Button>
      </div>
    );
  }

  if (!roomData || !currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Room Data Unavailable</h2>
        <p className="text-muted-foreground mb-6">Could not load room details. Please try again or ensure you are logged in.</p>
        <Button onClick={() => router.push('/')} size="lg">Go to Homepage</Button>
      </div>
    );
  }

  const gameSettings: GameSettings = roomData.settings || DEFAULT_GAME_SETTINGS;
  const currentPrizeFormat = gameSettings.prizeFormat;
  const prizesForFormat = PRIZE_DEFINITIONS[currentPrizeFormat] || [];
  const prizeDistributionPercentages = PRIZE_DISTRIBUTION_PERCENTAGES[currentPrizeFormat] || {};

  const totalTicketsInGame = roomData.players.reduce((sum, player) => sum + (player.tickets?.length || 0), 0);
  const totalPrizePool = gameSettings.ticketPrice * totalTicketsInGame;
  const otherPlayers = roomData.players.filter(p => p.id !== currentUser.username);
  const ticketsText = (count: number) => count === 1 ? 'ticket' : 'tickets';


  if (roomData.isGameOver) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    };

    let currentUserWinnings = 0;
    const currentUserPrizeNames: PrizeType[] = [];
    if (currentUser) {
        prizesForFormat.forEach(prize => {
            const claimInfo = roomData.prizeStatus[prize];
            if (claimInfo && claimInfo.claimedBy.includes(currentUser.username)) {
                currentUserPrizeNames.push(prize);
                const percentage = prizeDistributionPercentages[prize as PrizeType] || 0;
                const prizeAmount = (totalPrizePool * percentage) / 100;
                const prizePerWinner = prizeAmount / claimInfo.claimedBy.length;
                currentUserWinnings += prizePerWinner;
            }
        });
    }

    return (
      <div className="p-2 md:p-4 space-y-6 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold flex items-center justify-center">
              <PartyPopper className="mr-3 h-10 w-10 text-primary" /> Game Over!
            </CardTitle>
            <p className="text-lg mt-2 whitespace-pre-line">{gameMessage}</p>
          </CardHeader>
          <CardContent className="space-y-4">
             {currentUserWinnings > 0 && (
                <div className="text-center p-4 bg-green-100 dark:bg-green-900/40 rounded-lg border border-green-500/50 space-y-1">
                    <p className="text-lg font-semibold">Congratulations, {currentUser.username}!</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">You won a total of {formatCurrency(currentUserWinnings)}!</p>
                    <p className="text-sm text-muted-foreground">Your prizes: <span className="font-medium text-foreground">{currentUserPrizeNames.join(', ')}</span></p>
                </div>
            )}
            <h3 className="text-xl font-semibold text-center mb-2 flex items-center justify-center">
                <Award className="mr-2 h-5 w-5 text-accent"/>
                Final Prize Summary
            </h3>
            <div className="border rounded-md p-3">
               <div className="flex justify-between items-center text-lg font-bold mb-2 pb-2 border-b">
                <span>Total Prize Pool:</span>
                <span>{formatCurrency(totalPrizePool)}</span>
            </div>
              <ul className="space-y-2">
                {prizesForFormat.map(prize => {
                  const claimInfo = roomData.prizeStatus[prize];
                  const percentage = prizeDistributionPercentages[prize as PrizeType] || 0;
                  const prizeAmount = (totalPrizePool * percentage) / 100;

                  let prizeStatusText = "Not Claimed";
                  if (claimInfo && claimInfo.claimedBy.length > 0) {
                    const winnerNames = claimInfo.claimedBy.map(id => roomData.players.find(p => p.id === id)?.name || id).join(', ');
                    prizeStatusText = `Claimed by ${winnerNames}`;
                  }
                  
                  return (
                     <li key={prize} className="flex justify-between items-center text-md p-2 bg-secondary/20 rounded-md">
                        <div className="flex flex-col">
                            <span className="font-medium">{prize}</span>
                            <span className="text-xs text-muted-foreground">{formatCurrency(prizeAmount)} ({percentage}%)</span>
                        </div>
                        <span className={cn("font-semibold text-right", claimInfo && claimInfo.claimedBy.length > 0 ? "text-green-600" : "text-muted-foreground")}>
                            {prizeStatusText}
                        </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Button onClick={handlePlayAgain} className="w-full" size="lg" disabled={isResetting}>
                {isResetting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-5 w-5" />
                )}
                {isResetting ? "Resetting..." : (isCurrentUserHost ? "Start New Game in Lobby" : "Back to Lobby")}
              </Button>
              <Button variant="outline" className="w-full" size="lg" onClick={handleLeaveRoom}>
                <LogOut className="mr-2 h-5 w-5" /> Leave Room
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAutoCalling = roomData.settings.callingMode === 'auto';

  return (
    <div className="container mx-auto my-4 p-4 border rounded-xl shadow-lg space-y-4">
      <Card className="shadow-md">
        <CardContent className="p-2 sm:p-3 flex flex-row justify-between items-center text-sm gap-3">
          <div className="flex-grow">
            <div>Room ID: #{roomId} | Prize Pool: ₹{totalPrizePool.toFixed(2)} | Players: {roomData.players.length}</div>
            <div className="font-semibold text-primary">{currentUser.username} ({myTickets.length} {ticketsText(myTickets.length)})</div>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Game Info & Players">
                <Menu className="h-5 w-5 text-primary" />
              </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col">
              <SheetHeader>
                <SheetTitle>Game Info & Players</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-6 flex-grow overflow-y-auto">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center"><Award className="mr-2 h-5 w-5 text-primary" />Prize Info</h3>
                   {isLoading ? (
                      <p className="text-sm text-muted-foreground">Loading prize info...</p>
                  ) : (
                  <>
                      <p className="text-sm text-muted-foreground">Potential prize money based on total tickets.</p>
                      <ul className="space-y-1 mt-2 text-sm">
                      {prizesForFormat.map(prize => {
                          const percentage = prizeDistributionPercentages[prize as PrizeType] || 0;
                          const prizeAmount = (totalPrizePool * percentage) / 100;
                          return (
                          <li key={prize}>{prize}: ₹{prizeAmount.toFixed(2)} ({percentage}%)</li>
                          );
                      })}
                      </ul>
                  </>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center"><Users className="mr-2 h-5 w-5 text-primary" />Other Players ({otherPlayers.length})</h3>
                  {isLoading ? (
                      <p className="text-sm text-muted-foreground">Loading player list...</p>
                      ) : (
                      <ScrollArea className="h-40">
                          <ul className="space-y-1 mt-2 text-sm">
                          {otherPlayers.map((player, index) => (
                              <li key={player.id || index} className="flex justify-between items-center">
                              <span>
                                  {player.name}
                                  {player.isHost && <span className="ml-2 text-xs font-semibold text-primary">(Host)</span>}
                              </span>
                              <span className="text-muted-foreground">{player.tickets?.length || 0} {ticketsText(player.tickets?.length || 0)}</span>
                              </li>
                          ))}
                          {otherPlayers.length === 0 && <li className="text-muted-foreground">No other players in the room.</li>}
                          </ul>
                      </ScrollArea>
                  )}
                </div>
              </div>
              <div className="border-t pt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" size="sm">
                      <LogOut className="mr-2 h-4 w-4" /> Leave Game
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure you want to leave the game?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove you from the current game session. If you are the host, a new host will be assigned.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-green-600 text-primary-foreground hover:bg-green-700 border-transparent">Stay</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLeaveRoom} className={buttonVariants({ variant: "destructive" })}>
                        Leave
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </SheetContent>
          </Sheet>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4 lg:col-span-1">
          
          {isCurrentUserHost && !roomData.settings.isPublic && !roomData.isGameOver && (
            <Card>
              <CardContent className="p-3">
                  <div className="flex items-center justify-between rounded-md border p-3">
                      <Label htmlFor="calling-mode-switch" className="flex flex-col cursor-pointer">
                          <span className="font-semibold">Auto-Call</span>
                          <span className="text-xs text-muted-foreground">
                              {isAutoCalling ? "System is calling" : "Paused, call manually"}
                          </span>
                      </Label>
                      <Switch
                          id="calling-mode-switch"
                          checked={isAutoCalling}
                          onCheckedChange={handleToggleCallingMode}
                          disabled={isUpdatingMode || roomData.isGameOver}
                          aria-label="Toggle automatic number calling"
                      />
                  </div>
              </CardContent>
            </Card>
          )}

          <MemoizedCalledNumberDisplay 
            currentNumber={roomData.currentNumber}
            calledNumbers={roomData.calledNumbers}
            isMuted={isSfxMuted}
            onToggleMute={toggleSfxMute}
          />

          {isCurrentUserHost && !isAutoCalling && !roomData.isGameOver && (
            <Button 
                onClick={handleCallNextNumber}
                disabled={isCallingNextNumber || roomData.isGameOver}
                className="w-full"
            >
                <Zap className="mr-2 h-4 w-4" />
                {isCallingNextNumber ? 'Calling...' : 'Call Next Number'}
            </Button>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="max-w-7xl mx-auto space-y-4">
            {gameMessage && (
              <Alert
                variant={gameMessage.includes("Bogey") || gameMessage.includes("not valid") || gameMessage.includes("Failed") || gameMessage.includes("Error") ? "destructive" : "default"}
                className={cn(
                  "pr-10",
                  ((gameMessage.includes("claimed") || gameMessage.includes("won") || gameMessage.toLocaleLowerCase().includes("game over"))) && !gameMessage.includes("Bogey") && !gameMessage.includes("not valid") ? "bg-green-100 dark:bg-green-900 border-green-500" : ""
                )}
              >
                {gameMessage.includes("Bogey") || gameMessage.includes("not valid") || gameMessage.includes("Failed") || gameMessage.includes("Error") ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                <AlertTitle>{gameMessage.includes("Bogey") || gameMessage.includes("not valid") || gameMessage.includes("Failed") || gameMessage.includes("Error") ? "Update" : (gameMessage.includes("claimed") || gameMessage.includes("won") || gameMessage.toLocaleLowerCase().includes("game over") ? "Game Update!" : "Game Message")}</AlertTitle>
                <AlertDescription>{gameMessage}</AlertDescription>
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => setGameMessage(null)}
                    aria-label="Close message"
                  >
                    <X className="h-4 w-4" />
                </Button>
              </Alert>
            )}

            {myTickets.length > 0 && !roomData.isGameOver && (
              <div className="flex flex-wrap gap-2 justify-center">
                {prizesForFormat.map((prizeType, prizeIdx) => {
                  const claimInfo = roomData.prizeStatus[prizeType];
                  const hasPlayerClaimedThis = claimInfo?.claimedBy.includes(currentUser.username);
                  const isPrizeClaimedByAnyone = claimInfo && claimInfo.claimedBy.length > 0;

                  let buttonText = prizeType;
                  if (isPrizeClaimedByAnyone) {
                    if (hasPlayerClaimedThis) {
                      buttonText = `You Claimed ${prizeType}`;
                    } else {
                      const claimants = claimInfo.claimedBy.map(id => roomData.players.find(p => p.id === id)?.name || id).join(", ");
                      buttonText = `${prizeType} (Claimed by ${claimants})`;
                    }
                  }
                  
                  return (
                    <Button
                      key={`${prizeType}-${prizeIdx}`}
                      onClick={() => handleClaimPrize(prizeType)}
                      disabled={
                        roomData.isGameOver ||
                        hasPlayerClaimedThis ||
                        (isPrizeClaimedByAnyone && prizeType !== PRIZE_TYPES.FULL_HOUSE && !claimInfo?.claimedBy.includes(currentUser.username)) || 
                        (isPrizeClaimedByAnyone && prizeType === PRIZE_TYPES.FULL_HOUSE)
                      }
                      variant={isPrizeClaimedByAnyone ? "secondary" : "default"}
                      className={cn("px-2 py-1 rounded-md text-xs sm:text-sm",
                        !isPrizeClaimedByAnyone && prizeType.includes("Jaldi") ? "bg-green-500 hover:bg-green-600" :
                          !isPrizeClaimedByAnyone && prizeType.includes("Line") ? "bg-yellow-400 hover:bg-yellow-500 text-black" :
                            !isPrizeClaimedByAnyone && prizeType.includes("Full House") ? "bg-red-500 hover:bg-red-600" : "",
                        (hasPlayerClaimedThis || (isPrizeClaimedByAnyone && !hasPlayerClaimedThis)) ? "opacity-70" : "",
                        (roomData.isGameOver || (roomData.prizeStatus[PRIZE_TYPES.FULL_HOUSE]?.claimedBy?.length ?? 0 > 0) && prizeType !== PRIZE_TYPES.FULL_HOUSE) ? "cursor-not-allowed opacity-50" : ""
                      )}
                    >
                      {buttonText}
                    </Button>
                  );
                })}
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Your Tickets ({myTickets.length})</h2>
              <Dialog>
                <DialogTrigger asChild>
                   <Button variant="default" size="sm" className="font-semibold">
                    Number Board
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md p-4">
                  <DialogHeader className="pb-2">
                    <DialogTitle>Number Board</DialogTitle>
                  </DialogHeader>
                  <MemoizedLiveNumberBoard
                    calledNumbers={roomData.calledNumbers}
                    currentNumber={roomData.currentNumber}
                    remainingCount={NUMBERS_RANGE_MAX - roomData.calledNumbers.length}
                    calledCount={roomData.calledNumbers.length}
                  />
                </DialogContent>
              </Dialog>
            </div>

            {myTickets.length === 0 && !roomData.isGameOver && roomData.isGameStarted && <p className="text-center text-muted-foreground">You are spectating or have no tickets in this game.</p>}
            <ScrollArea className="max-h-[60vh] lg:max-h-none">
              <div className="flex flex-wrap justify-center gap-4">
                {myTickets.map((ticket, index) => (
                  <MemoizedHousieTicket
                    key={index}
                    ticketIndex={index}
                    ticket={ticket}
                    calledNumbers={roomData.calledNumbers}
                    markedNumbers={markedNumbers}
                    onNumberClick={roomData.isGameOver ? undefined : (num, r, c) => handleNumberClick(index, num, r, c)}
                    className="w-full max-w-[18rem] text-xs"
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
