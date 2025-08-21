


export interface UserStats {
  matchesPlayed: number;
  prizesWon: Record<PrizeType, number>;
  usernameChanged?: boolean;
  coins: number;
  level: number;
  xp: number;
  lastLogin?: string; // ISO string
  loginStreak?: number;
  lastClaimedDay?: number; // Day of the streak (1-7)
}

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isGuest: boolean;
  createdAt: string;
  stats: UserStats;
}

export interface Player {
  id: string; // Will typically be derived from username or a unique auth ID
  name: string;
  isHost?: boolean;
  isBot?: boolean;
}

export interface BackendPlayerInRoom extends Player {
  tickets: HousieTicketGrid[];
  isBot: boolean;
  confirmedTicketCost?: number;
}

export type TicketPrice = 5 | 10 | 20 | 25 | 50 | 100;
export type PrizeFormat = "Format 1";
export type CallingMode = 'auto' | 'manual';

export interface GameSettings {
  ticketPrice: TicketPrice | number; // Allow number for coin-based prices
  lobbySize: number;
  prizeFormat?: PrizeFormat;
  numberOfTicketsPerPlayer?: number; // How many tickets each player gets by default
  callingMode?: CallingMode;
  isPublic?: boolean;
  gameMode?: 'multiplayer' | 'easy' | 'medium' | 'hard' | 'online' | 'classic' | 'rush';
  tier?: OnlineGameTier;
}

export const PRIZE_TYPES = {
  EARLY_5: "Early 5",
  FIRST_LINE: "First Line",
  SECOND_LINE: "Second Line",
  THIRD_LINE: "Third Line",
  FULL_HOUSE: "Full House",
} as const;

export type PrizeType = typeof PRIZE_TYPES[keyof typeof PRIZE_TYPES];

export interface PrizeClaimant {
  id: string;
  name: string;
}

export interface PrizeClaim {
  claimedBy: PrizeClaimant[]; 
  timestamp?: Date | string;
}

export type HousieTicketNumber = number | null;
export type HousieTicketGrid = HousieTicketNumber[][];


export interface Room {
  id: string;
  host: Player; // Just basic Player info for the host
  players: BackendPlayerInRoom[]; // Detailed player info including tickets
  settings: GameSettings;
  createdAt: Date | string;
  isGameStarted: boolean;
  isGameOver: boolean;
  
  // Game-specific state
  currentNumber: number | null;
  calledNumbers: number[];
  numberPool: number[]; // Numbers 1-90, shuffled, numbers are removed as they are called
  prizeStatus: Record<PrizeType, PrizeClaim | null >; // Tracks who claimed what
  lastNumberCalledTimestamp?: Date | string; // Timestamp of the last number call
  totalPrizePool?: number;
}

// Types for Online Mode
export type OnlineGameTier = 'quick' | 'classic' | 'tournament';

export interface TierConfig {
    name: string;
    ticketPrice: number;
    roomSize: number;
    matchmakingTime: number;
    unlockRequirements: {
        matches: number;
        coins: number;
        level: number;
    };
}

// Firestore specific types for strong typing with transactions/listeners
import type { Timestamp } from 'firebase/firestore';

export interface FirestoreRoom {
    id: string;
    host: Player;
    settings: GameSettings;
    status: 'waiting' | 'pre-game' | 'in-progress' | 'finished';
    playersCount: number;
    humanCount: number;
    tier: OnlineGameTier;
    isPublic: boolean;
    createdAt: Timestamp;
    timerEnd?: Timestamp;
    preGameEndTime?: Timestamp;
    gameStartTime?: Timestamp;
    playersWhoUpdatedStats?: string[]; // To track who has updated their stats
    botTickets?: Record<string, HousieTicketGrid[]>;
}


export interface FirestorePlayer {
    id: string;
    name: string;
    type: 'human' | 'bot';
    tickets: number; // Storing ticket count for simplicity in this model
    joinedAt: Timestamp;
}


    

