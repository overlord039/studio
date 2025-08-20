
import type { TicketPrice, PrizeFormat, PrizeType, GameSettings } from '@/types';
import { PRIZE_TYPES } from '@/types';

export const TICKET_PRICES: TicketPrice[] = [5, 10, 20, 25, 50, 100];
export const PRIZE_FORMATS: PrizeFormat[] = ["Format 1"]; // Only one standard format

export const MIN_LOBBY_SIZE = 2; // Adjusted for typical games
export const MAX_LOBBY_SIZE = 50;

export const DEFAULT_NUMBER_OF_TICKETS_PER_PLAYER = 1;

export const SERVER_CALL_INTERVAL = 6000; // 6 seconds

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  ticketPrice: 10,
  lobbySize: 10,
  prizeFormat: "Format 1",
  numberOfTicketsPerPlayer: DEFAULT_NUMBER_OF_TICKETS_PER_PLAYER,
  callingMode: 'auto',
  gameMode: 'multiplayer',
};


export const PRIZE_DEFINITIONS: Record<PrizeFormat, PrizeType[]> = {
  "Format 1": [
    PRIZE_TYPES.EARLY_5,
    PRIZE_TYPES.FIRST_LINE,
    PRIZE_TYPES.SECOND_LINE,
    PRIZE_TYPES.THIRD_LINE,
    PRIZE_TYPES.FULL_HOUSE,
  ],
};

// Prize money distribution percentages, must sum to 100 for "Format 1"
// This is more for client-side display; backend might handle actual currency if it were real money.
export const PRIZE_DISTRIBUTION_PERCENTAGES: Record<PrizeFormat, Record<PrizeType, number>> = {
  "Format 1": {
    [PRIZE_TYPES.EARLY_5]: 10,
    [PRIZE_TYPES.FIRST_LINE]: 20,
    [PRIZE_TYPES.SECOND_LINE]: 20,
    [PRIZE_TYPES.THIRD_LINE]: 20,
    [PRIZE_TYPES.FULL_HOUSE]: 30,
  },
};

export const NUMBERS_RANGE_MIN = 1;
export const NUMBERS_RANGE_MAX = 90;
export const TICKET_ROWS = 3;
export const TICKET_COLS = 9;
export const NUMBERS_PER_ROW = 5;
export const BLANKS_PER_ROW = TICKET_COLS - NUMBERS_PER_ROW; // 4
export const TOTAL_NUMBERS_PER_TICKET = NUMBERS_PER_ROW * TICKET_ROWS; // 15

// XP and Leveling Constants
export const XP_PER_GAME_PARTICIPATION = 10;
export const XP_PER_PRIZE_WIN = {
  [PRIZE_TYPES.EARLY_5]: 5,
  [PRIZE_TYPES.FIRST_LINE]: 10,
  [PRIZE_TYPES.SECOND_LINE]: 10,
  [PRIZE_TYPES.THIRD_LINE]: 10,
  [PRIZE_TYPES.FULL_HOUSE]: 25,
};

export const getXpForNextLevel = (level: number) => {
    // This formula creates a curve where leveling up gets progressively harder.
    // Level 1 -> 2 needs 100 XP.
    // Level 10 -> 11 needs ~3162 XP.
    return Math.floor(100 * Math.pow(level, 1.5));
};

// New constant to make online play more rewarding
export const XP_MODIFIER_ONLINE = 1.5;
