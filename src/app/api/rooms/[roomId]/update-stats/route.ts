
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { getRoomStore } from '@/lib/server/game-store';
import { db } from '@/lib/firebase/config';
import { doc, increment, writeBatch, getDoc, updateDoc, runTransaction } from 'firebase/firestore';
import type { PrizeType, Room, UserStats, GameSettings } from '@/types';
import { PRIZE_TYPES } from '@/types';
import { PRIZE_DISTRIBUTION_PERCENTAGES, XP_PER_GAME_PARTICIPATION, XP_PER_PRIZE_WIN, getXpForNextLevel, PRIZE_DEFINITIONS, getCoinsForLevelUp } from '@/lib/constants';
import { checkAndAwardBadges, type Badge } from '@/lib/badges';

// Define coin rewards for offline games
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

// Simple in-memory cache to prevent multiple updates for the same game by the same user.
const processedGames = new Set<string>();

// Helper function to calculate final prize distribution accurately
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


export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;

  try {
    const { userId } = (await request.json()) as { userId: string };

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }
    if (!db) {
        // This case should not happen if the app is configured, but as a safeguard.
        return NextResponse.json({ success: false, message: 'Database not configured.' }, { status: 500 });
    }

    // --- Idempotency Check ---
    const processedKey = `${roomId}-${userId}`;
    if (processedGames.has(processedKey)) {
        return NextResponse.json({ success: true, message: 'Stats already updated for this game.' });
    }

    const room = getRoomStore(roomId);
    if (!room) {
      return NextResponse.json({ message: 'Room not found.' }, { status: 404 });
    }

    if (!room.isGameOver) {
      return NextResponse.json({ message: 'Game is not over yet. Stats cannot be updated.' }, { status: 400 });
    }
    
    const playerInRoom = room.players.find(p => p.id === userId);
    if (!playerInRoom) { // Bots are not in this list for stats, so this check is for humans
      return NextResponse.json({ message: 'Player not found in this game.' }, { status: 404 });
    }

    const playerDocRef = doc(db, "users", userId);
    let totalWinnings = 0;
    let newlyEarnedBadges: Badge[] = [];

    await runTransaction(db, async (transaction) => {
        const playerDoc = await transaction.get(playerDocRef);
        if (!playerDoc.exists()) {
            console.warn(`User document for userId ${userId} not found. Cannot update stats.`);
            return;
        }

        const currentStats: UserStats = playerDoc.data().stats || {};
        const statsUpdate: { [key: string]: any } = {
            'stats.matchesPlayed': increment(1)
        };
        
        let coinsEarned = 0;
        let xpGained = XP_PER_GAME_PARTICIPATION;
        const prizesWonByPlayer: PrizeType[] = [];

        for (const prizeType in room.prizeStatus) {
            const prizeInfo = room.prizeStatus[prizeType as PrizeType];
            if (prizeInfo && prizeInfo.claimedBy.some(c => c.id === userId)) {
                prizesWonByPlayer.push(prizeType as PrizeType);
            }
        }
        
        prizesWonByPlayer.forEach(prize => {
            statsUpdate[`stats.prizesWon.${prize}`] = increment(1);
            xpGained += XP_PER_PRIZE_WIN[prize] || 0;
        });

        if (prizesWonByPlayer.length > 0) {
            statsUpdate['stats.totalPrizesWon'] = increment(prizesWonByPlayer.length);
        }
        
        const isBotGame = room.settings.gameMode && ['easy', 'medium', 'hard'].includes(room.settings.gameMode);
        const isFriendsGame = room.settings.gameMode === 'multiplayer';

        if (isBotGame && room.settings.gameMode) {
            const gameMode = room.settings.gameMode as 'easy' | 'medium' | 'hard';
            const modeRewards = OFFLINE_COIN_REWARDS[gameMode];
            
            coinsEarned += PARTICIPATION_REWARD;
            prizesWonByPlayer.forEach(prize => {
                coinsEarned += modeRewards[prize] || 0;
            });
        } else if (isFriendsGame) {
            if ((room.totalPrizePool || 0) > 0) {
                 const finalPrizes = calculatePrizes(room.totalPrizePool || 0, room.settings);
                 prizesWonByPlayer.forEach(prize => {
                     const claimInfo = room.prizeStatus[prize];
                     if (claimInfo) {
                        const prizeAmount = finalPrizes[prize] || 0;
                        const prizePerWinner = claimInfo.claimedBy.length > 0 ? Math.floor(prizeAmount / claimInfo.claimedBy.length) : 0;
                        coinsEarned += prizePerWinner;
                     }
                });
            }
        }
        
        let currentLevel = currentStats.level || 1;
        let currentXp = (currentStats.xp || 0) + xpGained;
        let xpForNext = getXpForNextLevel(currentLevel);

        while (currentXp >= xpForNext) {
            currentLevel++;
            currentXp -= xpForNext;
            coinsEarned += getCoinsForLevelUp(currentLevel);
        }

        const prospectiveStats: UserStats = {
          ...currentStats,
          matchesPlayed: (currentStats.matchesPlayed || 0) + 1,
          prizesWon: prizesWonByPlayer.reduce((acc, prize) => {
              acc[prize] = (currentStats.prizesWon?.[prize] || 0) + 1;
              return acc;
          }, { ...currentStats.prizesWon }),
          totalPrizesWon: (currentStats.totalPrizesWon || 0) + prizesWonByPlayer.length,
          level: currentLevel,
          xp: currentXp
        };
        const badgeResult = checkAndAwardBadges(currentStats, prospectiveStats);
        coinsEarned += badgeResult.coinsAwarded;
        statsUpdate['stats.badges'] = badgeResult.badgeNames;
        newlyEarnedBadges = badgeResult.newlyEarnedBadges;

        if (coinsEarned > 0) {
          statsUpdate['stats.coins'] = increment(coinsEarned);
        }
        totalWinnings = coinsEarned;

        statsUpdate['stats.level'] = currentLevel;
        statsUpdate['stats.xp'] = currentXp;

        transaction.update(playerDocRef, statsUpdate);
    });

    processedGames.add(processedKey);

    return NextResponse.json({ success: true, message: 'Stats updated successfully.', winnings: totalWinnings, newlyEarnedBadges });

  } catch (error) {
    console.error(`Error updating stats for room ${roomId}:`, error);
    return NextResponse.json({ message: 'Error updating stats', error: (error as Error).message }, { status: 500 });
  }
}
