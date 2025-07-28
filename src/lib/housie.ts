
import type { HousieTicketGrid, HousieTicketNumber } from '@/types';
import { TICKET_ROWS, TICKET_COLS, NUMBERS_PER_ROW, TOTAL_NUMBERS_PER_TICKET, NUMBERS_RANGE_MAX } from './constants';

// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Helper function to get the number range for a column
const getColRange = (colIndex: number): [number, number] => {
  if (colIndex === 0) return [1, 9];
  if (colIndex === TICKET_COLS - 1) return [80, 90]; // Col 9 is 80-90
  return [colIndex * 10, colIndex * 10 + 9];
};

/**
 * Generates a set of Housie tickets, limiting number repetitions across them.
 * A number can appear on a maximum of two tickets within the generated set.
 * @param count The number of tickets to generate.
 * @returns An array of Housie ticket grids.
 */
export function generateMultipleUniqueTickets(count: number): HousieTicketGrid[] {
  const allTickets: HousieTicketGrid[] = [];
  const numberUsageCount = new Map<number, number>();

  for (let i = 0; i < count; i++) {
    // Determine which numbers have already been used twice and should be excluded.
    const excludedNumbers = new Set<number>();
    for (const [num, usage] of numberUsageCount.entries()) {
      if (usage >= 2) {
        excludedNumbers.add(num);
      }
    }

    const newTicket = generateImprovedHousieTicket(excludedNumbers);
    allTickets.push(newTicket);

    // Update the usage count with numbers from the newly generated ticket.
    newTicket.flat().forEach(num => {
      if (num !== null) {
        numberUsageCount.set(num, (numberUsageCount.get(num) || 0) + 1);
      }
    });
  }
  return allTickets;
}


export function generateImprovedHousieTicket(excludedNumbers: Set<number> = new Set()): HousieTicketGrid {
  let ticket: HousieTicketGrid;
  let isValidTicket = false;
  let attempts = 0;
  const MAX_ATTEMPTS = 100; // Safety break for regeneration

  do {
    ticket = Array(TICKET_ROWS).fill(null).map(() => Array(TICKET_COLS).fill(null));
    
    // 1. Determine Column Populations (how many numbers each column will have)
    const col_populations: number[] = Array(TICKET_COLS).fill(1); // Each column starts with 1 number
    let numbers_left_to_assign_to_cols = TOTAL_NUMBERS_PER_TICKET - TICKET_COLS; // 15 - 9 = 6

    // Distribute the remaining 6 numbers ensuring no column exceeds 3 numbers
    let distribute_guard = 0;
    while (numbers_left_to_assign_to_cols > 0 && distribute_guard < 200) { // Increased guard for safety
      const randomColIdx = Math.floor(Math.random() * TICKET_COLS);
      if (col_populations[randomColIdx] < 3) {
        col_populations[randomColIdx]++;
        numbers_left_to_assign_to_cols--;
      }
      distribute_guard++;
    }

    // If numbers_left_to_assign_to_cols is not 0, the distribution might be imperfect.
    // This should be rare. The validation step will catch it.

    // 2. Select and Sort Numbers for Columns
    const column_number_sets: number[][] = [];
    for (let c = 0; c < TICKET_COLS; c++) {
      const [min, max] = getColRange(c);
      const numbers_in_range: number[] = [];
      for (let i = min; i <= max; i++) {
        if (!excludedNumbers.has(i)) {
          numbers_in_range.push(i);
        }
      }
      shuffleArray(numbers_in_range);
      const selected_numbers_for_col = numbers_in_range.slice(0, col_populations[c]);
      selected_numbers_for_col.sort((a, b) => a - b); // Sort numbers within each column set
      column_number_sets.push(selected_numbers_for_col);
    }

    // 3. Place Numbers in Grid
    // For each column, distribute its numbers into unique rows, sorted by row index to ensure vertical sort
    for (let c = 0; c < TICKET_COLS; c++) {
      const numbers_to_place = column_number_sets[c]; // These are already sorted: e.g. [12, 18]
      const count_for_this_col = numbers_to_place.length;

      const all_possible_rows = [0, 1, 2];
      shuffleArray(all_possible_rows); // Randomize which rows get picked for this column
      
      // Select `count_for_this_col` distinct rows
      const chosen_rows = all_possible_rows.slice(0, count_for_this_col);
      chosen_rows.sort((a, b) => a - b); // Sort chosen rows: e.g. [0, 2]

      // Place the sorted numbers into the sorted chosen rows for this column
      for (let i = 0; i < count_for_this_col; i++) {
        const row_idx = chosen_rows[i];
        const number_val = numbers_to_place[i];
        ticket[row_idx][c] = number_val;
      }
    }

    // 4. Validate Row Counts (ensure each row has NUMBERS_PER_ROW)
    isValidTicket = true;
    for (let r = 0; r < TICKET_ROWS; r++) {
      const numbersInRow = ticket[r].filter(num => num !== null).length;
      if (numbersInRow !== NUMBERS_PER_ROW) {
        isValidTicket = false;
        break;
      }
    }
    // Also validate that all 15 numbers were placed (implicit if row validation passes)
    const totalNumbersPlaced = ticket.flat().filter(n => n !== null).length;
    if (totalNumbersPlaced !== TOTAL_NUMBERS_PER_TICKET) {
        isValidTicket = false;
    }


    attempts++;
  } while (!isValidTicket && attempts < MAX_ATTEMPTS);

  if (!isValidTicket) {
    console.warn(`Failed to generate a valid Housie ticket that meets all row/column constraints after ${MAX_ATTEMPTS} attempts. The returned ticket might be imperfect or a fallback.`);
    // Fallback: could return a pre-defined valid ticket or throw an error
    // For now, returning the last (potentially imperfect) attempt to avoid crashing
  }
  
  return ticket;
}

