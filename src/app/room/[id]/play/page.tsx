
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import HousieTicket from '@/components/game/housie-ticket';
import CalledNumberDisplay from '@/components/game/called-number-display';
import type { HousieTicketGrid, PrizeType, Room, GameSettings, CallingMode, PrizeClaimant, OnlineGameTier, TierConfig, FirestoreRoom, FirestorePlayer, User } from '@/types';
import { PRIZE_TYPES } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Award, Users, XCircle, CheckCircle2, PartyPopper, RotateCcw, LogOut, MinusSquare, PlusSquare, Loader2, X, Zap, Settings2, Play, Pause, Menu, Ticket, Star } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useAuth, useCoinAnimation } from '@/contexts/auth-context';
import { useSound } from '@/contexts/sound-context';
import { PRIZE_DEFINITIONS, PRIZE_DISTRIBUTION_PERCENTAGES, DEFAULT_GAME_SETTINGS, NUMBERS_RANGE_MAX, XP_PER_GAME_PARTICIPATION, XP_PER_PRIZE_WIN, XP_MODIFIER_ONLINE, getCoinsForLevelUp, getXpForNextLevel, SERVER_CALL_INTERVAL } from '@/lib/constants';
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
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Image from 'next/image';
import { db } from '@/lib/firebase/config';
import { onSnapshot, doc, collection, getDocs, QuerySnapshot, DocumentData, getDoc } from 'firebase/firestore';
import { BADGE_DEFINITIONS, type Badge } from '@/lib/badges';
import BadgeUnlockedDialog from '@/components/rewards/badge-unlocked-dialog';


const MemoizedHousieTicket = React.memo(HousieTicket);
const MemoizedLiveNumberBoard = React.memo(LiveNumberBoard);
const MemoizedCalledNumberDisplay = React.memo(CalledNumberDisplay);

