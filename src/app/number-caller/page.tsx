
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import LiveNumberBoard from '@/components/game/live-number-board';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Speaker, Play, Pause, RotateCcw, Volume2, VolumeX, Zap, Settings2, ArrowLeft } from 'lucide-react';
import { NUMBERS_RANGE_MIN, NUMBERS_RANGE_MAX } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

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
      setCurrentNumber(null); // No current number to show
      toast({ title: "All numbers called!", description: "The game is over. Reset to start a new game." });
      return null; // Indicate no number was called
    }

    const nextNumber = availableNumbers[0]; // Get the first number from the shuffled list
    setAvailableNumbers(prev => prev.slice(1)); // Remove it from available
    setCurrentNumber(nextNumber);
    setCalledNumbers(prev => [...prev, nextNumber].sort((a,b) => a-b)); // Add to called, keep sorted
    speakNumber(nextNumber);
    return nextNumber; // Return the called number
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
      if (availableNumbers.length === 0) {
          setIsAutoCalling(false); // Ensure it stops if somehow auto-call is toggled when no numbers left
          toast({ title: "All numbers called!", description: "Auto-calling stopped." });
          return;
      }
      // If starting auto-call and no number is currently shown, call one immediately.
      if (currentNumber === null) { 
        callNextNumber();
      }
      autoCallIntervalRef.current = setInterval(() => {
        const num = callNextNumber();
        if (num === null) { // All numbers called during an interval
            if(autoCallIntervalRef.current) clearInterval(autoCallIntervalRef.current);
            setIsAutoCalling(false); // Stop auto-calling
        }
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
  }, [isAutoCalling, autoCallSpeed, callNextNumber, availableNumbers.length, currentNumber, toast]);


  return (
    <div className="container mx-auto py-2 space-y-3 md:space-y-4">
      <Card className="shadow-xl bg-gradient-to-br from-primary via-purple-600 to-accent text-primary-foreground">
        <CardHeader className="text-center py-3 md:py-4">
          <div className="flex justify-center mb-1">
            <Speaker className="h-8 w-8 md:h-10 md:w-10" />
          </div>
          <CardTitle className="text-2xl md:text-3xl font-extrabold tracking-tight">Housie Number Caller</CardTitle>
          <CardDescription className="text-primary-foreground/80 text-sm md:text-base">
            Manually or automatically call numbers for your game.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="md:col-span-1 shadow-lg">
          <CardHeader className="pb-2 pt-3 md:pt-4">
            <CardTitle className="text-lg md:text-xl flex items-center"><Settings2 className="mr-2 h-5 w-5 text-primary"/>Caller Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-2 pb-3 md:pb-4">
            <Button 
              onClick={toggleAutoCall} 
              disabled={availableNumbers.length === 0}
              variant="default"
              className="w-full"
              size="default"
            >
              {isAutoCalling ? <Pause className="mr-2 h-4 w-4"/> : <Play className="mr-2 h-4 w-4"/>}
              {isAutoCalling ? 'Stop Auto Call' : 'Start Auto Call'}
            </Button>
            <Button 
              onClick={callNextNumber} 
              disabled={isAutoCalling || availableNumbers.length === 0} 
              className="w-full"
              size="default"
            >
              <Zap className="mr-2 h-4 w-4"/> Next Number
            </Button>
            
            <div className="space-y-1">
              <label htmlFor="speed-select" className="text-xs font-medium text-muted-foreground">Auto-Call Speed (seconds)</label>
              <Select 
                value={String(autoCallSpeed)} 
                onValueChange={(value) => setAutoCallSpeed(Number(value))}
                disabled={isAutoCalling}
              >
                <SelectTrigger id="speed-select" className="h-9">
                  <SelectValue placeholder="Select speed" />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
                    <SelectItem key={s} value={String(s)}>{s} seconds</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-2">
                 <Button onClick={toggleMute} variant="outline" className="flex-1" size="default">
                    {isMuted ? <VolumeX className="mr-2 h-4 w-4"/> : <Volume2 className="mr-2 h-4 w-4"/>}
                    {isMuted ? 'Unmute' : 'Mute'}
                </Button>
                <Button onClick={resetGame} variant="outline" className="flex-1" size="default">
                    <RotateCcw className="mr-2 h-4 w-4"/> Reset
                </Button>
            </div>

            {/* Desktop Back Button */}
            <Button onClick={() => router.back()} variant="secondary" className="w-full hidden md:flex">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-3">
            <Card className="shadow-lg bg-primary text-primary-foreground">
                <CardContent className="p-3 text-center relative">
                    <p className="text-xs md:text-sm uppercase tracking-wider mb-0.5">Last Called Number</p>
                    {currentNumber !== null ? (
                    <div className="flex items-center justify-center">
                        <Volume2 className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 opacity-80" />
                        <p className="text-5xl md:text-7xl font-bold animate-fade-in">{currentNumber}</p>
                    </div>
                    ) : (
                    <p className="text-3xl md:text-5xl font-semibold text-primary-foreground/70">-</p>
                    )}
                </CardContent>
            </Card>
            
            <LiveNumberBoard 
                calledNumbers={calledNumbers} 
                currentNumber={currentNumber}
                isMinimized={isBoardMinimized}
                onToggleMinimize={() => setIsBoardMinimized(!isBoardMinimized)}
            />
            <p className="text-center text-xs text-muted-foreground mt-1">
                {availableNumbers.length} numbers remaining. Total Called: {calledNumbers.length}.
            </p>

            {/* Mobile Back Button */}
            <Button onClick={() => router.back()} variant="secondary" className="w-full flex md:hidden">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
        </div>
      </div>
    </div>
  );
}
