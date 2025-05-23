
export interface Player {
  id: string; // Will typically be derived from username or a unique auth ID
  name: string;
  isHost?: boolean;
  ticketsToBuy?: number; // Lobby UI state, may not be persisted on server player object initially
}

export type TicketPrice = 5 | 10 | 20 | 25 | 50 | 100;

export type PrizeFormat = "Format 1"; // Simplified to one standard format

export interface GameSettings {
  ticketPrice: TicketPrice;
  lobbySize: number;
  prizeFormat: PrizeFormat;
}

export interface Room {
  id: string;
  host: Player;
  players: Player[];
  settings: GameSettings;
  createdAt: Date | string; // Allow string for serialization
  isGameStarted?: boolean;
}

// A Housie ticket is a 3x9 grid. Each cell can be a number or null (empty).
export type HousieTicketNumber = number | null;
export type HousieTicketRow = HousieTicketNumber[];
export type HousieTicketGrid = HousieTicketRow[];

export interface Claim {
  prizeName: string;
  playerId: string;
  timestamp: Date;
}

export interface Prize {
  name: string;
  amount: number; // Or percentage of prize pool
  claimedBy?: string[]; // Player IDs, changed to array for multiple winners
  isClaimable: boolean;
}

export const PRIZE_TYPES = {
  JALDI_5: "Jaldi 5",
  TOP_LINE: "Top Line",
  MIDDLE_LINE: "Middle Line",
  BOTTOM_LINE: "Bottom Line",
  FULL_HOUSE: "Full House",
} as const;

export type PrizeType = typeof PRIZE_TYPES[keyof typeof PRIZE_TYPES];

export interface GameState {
  roomId: string;
  players: Player[];
  settings: GameSettings;
  tickets: Record<string, HousieTicketGrid[]>; // playerId to array of tickets
  calledNumbers: number[];
  currentNumber: number | null;
  claims: Claim[];
  prizePool: number;
  prizeDistribution: Prize[];
  isGameStarted: boolean;
  isGameOver: boolean;
  gameHostId: string;
}