const TIERS: Record<OnlineGameTier, TierConfig> = {
    quick: {
        name: "Quick", ticketPrice: 5, roomSize: 4, matchmakingTime: 15,
        unlockRequirements: { level: 1, matches: 0, coins: 0 },
    },
    classic: {
        name: "Classic", ticketPrice: 10, roomSize: 6, matchmakingTime: 30,
        unlockRequirements: { level: 5, matches: 10, coins: 50 },
    },
    tournament: {
        name: "Tournament", ticketPrice: 20, roomSize: 10, matchmakingTime: 60,
        unlockRequirements: { level: 10, matches: 25, coins: 100 },
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
const PARTICIPATION_REWARD = 1;


function isFirestoreRoom(data: any): data is FirestoreRoom {
    return data && typeof data.status === 'string';
}

function initializePrizeStatus(settings: GameSettings): Record<PrizeType, any> {
    const status: Record<PrizeType, any> = {} as Record<PrizeType, any>;
    const prizeFormat = settings.prizeFormat || DEFAULT_GAME_SETTINGS.prizeFormat;
    const prizesForFormat = PRIZE_DEFINITIONS[prizeFormat] || Object.values(PRIZE_TYPES);

    (prizesForFormat as PrizeType[]).forEach(prize => {
        status[prize] = { claimedBy: [] }; // Firestore compatible
    });
    return status;
}

function calculatePrizes(totalPool: number, settings: GameSettings): Record<PrizeType, number> {
    const prizeFormat = settings.prizeFormat || 'Format 1';
    const prizeDefs = PRIZE_DEFINITIONS[prizeFormat] || [];
    const distPercentages = PRIZE_DISTRIBUTION_PERCENTAGES[prizeFormat] || {};
    
    const calculatedPrizes: Record<PrizeType, number> = {} as any;
    let sumOfPrizes = 0;
    
    // Calculate all prizes except Full House
    for (const prize of prizeDefs) {
        if (prize !== 'Full House') {
            const percentage = distPercentages[prize] || 0;
            const amount = Math.floor((totalPool * percentage) / 100);
            calculatedPrizes[prize] = amount;
            sumOfPrizes += amount;
        }
    }
    
    // Full House gets the remainder to ensure the total matches the pool
    if (prizeDefs.includes('Full House') && totalPool > 0) {
      calculatedPrizes['Full House'] = totalPool - sumOfPrizes;
    } else {
      calculatedPrizes['Full House'] = 0;
    }

    return calculatedPrizes;
}


export default function GameRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const roomId = Array.isArray(params.id) ? params.id[0] ?? '' : params.id ?? '';
  const { toast } = useToast();
  const { currentUser, loading: authLoading, fetchUser } = useAuth();
  const { playSound } = useSound();
  const { triggerAnimation } = useCoinAnimation();

  const [roomData, setRoomData] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBotGame, setIsBotGame] = useState(false);
  
  const [playerProfiles, setPlayerProfiles] = useState<Map<string, User>>(new Map());

  const [myTickets, setMyTickets] = useState<HousieTicketGrid[]>([]);
  const [markedNumbers, setMarkedNumbers] = useState<Set<string>>(new Set());
  const [isCallingNextNumber, setIsCallingNextNumber] = useState(false);
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [newlyEarnedBadges, setNewlyEarnedBadges] = useState<Badge[]>([]);

  // State specifically for the display component
  const [displayCurrentNumber, setDisplayCurrentNumber] = useState<number | null>(null);
  const [displayCalledHistory, setDisplayCalledHistory] = useState<number[]>([]);
  const [allCalledNumbersForBoard, setAllCalledNumbersForBoard] = useState<number[]>([]);

  const roomDataRef = useRef(roomData);
  const previousPrizeStatusRef = useRef<Room['prizeStatus'] | null>(null);
  const previousCallingModeRef = useRef<CallingMode | undefined>();
  const gameOverSoundPlayedRef = useRef(false);
  const statsUpdateInitiatedRef = useRef(false);


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
  
  const handlePrizeClaimNotification = useCallback((newRoomData: Room) => {
    if (!currentUser) return;
    
    const oldPrizeStatus = previousPrizeStatusRef.current;
    const newPrizeStatus = newRoomData.prizeStatus;

    if (oldPrizeStatus && newPrizeStatus && !newRoomData.isGameOver) {
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
                        .map(claimant => claimant.id === currentUser?.uid ? "You" : claimant.name)
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
    previousPrizeStatusRef.current = newPrizeStatus;
  }, [currentUser, playSound, toast]);

  // Combined Firestore and In-Memory Game Listener
  useEffect(() => {
    if (!roomId || !db || !currentUser) {
        setError("Room ID or User not available for fetching game details.");
        setIsLoading(false);
        return;
    }

    const roomDocRef = doc(db, 'rooms', roomId);

    // Initial fetch to determine game type
    getDoc(roomDocRef).then(initialSnap => {
        if (initialSnap.exists()) {
            const data = initialSnap.data();
            const gameMode = data.settings?.gameMode;
            
            if (gameMode === 'multiplayer' || gameMode === 'online') {
                // Use Firestore for Friends (multiplayer) and Online modes
                const unsub = onSnapshot(roomDocRef, async (docSnap) => {
                    if (docSnap.exists()) {
                        const firestoreData = docSnap.data() as FirestoreRoom & { calledNumbers?: number[], currentNumber?: number, prizeStatus?: any };
                        
                        const playersColRef = collection(db, "rooms", roomId, "players");
                        const playersSnap = await getDocs(playersColRef);
                        const playersList = playersSnap.docs.map(p => p.data() as BackendPlayerInRoom);

                        const isGameActive = firestoreData.status === 'in-progress';
                        const isGameOver = firestoreData.status === 'finished';

                        const syntheticRoom: Room = {
                            id: firestoreData.id,
                            host: firestoreData.host,
                            players: playersList,
                            settings: firestoreData.settings || DEFAULT_GAME_SETTINGS,
                            createdAt: firestoreData.createdAt.toDate(),
                            isGameStarted: isGameActive || isGameOver,
                            isGameOver: isGameOver,
                            currentNumber: firestoreData.currentNumber || null,
                            calledNumbers: firestoreData.calledNumbers || [],
                            numberPool: [], // Not used client-side for Firestore games
                            prizeStatus: firestoreData.prizeStatus || initializePrizeStatus(firestoreData.settings),
                            totalPrizePool: (firestoreData.settings.ticketPrice || 0) * playersList.reduce((acc, p) => acc + (p.tickets?.length || 0), 0)
                        };
                        
                        handlePrizeClaimNotification(syntheticRoom);
                        setRoomData(syntheticRoom);
                        setIsLoading(false);
                        
                        // Set tickets if not already set
                        const me = playersList.find(p => p.id === currentUser.uid);
                        if(me && me.tickets) {
                          setMyTickets(me.tickets);
                        }

                    } else {
                        setError("This room no longer exists.");
                    }
                });
                return unsub;
            } else {
                 // Use Polling for Bot games (easy, medium, hard)
                 setIsBotGame(true);
                 const fetchBotGame = async () => {
                     try {
                        const response = await fetch(`/api/rooms/${roomId}`);
                        if (!response.ok) throw new Error("Room not found");
                        const data: Room = await response.json();
                        handlePrizeClaimNotification(data);
                        setRoomData(data);
                        const me = data.players.find(p => p.id === currentUser.uid);
                        if (me && me.tickets) setMyTickets(me.tickets);
                     } catch(e) {
                         setError((e as Error).message);
                     } finally {
                        setIsLoading(false);
                     }
                 }
                 fetchBotGame(); // Initial fetch
                 const interval = setInterval(fetchBotGame, 3000);
                 return () => clearInterval(interval);
            }
        } else {
            setError("Room not found.");
            setIsLoading(false);
        }
    });

  }, [roomId, currentUser, db, handlePrizeClaimNotification]);

  // Client-side "ticker" for all game modes, only for the host.
  useEffect(() => {
    if (!roomData || !currentUser || !roomData.host || roomData.host.id !== currentUser.uid) {
        return;
    }

    const isAutoMode = roomData.settings.callingMode === 'auto';
    if (!isAutoMode) return;

    const intervalId = setInterval(() => {
        const currentRoom = roomDataRef.current;
        if (currentRoom && currentRoom.isGameStarted && !currentRoom.isGameOver) {
            const endpoint = isBotGame ? `/api/rooms/${currentRoom.id}/call-number` : '/api/online/call-number';
            const body = { roomId: currentRoom.id, hostId: currentUser.uid };
            
            fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            .then(res => res.json())
            .then(data => {
              if (data && !data.success && isBotGame) {
                 setRoomData(data);
              }
            })
            .catch(err => {
                console.warn("Failed to ping for number call:", err);
            });
        }
    }, SERVER_CALL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [isBotGame, roomData, currentUser]);


  // This effect runs ONCE when the game is over to trigger the stat update for all game modes.
  useEffect(() => {
    if (roomData?.isGameOver && currentUser && !statsUpdateInitiatedRef.current) {
        statsUpdateInitiatedRef.current = true; // Prevents re-running
        localStorage.removeItem(`markedNumbers-${roomId}-${currentUser.uid}`);
        
        const endpoint = isBotGame ? `/api/rooms/${roomId}/update-stats` : `/api/online/update-stats`;
        const body = { roomId, userId: currentUser.uid };

        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
              if (data.winnings > 0) {
                triggerAnimation(data.winnings);
              }
              if (data.newlyEarnedBadges && data.newlyEarnedBadges.length > 0) {
                setNewlyEarnedBadges(data.newlyEarnedBadges);
              }
            }
            fetchUser(); // Refresh user data after stats are updated
        })
        .catch(error => {
            console.error("Failed to trigger stats update:", error);
            toast({
                title: "Stats Sync Error",
                description: "Could not save your game stats.",
                variant: "destructive"
            });
        });
    }
  }, [roomData?.isGameOver, currentUser, roomId, toast, triggerAnimation, isBotGame, fetchUser]);

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

  // Announce new numbers and update display state
  useEffect(() => {
    if (roomData && roomData.currentNumber !== null && roomData.currentNumber !== displayCurrentNumber) {
      // Announce the number
      announce(roomData.currentNumber);
      
      // Update display state
      setDisplayCalledHistory(prevHistory => {
          if(displayCurrentNumber !== null) {
              return [displayCurrentNumber, ...prevHistory];
          }
          return prevHistory;
      });
      setDisplayCurrentNumber(roomData.currentNumber);
      setAllCalledNumbersForBoard(prevBoard => [roomData.currentNumber!, ...prevBoard]);
      
      // Trigger animation
      setAnimationKey(prev => prev + 1);
    }
  }, [roomData?.currentNumber, announce, displayCurrentNumber]);


  const handleNumberClick = (ticketIndex: number, numberValue: number, rowIndex: number, colIndex: number) => {
    if (!roomData || roomData.isGameOver || myTickets.length === 0) return;
    const key = `${ticketIndex}-${rowIndex}-${colIndex}`;

    if (markedNumbers.has(key)) {
      return; 
    }

    if (allCalledNumbersForBoard.includes(numberValue)) {
      playSound('marking number.wav');
      setMarkedNumbers(prev => {
        const newMarked = new Set(prev);
        newMarked.add(key);
        return newMarked;
      });
    }
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
    const numbersToValidate = allCalledNumbersForBoard;

    for (let i = 0; i < myTickets.length; i++) {
        const ticket = myTickets[i];
        
        let isValid = false;
        // Early 5 check is special, doesn't use housie library
        if (prizeType === PRIZE_TYPES.EARLY_5) {
            const markedAndCalledCount = ticket.flat().filter(num => num !== null && numbersToValidate.includes(num)).length;
            if (markedAndCalledCount >= 5) {
                isValid = true;
            }
        } else {
            const housieLib = require('@/lib/housie');
            isValid = housieLib.checkWinningCondition(ticket, numbersToValidate, prizeType);
        }

        if (isValid) {
            if (prizeType === PRIZE_TYPES.EARLY_5) {
                let markedAndCalledCountOnThisTicket = 0;
                 ticket.forEach((row, r) => {
                    row.forEach((num, c) => {
                        if (num !== null && numbersToValidate.includes(num)) {
                            if (markedNumbers.has(`${i}-${r}-${c}`)) {
                                markedAndCalledCountOnThisTicket++;
                            }
                        }
                    });
                });
                if (markedAndCalledCountOnThisTicket >= 5) {
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

    const endpoint = roomData.settings.gameMode === 'multiplayer' || roomData.settings.gameMode === 'online' ? `/api/online/claim-prize` : `/api/rooms/${roomId}/claim-prize`;
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, playerId: currentUser.uid, prizeType, ticketIndex: winningTicketIndex }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Failed to claim ${prizeType}.`);
      }
    } catch (err) {
      console.error(`Error claiming ${prizeType}:`, err);
      toast({ title: "Network Error", description: `Could not claim ${prizeType}.`, variant: "destructive" });
    }
  };

  const isCurrentUserHost = roomData?.host?.id === currentUser?.uid;

  const handlePlayAgain = async () => {
    if (!currentUser || !roomData) return;
    
    setIsResetting(true);

    if (isBotGame) {
        playSound('cards.mp3');
        router.push(`/play-with-computer`);
        return;
    } else { // It's a friends or online game
        if (roomData.settings.gameMode === 'online') {
            playSound('cards.mp3');
            router.push(`/online`);
        } else { // Friends game
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
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentUser) {
      router.push('/');
      return;
    }
    try {
      if (roomData?.settings.gameMode === 'multiplayer' || roomData?.settings.gameMode === 'online') {
          // No refund for online/friends games once started
          if (roomData?.isGameStarted) {
               // Just leave
          } else {
             // Logic to refund if lobby
          }
      }
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
  
  if (!roomData.isGameStarted && !roomData.isGameOver) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Waiting for Game to Start</h2>
        <p className="text-muted-foreground mb-6">The game will begin shortly. Get ready!</p>
      </div>
    )
  }

  const gameSettings: GameSettings = roomData.settings || DEFAULT_GAME_SETTINGS;
  const currentPrizeFormat = gameSettings.prizeFormat || 'Format 1';
  const prizesForFormat = PRIZE_DEFINITIONS[currentPrizeFormat] || [];
  const totalPrizePool = roomData.totalPrizePool || 0;
  
  const ticketsText = (count: number) => count === 1 ? 'ticket' : 'tickets';
  
  const formatCoins = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };
  
  const finalPrizes = calculatePrizes(totalPrizePool, gameSettings);
  const hasPrizePool = roomData.settings.ticketPrice > 0;

  if (roomData.isGameOver) {
    let totalWinnings = 0;
    let xpGained = 0;
    const currentUserPrizeNames: PrizeType[] = [];
    const isFriendsOrOnlineGame = roomData.settings.gameMode === 'multiplayer' || roomData.settings.gameMode === 'online';

    if (currentUser) {
        xpGained += XP_PER_GAME_PARTICIPATION * (isFriendsOrOnlineGame ? XP_MODIFIER_ONLINE : 1);

        for (const prize in roomData.prizeStatus) {
            const castedPrize = prize as PrizeType;
            if (roomData.prizeStatus[castedPrize]?.claimedBy.some(c => c.id === currentUser.uid)) {
                currentUserPrizeNames.push(castedPrize);
                xpGained += (XP_PER_PRIZE_WIN[castedPrize] || 0) * (isFriendsOrOnlineGame ? XP_MODIFIER_ONLINE : 1);
            }
        }
        
        if (isBotGame && roomData.settings.gameMode) {
            currentUserPrizeNames.forEach(prize => {
                totalWinnings += OFFLINE_COIN_REWARDS[roomData.settings.gameMode as 'easy' | 'medium' | 'hard'][prize] || 0;
            });
            totalWinnings += PARTICIPATION_REWARD;
        } else if (isFriendsOrOnlineGame) {
            currentUserPrizeNames.forEach(prize => {
                const claimInfo = roomData.prizeStatus[prize];
                if (claimInfo) {
                    const prizeAmount = finalPrizes[prize] || 0;
                    const prizePerWinner = claimInfo.claimedBy.length > 0 ? Math.floor(prizeAmount / claimInfo.claimedBy.length) : 0;
                    totalWinnings += prizePerWinner;
                }
            });
        }
        
        let currentLevel = currentUser.stats.level || 1;
        let currentXp = (currentUser.stats.xp || 0) + xpGained;
        let xpForNext = getXpForNextLevel(currentLevel);

        while (currentXp >= xpForNext) {
            currentLevel++;
            currentXp -= xpForNext;
            totalWinnings += getCoinsForLevelUp(currentLevel);
        }
    }
    
    const playAgainButtonText = isBotGame ? "Play Again" : "To Lobby";
    
    return (
      <>
        <Header />
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
                {(hasPrizePool) && (
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
                    const claimInfo = roomData.prizeStatus[prize as PrizeType];
                    const isClaimed = claimInfo && claimInfo.claimedBy.length > 0;
                    
                    let prizeStatusText = "Not Claimed";
                    if (isClaimed) {
                      const winnerNames = claimInfo.claimedBy.map(c => c.id === currentUser?.uid ? 'You' : c.name).join(', ');
                      prizeStatusText = `Claimed by ${winnerNames}`;
                    }
                    
                    if (!hasPrizePool) { // Bot games
                       const rewardAmount = (roomData.settings.gameMode && OFFLINE_COIN_REWARDS[roomData.settings.gameMode as keyof typeof OFFLINE_COIN_REWARDS]) ? OFFLINE_COIN_REWARDS[roomData.settings.gameMode as keyof typeof OFFLINE_COIN_REWARDS][prize as PrizeType] : 0;
                       return (
                           <li key={prize} className="flex flex-col text-sm bg-secondary/20 p-1.5 rounded-md">
                               <div className="flex justify-between items-center w-full">
                                  <span className="font-medium">{prize}</span>
                                  <div className="font-semibold flex items-center gap-1">
                                      <Image src="/coin.png" alt="Coin" width={16} height={16} />
                                      <span>{rewardAmount}</span>
                                  </div>
                               </div>
                               <span className={cn("text-xs text-right w-full", isClaimed ? "text-green-600 font-medium" : "text-muted-foreground/80")}>
                                  {prizeStatusText}
                              </span>
                          </li>
                        );
                    }

                    const prizeAmount = finalPrizes[prize as PrizeType] || 0;
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
                  {!hasPrizePool && (
                    <li className="flex flex-col text-sm bg-green-500/10 p-1.5 rounded-md border border-green-500/20 mt-2">
                        <div className="flex justify-between items-center w-full">
                            <span className="font-medium">Participation Reward</span>
                            <div className="font-semibold flex items-center gap-1 text-green-600">
                                <Image src="/coin.png" alt="Coin" width={16} height={16} />
                                <span>{PARTICIPATION_REWARD}</span>
                            </div>
                        </div>
                        <span className="text-xs text-right w-full text-muted-foreground/80">
                            Awarded for every game played
                        </span>
                    </li>
                  )}
                </ul>
              </div>

              {(totalWinnings > 0 || xpGained > 0) ? (
                  <div className="text-center p-4 bg-green-100 dark:bg-green-900/40 rounded-lg border border-green-500/50 space-y-2">
                      <p className="text-lg font-semibold">Congratulations, {currentUser.displayName}!</p>
                       {totalWinnings > 0 && (
                          <div className="text-2xl font-bold text-green-700 dark:text-green-300 flex items-center justify-center gap-2">
                              You won a total of <Image src="/coin.png" alt="Coins" width={24} height={24} /> {formatCoins(totalWinnings)}!
                          </div>
                      )}
                       {xpGained > 0 && (
                          <div className="text-lg font-bold text-blue-700 dark:text-blue-300 flex items-center justify-center gap-2">
                              You earned <Star className="h-5 w-5 fill-yellow-400 text-yellow-500" /> {Math.round(xpGained)} XP!
                          </div>
                      )}
                      {currentUserPrizeNames.length > 0 && (
                          <p className="text-sm text-muted-foreground">Your prizes: <span className="font-medium text-foreground">{currentUserPrizeNames.join(', ')}</span></p>
                      )}
                  </div>
              ) : (
                  <div className="text-center p-4 bg-secondary/50 rounded-lg">
                      <p className="font-semibold text-muted-foreground">You didn't win a prize this time, but well played!</p>
                       {xpGained > 0 && (
                          <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center justify-center gap-2">
                              You earned <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" /> {Math.round(xpGained)} XP for participating.
                          </p>
                      )}
                  </div>
              )}

              <BadgeUnlockedDialog
                badges={newlyEarnedBadges}
                open={newlyEarnedBadges.length > 0}
                onOpenChange={() => setNewlyEarnedBadges([])}
              />

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
      </>
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

  const sortedCalledNumbers = [...allCalledNumbersForBoard].sort((a,b) => a - b);


  return (
    <>
      <div className="container mx-auto p-4 space-y-4">
        <Card className="shadow-none border-none bg-transparent relative">
          <CardContent className="p-2 sm:p-3 flex justify-between items-center text-sm gap-3">
            <div className="flex-grow">
               <div className="flex items-center gap-2 mb-1">
                  {(() => {
                    const { gameMode, tier } = roomData.settings;

                    if (isBotGame) {
                      return (
                        <>
                          <div className="px-2 py-1 text-xs font-bold text-white rounded-md capitalize bg-blue-600">Offline</div>
                          <div className={cn(
                            "px-2 py-1 text-xs font-bold text-white rounded-md capitalize",
                            gameMode === 'easy' && "bg-green-600",
                            gameMode === 'medium' && "bg-yellow-600",
                            gameMode === 'hard' && "bg-red-600",
                          )}>
                            {BOT_GAME_MODE_NAMES[gameMode as keyof typeof BOT_GAME_MODE_NAMES]}
                          </div>
                        </>
                      );
                    } else if (gameMode === 'online' && tier) {
                      return (
                         <>
                          <div className="px-2 py-1 text-xs font-bold text-white rounded-md capitalize bg-blue-600">Online</div>
                          <div className="px-2 py-1 text-xs font-bold text-white rounded-md capitalize bg-green-600">
                            {TIERS[tier]?.name || 'Mode'}
                          </div>
                        </>
                      );
                    } else {
                       return (
                        <div className="px-2 py-1 text-xs font-bold text-white rounded-md capitalize bg-purple-600">
                            Friends
                        </div>
                       );
                    }
                  })()}
              </div>
              <div className="font-semibold text-white flex items-center gap-2">
                  <span>{currentUser.displayName}</span>
                  {roomData.settings.gameMode === 'multiplayer' && (
                    <span className="font-mono text-xs opacity-80">#{roomId}</span>
                  )}
              </div>
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
                    {hasPrizePool && (
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
                  <Button variant="outline" size="icon" aria-label="Game Info & Players">
                    <Menu className="h-5 w-5 text-primary" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="flex flex-col bg-card/90 backdrop-blur-sm border-primary/20">
                  <SheetHeader className="text-center border-b pb-2">
                      <SheetTitle className="text-base">Game Info & Players</SheetTitle>
                  </SheetHeader>
                  <div className="py-2 space-y-4 flex-grow overflow-y-auto">
                      <Card className="bg-secondary/30">
                          <CardHeader className="p-3 pb-2">
                              <CardTitle className="text-sm font-semibold flex items-center">
                                  <Award className="mr-2 h-4 w-4 text-primary" />
                                  Prize Status
                              </CardTitle>
                              {hasPrizePool && <div className="text-xs text-muted-foreground flex items-center gap-1">Total Pool: <Image src="/coin.png" alt="Coins" width={12} height={12} />{formatCoins(totalPrizePool)}</div>}
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
                                      
                                      if (!hasPrizePool) {
                                          const rewardAmount = (roomData.settings.gameMode && OFFLINE_COIN_REWARDS[roomData.settings.gameMode as keyof typeof OFFLINE_COIN_REWARDS]) ? OFFLINE_COIN_REWARDS[roomData.settings.gameMode as keyof typeof OFFLINE_COIN_REWARDS][prize as PrizeType] : 0;
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

                                      const prizeAmount = finalPrizes[prize as PrizeType] || 0;
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
                                         const playerTickets = player.tickets?.length || 0;
                                         const ticketCost = playerTickets * gameSettings.ticketPrice;
                                         const playerProfile = playerProfiles.get(player.id);
                                         const badgeOrder = ['PLATINUM_PLAYER', 'GOLD_MASTER', 'SILVER_VETERAN', 'BRONZE_COMPETITOR', 'NOVICE'];
                                         const highestBadge = playerProfile ? badgeOrder.map(key => BADGE_DEFINITIONS[key]).find(badge => playerProfile.stats.badges?.includes(badge.name)) : undefined;

                                         return (
                                          <li key={player.id} className="flex justify-between items-center bg-background/50 p-1.5 rounded-md">
                                          <div className="flex items-center gap-1.5">
                                            {highestBadge && <Image src={highestBadge.icon} alt={highestBadge.name} width={16} height={16} />}
                                            <span className={cn("font-medium", player.id === currentUser?.uid && "text-primary font-bold")}>
                                                {player.name}
                                                {player.isHost && gameSettings.gameMode !== 'online' && <span className="ml-1 font-semibold text-primary">*</span>}
                                            </span>
                                          </div>
                                          <div className="text-muted-foreground flex items-center gap-1">
                                            <span>{playerTickets} {ticketsText(playerTickets)}</span>
                                            {hasPrizePool && 
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
                                    {hasPrizePool && !roomData.isGameOver
                                        ? "Leaving will forfeit your entry fee. Are you sure?"
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
                  currentNumber={displayCurrentNumber}
                  calledNumbers={displayCalledHistory}
                  isMuted={isVoiceMuted}
                  onToggleMute={() => setIsVoiceMuted(prev => !prev)}
                  animationKey={animationKey}
              />
          </div>

          {isCurrentUserHost && !isAutoCalling && !roomData.isGameOver && (
            <div className="w-full max-w-md">
              <Button 
                  onClick={() => {
                    const endpoint = isBotGame ? `/api/rooms/${roomId}/call-number` : `/api/online/call-number`;
                    fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ roomId, hostId: currentUser.uid }),
                    });
                  }}
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
                      calledNumbers={sortedCalledNumbers}
                      currentNumber={displayCurrentNumber}
                      remainingCount={NUMBERS_RANGE_MAX - sortedCalledNumbers.length}
                      calledCount={sortedCalledNumbers.length}
                  />
                  </DialogContent>
              </Dialog>
              </div>

              {myTickets.length === 0 && !roomData.isGameOver && roomData.isGameStarted && <p className="text-center text-muted-foreground">You are spectating or have no tickets in this game.</p>}
              
              <div className={cn("grid gap-x-1 gap-y-4 justify-items-center", getTicketLayoutClass(myTickets.length))}>
                {myTickets.map((ticket, index) => (
                  <div key={index} className={cn(
                    'w-full flex justify-center',
                    myTickets.length === 3 && index === 2 && 'lg:col-span-2'
                  )}>
                    <MemoizedHousieTicket
                      ticketIndex={index}
                      ticket={ticket}
                      calledNumbers={allCalledNumbersForBoard}
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
