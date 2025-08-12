

import { NextResponse, type NextRequest } from 'next/server';
import { getRoomStore } from '@/lib/server/game-store';
import { db } from '@/lib/firebase/config';
import { doc, increment, writeBatch, getDoc, updateDoc } from 'firebase/firestore';
import type { PrizeType, Room } from '@/types';
import { PRIZE_TYPES } from '@/types';

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
        // This case should not happen for registered users, but as a safeguard.
        return NextResponse.json({ success: true, message: 'Stats for guests are handled client-side.' });
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
    if (!playerInRoom || playerInRoom.isBot) {
      return NextResponse.json({ message: 'Player not found in this game or is a bot.' }, { status: 404 });
    }

    const playerDocRef = doc(db, "users", userId);
    const playerDoc = await getDoc(playerDocRef);
    if (!playerDoc.exists()) {
        return NextResponse.json({ message: 'User data not found in database.' }, { status: 404 });
    }
    
    const isBotGame = room.settings.gameMode && ['easy', 'medium', 'hard'].includes(room.settings.gameMode);
    const isFriendsGame = room.settings.gameMode === 'multiplayer';
    
    const statsUpdate: { [key: string]: any } = {
        'stats.matchesPlayed': increment(1)
    };

    let coinsEarned = 0;
    const prizesWonByPlayer: PrizeType[] = [];

    for (const prizeType in room.prizeStatus) {
        const prizeInfo = room.prizeStatus[prizeType as PrizeType];
        if (prizeInfo && prizeInfo.claimedBy.some(c => c.id === userId)) {
            prizesWonByPlayer.push(prizeType as PrizeType);
        }
    }
    
    prizesWonByPlayer.forEach(prize => {
        statsUpdate[`stats.prizesWon.${prize}`] = increment(1);
    });
    
    if (isBotGame && room.settings.gameMode) {
        const gameMode = room.settings.gameMode as 'easy' | 'medium' | 'hard';
        const modeRewards = OFFLINE_COIN_REWARDS[gameMode];
        
        coinsEarned += PARTICIPATION_REWARD;
        prizesWonByPlayer.forEach(prize => {
            coinsEarned += modeRewards[prize] || 0;
        });
    } else if (isFriendsGame) {
        // Friends game with ticket price
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
    
    await updateDoc(playerDocRef, statsUpdate);
    processedGames.add(processedKey);

    return NextResponse.json({ success: true, message: 'Stats updated successfully.' });

  } catch (error) {
    console.error(`Error updating stats for room ${roomId}:`, error);
    return NextResponse.json({ message: 'Error updating stats', error: (error as Error).message }, { status: 500 });
  }
}
