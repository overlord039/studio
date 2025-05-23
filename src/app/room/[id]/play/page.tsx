
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useParams, useRouter } from 'next/navigation';
import { checkWinningCondition } from '@/lib/housie'; // generateImprovedHousieTicket is now backend
import HousieTicket from '@/components/game/housie-ticket';
import LiveNumberBoard from '@/components/game/live-number-board';
import CalledNumberDisplay from '@/components/game/called-number-display';
import type { HousieTicketGrid, PrizeType, Room, BackendPlayerInRoom } from '@/types';
import { PRIZE_TYPES, GameSettings } from '@/types'; 
import { announceCalledNumber } from '@/ai/flows/announce-called-number';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Award, Users, XCircle, CheckCircle2, PartyPopper, RotateCcw, LogOut, MinusSquare, PlusSquare, ListOrdered, Loader2, Speaker } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { PRIZE_DEFINITIONS, PRIZE_DISTRIBUTION_PERCENTAGES, DEFAULT_GAME_SETTINGS } from '@/lib/constants';


export default function GameRoomPage() {
  const routeParams = useParams();
  const router = useRouter();
  const roomId = routeParams.id as string;
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();

  const [roomData, setRoomData] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [myTickets, setMyTickets] = useState<HousieTicketGrid[]>([]);
  const [markedNumbers, setMarkedNumbers] = useState<Set<string>>(new Set()); // "ticketIndex-rowIndex-colIndex"
  const [gameMessage, setGameMessage] = useState<string | null>(null);
  
  const [isPrizesStatusMinimized, setIsPrizesStatusMinimized] = useState(true);
  const [isPrizeInfoMinimized, setIsPrizeInfoMinimized] = useState(true);
  const [isOtherPlayersMinimized, setIsOtherPlayersMinimized] = useState(true);
  const [isCallingNumber, setIsCallingNumber] = useState(false);

  const isCurrentUserHost = roomData?.host.id === currentUser?.username;

  const fetchGameDetails = useCallback(async (isInitialLoad = false) => {
    if (!roomId || !currentUser) return;
    if (isInitialLoad) setIsLoading(true);
    // setError(null); // Don't clear error on auto-refresh if game is over etc.

    try {
      const response = await fetch(`/api/rooms/${roomId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch game details.");
      }
      const data: Room = await response.json();
      setRoomData(data);

      // Set my tickets if not already set or if roomData changed
      const me = data.players.find(p => p.id === currentUser.username);
      if (me && me.tickets) {
        setMyTickets(me.tickets);
      } else if (isInitialLoad && (!me || !me.tickets)) {
        // If on initial load the current user has no tickets (e.g. spectator), set to empty
        setMyTickets([]);
      }
      
      if (data.isGameOver && !gameMessage?.includes("Game Over")) {
         // Determine the winner display
        const fhClaim = data.prizeStatus[PRIZE_TYPES.FULL_HOUSE];
        let gameOverMsg = "🎉 Game Over!";
        if (fhClaim && fhClaim.claimedBy.length > 0) {
          const winnerNames = fhClaim.claimedBy.map(winnerId => data.players.find(p=>p.id === winnerId)?.name || winnerId).join(' & ');
          gameOverMsg = `🎉 ${winnerNames} won Full House! Game Over!`;
           if (fhClaim.timestamp) {
             gameOverMsg += ` at ${new Date(fhClaim.timestamp).toLocaleTimeString()}`;
           }
        } else if (data.calledNumbers.length === (DEFAULT_GAME_SETTINGS.numberOfTicketsPerPlayer > 0 ? 90 : 0) ) { // Check if all numbers called
            gameOverMsg = "All numbers called. No Full House winner.";
        }
        setGameMessage(gameOverMsg);
      }


    } catch (err) {
      console.error("Error fetching game details:", err);
      if (isInitialLoad || !roomData) { // Only set critical error on initial load or if no data yet
        setError((err as Error).message);
      }
    } finally {
      if (isInitialLoad) setIsLoading(false);
    }
  }, [roomId, currentUser, gameMessage]); // Added gameMessage

  useEffect(() => {
    if (currentUser && roomId) {
      fetchGameDetails(true);
    } else if (!authLoading && !currentUser) {
      setIsLoading(false);
      setError("Please log in to play or spectate.");
    }
  }, [currentUser, roomId, authLoading, fetchGameDetails]);

  // Periodic refresh for game state
  useEffect(() => {
    if (!roomId || !currentUser || roomData?.isGameOver || isLoading) return;

    const intervalId = setInterval(() => {
      if (!document.hidden) { // Basic check to avoid fetching if tab is not active
        fetchGameDetails(false);
      }
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(intervalId);
  }, [roomId, currentUser, roomData?.isGameOver, isLoading, fetchGameDetails]);


  const handleCallNextNumber = async () => {
    if (!roomData || roomData.isGameOver || !isCurrentUserHost || isCallingNumber) return;
    setIsCallingNumber(true);
    setGameMessage(null);
    try {
      const response = await fetch(`/api/rooms/${roomId}/call-number`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: currentUser?.username }) // Optional: backend can verify host
      });
      
      const result = await response.json();

      if (!response.ok) {
        setGameMessage(result.message || "Failed to call number.");
        toast({ title: "Error Calling Number", description: result.message, variant: "destructive"});
      } else {
        setRoomData(result as Room); // Update with full room state from API
        if (result.currentNumber) {
           announceCalledNumber({ number: result.currentNumber })
            .then(() => console.log(`Announced: ${result.currentNumber}`))
            .catch(err => console.error("Error announcing number:", err));
        }
      }
    } catch (err) {
      console.error("Error calling next number:", err);
      setGameMessage("Network error calling number.");
      toast({ title: "Network Error", description: "Could not call next number.", variant: "destructive" });
    } finally {
      setIsCallingNumber(false);
    }
  };


  const handleNumberClick = (ticketIndex: number, numberValue: number, rowIndex: number, colIndex: number) => {
    if (!roomData || roomData.isGameOver || myTickets.length === 0) return;
    const key = `${ticketIndex}-${rowIndex}-${colIndex}`;
    if (markedNumbers.has(key)) return; 

    if (!roomData.calledNumbers.includes(numberValue)) {
      toast({
        title: "Invalid Mark",
        description: `Number ${numberValue} has not been called yet.`,
        variant: "destructive",
      });
      return;
    }
    setMarkedNumbers(prev => {
      const newMarked = new Set(prev);
      newMarked.add(key); 
      return newMarked;
    });
  };

  const handleClaimPrize = async (prizeType: PrizeType, ticketIndex: number) => {
    if (!roomData || roomData.isGameOver || !currentUser || myTickets.length === 0) {
      toast({ title: "Cannot Claim", description: "Game is over or you have no tickets.", variant: "destructive" });
      return;
    }
    setGameMessage(null);

    try {
      const response = await fetch(`/api/rooms/${roomId}/claim-prize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: currentUser.username, prizeType, ticketIndex }),
      });
      
      const result = await response.json();

      if (!response.ok) {
        setGameMessage(result.message || `Failed to claim ${prizeType}.`);
        toast({ title: `Claim ${prizeType} Invalid!`, description: result.message, variant: "destructive" });
      } else {
        const updatedRoom: Room = result;
        setRoomData(updatedRoom);
        const claimStatus = updatedRoom.prizeStatus[prizeType];
        let successMsg = `🔔 ${currentUser.username} has claimed ${prizeType}!`;
        if (claimStatus?.claimedBy.length && claimStatus.claimedBy.length > 1) {
            successMsg = `🔔 ${prizeType} claimed by ${claimStatus.claimedBy.join(' & ')}!`;
        }
        setGameMessage(successMsg);
        toast({ title: "Claim Successful!", description: successMsg, className: "bg-green-500 text-white" });

        if (updatedRoom.isGameOver && !gameMessage?.includes("Game Over")) {
           const fhClaim = updatedRoom.prizeStatus[PRIZE_TYPES.FULL_HOUSE];
           let gameOverMsg = "🎉 Game Over!";
           if (fhClaim && fhClaim.claimedBy.length > 0) {
             const winnerNames = fhClaim.claimedBy.map(winnerId => updatedRoom.players.find(p=>p.id === winnerId)?.name || winnerId).join(' & ');
             gameOverMsg = `🎉 ${winnerNames} won Full House! Game Over!`;
              if (fhClaim.timestamp) {
                gameOverMsg += ` at ${new Date(fhClaim.timestamp).toLocaleTimeString()}`;
              }
           }
           setGameMessage(gameOverMsg);
        }
      }
    } catch (err) {
      console.error(`Error claiming ${prizeType}:`, err);
      setGameMessage(`Network error claiming ${prizeType}.`);
      toast({ title: "Network Error", description: `Could not claim ${prizeType}.`, variant: "destructive" });
    }
  };
  

  const handlePlayAgain = () => {
    // This should ideally trigger a room reset on backend and re-fetch.
    // For now, simple client-side re-init might look broken if backend state isn't reset.
    // Consider navigating to lobby to "start a new game" properly.
    router.push(`/room/${roomId}/lobby`); 
    toast({title: "New Game", description: "Returning to lobby to start a new game."});
  };

  const handleLeaveRoom = () => {
    router.push('/');
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
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
    // This case should be rare if loading and error states are handled above
    return <div className="text-center p-8">Preparing your game... If this persists, please try refreshing.</div>;
  }
  
  const gameSettings: GameSettings = roomData.settings || DEFAULT_GAME_SETTINGS;
  const currentPrizeFormat = gameSettings.prizeFormat;
  const prizesForFormat = PRIZE_DEFINITIONS[currentPrizeFormat] || [];
  const prizeDistributionPercentages = PRIZE_DISTRIBUTION_PERCENTAGES[currentPrizeFormat] || {};

  const totalTicketsInGame = roomData.players.reduce((sum, player) => sum + (player.tickets?.length || 0), 0);
  const totalPrizePool = gameSettings.ticketPrice * totalTicketsInGame;
  const otherPlayers = roomData.players.filter(p => p.id !== currentUser.username);


  if (roomData.isGameOver) {
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
            <h3 className="text-xl font-semibold text-center mb-2">Final Prize Summary</h3>
            <ScrollArea className="h-48 border rounded-md p-3">
              <ul className="space-y-2">
                {prizesForFormat.map(prize => {
                  const claimInfo = roomData.prizeStatus[prize];
                  let prizeStatusText = "Not Claimed";
                  if (claimInfo && claimInfo.claimedBy.length > 0) {
                     const winnerNames = claimInfo.claimedBy.map(id => roomData.players.find(p=>p.id === id)?.name || id).join(', ');
                     prizeStatusText = `Claimed by ${winnerNames}`;
                     if (claimInfo.claimedBy.length > 1) {
                         prizeStatusText += ` (Split ${claimInfo.claimedBy.length} ways)`;
                     }
                  }
                  return (
                    <li key={prize} className="flex justify-between items-center text-md p-2 bg-secondary/20 rounded-md">
                      <span className="font-medium">{prize}:</span>
                      <span className={cn("font-semibold", claimInfo && claimInfo.claimedBy.length > 0 ? "text-green-600" : "text-muted-foreground")}>
                        {prizeStatusText}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Button onClick={handlePlayAgain} className="w-full" size="lg">
                <RotateCcw className="mr-2 h-5 w-5" /> Back to Lobby
              </Button>
              <Button onClick={handleLeaveRoom} variant="outline" className="w-full" size="lg">
                <LogOut className="mr-2 h-5 w-5" /> Leave Room
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-4 space-y-4">
      <Card className="shadow-md">
        <CardContent className="p-3 md:p-4 flex flex-col sm:flex-row justify-between items-center text-sm">
          <div>Room ID: #{roomId} | Prize Pool: ₹{totalPrizePool.toFixed(2)} | Players: {roomData.players.length}</div>
          <div className="font-semibold text-primary">{currentUser.username} ({myTickets.length} ticket(s))</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="space-y-4 lg:col-span-1">
          <CalledNumberDisplay currentNumber={roomData.currentNumber} />
          <LiveNumberBoard calledNumbers={roomData.calledNumbers} currentNumber={roomData.currentNumber} />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg flex items-center"><Award className="mr-2 h-5 w-5 text-primary" />Prizes Status</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsPrizesStatusMinimized(!isPrizesStatusMinimized)} aria-label={isPrizesStatusMinimized ? "Expand Prizes Status" : "Minimize Prizes Status"}>
                {isPrizesStatusMinimized ? <PlusSquare className="h-5 w-5" /> : <MinusSquare className="h-5 w-5" />}
                </Button>
            </CardHeader>
            {!isPrizesStatusMinimized && (
            <CardContent>
              <ScrollArea className="h-40">
                <ul className="space-y-1 text-sm">
                {prizesForFormat.map(prize => {
                  const claimInfo = roomData.prizeStatus[prize];
                  let statusText = "Available";
                  if (claimInfo && claimInfo.claimedBy.length > 0) {
                    const winnerNames = claimInfo.claimedBy.map(id => roomData.players.find(p=>p.id === id)?.name || id).join(', ');
                    statusText = `Claimed by ${winnerNames}`;
                  }
                  return (
                  <li key={prize} className={cn("flex justify-between", claimInfo && claimInfo.claimedBy.length > 0 ? "text-green-600 dark:text-green-400 font-semibold" : "text-muted-foreground")}>
                    <span>{prize}:</span>
                    <span>{statusText}</span>
                  </li>
                  );
                })}
                </ul>
              </ScrollArea>
            </CardContent>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
           <div className="max-w-xl mx-auto space-y-4">
            {gameMessage && ( 
              <Alert variant={gameMessage.includes("Bogey") || gameMessage.includes("not valid") || gameMessage.includes("Failed") ? "destructive" : (gameMessage.includes("claimed") || gameMessage.includes("won") ? "default" : "default")} 
                    className={cn((gameMessage.includes("claimed") || gameMessage.includes("won")) && !gameMessage.includes("Bogey") && !gameMessage.includes("not valid") ? "bg-green-100 dark:bg-green-900 border-green-500" : "")}>
                {gameMessage.includes("Bogey") || gameMessage.includes("not valid") || gameMessage.includes("Failed") ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                <AlertTitle>{gameMessage.includes("Bogey") || gameMessage.includes("not valid") || gameMessage.includes("Failed") ? "Update" : (gameMessage.includes("claimed") || gameMessage.includes("won") ? "Prize Update!" : "Game Message")}</AlertTitle>
                <AlertDescription>{gameMessage}</AlertDescription>
              </Alert>
            )}
            
            {myTickets.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {prizesForFormat.map(prizeType => {
                  const claimInfo = roomData.prizeStatus[prizeType];
                  const hasPlayerClaimedThis = claimInfo?.claimedBy.includes(currentUser.username);
                  const isPrizeClaimedByAnyone = claimInfo && claimInfo.claimedBy.length > 0;
                  let buttonText = prizeType; 

                  if (isPrizeClaimedByAnyone) {
                    if (hasPlayerClaimedThis) {
                        buttonText = `You Claimed ${prizeType}`;
                    } else  {
                        buttonText = `${prizeType} (Claimed by others)`;
                    }
                  }
                  
                  const isFullHouseClaimedByAnyone = roomData.prizeStatus[PRIZE_TYPES.FULL_HOUSE] && roomData.prizeStatus[PRIZE_TYPES.FULL_HOUSE]!.claimedBy.length > 0;

                  // For simplicity, we assume a player claims on one of their tickets.
                  // A more complex UI might let them pick which ticket if they have multiples.
                  // For now, using ticketIndex 0 for any claim action.
                  const ticketIndexForClaim = 0; 

                  return (
                    <Button
                      key={prizeType}
                      onClick={() => handleClaimPrize(prizeType, ticketIndexForClaim)}
                      disabled={roomData.isGameOver || hasPlayerClaimedThis || (isFullHouseClaimedByAnyone && prizeType !== PRIZE_TYPES.FULL_HOUSE) }
                      variant={isPrizeClaimedByAnyone ? "secondary" : "default"}
                      className={cn("px-2 py-1 rounded-md text-xs sm:text-sm", 
                        !isPrizeClaimedByAnyone && prizeType.includes("Jaldi") ? "bg-green-500 hover:bg-green-600" :
                        !isPrizeClaimedByAnyone && prizeType.includes("Line") ? "bg-yellow-400 hover:bg-yellow-500 text-black" :
                        !isPrizeClaimedByAnyone && prizeType.includes("Full House") ? "bg-red-500 hover:bg-red-600" : "",
                        (hasPlayerClaimedThis || (isPrizeClaimedByAnyone && !hasPlayerClaimedThis)) ? "opacity-70" : "",
                        (roomData.isGameOver || (isFullHouseClaimedByAnyone && prizeType !== PRIZE_TYPES.FULL_HOUSE) ) ? "cursor-not-allowed opacity-50" : ""
                      )}
                    >
                      {buttonText}
                    </Button>
                  );
                })}
              </div>
            )}
            
            <h2 className="text-xl font-semibold text-center">Your Tickets ({myTickets.length})</h2>
             {myTickets.length === 0 && <p className="text-center text-muted-foreground">You are spectating or have no tickets in this game.</p>}
            <ScrollArea className="max-h-[60vh] lg:max-h-none">
              <div className="flex flex-wrap justify-center gap-4">
              {myTickets.map((ticket, index) => (
                <HousieTicket
                  key={index}
                  ticketIndex={index}
                  ticket={ticket}
                  calledNumbers={roomData.calledNumbers}
                  markedNumbers={markedNumbers}
                  onNumberClick={roomData.isGameOver ? undefined : (num, r, c) => handleNumberClick(index, num, r, c)}
                  className="min-w-[280px] sm:min-w-[320px] md:min-w-[360px]"
                />
              ))}
              </div>
            </ScrollArea>
           </div>
        </div>

        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Prize Info</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsPrizeInfoMinimized(!isPrizeInfoMinimized)} aria-label={isPrizeInfoMinimized ? "Expand Prize Info" : "Minimize Prize Info"}>
                    {isPrizeInfoMinimized ? <PlusSquare className="h-5 w-5" /> : <MinusSquare className="h-5 w-5" />}
                </Button>
            </CardHeader>
            {!isPrizeInfoMinimized && (
            <CardContent>
              <p className="text-sm text-muted-foreground">Potential prize money based on current game settings and total tickets.</p>
              <ul className="space-y-1 mt-2 text-sm">
                {prizesForFormat.map(prize => {
                  const percentage = prizeDistributionPercentages[prize as PrizeType] || 0;
                  const prizeAmount = (totalPrizePool * percentage) / 100;
                  return (
                    <li key={prize}>{prize}: ₹{prizeAmount.toFixed(2)} ({percentage}%)</li>
                  );
                })}
              </ul>
            </CardContent>
            )}
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/>Other Players ({otherPlayers.length})</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsOtherPlayersMinimized(!isOtherPlayersMinimized)} aria-label={isOtherPlayersMinimized ? "Expand Other Players" : "Minimize Other Players"}>
                    {isOtherPlayersMinimized ? <PlusSquare className="h-5 w-5" /> : <MinusSquare className="h-5 w-5" />}
                </Button>
            </CardHeader>
            {!isOtherPlayersMinimized && (
            <CardContent>
              <ScrollArea className="h-40">
                <ul className="space-y-1 mt-2 text-sm">
                  {otherPlayers.map((player, index) => (
                    <li key={player.id || index} className="flex justify-between items-center">
                      <span>{player.name}</span>
                      <span className="text-muted-foreground">{player.tickets?.length || 0} ticket{ (player.tickets?.length || 0) === 1 ? '' : 's'}</span>
                    </li>
                  ))}
                   {otherPlayers.length === 0 && <li className="text-muted-foreground">No other players in the room.</li>}
                </ul>
              </ScrollArea>
            </CardContent>
            )}
          </Card>

          {isCurrentUserHost && !roomData.isGameOver && (
            <Button onClick={handleCallNextNumber} variant="outline" className="w-full mt-4" disabled={isCallingNumber || !roomData.isGameStarted}>
              {isCallingNumber && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {roomData.isGameStarted ? "Call Next Number" : "Waiting to Start"}
              {roomData.currentNumber && ` (Last: ${roomData.currentNumber})`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
