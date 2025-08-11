
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, runTransaction, collection, getDocs, increment } from 'firebase/firestore';
import type { FirestoreRoom, FirestorePlayer, PrizeType } from '@/types';
import { PRIZE_DEFINITIONS, PRIZE_DISTRIBUTION_PERCENTAGES } from '@/lib/constants';

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { message: 'Firestore is not configured.' },
      { status: 500 }
    );
  }

  try {
    const { roomId, userId } = (await request.json()) as {
      roomId: string;
      userId: string;
    };

    if (!roomId || !userId) {
      return NextResponse.json(
        { message: 'Room ID and User ID are required.' },
        { status: 400 }
      );
    }
    
    let totalWinnings = 0;
    
    await runTransaction(db, async (transaction) => {
        const roomRef = doc(db, 'rooms', roomId);
        const roomSnap = await transaction.get(roomRef);

        if (!roomSnap.exists()) {
            throw new Error('Room not found.');
        }
        
        const roomData = roomSnap.data() as FirestoreRoom & { prizeStatus?: any };
        if (roomData.status !== 'finished') {
            // To prevent premature updates, only update for finished games.
            // Client might call this multiple times, so this is an idempotency check.
            console.log(`Stats update for room ${roomId} called, but game not finished. Status: ${roomData.status}`);
            return;
        }
        
        const playerRef = doc(db, 'users', userId);
        const playerSnap = await transaction.get(playerRef);
        if (!playerSnap.exists()) {
            throw new Error('User data not found.');
        }

        // Prevent multiple updates for the same game
        const lastGameProcessed = playerSnap.data().stats?.lastGameProcessed;
        if (lastGameProcessed === roomId) {
            console.log(`Stats for room ${roomId} already processed for user ${userId}.`);
            return;
        }

        const playersColRef = collection(db, 'rooms', roomId, 'players');
        const playersSnap = await transaction.get(playersColRef);
        const playersList = playersSnap.docs.map(d => d.data() as FirestorePlayer);

        const totalTicketsSold = playersList.reduce((acc, p) => acc + (p.tickets || 1), 0);
        const totalPrizePool = (roomData.settings.ticketPrice || 0) * totalTicketsSold;

        const prizeFormat = roomData.settings.prizeFormat || 'Format 1';
        const prizesForFormat = PRIZE_DEFINITIONS[prizeFormat] || [];
        
        const statsUpdate: { [key: string]: any } = {
            'stats.matchesPlayed': increment(1),
            'stats.lastGameProcessed': roomId, // Mark this game as processed
        };

        prizesForFormat.forEach(prize => {
            const claimInfo = roomData.prizeStatus?.[prize as PrizeType];
            if (claimInfo && claimInfo.claimedBy?.some((c: {id: string}) => c.id === userId)) {
                // Increment prize count
                statsUpdate[`stats.prizesWon.${prize}`] = increment(1);
                
                // Calculate winnings
                const prizeAmount = (totalPrizePool * (PRIZE_DISTRIBUTION_PERCENTAGES[prizeFormat]?.[prize as PrizeType] || 0)) / 100;
                const prizePerWinner = claimInfo.claimedBy.length > 0 ? prizeAmount / claimInfo.claimedBy.length : prizeAmount;
                totalWinnings += prizePerWinner;
            }
        });

        if (totalWinnings > 0) {
            statsUpdate['stats.coins'] = increment(Math.round(totalWinnings));
        }
        
        transaction.update(playerRef, statsUpdate);
    });
    
    return NextResponse.json({ success: true, winnings: totalWinnings });

  } catch (error) {
    console.error('Error updating online game stats:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
