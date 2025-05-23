
import type { TicketPrice, PrizeFormat, PrizeType } from '@/types';
import { PRIZE_TYPES } from '@/types';

export const TICKET_PRICES: TicketPrice[] = [5, 10, 20, 25, 50, 100];
export const PRIZE_FORMATS: PrizeFormat[] = ["Format 1"]; // Only one standard format

export const MIN_LOBBY_SIZE = 5;
export const MAX_LOBBY_SIZE = 50;

export const DEFAULT_TICKET_PRICE: TicketPrice = 10;
export const DEFAULT_LOBBY_SIZE = 10;
export const DEFAULT_PRIZE_FORMAT: PrizeFormat = "Format 1";

export const PRIZE_DEFINITIONS: Record<PrizeFormat, PrizeType[]> = {
  "Format 1": [
    PRIZE_TYPES.JALDI_5,
    PRIZE_TYPES.TOP_LINE,
    PRIZE_TYPES.MIDDLE_LINE,
    PRIZE_TYPES.BOTTOM_LINE,
    PRIZE_TYPES.FULL_HOUSE,
  ],
};

// Prize money distribution percentages, must sum to 100 for "Format 1"
export const PRIZE_DISTRIBUTION_PERCENTAGES: Record<PrizeFormat, Record<PrizeType, number>> = {
  "Format 1": {
    [PRIZE_TYPES.JALDI_5]: 10,
    [PRIZE_TYPES.TOP_LINE]: 15,
    [PRIZE_TYPES.MIDDLE_LINE]: 15,
    [PRIZE_TYPES.BOTTOM_LINE]: 15,
    [PRIZE_TYPES.FULL_HOUSE]: 45,
  },
};

export const NUMBERS_RANGE_MIN = 1;
export const NUMBERS_RANGE_MAX = 90;
export const TICKET_ROWS = 3;
export const TICKET_COLS = 9;
export const NUMBERS_PER_ROW = 5;
export const BLANKS_PER_ROW = TICKET_COLS - NUMBERS_PER_ROW; // 4
export const TOTAL_NUMBERS_PER_TICKET = NUMBERS_PER_ROW * TICKET_ROWS; // 15
