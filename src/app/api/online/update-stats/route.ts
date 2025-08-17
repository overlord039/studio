
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, runTransaction, collection, getDocs, increment, writeBatch } from 'firebase/firestore';
import type { FirestoreRoom, FirestorePlayer, PrizeType, GameSettings } from '@/types';
import { PRIZE_DEFINITIONS, PRIZE_DISTRIBUTION_PERCENTAGES } from '@/lib/constants';

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


// Function to safely delete a room and its subcollections
async function deleteRoomAndSubcollections(roomId: string) {
    if (!db) return;
    const roomRef = doc(db, 'rooms', roomId);

    try {
        const batch = writeBatch(db);
        
        // Delete all documents in the 'players' subcollection
        const playersRef = collection(db, 'rooms', roomId, 'players');
        const playersSnap = await getDocs(playersRef);
        playersSnap.forEach(playerDoc => {
            batch.delete(playerDoc.ref);
        });

        // Delete the main room document
        batch.delete(roomRef);

        await batch.commit();
        console.log(`Successfully deleted room ${roomId} and its subcollections.`);
    } catch (error) {
        console.error(`Failed to delete room ${roomId}:`, error);
    }
}


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
    let allStatsUpdated = false;
    
    await runTransaction(db, async (transaction) => {
        const roomRef = doc(db, 'rooms', roomId);
        const roomSnap = await transaction.get(roomRef);

        if (!roomSnap.exists()) {
            console.log(`Room ${roomId} not found for stats update, likely already deleted.`);
            return;
        }
        
        const roomData = roomSnap.data() as FirestoreRoom & { prizeStatus?: any, playersWhoUpdatedStats?: string[], botTickets?: any };
        if (roomData.status !== 'finished') {
            console.log(`Stats update for room ${roomId} called, but game not finished. Status: ${roomData.status}`);
            return;
        }
        
        const playerRef = doc(db, 'users', userId);
        const playerSnap = await transaction.get(playerRef);
        if (!playerSnap.exists()) {
            // A player (human or guest) should always have a user doc. If not, something is wrong.
            console.warn(`User document for userId ${userId} not found in room ${roomId}. Cannot update stats.`);
            return;
        }

        // --- Idempotency: Check if this user's stats have been updated for this room ---
        if (roomData.playersWhoUpdatedStats?.includes(userId)) {
            console.log(`Stats for room ${roomId} already processed for user ${userId}.`);
            return;
        }

        const playersColRef = collection(db, 'rooms', roomId, 'players');
        const playersSnap = await getDocs(playersColRef);
        const playersList = playersSnap.docs.map(d => d.data() as FirestorePlayer);
        const humanPlayersCount = playersList.filter(p => p.type === 'human').length;

        const totalTicketsSold = playersList.reduce((acc, p) => acc + (p.tickets || 1), 0);
        const totalPrizePool = (roomData.settings.ticketPrice || 0) * totalTicketsSold;
        
        const finalPrizes = calculatePrizes(totalPrizePool, roomData.settings);

        const prizesForFormat = PRIZE_DEFINITIONS[roomData.settings.prizeFormat || 'Format 1'] || [];
        
        const statsUpdate: { [key: string]: any } = {
            'stats.matchesPlayed': increment(1),
        };

        prizesForFormat.forEach(prize => {
            const claimInfo = roomData.prizeStatus?.[prize as PrizeType];
            if (claimInfo && claimInfo.claimedBy?.some((c: {id: string}) => c.id === userId)) {
                statsUpdate[`stats.prizesWon.${prize}`] = increment(1);
                
                const prizeAmount = finalPrizes[prize as PrizeType] || 0;
                const prizePerWinner = claimInfo.claimedBy.length > 0 ? Math.floor(prizeAmount / claimInfo.claimedBy.length) : 0;
                totalWinnings += prizePerWinner;
            }
        });

        if (totalWinnings > 0) {
            statsUpdate['stats.coins'] = increment(totalWinnings);
        }
        
        // --- Update player stats and mark as updated for this room ---
        transaction.update(playerRef, statsUpdate);
        
        const updatedStatsPlayers = [...(roomData.playersWhoUpdatedStats || []), userId];
        transaction.update(roomRef, {
            playersWhoUpdatedStats: updatedStatsPlayers
        });

        // Check if all human players have updated their stats
        if (updatedStatsPlayers.length >= humanPlayersCount) {
            allStatsUpdated = true;
        }
    });
    
    // If all stats have been updated, delete the room outside the transaction
    if (allStatsUpdated) {
        await deleteRoomAndSubcollections(roomId);
    }
    
    return NextResponse.json({ success: true, winnings: totalWinnings });

  } catch (error) {
    console.error('Error updating online game stats:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