export function checkWinningCondition(ticket: HousieTicketGrid, calledNumbers: number[], prizeType: string): boolean {
  const getRowNumbers = (rowIndex: number): number[] => {
    return ticket[rowIndex].filter(num => num !== null) as number[];
  };

  const allNumbersOnTicket = ticket.flat().filter(num => num !== null) as number[];

  switch (prizeType) {
    case "Early 5":
      const markedNumbersOnTicket = allNumbersOnTicket.filter(num => calledNumbers.includes(num));
      return markedNumbersOnTicket.length >= 5;
    
    case "First Line":
      const topRowNumbers = getRowNumbers(0);
      return topRowNumbers.length === NUMBERS_PER_ROW && topRowNumbers.every(num => calledNumbers.includes(num));
    case "Second Line":
      const middleRowNumbers = getRowNumbers(1);
      return middleRowNumbers.length === NUMBERS_PER_ROW && middleRowNumbers.every(num => calledNumbers.includes(num));
    case "Third Line":
      const bottomRowNumbers = getRowNumbers(2);
      return bottomRowNumbers.length === NUMBERS_PER_ROW && bottomRowNumbers.every(num => calledNumbers.includes(num));
    
    case "Full House":
      return allNumbersOnTicket.length === TOTAL_NUMBERS_PER_TICKET && allNumbersOnTicket.every(num => calledNumbers.includes(num));
      
    default:
      console.warn("Unknown prize type in checkWinningCondition:", prizeType);
      return false;
  }
}

/**
 * Generates a single Housie ticket.
 * This is an older, potentially flawed version. Use generateImprovedHousieTicket for better compliance with rules.
 */
export function generateHousieTicket(): HousieTicketGrid {
  // This function is considered deprecated. The `generateImprovedHousieTicket` is preferred.
  console.warn("DEPRECATED: generateHousieTicket() called. Use generateImprovedHousieTicket() instead.");
  // For safety, let it return a result from the improved one if called by mistake.
  return generateImprovedHousieTicket(); 
}
