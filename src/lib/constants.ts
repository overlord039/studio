
import type { TicketPrice, PrizeFormat, Prize, PrizeType } from '@/types';

export const TICKET_PRICES: TicketPrice[] = [5, 10, 20, 25, 50, 100];
export const PRIZE_FORMATS: PrizeFormat[] = ["Format 1", "Format 2"];

export const MIN_LOBBY_SIZE = 5;
export const MAX_LOBBY_SIZE = 50;

export const DEFAULT_TICKET_PRICE: TicketPrice = 10;
export const DEFAULT_LOBBY_SIZE = 10;
export const DEFAULT_PRIZE_FORMAT: PrizeFormat = "Format 1";

export const PRIZE_DEFINITIONS: Record<PrizeFormat, PrizeType[]> = {
  "Format 1": [
    "Jaldi 5",
    "Top Line",
    "Middle Line",
    "Bottom Line",
    "Full House",
  ],
  "Format 2": [
    "1st Jaldi 5",
    "2nd Jaldi 5",
    "Top Line",
    "Middle Line",
    "Bottom Line",
    "2nd Full House",
    "1st Full House",
  ],
};

// Example prize money distribution percentages (sum to 100 for each format)
// This needs careful design based on game rules. These are placeholders.
export const PRIZE_DISTRIBUTION_PERCENTAGES: Record<PrizeFormat, Record<PrizeType, number>> = {
  "Format 1": {
    "Jaldi 5": 10,
    "Top Line": 15,
    "Middle Line": 15,
    "Bottom Line": 15,
    "Full House": 45,
    // Ensure all prizes in PRIZE_DEFINITIONS for Format 1 are covered
    "1st Jaldi 5": 0, // Not in Format 1
    "2nd Jaldi 5": 0, // Not in Format 1
    "1st Full House": 0, // Not in Format 1
    "2nd Full House": 0, // Not in Format 1
  },
  "Format 2": {
    "1st Jaldi 5": 10,
    "2nd Jaldi 5": 5, // Smaller prize for 2nd
    "Top Line": 10,
    "Middle Line": 10,
    "Bottom Line": 10,
    "2nd Full House": 20,
    "1st Full House": 35,
    // Ensure all prizes in PRIZE_DEFINITIONS for Format 2 are covered
    "Jaldi 5": 0, // Not in Format 2 (replaced by 1st/2nd)
    "Full House": 0, // Not in Format 2 (replaced by 1st/2nd)
  },
};

export const NUMBERS_RANGE_MIN = 1;
export const NUMBERS_RANGE_MAX = 90;
export const TICKET_ROWS = 3;
export const TICKET_COLS = 9;
export const NUMBERS_PER_ROW = 5;
export const BLANKS_PER_ROW = TICKET_COLS - NUMBERS_PER_ROW; // 4
export const TOTAL_NUMBERS_PER_TICKET = NUMBERS_PER_ROW * TICKET_ROWS; // 15
