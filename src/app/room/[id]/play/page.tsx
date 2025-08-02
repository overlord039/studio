

"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import HousieTicket from '@/components/game/housie-ticket';
import CalledNumberDisplay from '@/components/game/called-number-display';
import type { HousieTicketGrid, PrizeType, Room, GameSettings, CallingMode, PrizeClaimant, OnlineGameTier, TierConfig } from '@/types';
import { PRIZE_TYPES } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Award, Users, XCircle, CheckCircle2, PartyPopper, RotateCcw, LogOut, MinusSquare, PlusSquare, Loader2, X, Zap, Settings2, Play, Pause, Menu, Ticket } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useSound } from '@/contexts/sound-context';
import { PRIZE_DEFINITIONS, PRIZE_DISTRIBUTION_PERCENTAGES, DEFAULT_GAME_SETTINGS, NUMBERS_RANGE_MAX } from '@/lib/constants';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import LiveNumberBoard from '@/components/game/live-number-board';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Footer from '@/components/layout/footer';
import Image from 'next/image';


const MemoizedHousieTicket = React.memo(HousieTicket);
const MemoizedLiveNumberBoard = React.memo(LiveNumberBoard);
const MemoizedCalledNumberDisplay = React.memo(CalledNumberDisplay);

const TIERS: Record<OnlineGameTier, TierConfig> = {
    quick: {
        name: "Quick", ticketPrice: 5, roomSize: 4, matchmakingTime: 15,
        unlockRequirements: { matches: 0, coins: 0 },
    },
    classic: {
        name: "Classic", ticketPrice: 10, roomSize: 6, matchmakingTime: 30,
        unlockRequirements: { matches: 5, coins: 50 },
    },
    tournament: {
        name: "Tournament", ticketPrice: 20, roomSize: 10, matchmakingTime: 60,
        unlockRequirements: { matches: 15, coins: 150 },
    }
};

const BOT_GAME_MODE_NAMES = {
    easy: "Easy",
    medium: "Classic",
    hard: "Rush",
};

const OFFLINE_COIN_REWARDS: Record<'easy' | 'medium' | 'hard', Record<PrizeType, number>> = {
  easy: {
    [PRIZE_TYPES.EARLY_5]: 1,
    [PRIZE_TYPES.FIRST_LINE]: 1,
    [PRIZE_TYPES.SECOND_LINE]: 1,
    [PRIZE_TYPES.THIRD_LINE]: 1,
    [PRIZE_TYPES.FULL_HOUSE]: 2,
  },
  medium: {
    [PRIZE_TYPES.EARLY_5]: 1,
    [PRIZE_TYPES.FIRST_LINE]: 2,
    [PRIZE_TYPES.SECOND_LINE]: 2,
    [PRIZE_TYPES.THIRD_LINE]: 2,
    [PRIZE_TYPES.FULL_HOUSE]: 3,
  },
  hard: {
    [PRIZE_TYPES.EARLY_5]: 2,
    [PRIZE_TYPES.FIRST_LINE]: 3,
    [PRIZE_TYPES.SECOND_LINE]: 3,
    [PRIZE_TYPES.THIRD_LINE]: 3,
    [PRIZE_TYPES.FULL_HOUSE]: 5,
  }
};


