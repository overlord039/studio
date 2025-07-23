
import { NextResponse, type NextRequest } from 'next/server';
import { getRoomStore } from '@/lib/server/game-store';
import { db } from '@/lib/firebase/config';
import { doc, increment, writeBatch, getDoc } from 'firebase/firestore';
import type { PrizeType } from '@/types';
import { PRIZE_TYPES } from '@/types';

// Define coin rewards for offline games
const OFFLINE_COIN_REWARDS: Record<PrizeType, number> = {
  [PRIZE_TYPES.EARLY_5]: 1,
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

    const isOfflineGame = room.settings.gameMode !== 'online';

    const statsUpdate: { [key: string]: any } = {
        'stats.matchesPlayed': increment(1)
    };

    let totalPrizesWon = 0;
    let coinsEarned = 0;

    for (const prizeType in room.prizeStatus) {
        const prizeInfo = room.prizeStatus[prizeType as PrizeType];
        if (prizeInfo && prizeInfo.claimedBy.some(c => c.id === userId)) {
            statsUpdate[`stats.prizesWon.${prizeType}`] = increment(1);
            totalPrizesWon++;
            if (isOfflineGame) {
                coinsEarned += OFFLINE_COIN_REWARDS[prizeType as PrizeType] || 0;
            }
        }
    }

    if (isOfflineGame) {
        if (totalPrizesWon === 0) {
            coinsEarned = PARTICIPATION_REWARD;
        }
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
