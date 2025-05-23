
export interface Player {
  id: string;
  name: string;
  isHost?: boolean;
}

export type TicketPrice = 5 | 10 | 20 | 25 | 50 | 100;

export type PrizeFormat = "Format 1" | "Format 2";

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
  createdAt: Date;
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
  claimedBy?: string; // Player ID
  isClaimable: boolean;
}

export const PRIZE_TYPES = {
  JALDI_5: "Jaldi 5",
  FIRST_JALDI_5: "1st Jaldi 5",
  SECOND_JALDI_5: "2nd Jaldi 5",
  TOP_LINE: "Top Line",
  MIDDLE_LINE: "Middle Line",
  BOTTOM_LINE: "Bottom Line",
  FIRST_FULL_HOUSE: "1st Full House",
  SECOND_FULL_HOUSE: "2nd Full House",
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
