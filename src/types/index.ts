

export interface UserStats {
  matchesPlayed: number;
  prizesWon: Record<PrizeType, number>;
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
  email?: string | null;
  isBot?: boolean;
}

export interface BackendPlayerInRoom extends Player {
  tickets: HousieTicketGrid[];
  email: string; // Make it mandatory for backend (will have a fallback)
  isBot: boolean;
}

export type TicketPrice = 5 | 10 | 20 | 25 | 50 | 100;
export type PrizeFormat = "Format 1";
export type CallingMode = 'auto' | 'manual';

export interface GameSettings {
  ticketPrice: TicketPrice;
  lobbySize: number;
  prizeFormat: PrizeFormat;
  numberOfTicketsPerPlayer: number; // How many tickets each player gets by default
  callingMode: CallingMode;
  isPublic?: boolean;
  gameMode?: 'multiplayer' | 'easy' | 'hard';
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
}

// A Housie ticket is a 3x9 grid. Each cell can be a number or null (empty).
export type HousieTicketNumber = number | null;
export type HousieTicketRow = HousieTicketNumber[];
export type HousieTicketGrid = HousieTicketRow[];
