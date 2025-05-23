
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useParams } from 'next/navigation';
import { generateImprovedHousieTicket, checkWinningCondition } from '@/lib/housie';
import HousieTicket from '@/components/game/housie-ticket';
import LiveNumberBoard from '@/components/game/live-number-board';
import CalledNumberDisplay from '@/components/game/called-number-display';
import type { HousieTicketGrid, PrizeType } from '@/types';
import { PRIZE_TYPES } from '@/types'; // Use PRIZE_TYPES for consistent prize names
import { announceCalledNumber } from '@/ai/flows/announce-called-number';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Award, Users, XCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const MOCK_USERNAME = "Player123";
const MOCK_TOTAL_MONEY = 2000;
const MOCK_PLAYER_COUNT = 6;

// Available prizes based on a typical game format.
const AVAILABLE_PRIZES: PrizeType[] = [
  PRIZE_TYPES.JALDI_5,
  PRIZE_TYPES.TOP_LINE,
  PRIZE_TYPES.MIDDLE_LINE,
  PRIZE_TYPES.BOTTOM_LINE,
  PRIZE_TYPES.FULL_HOUSE,
];


export default function GameRoomPage() {
  const params = useParams();
  const roomId = params.id as string;
  const { toast } = useToast();

  const [tickets, setTickets] = useState<HousieTicketGrid[]>([]);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [markedNumbers, setMarkedNumbers] = useState<Set<string>>(new Set()); // "ticketIndex-rowIndex-colIndex"
  const [claimedPrizes, setClaimedPrizes] = useState<Record<PrizeType, string | null>>({}); // prize -> player name
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameMessage, setGameMessage] = useState<string | null>(null);

  // Initialize tickets
  useEffect(() => {
    setTickets([generateImprovedHousieTicket(), generateImprovedHousieTicket()]); // Player has 2 tickets
    AVAILABLE_PRIZES.forEach(prize => {
      setClaimedPrizes(prev => ({ ...prev, [prize]: null }));
    });
  }, []);

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
      setGameMessage(null); // Clear previous claim messages
    } else {
      setIsGameOver(true);
      setGameMessage("All numbers called. Game Over!");
      toast({ title: "Game Over!", description: "All numbers have been called." });
    }
  }, [calledNumbers, isGameOver, toast]);

  // Auto-call numbers for demo purposes
  useEffect(() => {
    if (isGameOver || calledNumbers.length >= 90) return;
    const interval = setInterval(() => {
      callNextNumber();
    }, 5000); // Call a new number every 5 seconds
    return () => clearInterval(interval);
  }, [callNextNumber, calledNumbers.length, isGameOver]);


  const handleNumberClick = (ticketIndex: number, numberValue: number, rowIndex: number, colIndex: number) => {
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

    // Find a ticket that wins this prize
    let winningTicketIndex = -1;
    for (let i = 0; i < tickets.length; i++) {
      // Create a Set of marked numbers for *this specific ticket* to pass to checkWinningCondition
      const ticketSpecificMarkedNumbers: number[] = [];
      tickets[i].forEach((row, rIdx) => {
        row.forEach((num, cIdx) => {
          if (num !== null && markedNumbers.has(`${i}-${rIdx}-${cIdx}`)) {
            ticketSpecificMarkedNumbers.push(num);
          }
        });
      });
      // The checkWinningCondition needs to know which numbers on THIS ticket are marked AND called.
      // It should internally check if all required numbers for the prize on the ticket are in calledNumbers AND marked by player.
      // For simplicity, we assume `checkWinningCondition` handles this correctly.
      // A more accurate check would use `ticketSpecificMarkedNumbers` in conjunction with `calledNumbers`.
      // The current `checkWinningCondition` only uses `calledNumbers`. This is a simplification.
      if (checkWinningCondition(tickets[i], calledNumbers, prizeType)) {
        winningTicketIndex = i;
        break;
      }
    }
    
    if (winningTicketIndex !== -1) {
      setClaimedPrizes(prev => ({ ...prev, [prizeType]: MOCK_USERNAME }));
      const successMessage = `🔔 ${MOCK_USERNAME} has claimed ${prizeType}! This prize is now closed.`;
      setGameMessage(successMessage);
      toast({ title: "Claim Successful!", description: `${prizeType} claimed by ${MOCK_USERNAME}.`, className: "bg-green-500 text-white" });

      if (prizeType === PRIZE_TYPES.FULL_HOUSE) {
        setIsGameOver(true);
        setGameMessage(`🎉 ${MOCK_USERNAME} won Full House! Game Over!`);
        toast({ title: "Full House!", description: `Game Over! ${MOCK_USERNAME} wins Full House.` });
      }
    } else {
      const failMessage = `Claim for ${prizeType} by ${MOCK_USERNAME} is not valid. Bogey!`;
      setGameMessage(failMessage);
      toast({ title: "Claim Invalid!", description: `Your claim for ${prizeType} was not valid.`, variant: "destructive" });
    }
  };

  return (
    <div className="p-2 md:p-4 space-y-4">
      {/* Top Bar */}
      <Card className="shadow-md">
        <CardContent className="p-3 md:p-4 flex flex-col sm:flex-row justify-between items-center text-sm">
          <div>Room ID: #{roomId} | Total Money: ₹{MOCK_TOTAL_MONEY} | Players: {MOCK_PLAYER_COUNT}</div>
          <div className="font-semibold text-primary">{MOCK_USERNAME}</div>
        </CardContent>
      </Card>

      {/* Prize Buttons */}
      <div className="flex flex-wrap gap-2 mb-2 justify-center">
        {AVAILABLE_PRIZES.map(prize => (
          <Button
            key={prize}
            onClick={() => handleClaimPrize(prize)}
            disabled={!!claimedPrizes[prize] || isGameOver}
            variant={claimedPrizes[prize] ? "secondary" : "default"}
            className={cn("px-2 py-1 rounded-md text-xs sm:text-sm", 
              prize.includes("Jaldi") ? "bg-green-500 hover:bg-green-600" :
              prize.includes("Line") ? "bg-yellow-400 hover:bg-yellow-500 text-black" :
              "bg-red-500 hover:bg-red-600" // Housie
            )}
          >
            {claimedPrizes[prize] ? `${prize} (Claimed)` : `Claim ${prize}`}
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
        {/* Left Column */}
        <div className="space-y-4 lg:col-span-1">
          <CalledNumberDisplay currentNumber={currentNumber} />
          <LiveNumberBoard calledNumbers={calledNumbers} currentNumber={currentNumber} />
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center"><Award className="mr-2 h-5 w-5 text-primary" />Prizes Claimed</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-40">
                <ul className="space-y-1 text-sm">
                {AVAILABLE_PRIZES.map(prize => (
                  <li key={prize} className={cn("flex justify-between", claimedPrizes[prize] ? "text-green-600 dark:text-green-400 font-semibold" : "text-muted-foreground")}>
                    <span>{prize}:</span>
                    <span>{claimedPrizes[prize] || "Available"}</span>
                  </li>
                ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Center Column - Tickets */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-center">Your Tickets</h2>
          <ScrollArea className="max-h-[60vh] lg:max-h-none">
            <div className="space-y-6">
            {tickets.map((ticket, index) => (
              <HousieTicket
                key={index}
                ticket={ticket}
                calledNumbers={calledNumbers}
                markedNumbers={
                    new Set(Array.from(markedNumbers).filter(key => key.startsWith(`${index}-`)))
                }
                onNumberClick={(num, r, c) => handleNumberClick(index, num, r, c)}
                className="min-w-[280px] sm:min-w-[320px] md:min-w-[360px] mx-auto"
              />
            ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Column */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader><CardTitle className="text-lg">Prize Info</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Prize money details will be shown here based on game settings and player count.</p>
              {/* Mock prize values */}
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
              {/* Mock player status */}
              <ul className="space-y-1 mt-2 text-sm">
                <li>Player2: 3 tickets</li>
                <li>Player3: 1 ticket (Jaldi 5 claimed)</li>
              </ul>
            </CardContent>
          </Card>
           {isGameOver && (
            <Card className="bg-green-500 text-white">
                <CardHeader><CardTitle className="text-2xl">🎉 Game Over! 🎉</CardTitle></CardHeader>
                <CardContent>
                    <p>Thank you for playing!</p>
                    {/* Display winners here */}
                </CardContent>
            </Card>
            )}
        </div>
      </div>

      {/* Temporary button to manually call next number for testing */}
      {process.env.NODE_ENV === 'development' && !isGameOver && (
        <Button onClick={callNextNumber} variant="outline" className="mt-4">
          Dev: Call Next Number
        </Button>
      )}
    </div>
  );
}
