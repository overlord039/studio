

import { NextResponse, type NextRequest } from 'next/server';
import { getRoomStore } from '@/lib/server/game-store';
import { db } from '@/lib/firebase/config';
import { doc, increment, writeBatch, getDoc, updateDoc, runTransaction } from 'firebase/firestore';
import type { PrizeType, Room, UserStats } from '@/types';
import { PRIZE_TYPES } from '@/types';
import { PRIZE_DISTRIBUTION_PERCENTAGES, XP_PER_GAME_PARTICIPATION, XP_PER_PRIZE_WIN, getXpForNextLevel } from '@/lib/constants';

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
                prizesWonByPlayer.forEach(prize => {
                     const claimInfo = room.prizeStatus[prize];
                     if (claimInfo) {
                        const percentage = PRIZE_DISTRIBUTION_PERCENTAGES['Format 1'][prize] || 0;
                        const prizeAmount = ((room.totalPrizePool || 0) * percentage) / 100;
                        const prizePerWinner = claimInfo.claimedBy.length > 0 ? Math.floor(prizeAmount / claimInfo.claimedBy.length) : 0;
                        coinsEarned += prizePerWinner;
                     }
                });
            }
        }
        
        if (coinsEarned > 0) {
          statsUpdate['stats.coins'] = increment(coinsEarned);
        }
        totalWinnings = coinsEarned;

        // Leveling up logic
        let currentLevel = currentStats.level || 1;
        let currentXp = (currentStats.xp || 0) + xpGained;
        let xpForNext = getXpForNextLevel(currentLevel);

        while (currentXp >= xpForNext) {
            currentLevel++;
            currentXp -= xpForNext;
            xpForNext = getXpForNextLevel(currentLevel);
        }

        statsUpdate['stats.level'] = currentLevel;
        statsUpdate['stats.xp'] = currentXp;

        transaction.update(playerDocRef, statsUpdate);
    });

    processedGames.add(processedKey);

    return NextResponse.json({ success: true, message: 'Stats updated successfully.', winnings: totalWinnings });

  } catch (error) {
    console.error(`Error updating stats for room ${roomId}:`, error);
    return NextResponse.json({ message: 'Error updating stats', error: (error as Error).message }, { status: 500 });
  }
}
