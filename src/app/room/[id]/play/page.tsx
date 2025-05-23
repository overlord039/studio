
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useParams, useRouter } from 'next/navigation';
import { generateImprovedHousieTicket, checkWinningCondition } from '@/lib/housie';
import HousieTicket from '@/components/game/housie-ticket';
import LiveNumberBoard from '@/components/game/live-number-board';
import CalledNumberDisplay from '@/components/game/called-number-display';
import type { HousieTicketGrid, PrizeType } from '@/types';
import { PRIZE_TYPES } from '@/types';
import { announceCalledNumber } from '@/ai/flows/announce-called-number';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Award, Users, XCircle, CheckCircle2, PartyPopper, RotateCcw, LogOut } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';


const MOCK_USERNAME = "Player123"; // Represents the current user
const MOCK_TOTAL_MONEY = 2000; // Example total prize pool
const MOCK_PLAYER_COUNT = 6; // Example player count

const AVAILABLE_PRIZES: PrizeType[] = [
  PRIZE_TYPES.JALDI_5,
  PRIZE_TYPES.TOP_LINE,
  PRIZE_TYPES.MIDDLE_LINE,
  PRIZE_TYPES.BOTTOM_LINE,
  PRIZE_TYPES.FULL_HOUSE,
];


export default function GameRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  const { toast } = useToast();

  const [tickets, setTickets] = useState<HousieTicketGrid[]>([]);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [markedNumbers, setMarkedNumbers] = useState<Set<string>>(new Set());
  const [claimedPrizes, setClaimedPrizes] = useState<Record<PrizeType, string[] | null>>({});
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameMessage, setGameMessage] = useState<string | null>(null);
  const [fullHouseWinTime, setFullHouseWinTime] = useState<Date | null>(null);

  const initializeGame = useCallback(() => {
    setTickets([generateImprovedHousieTicket(), generateImprovedHousieTicket()]); // User gets 2 tickets
    const initialClaims: Record<PrizeType, string[] | null> = {};
    AVAILABLE_PRIZES.forEach(prize => {
      initialClaims[prize] = null; // Initialize with null, meaning no one has claimed yet
    });
    setClaimedPrizes(initialClaims);
    setCalledNumbers([]);
    setCurrentNumber(null);
    setMarkedNumbers(new Set());
    setIsGameOver(false);
    setGameMessage(null);
    setFullHouseWinTime(null);
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const callNextNumber = useCallback(() => {
    if (isGameOver) return;

    let newNumber;
    do {
      newNumber = Math.floor(Math.random() * 90) + 1;
    } while (calledNumbers.includes(newNumber) && calledNumbers.length < 90);

    if (calledNumbers.length < 90) {
      setCurrentNumber(newNumber);
      setCalledNumbers(prev => [...prev, newNumber]);
      announceCalledNumber({ number: newNumber })
        .then(() => console.log(`Announced: ${newNumber}`))
        .catch(err => console.error("Error announcing number:", err));
      setGameMessage(null);
    } else {
      setIsGameOver(true);
      setGameMessage("All numbers called. Game Over!");
      toast({ title: "Game Over!", description: "All numbers have been called." });
    }
  }, [calledNumbers, isGameOver, toast]);

  useEffect(() => {
    if (isGameOver || calledNumbers.length >= 90) return;
    const interval = setInterval(() => {
      callNextNumber();
    }, 3000); // 3-second interval
    return () => clearInterval(interval);
  }, [callNextNumber, calledNumbers.length, isGameOver]);


  const handleNumberClick = (ticketIndex: number, numberValue: number, rowIndex: number, colIndex: number) => {
    if (isGameOver) return;

    if (!calledNumbers.includes(numberValue)) {
      toast({
        title: "Invalid Mark",
        description: `Number ${numberValue} has not been called yet.`,
        variant: "destructive",
      });
      return;
    }
    const key = `${ticketIndex}-${rowIndex}-${colIndex}`;
    setMarkedNumbers(prev => {
      const newMarked = new Set(prev);
      if (newMarked.has(key)) {
        newMarked.delete(key);
      } else {
        newMarked.add(key);
      }
      return newMarked;
    });
  };

  const handleClaimPrize = (prizeType: PrizeType) => {
    if (isGameOver) {
      toast({ title: "Game Over", description: `Game is over. No more claims allowed.`, variant: "destructive" });
      return;
    }

    const currentWinnersForPrize = claimedPrizes[prizeType] || [];
    if (currentWinnersForPrize.includes(MOCK_USERNAME)) {
      toast({ title: "Already Claimed", description: `You have already claimed ${prizeType}.` });
      return;
    }
    
    // For Full House, if anyone has claimed it, the game is over.
    if (prizeType === PRIZE_TYPES.FULL_HOUSE && (claimedPrizes[PRIZE_TYPES.FULL_HOUSE]?.length || 0) > 0) {
        toast({ title: "Claim Failed", description: `Full House already claimed. Game is over.`, variant: "destructive" });
        return;
    }


    let winningTicketIndex = -1;
    for (let i = 0; i < tickets.length; i++) {
      const numbersRequiredForPrizeOnThisTicket = getNumbersForPrizePattern(tickets[i], prizeType);
      const allRequiredNumbersMarkedByPlayer = numbersRequiredForPrizeOnThisTicket.every(num => {
        let rFound = -1, cFound = -1;
        outer: for(let r=0; r<tickets[i].length; r++) {
          for(let c=0; c<tickets[i][r].length; c++) {
            if(tickets[i][r][c] === num) {
              rFound=r; cFound=c;
              break outer;
            }
          }
        }
        return rFound !== -1 && markedNumbers.has(`${i}-${rFound}-${cFound}`);
      });
      const allRequiredNumbersCalled = numbersRequiredForPrizeOnThisTicket.every(num => calledNumbers.includes(num));

      if (allRequiredNumbersMarkedByPlayer && allRequiredNumbersCalled && checkWinningCondition(tickets[i], calledNumbers, prizeType)) {
        winningTicketIndex = i;
        break;
      }
    }
    
    if (winningTicketIndex !== -1) { // Player MOCK_USERNAME has a valid claim
      const newWinnerList = [...currentWinnersForPrize, MOCK_USERNAME];
      setClaimedPrizes(prev => ({ ...prev, [prizeType]: newWinnerList }));
      
      const successMessage = `🔔 ${MOCK_USERNAME} has claimed ${prizeType}!`;
      setGameMessage(successMessage);
      toast({ title: "Claim Successful!", description: `${prizeType} claimed by ${MOCK_USERNAME}.`, className: "bg-green-500 text-white" });

      if (prizeType === PRIZE_TYPES.FULL_HOUSE) {
        setIsGameOver(true);
        setFullHouseWinTime(new Date());
        setGameMessage(`🎉 ${newWinnerList.join(' & ')} won Full House! Game Over!`);
      }
    } else {
      const failMessage = `Claim for ${prizeType} by ${MOCK_USERNAME} is not valid. Bogey!`;
      setGameMessage(failMessage);
      toast({ title: "Claim Invalid!", description: `Your claim for ${prizeType} was not valid.`, variant: "destructive" });
    }
  };
  
  function getNumbersForPrizePattern(ticket: HousieTicketGrid, prize: PrizeType): number[] {
    const getRowNumbers = (rowIndex: number) => ticket[rowIndex].filter(n => n !== null) as number[];
    switch(prize) {
      case PRIZE_TYPES.JALDI_5: 
      case PRIZE_TYPES.FIRST_JALDI_5:
      case PRIZE_TYPES.SECOND_JALDI_5:
        return ticket.flat().filter(n => n !== null) as number[];
      case PRIZE_TYPES.TOP_LINE: return getRowNumbers(0);
      case PRIZE_TYPES.MIDDLE_LINE: return getRowNumbers(1);
      case PRIZE_TYPES.BOTTOM_LINE: return getRowNumbers(2);
      case PRIZE_TYPES.FULL_HOUSE: 
      case PRIZE_TYPES.FIRST_FULL_HOUSE:
      case PRIZE_TYPES.SECOND_FULL_HOUSE:
        return ticket.flat().filter(n => n !== null) as number[];
      default: return [];
    }
  }

  const handlePlayAgain = () => {
    initializeGame();
  };

  const handleLeaveRoom = () => {
    router.push('/');
  };

  if (isGameOver) {
    const fullHouseWinners = claimedPrizes[PRIZE_TYPES.FULL_HOUSE] || [];
    return (
      <div className="p-2 md:p-4 space-y-6 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold flex items-center justify-center">
              <PartyPopper className="mr-3 h-10 w-10 text-primary" /> Game Over!
            </CardTitle>
            {fullHouseWinners.length > 0 && (
              <p className="text-xl mt-2">
                Congratulations <span className="font-semibold text-accent">{fullHouseWinners.join(' & ')}</span> for winning Full House!
                {fullHouseWinTime && (
                  <span className="block text-sm text-muted-foreground">
                    Won at: {fullHouseWinTime.toLocaleTimeString()}
                  </span>
                )}
              </p>
            )}
             {fullHouseWinners.length === 0 && calledNumbers.length === 90 && (
                <p className="text-xl mt-2 text-muted-foreground">All numbers called. No Full House winner.</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="text-xl font-semibold text-center mb-2">Final Prize Summary</h3>
            <ScrollArea className="h-48 border rounded-md p-3">
              <ul className="space-y-2">
                {AVAILABLE_PRIZES.map(prize => {
                  const winners = claimedPrizes[prize] || [];
                  const prizeStatus = winners.length > 0 ? `Claimed by ${winners.join(', ')}` : "Not Claimed";
                  return (
                    <li key={prize} className="flex justify-between items-center text-md p-2 bg-secondary/20 rounded-md">
                      <span className="font-medium">{prize}:</span>
                      <span className={cn("font-semibold", winners.length > 0 ? "text-green-600" : "text-muted-foreground")}>
                        {prizeStatus}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Button onClick={handlePlayAgain} className="w-full" size="lg">
                <RotateCcw className="mr-2 h-5 w-5" /> Play Again
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
          <div>Room ID: #{roomId} | Total Money: ₹{MOCK_TOTAL_MONEY} | Players: {MOCK_PLAYER_COUNT}</div>
          <div className="font-semibold text-primary">{MOCK_USERNAME}</div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 mb-2 justify-center">
        {AVAILABLE_PRIZES.map(prize => {
          const winnersOfThisPrize = claimedPrizes[prize] || [];
          const hasPlayerClaimedThis = winnersOfThisPrize.includes(MOCK_USERNAME);
          let buttonText = `Claim ${prize}`;

          if (winnersOfThisPrize.length > 0) {
            if (hasPlayerClaimedThis) {
                buttonText = `You Claimed ${prize}`;
            } else if (winnersOfThisPrize.length === 1) {
                buttonText = `${prize} (Claimed by ${winnersOfThisPrize[0]})`;
            } else {
                buttonText = `${prize} (Claimed by ${winnersOfThisPrize.length} players)`;
            }
          }
          
          const isFullHouseClaimedByAnyone = prize === PRIZE_TYPES.FULL_HOUSE && winnersOfThisPrize.length > 0;

          return (
            <Button
              key={prize}
              onClick={() => handleClaimPrize(prize)}
              disabled={isGameOver || hasPlayerClaimedThis || isFullHouseClaimedByAnyone}
              variant={winnersOfThisPrize.length > 0 ? "secondary" : "default"}
              className={cn("px-2 py-1 rounded-md text-xs sm:text-sm", 
                !hasPlayerClaimedThis && winnersOfThisPrize.length === 0 && prize.includes("Jaldi") ? "bg-green-500 hover:bg-green-600" :
                !hasPlayerClaimedThis && winnersOfThisPrize.length === 0 && prize.includes("Line") ? "bg-yellow-400 hover:bg-yellow-500 text-black" :
                !hasPlayerClaimedThis && winnersOfThisPrize.length === 0 && prize.includes("Full House") ? "bg-red-500 hover:bg-red-600" : "",
                (hasPlayerClaimedThis || (winnersOfThisPrize.length > 0 && prize !== PRIZE_TYPES.FULL_HOUSE && !hasPlayerClaimedThis)) ? "opacity-70" : "",
                (isGameOver || isFullHouseClaimedByAnyone) ? "cursor-not-allowed opacity-50" : ""
              )}
            >
              {buttonText}
            </Button>
          );
        })}
      </div>
      
      {gameMessage && (
        <Alert variant={gameMessage.includes("Bogey") || gameMessage.includes("not valid") ? "destructive" : (gameMessage.includes("claimed") ? "default" : "default")} 
               className={cn(gameMessage.includes("claimed") && !gameMessage.includes("Bogey") && !gameMessage.includes("not valid") ? "bg-green-100 dark:bg-green-900 border-green-500" : "")}>
          {gameMessage.includes("Bogey") || gameMessage.includes("not valid") ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <AlertTitle>{gameMessage.includes("Bogey") || gameMessage.includes("not valid") ? "Claim Update" : (gameMessage.includes("claimed") ? "Prize Claimed!" : "Game Message")}</AlertTitle>
          <AlertDescription>{gameMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="space-y-4 lg:col-span-1">
          <CalledNumberDisplay currentNumber={currentNumber} />
          <LiveNumberBoard calledNumbers={calledNumbers} currentNumber={currentNumber} />
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center"><Award className="mr-2 h-5 w-5 text-primary" />Prizes Status</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-40">
                <ul className="space-y-1 text-sm">
                {AVAILABLE_PRIZES.map(prize => {
                  const winners = claimedPrizes[prize] || [];
                  let statusText = "Available";
                  if (winners.length > 0) {
                    statusText = `Claimed by ${winners.join(', ')}`;
                  }
                  return (
                  <li key={prize} className={cn("flex justify-between", winners.length > 0 ? "text-green-600 dark:text-green-400 font-semibold" : "text-muted-foreground")}>
                    <span>{prize}:</span>
                    <span>{statusText}</span>
                  </li>
                  );
                })}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-center">Your Tickets</h2>
          <ScrollArea className="max-h-[60vh] lg:max-h-none">
            <div className="space-y-6">
            {tickets.map((ticket, index) => (
              <HousieTicket
                key={index}
                ticketIndex={index}
                ticket={ticket}
                calledNumbers={calledNumbers}
                markedNumbers={markedNumbers}
                onNumberClick={isGameOver ? undefined : (num, r, c) => handleNumberClick(index, num, r, c)}
                className="min-w-[280px] sm:min-w-[320px] md:min-w-[360px] mx-auto"
              />
            ))}
            </div>
          </ScrollArea>
        </div>

        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader><CardTitle className="text-lg">Prize Info</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Prize money details will be shown here based on game settings and player count. (Splitting logic to be displayed here)</p>
              <ul className="space-y-1 mt-2 text-sm">
                {/* Example: This would be dynamic based on game setup & claimedPrizes */}
                <li>Jaldi 5: ₹100 (Split among {claimedPrizes[PRIZE_TYPES.JALDI_5]?.length || 0} winners)</li>
                <li>Top Line: ₹150 (Split among {claimedPrizes[PRIZE_TYPES.TOP_LINE]?.length || 0} winners)</li>
                <li>Full House: ₹500 (Split among {claimedPrizes[PRIZE_TYPES.FULL_HOUSE]?.length || 0} winners)</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/>Other Players</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Details about other players' progress or status would appear here.</p>
              <ul className="space-y-1 mt-2 text-sm">
                {/* This is mock data and would need real-time updates in a full app */}
                <li>Player2: 3 tickets</li>
                <li>Player3: 1 ticket (Jaldi 5 claimed)</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <Button onClick={callNextNumber} variant="outline" className="mt-4" disabled={isGameOver}>
          Dev: Call Next Number
        </Button>
      )}
    </div>
  );
}

