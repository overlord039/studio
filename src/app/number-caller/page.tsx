
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Speaker, VolumeX, RotateCcw, Zap, Settings2, Play, Pause, Home } from 'lucide-react';
import { NUMBERS_RANGE_MIN, NUMBERS_RANGE_MAX } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import LiveNumberBoard from '@/components/game/live-number-board';
import CalledNumberDisplay from '@/components/game/called-number-display';
import { useSound } from '@/contexts/sound-context';
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
  const autoCallSpeed = 5; // Fixed speed in seconds
  const { isSfxMuted, toggleSfxMute } = useSound();
  const [isBoardMinimized, setIsBoardMinimized] = useState(true); // Board is minimized by default
  const autoCallIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const speakNumber = useCallback((num: number) => {
    if (!isSfxMuted && typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(String(num));
      window.speechSynthesis.speak(utterance);
    }
  }, [isSfxMuted]);

  const callNextNumber = useCallback(() => {
    if (availableNumbers.length === 0) {
      setIsAutoCalling(false); // Stop auto-calling if all numbers are out
      toast({ title: "All numbers called!", description: "The game is over. Reset to start a new game." });
      return;
    }

    const nextNumber = availableNumbers[0]; // Get the first number from the shuffled list
    setAvailableNumbers(prev => prev.slice(1)); // Remove it from available
    setCurrentNumber(nextNumber);
    setCalledNumbers(prev => [nextNumber, ...prev]);
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

  const handleToggleAutoCall = () => {
    setIsAutoCalling(prev => !prev);
  };

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

  const sortedCalledNumbers = [...calledNumbers].sort((a,b) => a - b);

  return (
    <div className="container mx-auto py-2 space-y-3 md:space-y-4">
      <Card className="shadow-xl bg-gradient-to-br from-primary via-purple-600 to-accent text-primary-foreground">
        <CardHeader className="flex flex-row items-center gap-4 py-3 md:py-4 px-4 md:px-6">
          <Speaker className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0" />
          <div className="flex flex-col">
            <CardTitle className="text-2xl md:text-3xl font-extrabold tracking-tight">Housie Number Caller</CardTitle>
            <CardDescription className="text-primary-foreground/80 text-sm md:text-base">
              Manually or automatically call numbers.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="md:col-span-1 shadow-lg">
          <CardContent className="p-4">
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
                    onCheckedChange={handleToggleAutoCall}
                    disabled={false}
                    aria-label="Toggle automatic number calling"
                />
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-3">
           <CalledNumberDisplay 
            currentNumber={currentNumber}
            calledNumbers={calledNumbers}
            isMuted={isSfxMuted}
            onToggleMute={toggleSfxMute}
          />
           {!isAutoCalling && (
              <Button onClick={callNextNumber} disabled={availableNumbers.length === 0} className="w-full">
                <Zap className="mr-2 h-4 w-4" /> Next Number
              </Button>
            )}
          
          <LiveNumberBoard 
            calledNumbers={sortedCalledNumbers}
            currentNumber={currentNumber}
            isMinimized={isBoardMinimized}
            onToggleMinimize={() => setIsBoardMinimized(!isBoardMinimized)}
            remainingCount={NUMBERS_RANGE_MAX - sortedCalledNumbers.length}
            calledCount={sortedCalledNumbers.length}
          />

          <div className="flex w-full gap-2 pt-2">
            <Button onClick={() => router.push('/')} variant="destructive" className="flex-1">
                <Home className="mr-2 h-4 w-4" /> Back to Home
            </Button>
            <Button onClick={resetGame} variant="outline" className="flex-1">
                <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
