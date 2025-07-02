"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Speaker, Volume2, VolumeX, RotateCcw, Zap, Settings2, ArrowLeft } from 'lucide-react';
import { NUMBERS_RANGE_MIN, NUMBERS_RANGE_MAX } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import LiveNumberBoard from '@/components/game/live-number-board';

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const ALL_NUMBERS = Array.from({ length: NUMBERS_RANGE_MAX - NUMBERS_RANGE_MIN + 1 }, (_, i) => NUMBERS_RANGE_MIN + i);

export default function NumberCallerPage() {
  const router = useRouter();
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [availableNumbers, setAvailableNumbers] = useState<number[]>(shuffleArray(ALL_NUMBERS));
  const [isAutoCalling, setIsAutoCalling] = useState(false);
  const [autoCallSpeed, setAutoCallSpeed] = useState(5); // Default speed in seconds
  const [isMuted, setIsMuted] = useState(false);
  const [isBoardMinimized, setIsBoardMinimized] = useState(true); // Board is minimized by default
  const autoCallIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const speakNumber = useCallback((num: number) => {
    if (!isMuted && typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(String(num));
      window.speechSynthesis.speak(utterance);
    }
  }, [isMuted]);

  const callNextNumber = useCallback(() => {
    if (availableNumbers.length === 0) {
      setIsAutoCalling(false); // Stop auto-calling if all numbers are out
      toast({ title: "All numbers called!", description: "The game is over. Reset to start a new game." });
      return;
    }

    const nextNumber = availableNumbers[0]; // Get the first number from the shuffled list
    setAvailableNumbers(prev => prev.slice(1)); // Remove it from available
    setCurrentNumber(nextNumber);
    setCalledNumbers(prev => [...prev, nextNumber].sort((a, b) => a - b)); // Keep called numbers sorted for the board
    speakNumber(nextNumber);
  }, [availableNumbers, speakNumber, toast]);

  const resetGame = () => {
    if (autoCallIntervalRef.current) {
      clearInterval(autoCallIntervalRef.current);
    }
    setIsAutoCalling(false);
    setCurrentNumber(null);
    setCalledNumbers([]);
    setAvailableNumbers(shuffleArray(ALL_NUMBERS));
    setIsBoardMinimized(true); // Ensure board is minimized on reset
    toast({ title: "Game Reset", description: "Ready to call numbers again!"});
  };

  const toggleAutoCall = () => {
    setIsAutoCalling(prev => !prev);
  };
  
  const toggleMute = () => setIsMuted(prev => !prev);

  useEffect(() => {
    if (isAutoCalling) {
      // If starting auto-call and no number is currently shown, call one immediately.
      if (currentNumber === null) {
        callNextNumber();
      }
      autoCallIntervalRef.current = setInterval(() => {
        callNextNumber();
      }, autoCallSpeed * 1000);
    } else {
      if (autoCallIntervalRef.current) {
        clearInterval(autoCallIntervalRef.current);
      }
    }
    // Cleanup function to clear interval when component unmounts or dependencies change
    return () => {
      if (autoCallIntervalRef.current) {
        clearInterval(autoCallIntervalRef.current);
      }
    };
  }, [isAutoCalling, autoCallSpeed, callNextNumber, currentNumber]);

  return (
    <div className="container mx-auto py-2 space-y-3 md:space-y-4">
      <Card className="shadow-xl bg-gradient-to-br from-primary via-purple-600 to-accent text-primary-foreground">
        <CardHeader className="flex flex-row items-center gap-4 py-3 md:py-4 px-4 md:px-6">
          <div className="flex-shrink-0">
            <Speaker className="h-8 w-8 md:h-10 md:w-10" />
          </div>
          <div className="flex-grow">
            <CardTitle className="text-2xl md:text-3xl font-extrabold tracking-tight">Housie Number Caller</CardTitle>
            <CardDescription className="text-primary-foreground/80 text-sm md:text-base">
              Manually or automatically call numbers for your game.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="md:col-span-1 shadow-lg">
          <CardHeader className="pb-2 pt-3 md:pt-4">
            <CardTitle className="text-lg md:text-xl flex items-center"><Settings2 className="mr-2 h-5 w-5 text-primary"/>Caller Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-2 pb-3 md:pb-4">
            <Button onClick={toggleAutoCall} className="w-full">
                {isAutoCalling ? "Stop Auto Call" : "Start Auto Call"}
            </Button>
            {!isAutoCalling && (
              <Button onClick={callNextNumber} disabled={availableNumbers.length === 0} className="w-full">
                Next Number
              </Button>
            )}
             <div className="text-center pt-2">
              <label htmlFor="speed-select" className="text-sm font-medium text-muted-foreground">Auto-Call Speed (seconds)</label>
              <select 
                id="speed-select"
                value={autoCallSpeed} 
                onChange={e => setAutoCallSpeed(Number(e.target.value))}
                className="w-full mt-1 p-2 border rounded-md bg-card text-card-foreground"
              >
                <option value={3}>3 seconds</option>
                <option value={5}>5 seconds</option>
                <option value={7}>7 seconds</option>
                <option value={10}>10 seconds</option>
              </select>
            </div>
            <div className="flex w-full gap-2 pt-2">
                <Button onClick={toggleMute} variant="outline" className="flex-1" size="default">
                    {isMuted ? 'Unmute' : 'Mute'}
                </Button>
                 <Button onClick={resetGame} variant="outline" className="flex-1" size="default">
                    Reset
                </Button>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-3">
          <Card className="shadow-lg">
              <CardContent className="p-3 text-center relative">
                  <p className="text-sm text-muted-foreground mb-1">Last Called Number</p>
                   <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={toggleMute} 
                      className="absolute top-2 right-2 text-muted-foreground hover:bg-card/80"
                      aria-label={isMuted ? "Unmute voice" : "Mute voice"}
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                  {currentNumber !== null ? (
                      <p className="text-7xl font-bold">{currentNumber}</p>
                  ) : (
                      <p className="text-5xl font-semibold text-muted-foreground">-</p>
                  )}
              </CardContent>
          </Card>
          
          <LiveNumberBoard 
            calledNumbers={calledNumbers}
            currentNumber={currentNumber}
            isMinimized={isBoardMinimized}
            onToggleMinimize={() => setIsBoardMinimized(!isBoardMinimized)}
          />

            <Button onClick={() => router.back()} variant="secondary" className="flex-1">
                Back
            </Button>
        </div>
      </div>
    </div>
  );
}
