
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import LiveNumberBoard from '@/components/game/live-number-board';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Speaker, Play, Pause, RotateCcw, Volume2, VolumeX, Zap, Settings2 } from 'lucide-react';
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
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [availableNumbers, setAvailableNumbers] = useState<number[]>(shuffleArray(ALL_NUMBERS));
  const [isAutoCalling, setIsAutoCalling] = useState(false);
  const [autoCallSpeed, setAutoCallSpeed] = useState(5); // Default speed in seconds
  const [isMuted, setIsMuted] = useState(false);
  const [isBoardMinimized, setIsBoardMinimized] = useState(true);
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
      setIsAutoCalling(false);
      setCurrentNumber(null);
      toast({ title: "All numbers called!", description: "The game is over. Reset to start a new game." });
      return null;
    }

    const nextNumber = availableNumbers[0];
    setAvailableNumbers(prev => prev.slice(1));
    setCurrentNumber(nextNumber);
    setCalledNumbers(prev => [...prev, nextNumber].sort((a,b) => a-b));
    speakNumber(nextNumber);
    return nextNumber;
  }, [availableNumbers, speakNumber, toast]);

  const resetGame = () => {
    if (autoCallIntervalRef.current) {
      clearInterval(autoCallIntervalRef.current);
    }
    setIsAutoCalling(false);
    setCurrentNumber(null);
    setCalledNumbers([]);
    setAvailableNumbers(shuffleArray(ALL_NUMBERS));
    setIsBoardMinimized(true);
    toast({ title: "Game Reset", description: "Ready to call numbers again!"});
  };

  const toggleAutoCall = () => {
    setIsAutoCalling(prev => !prev);
  };
  
  const toggleMute = () => setIsMuted(prev => !prev);

  useEffect(() => {
    if (isAutoCalling) {
      if (availableNumbers.length === 0) {
          setIsAutoCalling(false); 
          toast({ title: "All numbers called!", description: "Auto-calling stopped." });
          return;
      }
      if (currentNumber === null) {
        callNextNumber();
      }
      autoCallIntervalRef.current = setInterval(() => {
        const num = callNextNumber();
        if (num === null) { 
            if(autoCallIntervalRef.current) clearInterval(autoCallIntervalRef.current);
            setIsAutoCalling(false);
        }
      }, autoCallSpeed * 1000);
    } else {
      if (autoCallIntervalRef.current) {
        clearInterval(autoCallIntervalRef.current);
      }
    }
    return () => {
      if (autoCallIntervalRef.current) {
        clearInterval(autoCallIntervalRef.current);
      }
    };
  }, [isAutoCalling, autoCallSpeed, callNextNumber, availableNumbers.length, currentNumber, toast]);

  return (
    <div className="container mx-auto py-2 space-y-4 md:space-y-6"> {/* Reduced py and space-y */}
      <Card className="shadow-xl bg-gradient-to-br from-primary via-purple-600 to-accent text-primary-foreground">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-1"> {/* Reduced mb */}
            <Speaker className="h-10 w-10 md:h-12 md:w-12" /> {/* Slightly smaller base icon */}
          </div>
          <CardTitle className="text-3xl md:text-4xl font-extrabold tracking-tight">Housie Number Caller</CardTitle> {/* Responsive title */}
          <CardDescription className="text-primary-foreground/80 text-base md:text-lg"> {/* Responsive description */}
            Manually or automatically call numbers for your game.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"> {/* Reduced gap */}
        {/* Controls Section */}
        <Card className="md:col-span-1 shadow-lg">
          <CardHeader className="pb-2"> {/* Reduced pb for tighter header */}
            <CardTitle className="text-xl md:text-2xl flex items-center"><Settings2 className="mr-2 h-5 w-5 md:h-6 md:w-6 text-primary"/>Caller Controls</CardTitle> {/* Responsive title */}
          </CardHeader>
          <CardContent className="space-y-3 pt-4"> {/* Reduced space-y, added pt to compensate CardHeader pb removal */}
            <Button 
              onClick={callNextNumber} 
              disabled={isAutoCalling || availableNumbers.length === 0} 
              className="w-full"
              size="default" // Changed size to default
            >
              <Zap className="mr-2 h-5 w-5"/> Next Number
            </Button>
            <Button 
              onClick={toggleAutoCall} 
              disabled={availableNumbers.length === 0}
              variant={isAutoCalling ? "destructive" : "default"}
              className="w-full"
              size="default" // Changed size to default
            >
              {isAutoCalling ? <Pause className="mr-2 h-5 w-5"/> : <Play className="mr-2 h-5 w-5"/>}
              {isAutoCalling ? 'Stop Auto Call' : 'Start Auto Call'}
            </Button>
            
            <div className="space-y-1"> {/* Reduced space-y */}
              <label htmlFor="speed-select" className="text-xs md:text-sm font-medium text-muted-foreground">Auto-Call Speed (seconds)</label> {/* Responsive label */}
              <Select 
                value={String(autoCallSpeed)} 
                onValueChange={(value) => setAutoCallSpeed(Number(value))}
                disabled={isAutoCalling}
              >
                <SelectTrigger id="speed-select">
                  <SelectValue placeholder="Select speed" />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
                    <SelectItem key={s} value={String(s)}>{s} seconds</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-2 md:space-x-3"> {/* Slightly reduced space-x */}
                 <Button onClick={toggleMute} variant="outline" className="flex-1" size="default">
                    {isMuted ? <VolumeX className="mr-2 h-5 w-5"/> : <Volume2 className="mr-2 h-5 w-5"/>}
                    {isMuted ? 'Unmute' : 'Mute'}
                </Button>
                <Button onClick={resetGame} variant="outline" className="flex-1" size="default">
                    <RotateCcw className="mr-2 h-5 w-5"/> Reset
                </Button>
            </div>
          </CardContent>
        </Card>

        {/* Display and Board Section */}
        <div className="md:col-span-2 space-y-4"> {/* Reduced space-y */}
            <Card className="shadow-lg bg-primary text-primary-foreground">
                <CardContent className="p-4 text-center relative"> {/* Reduced p */}
                    <p className="text-sm md:text-base uppercase tracking-wider mb-1">Last Called Number</p> {/* Responsive text, reduced mb */}
                    {currentNumber !== null ? (
                    <div className="flex items-center justify-center">
                        <Volume2 className="h-5 w-5 md:h-6 md:w-6 mr-2 opacity-80" /> {/* Responsive icon */}
                        <p className="text-6xl md:text-8xl font-bold animate-fade-in">{currentNumber}</p>
                    </div>
                    ) : (
                    <p className="text-4xl md:text-6xl font-semibold text-primary-foreground/70">-</p>
                    )}
                </CardContent>
            </Card>
            
            <LiveNumberBoard 
                calledNumbers={calledNumbers} 
                currentNumber={currentNumber}
                isMinimized={isBoardMinimized}
                onToggleMinimize={() => setIsBoardMinimized(!isBoardMinimized)}
            />
            <p className="text-center text-xs md:text-sm text-muted-foreground mt-2"> {/* Added mt, responsive text */}
                {availableNumbers.length} numbers remaining. Total Called: {calledNumbers.length}.
            </p>
        </div>
      </div>
    </div>
  );
}
