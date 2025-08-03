

import { NextResponse, type NextRequest } from 'next/server';
import { getRoomStore } from '@/lib/server/game-store';
import { db } from '@/lib/firebase/config';
import { doc, increment, writeBatch, getDoc } from 'firebase/firestore';
import type { PrizeType } from '@/types';
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
        return NextResponse.json({ message: 'Firestore is not configured.' }, { status: 500 });
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
    
    // Online game stats (including coins & prizes) are handled separately in game-store.ts upon game completion.
    const isOnlineGame = room.settings.gameMode === 'online';
    if (isOnlineGame) {
        return NextResponse.json({ success: true, message: 'Stats for online games are handled separately.' });
    }

    // Logic for OFFLINE (BOT) & FRIENDS (MULTIPLAYER) games
    const isFriendsGame = room.settings.gameMode === 'multiplayer';
    
    const statsUpdate: { [key: string]: any } = {
        'stats.matchesPlayed': increment(1)
    };

    let coinsEarned = 0;
    const prizesWonByPlayer: PrizeType[] = [];

    // Determine which prizes the player won
    for (const prizeType in room.prizeStatus) {
        const prizeInfo = room.prizeStatus[prizeType as PrizeType];
        if (prizeInfo && prizeInfo.claimedBy.some(c => c.id === userId)) {
            prizesWonByPlayer.push(prizeType as PrizeType);
        }
    }
    
    if (!isFriendsGame && room.settings.gameMode) {
        // For bot games, calculate prize winnings and add participation reward
        const gameMode = room.settings.gameMode as 'easy' | 'medium' | 'hard';
        const modeRewards = OFFLINE_COIN_REWARDS[gameMode];
        
        coinsEarned += PARTICIPATION_REWARD; // Always award participation coins

        if (modeRewards && prizesWonByPlayer.length > 0) {
            prizesWonByPlayer.forEach(prize => {
                statsUpdate[`stats.prizesWon.${prize}`] = increment(1);
                coinsEarned += modeRewards[prize] || 0;
            });
        }
    } else if (isFriendsGame && prizesWonByPlayer.length > 0) { 
        // For friends game, only update prize count, no coins
        prizesWonByPlayer.forEach(prize => {
            statsUpdate[`stats.prizesWon.${prize}`] = increment(1);
        });
    }
    
    // Only update coins for non-friends games (i.e., bot games)
    if (!isFriendsGame && coinsEarned > 0) {
      statsUpdate['stats.coins'] = increment(coinsEarned);
    }
    
    const batch = writeBatch(db);
    batch.update(playerDocRef, statsUpdate);
    await batch.commit();

    return NextResponse.json({ success: true, message: 'Stats updated successfully.' });

  } catch (error) {
    console.error(`Error updating stats for room ${roomId}:`, error);
    return NextResponse.json({ message: 'Error updating stats', error: (error as Error).message }, { status: 500 });
  }
}
