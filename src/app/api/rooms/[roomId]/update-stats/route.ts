
import { NextResponse, type NextRequest } from 'next/server';
import { getRoomStore } from '@/lib/server/game-store';
import { db } from '@/lib/firebase/config';
import { doc, increment, writeBatch } from 'firebase/firestore';
import type { PrizeType } from '@/types';

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

    // Crucial validation: only update stats if the game is actually over
    if (!room.isGameOver) {
      return NextResponse.json({ message: 'Game is not over yet. Stats cannot be updated.' }, { status: 400 });
    }
    
    // Do not update stats for bot games
    if (room.settings.gameMode !== 'multiplayer') {
        return NextResponse.json({ success: true, message: 'Stats not updated for bot games.' });
    }

    const playerInRoom = room.players.find(p => p.id === userId);
    if (!playerInRoom) {
      return NextResponse.json({ message: 'Player not found in this game.' }, { status: 404 });
    }

    const playerDocRef = doc(db, "users", userId);
    
    const batch = writeBatch(db);

    const statsUpdate: { [key: string]: any } = {
        'stats.matchesPlayed': increment(1)
    };

    for (const prizeType in room.prizeStatus) {
        const prizeInfo = room.prizeStatus[prizeType as PrizeType];
        if (prizeInfo && prizeInfo.claimedBy.some(c => c.id === userId)) {
            statsUpdate[`stats.prizesWon.${prizeType}`] = increment(1);
        }
    }

    batch.update(playerDocRef, statsUpdate);
    await batch.commit();

    return NextResponse.json({ success: true, message: 'Stats updated successfully.' });

  } catch (error) {
    console.error(`Error updating stats for room ${roomId}:`, error);
    return NextResponse.json({ message: 'Error updating stats', error: (error as Error).message }, { status: 500 });
  }
}
