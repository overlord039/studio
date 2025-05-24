
export interface Player {
  id: string; // Will typically be derived from username or a unique auth ID
  name: string;
  isHost?: boolean;
  // ticketsToBuy is a client-side concept for the lobby, actual tickets are on BackendPlayerInRoom
}

export interface BackendPlayerInRoom extends Player {
  tickets: HousieTicketGrid[];
  // Add any other backend-specific player state here if needed
}

export type TicketPrice = 5 | 10 | 20 | 25 | 50 | 100;
export type PrizeFormat = "Format 1";

export interface GameSettings {
  ticketPrice: TicketPrice;
  lobbySize: number;
  prizeFormat: PrizeFormat;
  numberOfTicketsPerPlayer: number; // How many tickets each player gets by default
}

export const PRIZE_TYPES = {
  JALDI_5: "Jaldi 5",
  TOP_LINE: "Top Line",
  MIDDLE_LINE: "Middle Line",
  BOTTOM_LINE: "Bottom Line",
  FULL_HOUSE: "Full House",
} as const;

export type PrizeType = typeof PRIZE_TYPES[keyof typeof PRIZE_TYPES];

export interface PrizeClaim {
  claimedBy: string[]; // Array of player IDs who claimed this
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
