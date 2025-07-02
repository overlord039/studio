"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Speaker, RotateCcw, Zap, Settings2, ArrowLeft } from 'lucide-react';
import { NUMBERS_RANGE_MIN, NUMBERS_RANGE_MAX } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import LiveNumberBoard from '@/components/game/live-number-board';
import CalledNumberDisplay from '@/components/game/called-number-display';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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
  const [autoCallSpeed] = useState(5); // Fixed speed in seconds
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
    setCalledNumbers(prev => [...prev, nextNumber]); // Add to called, keep in call order
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
          <CardContent className="space-y-4 pt-2 pb-3 md:pb-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="auto-call-switch" className="flex flex-col cursor-pointer">
                <span className="font-semibold">Auto-Call</span>
                <span className="text-xs text-muted-foreground">
                  {isAutoCalling ? "System is calling" : "Paused, call manually"}
                </span>
              </Label>
              <Switch
                id="auto-call-switch"
                checked={isAutoCalling}
                onCheckedChange={toggleAutoCall}
                disabled={availableNumbers.length === 0}
                aria-label="Toggle automatic number calling"
              />
            </div>
            
            {/* Desktop Buttons */}
            <div className="hidden pt-2 md:flex md:gap-2">
                <Button onClick={() => router.back()} variant="destructive" className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={resetGame} variant="outline" className="flex-1" size="default">
                    <RotateCcw className="mr-2 h-4 w-4"/> Reset
                </Button>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-3">
            <CalledNumberDisplay
                currentNumber={currentNumber}
                calledNumbers={calledNumbers}
                isMuted={isMuted}
                onToggleMute={toggleMute}
            />

            {!isAutoCalling && (
              <Button 
                onClick={callNextNumber} 
                disabled={availableNumbers.length === 0} 
                className="w-full"
                size="lg"
              >
                <Zap className="mr-2 h-4 w-4"/> Next Number
              </Button>
            )}
            
            <LiveNumberBoard 
                calledNumbers={calledNumbers.slice().sort((a,b) => a - b)}
                currentNumber={currentNumber}
                isMinimized={isBoardMinimized}
                onToggleMinimize={() => setIsBoardMinimized(!isBoardMinimized)}
                remainingCount={availableNumbers.length}
                calledCount={calledNumbers.length}
            />

            {/* Mobile Buttons */}
            <div className="flex w-full gap-2 md:hidden">
                <Button onClick={() => router.back()} variant="destructive" className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={resetGame} variant="outline" className="flex-1" size="default">
                    <RotateCcw className="mr-2 h-4 w-4"/> Reset
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
