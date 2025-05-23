
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useParams, useRouter } from 'next/navigation'; // Added useRouter
import { generateImprovedHousieTicket, checkWinningCondition } from '@/lib/housie';
import HousieTicket from '@/components/game/housie-ticket';
import LiveNumberBoard from '@/components/game/live-number-board';
import CalledNumberDisplay from '@/components/game/called-number-display';
import type { HousieTicketGrid, PrizeType } from '@/types';
import { PRIZE_TYPES } from '@/types'; 
import { announceCalledNumber } from '@/ai/flows/announce-called-number';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Award, Users, XCircle, CheckCircle2, PartyPopper, RotateCcw, LogOut } from 'lucide-react'; // Added PartyPopper, RotateCcw, LogOut
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';


const MOCK_USERNAME = "Player123";
const MOCK_TOTAL_MONEY = 2000;
const MOCK_PLAYER_COUNT = 6;

const AVAILABLE_PRIZES: PrizeType[] = [
  PRIZE_TYPES.JALDI_5,
  PRIZE_TYPES.TOP_LINE,
  PRIZE_TYPES.MIDDLE_LINE,
  PRIZE_TYPES.BOTTOM_LINE,
  PRIZE_TYPES.FULL_HOUSE,
];


export default function GameRoomPage() {
  const params = useParams();
  const router = useRouter(); // Initialize router
  const roomId = params.id as string;
  const { toast } = useToast();

  const [tickets, setTickets] = useState<HousieTicketGrid[]>([]);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [markedNumbers, setMarkedNumbers] = useState<Set<string>>(new Set());
  const [claimedPrizes, setClaimedPrizes] = useState<Record<PrizeType, string | null>>({});
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameMessage, setGameMessage] = useState<string | null>(null);
  const [fullHouseWinTime, setFullHouseWinTime] = useState<Date | null>(null);

  const initializeGame = useCallback(() => {
    setTickets([generateImprovedHousieTicket(), generateImprovedHousieTicket()]);
    const initialClaims: Record<PrizeType, string | null> = {};
    AVAILABLE_PRIZES.forEach(prize => {
      initialClaims[prize] = null;
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
    }, 3000);
    return () => clearInterval(interval);
  }, [callNextNumber, calledNumbers.length, isGameOver]);


  const handleNumberClick = (ticketIndex: number, numberValue: number, rowIndex: number, colIndex: number) => {
    if (isGameOver) return; // Prevent marking if game is over

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
    if (isGameOver || claimedPrizes[prizeType]) {
      toast({ title: "Claim Failed", description: `Prize ${prizeType} already claimed or game over.`, variant: "destructive" });
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
    
    if (winningTicketIndex !== -1) {
      const winnerName = MOCK_USERNAME; // In a real app, get actual player name
      setClaimedPrizes(prev => ({ ...prev, [prizeType]: winnerName }));
      const successMessage = `🔔 ${winnerName} has claimed ${prizeType}! This prize is now closed.`;
      setGameMessage(successMessage);
      toast({ title: "Claim Successful!", description: `${prizeType} claimed by ${winnerName}.`, className: "bg-green-500 text-white" });

      if (prizeType === PRIZE_TYPES.FULL_HOUSE) {
        setIsGameOver(true);
        setFullHouseWinTime(new Date());
        setGameMessage(`🎉 ${winnerName} won Full House! Game Over!`);
        // Toast for Full House is handled by the game over screen more prominently
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
        // For Jaldi 5, any 5 marked and called numbers on the ticket.
        // This helper should return all numbers on the ticket to be checked against marked+called.
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
    const fullHouseWinner = claimedPrizes[PRIZE_TYPES.FULL_HOUSE];
    return (
      <div className="p-2 md:p-4 space-y-6 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold flex items-center justify-center">
              <PartyPopper className="mr-3 h-10 w-10 text-primary" /> Game Over!
            </CardTitle>
            {fullHouseWinner && (
              <p className="text-xl mt-2">
                Congratulations <span className="font-semibold text-accent">{fullHouseWinner}</span> for winning Full House!
                {fullHouseWinTime && (
                  <span className="block text-sm text-muted-foreground">
                    Won at: {fullHouseWinTime.toLocaleTimeString()}
                  </span>
                )}
              </p>
            )}
             {!fullHouseWinner && calledNumbers.length === 90 && (
                <p className="text-xl mt-2 text-muted-foreground">All numbers called. No Full House winner.</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="text-xl font-semibold text-center mb-2">Final Prize Summary</h3>
            <ScrollArea className="h-48 border rounded-md p-3">
              <ul className="space-y-2">
                {AVAILABLE_PRIZES.map(prize => (
                  <li key={prize} className="flex justify-between items-center text-md p-2 bg-secondary/20 rounded-md">
                    <span className="font-medium">{prize}:</span>
                    <span className={cn("font-semibold", claimedPrizes[prize] ? "text-green-600" : "text-muted-foreground")}>
                      {claimedPrizes[prize] || "Not Claimed"}
                    </span>
                  </li>
                ))}
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
        {AVAILABLE_PRIZES.map(prize => (
          <Button
            key={prize}
            onClick={() => handleClaimPrize(prize)}
            disabled={!!claimedPrizes[prize] || isGameOver}
            variant={claimedPrizes[prize] ? "secondary" : "default"}
            className={cn("px-2 py-1 rounded-md text-xs sm:text-sm", 
              !claimedPrizes[prize] && prize.includes("Jaldi") ? "bg-green-500 hover:bg-green-600" :
              !claimedPrizes[prize] && prize.includes("Line") ? "bg-yellow-400 hover:bg-yellow-500 text-black" :
              !claimedPrizes[prize] && prize.includes("Full House") ? "bg-red-500 hover:bg-red-600" : "",
              !!claimedPrizes[prize] ? "cursor-not-allowed opacity-70" : ""
            )}
          >
            {claimedPrizes[prize] ? `${prize} (Claimed by ${claimedPrizes[prize]})` : `Claim ${prize}`}
          </Button>
        ))}
      </div>
      
      {gameMessage && (
        <Alert variant={gameMessage.includes("Bogey") || gameMessage.includes("not valid") ? "destructive" : (gameMessage.includes("claimed") ? "default" : "default")} className={cn(gameMessage.includes("claimed") && !gameMessage.includes("Bogey") ? "bg-green-100 dark:bg-green-900 border-green-500" : "")}>
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
                {AVAILABLE_PRIZES.map(prize => (
                  <li key={prize} className={cn("flex justify-between", claimedPrizes[prize] ? "text-green-600 dark:text-green-400 font-semibold" : "text-muted-foreground")}>
                    <span>{prize}:</span>
                    <span>{claimedPrizes[prize] ? `Claimed by ${claimedPrizes[prize]}` : "Available"}</span>
                  </li>
                ))}
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
                onNumberClick={isGameOver ? undefined : (num, r, c) => handleNumberClick(index, num, r, c)} // Disable click if game over
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
              <p className="text-sm text-muted-foreground">Prize money details will be shown here based on game settings and player count.</p>
              <ul className="space-y-1 mt-2 text-sm">
                <li>Jaldi 5: ₹100</li>
                <li>Top Line: ₹150</li>
                <li>Full House: ₹500</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/>Other Players</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Details about other players' progress or status would appear here.</p>
              <ul className="space-y-1 mt-2 text-sm">
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
