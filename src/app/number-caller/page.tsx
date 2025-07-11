
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Speaker, VolumeX, RotateCcw, Zap, Settings2, Play, Pause, LogOut } from 'lucide-react';
import { NUMBERS_RANGE_MIN, NUMBERS_RANGE_MAX } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import LiveNumberBoard from '@/components/game/live-number-board';
import CalledNumberDisplay from '@/components/game/called-number-display';
import { useSound } from '@/contexts/sound-context';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

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
  const autoCallSpeed = 6; // Fixed speed in seconds
  const { isSfxMuted, toggleSfxMute } = useSound();
  const autoCallIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const [animationKey, setAnimationKey] = useState(0);

  const speakNumber = useCallback((num: number) => {
    if (isSfxMuted || typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(String(num));
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
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
    setAnimationKey(prev => prev + 1);
  }, [availableNumbers, speakNumber, toast]);

  const resetGame = () => {
    if (autoCallIntervalRef.current) {
      clearInterval(autoCallIntervalRef.current);
    }
    setIsAutoCalling(false);
    setCurrentNumber(null);
    setCalledNumbers([]);
    setAvailableNumbers(shuffleArray(ALL_NUMBERS));
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
    <div className="container mx-auto p-4 space-y-3 md:space-y-4 border rounded-xl shadow-lg">
      <Card className="shadow-xl bg-gradient-to-br from-primary via-purple-600 to-accent text-primary-foreground">
        <CardHeader className="flex flex-row items-center justify-between gap-4 py-3 md:py-4 px-4 md:px-6">
           <div className="flex items-center gap-4">
            <Speaker className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0" />
            <div className="flex flex-col">
              <CardTitle className="text-xl md:text-2xl font-extrabold tracking-tight">Housie Number Caller</CardTitle>
              <CardDescription className="text-primary-foreground/80 text-sm md:text-base">
                Manually or automatically call numbers.
              </CardDescription>
            </div>
          </div>
           <div className="flex items-center space-x-2">
              <Label htmlFor="auto-call-switch" className="font-semibold hidden sm:block">Auto-Call</Label>
               <Switch
                  id="auto-call-switch"
                  checked={isAutoCalling}
                  onCheckedChange={handleToggleAutoCall}
                  aria-label="Toggle automatic number calling"
              />
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-3">
          <CalledNumberDisplay 
            currentNumber={currentNumber}
            calledNumbers={calledNumbers}
            isMuted={isSfxMuted}
            onToggleMute={toggleSfxMute}
            animationKey={animationKey}
          />
          {!isAutoCalling && (
            <Button onClick={callNextNumber} disabled={availableNumbers.length === 0} className="w-full">
              <Zap className="mr-2 h-4 w-4" /> Next Number
            </Button>
          )}
        
        <LiveNumberBoard 
          calledNumbers={sortedCalledNumbers}
          currentNumber={currentNumber}
          isMinimized={false}
          onToggleMinimize={() => {}}
          remainingCount={NUMBERS_RANGE_MAX - sortedCalledNumbers.length}
          calledCount={sortedCalledNumbers.length}
        />

        <div className="flex w-full gap-2 pt-2">
          <Link href="/" passHref className="flex-1">
            <Button variant="destructive" className="w-full">
                <LogOut className="mr-2 h-4 w-4" /> Back to Home
            </Button>
          </Link>
          <Button onClick={resetGame} variant="outline" className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
