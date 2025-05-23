
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import HousieTicket from '@/components/game/housie-ticket';
import LiveNumberBoard from '@/components/game/live-number-board';
import CalledNumberDisplay from '@/components/game/called-number-display';
import type { HousieTicketGrid, PrizeType, Room } from '@/types';
import { PRIZE_TYPES, type GameSettings } from '@/types';
import { announceCalledNumber } from '@/ai/flows/announce-called-number';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Award, Users, XCircle, CheckCircle2, PartyPopper, RotateCcw, LogOut, MinusSquare, PlusSquare, ListOrdered, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { PRIZE_DEFINITIONS, PRIZE_DISTRIBUTION_PERCENTAGES, DEFAULT_GAME_SETTINGS, NUMBERS_RANGE_MAX } from '@/lib/constants';


export default function GameRoomPage() {
  const routeParams = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = routeParams.id as string;
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();

  const [roomData, setRoomData] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [myTickets, setMyTickets] = useState<HousieTicketGrid[]>([]);
  const [markedNumbers, setMarkedNumbers] = useState<Set<string>>(new Set());
  const [gameMessage, setGameMessage] = useState<string | null>(null);

  const [isPrizesStatusMinimized, setIsPrizesStatusMinimized] = useState(true);
  const [isPrizeInfoMinimized, setIsPrizeInfoMinimized] = useState(true);
  const [isOtherPlayersMinimized, setIsOtherPlayersMinimized] = useState(true);
  const [isCallingNumber, setIsCallingNumber] = useState(false);

  const previousCurrentNumberRef = useRef<number | null>(null);

  const isCurrentUserHost = roomData?.host.id === currentUser?.username;

  const fetchGameDetails = useCallback(async (isInitialLoad = false) => {
    if (!roomId || !currentUser) {
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
        } else {
          setError(errorData.message || `Failed to fetch room details: ${response.statusText}`);
        }
        setRoomData(null);
        if (isInitialLoad) setIsLoading(false);
        return; 
      }
      const data: Room = await response.json();
      setRoomData(data);

      const me = data.players.find(p => p.id === currentUser.username);
      if (me && me.tickets) {
        setMyTickets(me.tickets);
      } else if (isInitialLoad && (!me || !me.tickets || me.tickets.length === 0)) {
        const ticketsParam = searchParams.get('playerTickets');
        const numTickets = ticketsParam ? parseInt(ticketsParam, 10) : 0;
        if (numTickets === 0 && !data.isGameOver && data.isGameStarted) {
            if (!gameMessage?.toLocaleLowerCase().includes("game over")) {
                 setGameMessage("You are spectating. You don't have tickets in this game.");
            }
        }
        setMyTickets([]);
      }

      if (data.isGameOver && !gameMessage?.toLocaleLowerCase().includes("game over")) {
        const fhClaim = data.prizeStatus[PRIZE_TYPES.FULL_HOUSE];
        let gameOverMsg = "🎉 Game Over!";
        if (fhClaim && fhClaim.claimedBy.length > 0) {
          const winnerNames = fhClaim.claimedBy.map(winnerId => data.players.find(p=>p.id === winnerId)?.name || winnerId).join(' & ');
          gameOverMsg = `🎉 ${winnerNames} won Full House! Game Over!`;
           if (fhClaim.timestamp) {
             const claimTimestamp = typeof fhClaim.timestamp === 'string' ? new Date(fhClaim.timestamp) : fhClaim.timestamp;
             gameOverMsg += ` at ${claimTimestamp.toLocaleTimeString()}`;
           }
        } else if (data.calledNumbers.length === NUMBERS_RANGE_MAX ) {
            gameOverMsg = "All numbers called. No Full House winner.";
        }
        setGameMessage(gameOverMsg);
      }

    } catch (err) {
      console.error("Error fetching game details:", err);
      if (isInitialLoad || !roomData) { 
        setError(`Failed to fetch game details: ${(err as Error).message}`);
        setRoomData(null); 
      } else {
        toast({ title: "Game Update Failed", description: "Could not refresh game data.", variant: "destructive", duration: 3000});
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

  useEffect(() => {
    if (!roomId || !currentUser || roomData?.isGameOver || isLoading) return;
    const intervalId = setInterval(() => {
      if (!document.hidden) {
        fetchGameDetails(false);
      }
    }, 3000); 
    return () => clearInterval(intervalId);
  }, [roomId, currentUser, roomData?.isGameOver, isLoading, fetchGameDetails]);

  useEffect(() => {
    if (roomData && roomData.currentNumber !== null && roomData.currentNumber !== previousCurrentNumberRef.current) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(String(roomData.currentNumber));
        window.speechSynthesis.speak(utterance);
        announceCalledNumber({ number: roomData.currentNumber })
          .then(() => console.log(`AI flow 'announceCalledNumber' invoked for: ${roomData.currentNumber}`))
          .catch(err => console.error("Error invoking announceCalledNumber AI flow:", err));
      } else if (typeof window !== 'undefined' && !window.speechSynthesis) {
        console.log("Client-side TTS (SpeechSynthesis) not available in this browser.");
      }
      previousCurrentNumberRef.current = roomData.currentNumber;
    }
  }, [roomData?.currentNumber]);


  const handleCallNextNumber = useCallback(async () => {
    if (isCallingNumber) return; 

    if (!currentUser?.username || !isCurrentUserHost) {
        console.log("User not host or not logged in, cannot call number for this client instance.");
        return;
    }
    
    setIsCallingNumber(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/call-number`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: currentUser.username }) 
      });
      
      const result = await response.json();

      if (!response.ok) {
        if (!gameMessage?.toLocaleLowerCase().includes("game over")) {
            setGameMessage(result.message || "Failed to call number.");
        }
        toast({ title: "Error Calling Number", description: result.message, variant: "destructive"});
      } else {
        setRoomData(result as Room); 
         if (result.message && !gameMessage?.toLocaleLowerCase().includes("game over")) { 
            setGameMessage(result.message);
        }
      }
    } catch (err) {
      console.error("Error calling next number:", err);
      if (!gameMessage?.toLocaleLowerCase().includes("game over")) {
        setGameMessage("Network error calling number.");
      }
      toast({ title: "Network Error", description: "Could not call next number.", variant: "destructive" });
    } finally {
      setIsCallingNumber(false);
    }
  }, [roomId, currentUser?.username, isCurrentUserHost, toast, isCallingNumber]); 

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (isCurrentUserHost && roomData && roomData.isGameStarted && !roomData.isGameOver && !isCallingNumber) {
      intervalId = setInterval(() => {
        handleCallNextNumber();
      }, 4000); // Updated interval to 4 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isCurrentUserHost, roomData, isCallingNumber, handleCallNextNumber]);


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

  const handleClaimPrize = async (prizeType: PrizeType, ticketIndexToClaimOn: number) => {
    if (!roomData || !currentUser || myTickets.length === 0) {
      toast({ title: "Cannot Claim", description: "Room data missing, not logged in, or you have no tickets.", variant: "destructive" });
      return;
    }
    
    if (!gameMessage?.toLocaleLowerCase().includes("game over")) {
        setGameMessage(null);
    }

    try {
      const response = await fetch(`/api/rooms/${roomId}/claim-prize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: currentUser.username, prizeType, ticketIndex: ticketIndexToClaimOn }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (!gameMessage?.toLocaleLowerCase().includes("game over")) {
            setGameMessage(result.message || `Failed to claim ${prizeType}.`);
        }
        toast({ title: `Claim ${prizeType} Invalid!`, description: result.message, variant: "destructive" });
      } else {
        const updatedRoom: Room = result;
        setRoomData(updatedRoom); 

        const claimStatus = updatedRoom.prizeStatus[prizeType];
        let successMsg = `🔔 ${currentUser.username} has claimed ${prizeType}!`; 

        if (claimStatus?.claimedBy.includes(currentUser.username)) {
            const allClaimantsNames = claimStatus.claimedBy.map(id => updatedRoom.players.find(p=>p.id===id)?.name || id);
            if (allClaimantsNames.length > 1) {
                 successMsg = `🔔 ${prizeType} claimed by ${allClaimantsNames.join(' & ')}! (You are one of them!)`;
            } else if (allClaimantsNames.length === 1 && allClaimantsNames[0] !== currentUser.username) {
                successMsg = `🔔 ${prizeType} was already claimed by ${allClaimantsNames.join(' & ')}.`;
            }


            if (prizeType === PRIZE_TYPES.FULL_HOUSE) {
                let autoAwardMsg = "";
                const linePrizes: PrizeType[] = [PRIZE_TYPES.TOP_LINE, PRIZE_TYPES.MIDDLE_LINE, PRIZE_TYPES.BOTTOM_LINE];
                linePrizes.forEach(linePrize => {
                    const lineClaimStatus = updatedRoom.prizeStatus[linePrize];
                    if (lineClaimStatus?.claimedBy.includes(currentUser.username) && 
                        roomData?.prizeStatus[linePrize]?.claimedBy.includes(currentUser.username) === false) { 
                        autoAwardMsg += `\nAlso awarded ${linePrize}.`;
                    }
                });
                if (autoAwardMsg) successMsg += autoAwardMsg;

                const fhFinalClaim = updatedRoom.prizeStatus[PRIZE_TYPES.FULL_HOUSE];
                let finalGameOverMsg = "🎉 Game Over!";
                 if (fhFinalClaim && fhFinalClaim.claimedBy.length > 0) {
                    const winnerNames = fhFinalClaim.claimedBy.map(winnerId => updatedRoom.players.find(p=>p.id === winnerId)?.name || winnerId).join(' & ');
                    finalGameOverMsg = `🎉 ${winnerNames} won Full House! Game Over!`;
                    if (fhFinalClaim.timestamp) {
                        const claimTimestamp = typeof fhFinalClaim.timestamp === 'string' ? new Date(fhFinalClaim.timestamp) : fhFinalClaim.timestamp;
                        finalGameOverMsg += ` at ${claimTimestamp.toLocaleTimeString()}`;
                    }
                }
                setGameMessage(finalGameOverMsg); 

            } else {
                 if (!gameMessage?.toLocaleLowerCase().includes("game over")) {
                    setGameMessage(successMsg);
                 }
            }
        } else if (claimStatus?.claimedBy.length) { 
             successMsg = `🔔 ${prizeType} was claimed by ${claimStatus.claimedBy.map(id => updatedRoom.players.find(p=>p.id===id)?.name || id).join(' & ')}.`;
             if (!gameMessage?.toLocaleLowerCase().includes("game over")) {
                setGameMessage(successMsg);
             }
        } else {
            if (!gameMessage?.toLocaleLowerCase().includes("game over")) {
                setGameMessage(successMsg);
            }
        }
        
        toast({ title: "Claim Submitted!", description: successMsg, className: "bg-green-500 text-white" });
      }
    } catch (err) {
      console.error(`Error claiming ${prizeType}:`, err);
      if (!gameMessage?.toLocaleLowerCase().includes("game over")) {
        setGameMessage(`Network error claiming ${prizeType}.`);
      }
      toast({ title: "Network Error", description: `Could not claim ${prizeType}.`, variant: "destructive" });
    }
  };

  const handlePlayAgain = () => {
    router.push(`/room/${roomId}/lobby`);
    toast({title: "New Game Setup", description: "Returning to lobby."});
  };

  const handleLeaveRoom = () => {
    router.push('/');
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
                  let winnerNames = "";
                  let isSplit = false;
                  if (claimInfo && claimInfo.claimedBy.length > 0) {
                     winnerNames = claimInfo.claimedBy.map(id => roomData.players.find(p=>p.id === id)?.name || id).join(', ');
                     prizeStatusText = `Claimed by ${winnerNames}`;
                     if (claimInfo.claimedBy.length > 1) {
                         isSplit = true;
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
              <Alert variant={gameMessage.includes("Bogey") || gameMessage.includes("not valid") || gameMessage.includes("Failed") || gameMessage.includes("Error") ? "destructive" : (gameMessage.includes("claimed") || gameMessage.includes("won") || gameMessage.toLocaleLowerCase().includes("game over") ? "default" : "default")}
                    className={cn(((gameMessage.includes("claimed") || gameMessage.includes("won") || gameMessage.toLocaleLowerCase().includes("game over"))) && !gameMessage.includes("Bogey") && !gameMessage.includes("not valid") ? "bg-green-100 dark:bg-green-900 border-green-500" : "")}>
                {gameMessage.includes("Bogey") || gameMessage.includes("not valid") || gameMessage.includes("Failed")  || gameMessage.includes("Error") ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                <AlertTitle>{gameMessage.includes("Bogey") || gameMessage.includes("not valid") || gameMessage.includes("Failed")  || gameMessage.includes("Error") ? "Update" : (gameMessage.includes("claimed") || gameMessage.includes("won") || gameMessage.toLocaleLowerCase().includes("game over") ? "Game Update!" : "Game Message")}</AlertTitle>
                <AlertDescription>{gameMessage}</AlertDescription>
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
                    } else  {
                        const claimants = claimInfo.claimedBy.map(id => roomData.players.find(p => p.id === id)?.name || id).join(", ");
                        buttonText = `${prizeType} (Claimed by ${claimants})`;
                    }
                  }

                  const ticketIndexForClaim = 0; 

                  return (
                    <Button
                      key={`${prizeType}-${prizeIdx}`}
                      onClick={() => handleClaimPrize(prizeType, ticketIndexForClaim)}
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

            <h2 className="text-xl font-semibold text-center">Your Tickets ({myTickets.length})</h2>
             {myTickets.length === 0 && !roomData.isGameOver && roomData.isGameStarted && <p className="text-center text-muted-foreground">You are spectating or have no tickets in this game.</p>}
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
                  className="min-w-[280px] sm:min-w-[300px] md:min-w-[320px]"
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

           <Button onClick={handleLeaveRoom} variant="destructive" className="w-full mt-2" size="sm">
                <LogOut className="mr-2 h-4 w-4" /> Leave Game
           </Button>
        </div>
      </div>
    </div>
  );
}

