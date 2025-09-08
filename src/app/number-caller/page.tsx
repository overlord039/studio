
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
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const autoCallIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const [animationKey, setAnimationKey] = useState(0);

  const speakNumber = useCallback((num: number) => {
    if (isVoiceMuted || typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(String(num));
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  }, [isVoiceMuted]);

  const callNextNumber = useCallback(() => {
    if (availableNumbers.length === 0) {
      setIsAutoCalling(false);
      toast({ title: "All numbers called!", description: "The game is over. Reset to start a new game." });
      return;
    }

    const [nextNumber, ...rest] = availableNumbers;
    
    setCalledNumbers(prev => {
        if(currentNumber !== null) {
            return [currentNumber, ...prev];
        }
        return prev;
    });

    setCurrentNumber(nextNumber);
    setAvailableNumbers(rest);
    speakNumber(nextNumber);
    setAnimationKey(k => k + 1);

  }, [availableNumbers, currentNumber, speakNumber, toast]);
  

  const resetGame = () => {
    if (autoCallIntervalRef.current) {
      clearInterval(autoCallIntervalRef.current);
      autoCallIntervalRef.current = null;
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
      callNextNumber(); // Call immediately on toggle
      autoCallIntervalRef.current = setInterval(callNextNumber, autoCallSpeed * 1000);
    } else if (autoCallIntervalRef.current) {
      clearInterval(autoCallIntervalRef.current);
      autoCallIntervalRef.current = null;
    }
    
    return () => {
      if (autoCallIntervalRef.current) {
        clearInterval(autoCallIntervalRef.current);
      }
    };
  }, [isAutoCalling, callNextNumber, autoCallSpeed]);

  const allCalledNumbersForBoard = currentNumber !== null ? [currentNumber, ...calledNumbers] : calledNumbers;
  const sortedCalledNumbers = [...allCalledNumbersForBoard].sort((a,b) => a - b);

  return (
    <div className="container mx-auto p-4 space-y-3 md:space-y-4">
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <CalledNumberDisplay 
            currentNumber={currentNumber}
            calledNumbers={calledNumbers}
            isMuted={isVoiceMuted}
            onToggleMute={() => setIsVoiceMuted(prev => !prev)}
            animationKey={animationKey}
          />
          {!isAutoCalling && (
            <Button onClick={callNextNumber} disabled={availableNumbers.length === 0} className="w-full h-12 text-lg">
              <Zap className="mr-2 h-5 w-5" /> Next Number
            </Button>
          )}
          <div className="flex w-full gap-2">
            <Link href="/" passHref className="flex-1">
              <Button variant="destructive" className="w-full">
                  <LogOut className="mr-2 h-4 w-4 rotate-180" /> Back
              </Button>
            </Link>
            <Button onClick={resetGame} variant="outline" className="flex-1">
                <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
          </div>
        </div>
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Number Board</CardTitle>
                </CardHeader>
                <CardContent>
                    <LiveNumberBoard 
                        calledNumbers={sortedCalledNumbers}
                        currentNumber={currentNumber}
                        remainingCount={NUMBERS_RANGE_MAX - sortedCalledNumbers.length}
                        calledCount={sortedCalledNumbers.length}
                    />
                </CardContent>
            </Card>
        </div>
      </div>

    </div>
  );
}