export default function GameRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const roomId = Array.isArray(params.id) ? params.id[0] ?? '' : params.id ?? '';
  const { toast } = useToast();
  const { currentUser, loading: authLoading, updateUserStats: updateContextUserStats } = useAuth();
  const { isSfxMuted, playSound } = useSound();

  const [roomData, setRoomData] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [myTickets, setMyTickets] = useState<HousieTicketGrid[]>([]);
  const [markedNumbers, setMarkedNumbers] = useState<Set<string>>(new Set());
  const [isCallingNextNumber, setIsCallingNextNumber] = useState(false);
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [coinsWonThisGame, setCoinsWonThisGame] = useState<number | null>(null);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);

  const previousCurrentNumberRef = useRef<number | null>(null);
  const roomDataRef = useRef(roomData);
  const previousPrizeStatusRef = useRef<Room['prizeStatus'] | null>(null);
  const previousCallingModeRef = useRef<CallingMode | undefined>();
  const gameOverSoundPlayedRef = useRef(false);
  const statsUpdateInitiatedRef = useRef(false);

  useEffect(() => {
    if (roomData?.currentNumber !== previousCurrentNumberRef.current) {
      setAnimationKey(prev => prev + 1);
    }
  }, [roomData?.currentNumber]);

  useEffect(() => {
    roomDataRef.current = roomData;
  }, [roomData]);

  useEffect(() => {
    if (roomData?.isGameOver && !gameOverSoundPlayedRef.current) {
      playSound('gameover.wav');
      gameOverSoundPlayedRef.current = true;
    }
    if (roomData && !roomData.isGameOver) {
        gameOverSoundPlayedRef.current = false;
    }
  }, [roomData?.isGameOver, playSound]);

  const announce = useCallback((num: number) => {
    if (isVoiceMuted || typeof window === 'undefined' || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(String(num));
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  }, [isVoiceMuted]);

  const fetchGameDetails = useCallback(async (isInitialLoad = false) => {
    const playerTicketsParam = searchParams.get('playerTickets');
    if (!roomId || !currentUser?.uid) {
      if (isInitialLoad) {
        setError("Room ID or User not available for fetching game details.");
        setIsLoading(false);
      }
      return;
    }

    if (isInitialLoad) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const response = await fetch(`/api/rooms/${roomId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to parse error response. Status: ${response.status}` }));
        if (response.status === 404) {
          setError("Room not found. It might have expired or never existed.");
          if (isInitialLoad) setRoomData(null);
        } else {
          setError(errorData.message || `Failed to fetch room details: ${response.statusText}`);
          if (isInitialLoad) setRoomData(null);
        }
        if (isInitialLoad) setIsLoading(false);
        return;
      }
      const data: Room = await response.json();
      
      const oldPrizeStatus = previousPrizeStatusRef.current;
      const newPrizeStatus = data.prizeStatus;

      if (oldPrizeStatus && newPrizeStatus && !data.isGameOver) {
          const prizes = Object.keys(newPrizeStatus) as PrizeType[];
          for (const prize of prizes) {
              const newClaim = newPrizeStatus[prize];
              const oldClaim = oldPrizeStatus[prize];

              const newClaimants = newClaim?.claimedBy ?? [];
              const oldClaimants = oldClaim?.claimedBy ?? [];

              if (newClaimants.length > oldClaimants.length) {
                  const oldClaimantIds = new Set(oldClaimants.map(c => c.id));
                  const newlyAddedClaimants = newClaimants.filter(c => !oldClaimantIds.has(c.id));

                  if (newlyAddedClaimants.length > 0) {
                      playSound('win.wav');
                      const claimantNames = newlyAddedClaimants
                          .map(claimant => {
                              if (claimant.id === currentUser?.uid) return "You";
                              return claimant.name || claimant.id;
                           })
                          .join(', ');
                      
                      toast({
                        title: "Game Update!",
                        description: `🔔 ${claimantNames} claimed ${prize}!`
                      });
                      
                      break; 
                  }
              }
          }
      }
      
      setRoomData(data);
      previousPrizeStatusRef.current = data.prizeStatus;

      const me = data.players.find(p => p.id === currentUser.uid);
      if (me && me.tickets) {
        setMyTickets(me.tickets);
      } else if (isInitialLoad && (!me || !me.tickets || me.tickets.length === 0)) {
        if (playerTicketsParam) {
            const numTickets = parseInt(playerTicketsParam, 10);
            if (numTickets === 0 && data.isGameStarted && !data.isGameOver) {
                if (!roomDataRef.current || !roomDataRef.current.isGameOver) { 
                    toast({ title: 'Spectating', description: "You don't have any tickets for this game." });
                }
            }
        }
        setMyTickets([]);
      }

    } catch (err) {
      console.error("Error fetching game details:", err);
      if (isInitialLoad || !roomDataRef.current) {
        setError(`Failed to fetch game details: ${(err as Error).message}`);
        if (isInitialLoad) setRoomData(null);
      } else if (roomDataRef.current && !roomDataRef.current.isGameOver) {
        toast({
          title: "Game Update Failed",
          description: "Could not fetch latest game details. Retrying...",
          variant: "destructive",
          duration: 2000,
        });
      }
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  }, [roomId, currentUser, searchParams, toast, playSound]);

  // This effect runs ONCE when the game is over to trigger the stat update.
  useEffect(() => {
    if (roomData?.isGameOver && currentUser && !statsUpdateInitiatedRef.current) {
      statsUpdateInitiatedRef.current = true;
      localStorage.removeItem(`markedNumbers-${roomId}-${currentUser.uid}`);

      const updateMyStats = async () => {
        
        const isGameApplicableForStatsUpdate = roomData.settings.gameMode !== 'online';
        if (!isGameApplicableForStatsUpdate) return; 

        if (currentUser.isGuest) {
            const newStats = { ...currentUser.stats };
            newStats.matchesPlayed += 1;
            
            const prizesWon = roomData.prizeStatus;
            for (const prize in prizesWon) {
                if(prizesWon[prize as PrizeType]?.claimedBy.some(c => c.id === currentUser.uid)) {
                   newStats.prizesWon[prize as PrizeType] = (newStats.prizesWon[prize as PrizeType] || 0) + 1;
                }
            }
            updateContextUserStats(newStats);
            return;
        }

        try {
          const response = await fetch(`/api/rooms/${roomId}/update-stats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.uid }),
          });

          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.message || "Failed to trigger stat update.");
          }
          
          if (result.coinsEarned >= 0) {
            setCoinsWonThisGame(result.coinsEarned);
             if (result.coinsEarned > 0) {
                toast({
                    title: "Coins Rewarded!",
                    description: `You earned ${result.coinsEarned} coins for playing.`,
                    className: "bg-yellow-500 text-white",
                })
             }
          }
        } catch (error) {
          console.error("Failed to trigger stats update:", error);
          toast({
            title: "Stats Sync Error",
            description: "Could not save your game stats.",
            variant: "destructive"
          });
        }
      };

      updateMyStats();
    }
  }, [roomData?.isGameOver, currentUser, roomId, toast, updateContextUserStats]);

  // This effect loads marked numbers from localStorage on mount
  useEffect(() => {
    if (!roomId || !currentUser) return;

    try {
      const storedMarkedNumbers = localStorage.getItem(`markedNumbers-${roomId}-${currentUser.uid}`);
      if (storedMarkedNumbers) {
        setMarkedNumbers(new Set(JSON.parse(storedMarkedNumbers)));
      }
    } catch (e) {
      console.error("Failed to load marked numbers from local storage", e);
    }
  }, [roomId, currentUser]);

  // This effect saves marked numbers to localStorage whenever they change
  useEffect(() => {
    if (!roomId || !currentUser || roomData?.isGameOver) return;
    try {
        localStorage.setItem(
            `markedNumbers-${roomId}-${currentUser.uid}`,
            JSON.stringify(Array.from(markedNumbers))
        );
    } catch (e) {
        console.error("Failed to save marked numbers to local storage", e);
    }
  }, [markedNumbers, roomId, currentUser, roomData?.isGameOver]);

  useEffect(() => {
    if (currentUser && roomId && !authLoading) {
      fetchGameDetails(true);
    } else if (!authLoading && !currentUser) {
      setIsLoading(false);
      setError("Please log in to play or spectate.");
    }
  }, [currentUser, roomId, authLoading, fetchGameDetails]);

  // Polling for game updates and handling notifications for changes
  useEffect(() => {
    if (!roomId || !currentUser || roomData?.isGameOver || isLoading) {
        if (previousCallingModeRef.current && roomData?.isGameOver) {
            previousCallingModeRef.current = undefined; // Reset on game over
        }
        return;
    }
    
    // Check for calling mode change
    if (previousCallingModeRef.current && roomData && roomData.settings.callingMode !== previousCallingModeRef.current) {
        playSound('notification.wav');
        toast({
            title: "Mode Switched by Host",
            description: `Number calling is now ${roomData.settings.callingMode}.`
        });
    }
    previousCallingModeRef.current = roomData?.settings.callingMode;

    const isManualMode = roomData?.settings.callingMode === 'manual';
    const isHost = roomData?.host.id === currentUser.uid;
    const pollInterval = isManualMode && !isHost ? 7000 : 5000;

    const intervalId = setInterval(() => {
      if (!document.hidden) { 
        fetchGameDetails(false);
      }
    }, pollInterval); 
    
    return () => {
        clearInterval(intervalId);
    };
  }, [roomId, currentUser, roomData, isLoading, fetchGameDetails, playSound, toast]);


  // Announce new numbers
  useEffect(() => {
    if (roomData && roomData.currentNumber !== null && roomData.currentNumber !== previousCurrentNumberRef.current) {
      announce(roomData.currentNumber);
      previousCurrentNumberRef.current = roomData.currentNumber;
    }
  }, [roomData?.currentNumber, announce]);


  const handleNumberClick = (ticketIndex: number, numberValue: number, rowIndex: number, colIndex: number) => {
    if (!roomData || roomData.isGameOver || myTickets.length === 0) return;
    const key = `${ticketIndex}-${rowIndex}-${colIndex}`;

    if (markedNumbers.has(key)) {
      return; 
    }

    if (!roomData.calledNumbers.includes(numberValue)) {
      return;
    }
    playSound('marking number.wav');
    setMarkedNumbers(prev => {
      const newMarked = new Set(prev);
      newMarked.add(key);
      return newMarked;
    });
  };

  const handleClaimPrize = async (prizeType: PrizeType) => {
    if (!roomData || !currentUser) {
      toast({ title: "Cannot Claim", description: "Room data missing or not logged in.", variant: "destructive" });
      return;
    }

    const getPrizeNumbersOnTicket = (ticket: HousieTicketGrid, prizeType: PrizeType): { num: number; r: number; c: number }[] => {
        const prizeNumbers: { num: number; r: number; c: number }[] = [];
        if (prizeType === PRIZE_TYPES.FIRST_LINE) {
            ticket[0].forEach((num, c) => { if (num !== null) prizeNumbers.push({ num, r: 0, c }); });
        } else if (prizeType === PRIZE_TYPES.SECOND_LINE) {
            ticket[1].forEach((num, c) => { if (num !== null) prizeNumbers.push({ num, r: 1, c }); });
        } else if (prizeType === PRIZE_TYPES.THIRD_LINE) {
            ticket[2].forEach((num, c) => { if (num !== null) prizeNumbers.push({ num, r: 2, c }); });
        } else if (prizeType === PRIZE_TYPES.FULL_HOUSE) {
            ticket.forEach((row, r) => row.forEach((num, c) => { if (num !== null) prizeNumbers.push({ num, r, c }); }));
        }
        return prizeNumbers;
    };
    
    let isClaimValidAndMarked = false;
    let winningTicketIndex = -1;

    for (let i = 0; i < myTickets.length; i++) {
        const ticket = myTickets[i];
        const housieLib = require('@/lib/housie');

        if (housieLib.checkWinningCondition(ticket, roomData.calledNumbers, prizeType)) {
            if (prizeType === PRIZE_TYPES.EARLY_5) {
                let markedAndCalledCount = 0;
                ticket.forEach((row, r) => {
                    row.forEach((num, c) => {
                        if (num !== null && roomData.calledNumbers.includes(num)) {
                            if (markedNumbers.has(`${i}-${r}-${c}`)) {
                                markedAndCalledCount++;
                            }
                        }
                    });
                });

                if (markedAndCalledCount >= 5) {
                    isClaimValidAndMarked = true;
                    winningTicketIndex = i;
                    break;
                }
            } else {
                const prizeNumbers = getPrizeNumbersOnTicket(ticket, prizeType);
                const areAllMarked = prizeNumbers.every(({ r, c }) => markedNumbers.has(`${i}-${r}-${c}`));
                
                if (areAllMarked) {
                    isClaimValidAndMarked = true;
                    winningTicketIndex = i;
                    break;
                }
            }
        }
    }

    if (!isClaimValidAndMarked) {
        playSound('error.wav');
        toast({
            title: `Claim for ${prizeType} Failed`,
            description: "You must mark all required numbers on your ticket before claiming a prize.",
            variant: "destructive"
        });
        return;
    }
    
    try {
      const response = await fetch(`/api/rooms/${roomId}/claim-prize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: currentUser.uid, prizeType, ticketIndex: winningTicketIndex }),
      });

      const result = await response.json();

      if (response.ok) {
        playSound('win.wav');
        const updatedRoom: Room = result;
        setRoomData(updatedRoom); 
        previousPrizeStatusRef.current = updatedRoom.prizeStatus;

        const claimStatus = updatedRoom.prizeStatus[prizeType];
        
        let toastMessageAlert = `Your claim for ${prizeType} has been submitted for validation.`;
        if (claimStatus?.claimedBy.some(c => c.id === currentUser.uid)) {
            toastMessageAlert = `You successfully claimed ${prizeType}!`;
        }

        if (updatedRoom.isGameOver) {
          toastMessageAlert = `You claimed Full House! Game Over.`
        }

        toast({
            title: "Claim Processed!",
            description: toastMessageAlert,
            className: (toastMessageAlert.includes("Bogey") || toastMessageAlert.includes("Invalid") || toastMessageAlert.includes("Failed")) ? "bg-destructive" : "bg-green-500 text-white"
        });
      } else {
        const errorMessage = result.message || `Failed to claim ${prizeType}.`;
        if (errorMessage.toLowerCase().includes('bogey')) {
          playSound('error.wav');
        }
        toast({
            title: `Claim for ${prizeType} Failed`,
            description: errorMessage,
            variant: "destructive"
        });
      }
    } catch (err) {
      console.error(`Error claiming ${prizeType}:`, err);
      toast({ title: "Network Error", description: `Could not claim ${prizeType}.`, variant: "destructive" });
    }
  };

  const handleCallNextNumber = async () => {
    if (!currentUser || !roomData) return;
    setIsCallingNextNumber(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/call-number`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: currentUser.uid }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to call next number.');
      }
      setRoomData(data);
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsCallingNextNumber(false);
    }
  };

  const handleToggleCallingMode = async () => {
    if (!currentUser || !isCurrentUserHost || !roomData || roomData.isGameOver || roomData.settings.gameMode === 'online') return;

    setIsUpdatingMode(true);
    const newMode = roomData.settings.callingMode === 'auto' ? 'manual' : 'auto';

    try {
        const response = await fetch(`/api/rooms/${roomId}/update-calling-mode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hostId: currentUser.uid, callingMode: newMode }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Failed to switch to ${newMode} mode.`);
        }
        setRoomData(data);
        // Do not toast here. Let the useEffect handle it for all players.
    } catch (error) {
        toast({
            title: "Error Switching Mode",
            description: (error as Error).message,
            variant: "destructive",
        });
    } finally {
        setIsUpdatingMode(false);
    }
  };

  const isCurrentUserHost = roomData?.host.id === currentUser?.uid;

  const handlePlayAgain = async () => {
    if (!currentUser || !roomData) return;

    const isBotGame = roomData.settings.gameMode !== 'multiplayer' && roomData.settings.gameMode !== 'online';
    const isOnlineGame = roomData.settings.gameMode === 'online';
    setIsResetting(true);

    if (isBotGame) {
        playSound('cards.mp3');
        router.push(`/play-with-computer`);
        return;
    } else if (isOnlineGame) {
        playSound('cards.mp3');
        router.push(`/online`);
        return;
    } else { // It's a friends game
      if (isCurrentUserHost) {
        try {
          const response = await fetch(`/api/rooms/${roomId}/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hostId: currentUser.uid }),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to reset the game.");
          }
          router.push(`/room/${roomId}/lobby`);
          playSound('notification.wav');
          toast({ title: "New Game Ready!", description: "The lobby has been reset for all players." });
        } catch (err) {
          console.error("Error resetting game:", err);
          toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
          setIsResetting(false);
        }
      } else {
        router.push(`/room/${roomId}/lobby`);
        playSound('notification.wav');
        toast({ title: "Returning to Lobby", description: "Waiting for host to start a new game." });
      }
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentUser) {
      router.push('/');
      return;
    }
    try {
      await fetch(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: currentUser.uid }),
      });
      playSound('notification.wav');
      toast({ title: "You have left the room." });
    } catch (err) {
      console.error("Error leaving room:", err);
      toast({ title: "Error", description: "Could not leave the room cleanly. Redirecting anyway.", variant: "destructive" });
    } finally {
      router.push('/');
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-xl">Loading Game...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Error Loading Game</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => router.push('/')} size="lg">Go to Homepage</Button>
      </div>
    );
  }

  if (!roomData || !currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Room Data Unavailable</h2>
        <p className="text-muted-foreground mb-6">Could not load room details. Please try again or ensure you are logged in.</p>
        <Button onClick={() => router.push('/')} size="lg">Go to Homepage</Button>
      </div>
    );
  }
  
  if (!roomData.isGameStarted) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Waiting for Game to Start</h2>
        <p className="text-muted-foreground mb-6">The game will begin shortly. Get ready!</p>
      </div>
    )
  }

  const isBotGame = roomData.settings.gameMode !== 'multiplayer' && roomData.settings.gameMode !== 'online';
  
  const gameSettings: GameSettings = roomData.settings || DEFAULT_GAME_SETTINGS;
  const currentPrizeFormat = gameSettings.prizeFormat;
  const prizesForFormat = PRIZE_DEFINITIONS[currentPrizeFormat] || [];
  const prizeDistributionPercentages = PRIZE_DISTRIBUTION_PERCENTAGES[currentPrizeFormat] || {};
  const totalPrizePool = roomData.totalPrizePool || 0;
  
  const ticketsText = (count: number) => count === 1 ? 'ticket' : 'tickets';
  
  const formatCoins = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  if (roomData.isGameOver) {
    let currentUserWinnings = 0;
    const currentUserPrizeNames: string[] = [];
    const ticketPrice = roomData.settings.ticketPrice || 0;
    const ticketsBought = myTickets.length;
    const totalCost = ticketPrice * ticketsBought;

    if (currentUser) {
        if (!isBotGame) { // For Online and Friends modes
            prizesForFormat.forEach(prize => {
                const claimInfo = roomData.prizeStatus[prize];
                if (claimInfo && claimInfo.claimedBy.some(c => c.id === currentUser.uid)) {
                    if (!currentUserPrizeNames.includes(prize)) {
                        currentUserPrizeNames.push(prize);
                    }
                    const prizeAmount = (totalPrizePool * (prizeDistributionPercentages[prize as PrizeType] || 0)) / 100;
                    const prizePerWinner = prizeAmount / claimInfo.claimedBy.length;
                    currentUserWinnings += prizePerWinner;
                }
            });
        } else if (coinsWonThisGame !== null) { // For bot games
            currentUserWinnings = coinsWonThisGame;
            // Common logic to find out names of prizes won for all modes
            const prizesWon = roomData.prizeStatus;
            for (const prize in prizesWon) {
                if(prizesWon[prize as PrizeType]?.claimedBy.some(c => c.id === currentUser.uid)) {
                    if (!currentUserPrizeNames.includes(prize)) { 
                        currentUserPrizeNames.push(prize);
                    }
                }
            }
        }
    }
    
    const playAgainButtonText = isBotGame ? "Play Again" : (roomData.settings.gameMode === 'online' ? "Find New Match" : (isCurrentUserHost ? "New Game" : "To Lobby"));
    const userHasPrizes = currentUserPrizeNames.length > 0;
    const isParticipationWinner = !userHasPrizes && currentUserWinnings > 0;

    return (
      <div className="flex-grow p-4 flex flex-col items-center justify-center">
        <Card className="w-full max-w-2xl shadow-xl border-accent">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold flex items-center justify-center">
              <PartyPopper className="mr-3 h-10 w-10 text-primary" /> Game Over!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="text-xl font-semibold text-center mb-2 flex items-center justify-center">
                <Award className="mr-2 h-5 w-5 text-accent"/>
                Final Prize Summary
            </h3>
            <div className="border rounded-md p-3">
              {!isBotGame && (
              <div className="flex justify-between items-center text-lg font-bold mb-2 pb-2 border-b">
                <span>Total Prize Pool:</span>
                <div className="flex items-center gap-1">
                  <Image src="/coin.png" alt="Coins" width={20} height={20} />
                  <span>{formatCoins(totalPrizePool)}</span>
                </div>
              </div>
              )}
              <ul className="space-y-2">
                {prizesForFormat.map(prize => {
                  const claimInfo = roomData.prizeStatus[prize];
                  const isClaimed = claimInfo && claimInfo.claimedBy.length > 0;
                  
                  let prizeStatusText = "Not Claimed";
                  if (isClaimed) {
                    const winnerNames = claimInfo.claimedBy.map(c => c.id === currentUser?.uid ? 'You' : c.name).join(', ');
                    prizeStatusText = `Claimed by ${winnerNames}`;
                  }
                  
                  if (isBotGame) {
                     const rewardAmount = (roomData.settings.gameMode && OFFLINE_COIN_REWARDS[roomData.settings.gameMode as keyof typeof OFFLINE_COIN_REWARDS]) ? OFFLINE_COIN_REWARDS[roomData.settings.gameMode as keyof typeof OFFLINE_COIN_REWARDS][prize] : 0;
                     return (
                         <li key={prize} className="flex flex-col text-sm bg-secondary/20 p-1.5 rounded-md">
                             <div className="flex justify-between items-center w-full">
                                <span className="font-medium">{prize}</span>
                                <div className="font-semibold flex items-center gap-1">
                                    <Image src="/coin.png" alt="Coins" width={16} height={16} />
                                    <span>{rewardAmount}</span>
                                </div>
                             </div>
                             <span className={cn("text-xs text-right w-full", isClaimed ? "text-green-600 font-medium" : "text-muted-foreground/80")}>
                                {prizeStatusText}
                            </span>
                        </li>
                      );
                  }

                  const prizeAmount = (totalPrizePool * (prizeDistributionPercentages[prize as PrizeType] || 0)) / 100;
                  const prizePerWinner = (claimInfo && claimInfo.claimedBy.length > 0) ? prizeAmount / claimInfo.claimedBy.length : 0;
                  
                  return (
                     <li key={prize} className="flex flex-col bg-secondary/20 p-1.5 rounded-md text-sm">
                        <div className="flex justify-between items-center w-full">
                           <div className="flex items-center gap-1">
                             <span>{prize}</span>
                           </div>
                           <div className="font-semibold flex items-center gap-1">
                             <Image src="/coin.png" alt="Coins" width={16} height={16} />
                             <span>{formatCoins(prizeAmount)}</span>
                           </div>
                        </div>
                        <span className={cn("text-xs text-right w-full", isClaimed ? "text-green-600 font-medium" : "text-muted-foreground/80")}>
                           {prizeStatusText}
                           {prizePerWinner > 0 && claimInfo && claimInfo.claimedBy.length > 1 && ` (${formatCoins(prizePerWinner)} each)`}
                        </span>
                     </li>
                  );
                })}
              </ul>
            </div>

            {(userHasPrizes || isParticipationWinner) ? (
                <div className="text-center p-4 bg-green-100 dark:bg-green-900/40 rounded-lg border border-green-500/50 space-y-1">
                    <p className="text-lg font-semibold">Congratulations, {currentUser.displayName}!</p>
                    {(!isBotGame || (isBotGame && userHasPrizes)) ? (
                      <>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-300 flex items-center justify-center gap-2">
                            You won a total of <Image src="/coin.png" alt="Coins" width={24} height={24} /> {formatCoins(currentUserWinnings)}!
                        </div>
                         <p className="text-sm text-muted-foreground">Your prizes: <span className="font-medium text-foreground">{currentUserPrizeNames.join(', ')}</span></p>
                        {!isBotGame && (
                            <p className="text-sm text-muted-foreground">You spent {formatCoins(totalCost)} and won {formatCoins(currentUserWinnings)}</p>
                        )}
                      </>
                    ) : isParticipationWinner ? (
                        <div className="text-2xl font-bold text-green-700 dark:text-green-300 flex items-center justify-center gap-2">
                           You won a total of <Image src="/coin.png" alt="Coins" width={24} height={24} /> {formatCoins(currentUserWinnings)}!
                           <span className="text-sm text-muted-foreground">(Participation Reward)</span>
                        </div>
                    ) : userHasPrizes ? (
                         <p className="text-lg text-muted-foreground">You claimed: <span className="font-medium text-foreground">{currentUserPrizeNames.join(', ')}</span></p>
                    ) : null}
                </div>
            ) : (
                 <div className="text-center p-4 bg-secondary/50 rounded-lg">
                    <p className="font-semibold text-muted-foreground">You didn't win a prize this time, but well played!</p>
                    <p className="text-sm text-muted-foreground">Better luck next game!</p>
                </div>
            )}

            <div className="flex flex-row gap-4 mt-6">
              <Button onClick={handlePlayAgain} className="flex-1" size="lg" disabled={isResetting}>
                {isResetting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-5 w-5" />
                )}
                {isResetting ? "Starting..." : playAgainButtonText}
              </Button>
              <Button variant="destructive" className="flex-1" size="lg" onClick={handleLeaveRoom}>
                <LogOut className="mr-2 h-5 w-5" /> Leave
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAutoCalling = roomData.settings.callingMode === 'auto';
  
  const getTicketLayoutClass = (count: number) => {
    switch (count) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 lg:grid-cols-2';
      case 3:
        return 'grid-cols-1 lg:grid-cols-2';
      case 4:
        return 'grid-cols-1 lg:grid-cols-2';
      default:
        return 'grid-cols-1 lg:grid-cols-2';
    }
  };


  return (
    <>
      <div className="container mx-auto p-4 space-y-4">
        <Card className="shadow-none border-none bg-transparent relative">
          <CardContent className="p-2 sm:p-3 flex justify-between items-center text-sm gap-3">
            <div className="flex-grow">
               <div className="flex items-center gap-2 mb-1">
                  {isBotGame && roomData.settings.gameMode ? (
                      <div className={cn(
                          "px-2 py-1 text-xs font-bold text-white rounded-md capitalize",
                          roomData.settings.gameMode === 'easy' && "bg-green-600",
                          roomData.settings.gameMode === 'medium' && "bg-yellow-600",
                          roomData.settings.gameMode === 'hard' && "bg-red-600",
                      )}>
                          {BOT_GAME_MODE_NAMES[roomData.settings.gameMode as keyof typeof BOT_GAME_MODE_NAMES] || 'Bot Game'} Mode
                      </div>
                  ) : roomData.settings.gameMode === 'online' && roomData.settings.tier ? (
                      <div className="px-2 py-1 text-xs font-bold text-white rounded-md capitalize bg-blue-600">
                          Online: {TIERS[roomData.settings.tier]?.name || 'Mode'}
                      </div>
                  ) : (
                      <div className="text-white capitalize">
                          Room ID: #{roomId}
                      </div>
                  )}
              </div>
              <div className="font-semibold text-white">{currentUser.displayName} ({myTickets.length} {ticketsText(myTickets.length)})</div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
                 <div className="flex items-center gap-4 text-white">
                    <div className="flex flex-col items-center">
                        <span className="text-xs opacity-80">Room Size</span>
                        <div className="font-bold flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {gameSettings.lobbySize}
                        </div>
                    </div>
                    {!isBotGame && (
                        <div className="flex flex-col items-center">
                            <span className="text-xs opacity-80">Prize Pool</span>
                            <div className="font-bold flex items-center gap-1">
                                <Image src="/coin.png" alt="Coins" width={16} height={16} />
                                {formatCoins(totalPrizePool)}
                            </div>
                        </div>
                    )}
                </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Game Info &amp; Players">
                    <Menu className="h-5 w-5 text-primary" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="flex flex-col bg-card/90 backdrop-blur-sm border-primary/20">
                  <SheetHeader className="text-center border-b pb-2">
                      <SheetTitle className="text-base">Game Info &amp; Players</SheetTitle>
                  </SheetHeader>
                  <div className="py-2 space-y-4 flex-grow overflow-y-auto">
                      <Card className="bg-secondary/30">
                          <CardHeader className="p-3 pb-2">
                              <CardTitle className="text-sm font-semibold flex items-center">
                                  <Award className="mr-2 h-4 w-4 text-primary" />
                                  Prize Status
                              </CardTitle>
                              {!isBotGame && <div className="text-xs text-muted-foreground flex items-center gap-1">Total Pool: <Image src="/coin.png" alt="Coins" width={12} height={12} />{formatCoins(totalPrizePool)}</div>}
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                              {isLoading ? (
                                  <p className="text-xs text-muted-foreground">Loading prize info...</p>
                              ) : (
                                  <ul className="space-y-1 text-xs">
                                  {prizesForFormat.map(prize => {
                                      const claimInfo = roomData.prizeStatus[prize as PrizeType];
                                      const isClaimed = claimInfo && claimInfo.claimedBy.length > 0;

                                      let claimantText = "Unclaimed";
                                      if (isClaimed) {
                                          const claimantNames = claimInfo.claimedBy.map(c => {
                                              if (c.id === currentUser?.uid) return "You";
                                              return c.name || c.id;
                                          }).join(', ');
                                          claimantText = `Claimed by ${claimantNames}`;
                                      }
                                      
                                      if (isBotGame) {
                                          const rewardAmount = (roomData.settings.gameMode && OFFLINE_COIN_REWARDS[roomData.settings.gameMode as keyof typeof OFFLINE_COIN_REWARDS]) ? OFFLINE_COIN_REWARDS[roomData.settings.gameMode as keyof typeof OFFLINE_COIN_REWARDS][prize] : 0;
                                          return (
                                             <li key={prize} className="flex flex-col bg-background/50 p-1.5 rounded-md">
                                                <div className="flex justify-between items-center w-full">
                                                    <div className="flex items-center gap-1">
                                                        <span>{prize}</span>
                                                    </div>
                                                    <div className="font-semibold flex items-center gap-1">
                                                        <Image src="/coin.png" alt="Coins" width={12} height={12} />
                                                        {rewardAmount}
                                                    </div>
                                                </div>
                                                <span className={cn("text-xs text-right w-full", isClaimed ? "text-green-600 font-medium" : "text-muted-foreground/80")}>
                                                    {claimantText}
                                                </span>
                                            </li>
                                          );
                                      }

                                      // Logic for online/friends games (with money)
                                      const prizeAmount = (totalPrizePool * (prizeDistributionPercentages[prize as PrizeType] || 0)) / 100;
                                      const winnerCount = claimInfo?.claimedBy.length ?? 0;

                                      let prizeValueText = formatCoins(prizeAmount);
                                      if (isClaimed && winnerCount > 1) {
                                          const prizePerWinner = prizeAmount / winnerCount;
                                          prizeValueText = `${formatCoins(prizePerWinner)} each`;
                                      }

                                      return (
                                          <li key={prize} className="flex flex-col bg-background/50 p-1.5 rounded-md">
                                              <div className="flex justify-between items-center w-full">
                                                  <div className="flex items-center gap-1">
                                                    <span>{prize}</span>
                                                  </div>
                                                  <div className="font-semibold flex items-center gap-1">
                                                    <Image src="/coin.png" alt="Coins" width={12} height={12} />
                                                    {prizeValueText}
                                                  </div>
                                              </div>
                                              <span className={cn("text-xs text-right w-full", isClaimed ? "text-green-600 font-medium" : "text-muted-foreground/80")}>
                                                  {claimantText}
                                              </span>
                                          </li>
                                      );
                                  })}
                                  </ul>
                              )}
                          </CardContent>
                      </Card>
                      <Card className="bg-secondary/30">
                          <CardHeader className="p-3 pb-2">
                              <CardTitle className="text-sm font-semibold flex items-center"><Users className="mr-2 h-4 w-4 text-primary" />Players ({roomData.players.length})</CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                              {isLoading ? (
                                  <p className="text-xs text-muted-foreground">Loading player list...</p>
                              ) : (
                                  <ScrollArea className="h-40">
                                      <ul className="space-y-1 text-xs">
                                      {[...roomData.players].sort((a,b) => (a.isHost ? -1 : b.isHost ? 1 : 0)).map((player) => {
                                         const ticketCount = player.tickets?.length || 0;
                                         const ticketCost = ticketCount * gameSettings.ticketPrice;
                                         return (
                                          <li key={player.id} className="flex justify-between items-center bg-background/50 p-1.5 rounded-md">
                                          <span className={cn("font-medium", player.id === currentUser?.uid && "text-primary font-bold")}>
                                              {player.name}
                                              {player.isHost && <span className="ml-1 font-semibold text-primary">*</span>}
                                          </span>
                                          <div className="text-muted-foreground flex items-center gap-1">
                                            <span>{ticketCount} {ticketsText(ticketCount)}</span>
                                            {(!isBotGame) && 
                                              <div className="flex items-center gap-0.5">
                                                (<Image src="/coin.png" alt="Coins" width={12} height={12} />{formatCoins(ticketCost)})
                                              </div>
                                            }
                                          </div>
                                          </li>
                                        );
                                      })}
                                      </ul>
                                  </ScrollArea>
                              )}
                          </CardContent>
                      </Card>
                       {isCurrentUserHost && roomData.settings.gameMode === 'multiplayer' && !roomData.isGameOver && (
                        <Card className="bg-secondary/30">
                          <CardHeader className="p-3 pb-2">
                             <CardTitle className="text-sm font-semibold flex items-center"><Settings2 className="mr-2 h-4 w-4 text-primary" />Host Controls</CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                              <div className="flex items-center gap-1.5 p-1 rounded-md">
                                  <Label htmlFor="calling-mode-switch" className="text-xs font-medium text-foreground cursor-pointer flex-grow">
                                      Auto-Call Numbers
                                  </Label>
                                  <Switch
                                      id="calling-mode-switch"
                                      checked={isAutoCalling}
                                      onCheckedChange={handleToggleCallingMode}
                                      disabled={isUpdatingMode}
                                      aria-label="Toggle automatic number calling"
                                  />
                              </div>
                          </CardContent>
                        </Card>
                       )}
                  </div>
                  <div className="border-t pt-2">
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" className="w-full" size="sm">
                                  <LogOut className="mr-2 h-4 w-4" /> Leave Game
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure you want to leave the game?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {roomData.settings.gameMode === 'online'
                                        ? "Leaving an online match will forfeit your entry fee. Are you sure?"
                                        : "This will remove you from the current game session. If you are the host, a new host will be assigned."
                                    }
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Stay</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleLeaveRoom} className={buttonVariants({ variant: "destructive" })}>
                                      Leave
                                  </AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center space-y-4">
          <div className="w-full max-w-md relative">
              <MemoizedCalledNumberDisplay 
                  currentNumber={roomData.currentNumber}
                  calledNumbers={roomData.calledNumbers}
                  isMuted={isVoiceMuted}
                  onToggleMute={() => setIsVoiceMuted(prev => !prev)}
                  animationKey={animationKey}
              />
          </div>

          {isCurrentUserHost && !isAutoCalling && !roomData.isGameOver && (
            <div className="w-full max-w-md">
              <Button 
                  onClick={handleCallNextNumber}
                  disabled={isCallingNextNumber || roomData.isGameOver}
                  className="w-full"
              >
                {isCallingNextNumber ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                {isCallingNextNumber ? 'Calling...' : 'Call Next Number'}
              </Button>
            </div>
          )}

          <div className="w-full max-w-7xl mx-auto space-y-4">
              {myTickets.length > 0 && !roomData.isGameOver && (
              <div className="flex flex-wrap gap-1 justify-center">
                  {prizesForFormat.map((prizeType, prizeIdx) => {
                  const claimInfo = roomData.prizeStatus[prizeType];
                  const isPrizeClaimedByAnyone = claimInfo && claimInfo.claimedBy.length > 0;
                  
                  return (
                      <Button
                      key={`${prizeType}-${prizeIdx}`}
                      onClick={() => handleClaimPrize(prizeType)}
                      disabled={
                          roomData.isGameOver ||
                          isPrizeClaimedByAnyone
                      }
                      variant={isPrizeClaimedByAnyone ? "secondary" : "default"}
                      className={cn("px-2 py-3 h-auto rounded-md text-xs sm:text-sm",
                          !isPrizeClaimedByAnyone && prizeType.includes("Early") ? "bg-green-500 hover:bg-green-600" :
                          !isPrizeClaimedByAnyone && prizeType.includes("Line") ? "bg-yellow-400 hover:bg-yellow-500 text-black" :
                              !isPrizeClaimedByAnyone && prizeType.includes("Full House") ? "bg-red-500 hover:bg-red-600" : ""
                      )}
                      >
                      {prizeType}
                      </Button>
                  );
                  })}
              </div>
              )}
              
              <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">
                Your Tickets ({myTickets.length}
                <Ticket className="ml-1 h-5 w-5 inline-block align-middle transform -rotate-45" />)
              </h2>
              <Dialog>
                  <DialogTrigger asChild>
                      <Button variant="default" size="sm" className="font-semibold" onClick={() => playSound('cards.mp3')}>
                      Number Board
                  </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md p-4">
                  <DialogHeader className="pb-2">
                      <DialogTitle>Number Board</DialogTitle>
                  </DialogHeader>
                  <MemoizedLiveNumberBoard
                      calledNumbers={roomData.calledNumbers}
                      currentNumber={roomData.currentNumber}
                      remainingCount={NUMBERS_RANGE_MAX - roomData.calledNumbers.length}
                      calledCount={roomData.calledNumbers.length}
                  />
                  </DialogContent>
              </Dialog>
              </div>

              {myTickets.length === 0 && !roomData.isGameOver && roomData.isGameStarted && <p className="text-center text-muted-foreground">You are spectating or have no tickets in this game.</p>}
              
              <div className={cn("grid gap-x-2 gap-y-4 justify-items-center", getTicketLayoutClass(myTickets.length))}>
                {myTickets.map((ticket, index) => (
                  <div key={index} className={cn(
                    'w-full flex justify-center',
                    myTickets.length === 3 && index === 2 && 'lg:col-span-2'
                  )}>
                    <MemoizedHousieTicket
                      ticketIndex={index}
                      ticket={ticket}
                      calledNumbers={roomData.calledNumbers}
                      markedNumbers={markedNumbers}
                      onNumberClick={roomData.isGameOver ? undefined : (num, r, c) => handleNumberClick(index, num, r, c)}
                      className="w-full max-w-md lg:max-w-lg"
                    />
                  </div>
                ))}
              </div>

          </div>
        </div>
      </div>
      {myTickets.length < 4 && <Footer />}
    </>
  );
}
