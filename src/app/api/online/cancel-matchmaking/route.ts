
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase/config';
import {
  doc,
  runTransaction,
  increment,
} from 'firebase/firestore';
import type { OnlineGameTier, TierConfig } from '@/types';

// Minimal TIERS config needed for price calculation
const TIERS: Record<OnlineGameTier, Pick<TierConfig, 'ticketPrice'>> = {
  quick: { ticketPrice: 5 },
  classic: { ticketPrice: 10 },
  tournament: { ticketPrice: 20 },
};

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { message: 'Firestore is not configured.' },
      { status: 500 }
    );
  }

  try {
    const { roomId, playerId, tier, tickets } = (await request.json()) as {
      roomId: string;
      playerId: string;
      tier: OnlineGameTier;
      tickets: number;
    };

    if (!roomId || !playerId || !tier || !tickets) {
      return NextResponse.json(
        { message: 'Room ID, Player ID, Tier, and Ticket count are required.' },
        { status: 400 }
      );
    }
    
    const tierConfig = TIERS[tier];
    if (!tierConfig) {
        return NextResponse.json({ message: 'Invalid tier specified.' }, { status: 400 });
    }

    const refundAmount = tierConfig.ticketPrice * tickets;

    await runTransaction(db, async (transaction) => {
      const roomRef = doc(db, 'rooms', roomId);
      const playerInRoomRef = doc(db, 'rooms', roomId, 'players', playerId);
      const userRef = doc(db, 'users', playerId);

      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists() || roomSnap.data().status !== 'waiting') {
        // If room doesn't exist or is no longer in matchmaking, no action is needed.
        // This prevents race conditions where a user cancels as the game starts.
        console.log(`Cancellation for room ${roomId} skipped. Room not found or not in 'waiting' state.`);
        return;
      }
      
      // 1. Refund Coins
      transaction.update(userRef, { 'stats.coins': increment(refundAmount) });
      
      // 2. Remove player from room's subcollection
      transaction.delete(playerInRoomRef);
      
      // 3. Decrement human count in the room
      transaction.update(roomRef, { humanCount: increment(-1) });
    });

    return NextResponse.json({
      success: true,
      message: 'Matchmaking canceled and coins refunded.',
    });
  } catch (error) {
    console.error('Error canceling matchmaking:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
