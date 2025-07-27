
import { NextResponse, type NextRequest } from 'next/server';
import { getRoomStore } from '@/lib/server/game-store';
import { db } from '@/lib/firebase/config';
import { doc, increment, writeBatch, getDoc } from 'firebase/firestore';
import type { PrizeType } from '@/types';
import { PRIZE_TYPES } from '@/types';

// Define coin rewards for offline games
const OFFLINE_COIN_REWARDS: Record<PrizeType, number> = {
  [PRIZE_TYPES.EARLY_5]: 2,
  [PRIZE_TYPES.FIRST_LINE]: 2,
  [PRIZE_TYPES.SECOND_LINE]: 2,
  [PRIZE_TYPES.THIRD_LINE]: 2,
  [PRIZE_TYPES.FULL_HOUSE]: 3,
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

    const batch = writeBatch(db);

    const isFriendsGame = room.settings.gameMode === 'multiplayer';
    if (isFriendsGame) {
      // Friends games don't have coin rewards, just track match played
      const statsUpdate = { 'stats.matchesPlayed': increment(1) };
      batch.update(playerDocRef, statsUpdate);
      await batch.commit();
      return NextResponse.json({ success: true, message: 'Stats updated for multiplayer game.', coinsEarned: 0 });
    }

    // This API is only for offline games now. Online game stats are updated in game-store.ts
    const isOfflineGame = room.settings.gameMode !== 'online' && !isFriendsGame;
    if (!isOfflineGame) {
        return NextResponse.json({ success: true, message: 'Stats for online games are handled separately.' });
    }
    
    // Logic for OFFLINE (BOT) games
    const statsUpdate: { [key: string]: any } = {
        'stats.matchesPlayed': increment(1)
    };

    let totalPrizesWonCount = 0;
    let coinsEarned = 0;
    const prizesWonByPlayer: PrizeType[] = [];

    for (const prizeType in room.prizeStatus) {
        const prizeInfo = room.prizeStatus[prizeType as PrizeType];
        if (prizeInfo && prizeInfo.claimedBy.some(c => c.id === userId)) {
            prizesWonByPlayer.push(prizeType as PrizeType);
        }
    }
    
    totalPrizesWonCount = prizesWonByPlayer.length;

    if (totalPrizesWonCount > 0) {
        prizesWonByPlayer.forEach(prize => {
            statsUpdate[`stats.prizesWon.${prize}`] = increment(1);
            coinsEarned += OFFLINE_COIN_REWARDS[prize] || 0;
        });
    } else {
        // Only give participation reward if NO other prize was won
        coinsEarned = PARTICIPATION_REWARD;
    }
    
    if (coinsEarned > 0) {
      statsUpdate['stats.coins'] = increment(coinsEarned);
    }
    
    batch.update(playerDocRef, statsUpdate);
    await batch.commit();

    return NextResponse.json({ success: true, message: 'Stats updated successfully.', coinsEarned });

  } catch (error) {
    console.error(`Error updating stats for room ${roomId}:`, error);
    return NextResponse.json({ message: 'Error updating stats', error: (error as Error).message }, { status: 500 });
  }
}
