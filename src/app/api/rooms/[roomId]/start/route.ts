

import { NextResponse, type NextRequest } from 'next/server';
import { generateMultipleUniqueTickets } from '@/lib/housie';
import { db } from '@/lib/firebase/config';
import { doc, runTransaction, collection, getDocs, writeBatch } from 'firebase/firestore';
import type { FirestoreRoom, BackendPlayerInRoom } from '@/types';
import { MIN_LOBBY_SIZE } from '@/lib/constants';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;

  try {
    const { hostId } = (await request.json()) as { hostId: string };
    
    if (!db) {
        return NextResponse.json({ message: 'Database not configured' }, { status: 500 });
    }
    if (!roomId || !hostId) {
      return NextResponse.json({ message: 'Room ID and Host ID are required' }, { status: 400 });
    }

    const roomRef = doc(db, 'rooms', roomId);

    await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomRef);
        if (!roomSnap.exists()) {
            throw new Error("Room not found.");
        }

        const roomData = roomSnap.data() as FirestoreRoom;
        if (roomData.host.id !== hostId) {
            throw new Error("Only the host can start the game.");
        }
        if (roomData.status !== 'waiting') {
            throw new Error("Game has already started or is not in the waiting state.");
        }

        const playersColRef = collection(db, 'rooms', roomId, 'players');
        const playersSnap = await getDocs(playersColRef); // Use getDocs outside transaction for reads if possible
        const playersWithTickets = playersSnap.docs.filter(doc => (doc.data().tickets || 0) > 0);

        if (playersWithTickets.length < MIN_LOBBY_SIZE) {
            throw new Error(`Need at least ${MIN_LOBBY_SIZE} players with tickets to start. Currently: ${playersWithTickets.length}.`);
        }
        
        // This is a write operation, so it must be done within the transaction or a batch
        const batch = writeBatch(db);
        playersWithTickets.forEach(playerDoc => {
            const playerData = playerDoc.data() as BackendPlayerInRoom;
            const ticketsToGenerate = playerData.tickets.length > 0 ? playerData.tickets.length : 1; // Fallback
            const generatedTickets = generateMultipleUniqueTickets(ticketsToGenerate as any);
            batch.update(playerDoc.ref, { tickets: generatedTickets });
        });
        await batch.commit();

        // Update the room status in the main transaction
        transaction.update(roomRef, { status: 'in-progress' });
    });

    // Fetch the final state to return
    const finalRoomDoc = await getDoc(roomRef);
    const finalPlayersSnap = await getDocs(collection(db, 'rooms', roomId, 'players'));
    const finalPlayers = finalPlayersSnap.docs.map(d => d.data());

    const responseData = {
        ...finalRoomDoc.data(),
        players: finalPlayers,
        isGameStarted: true, // Manually set this for client consistency
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error(`Error starting game in room ${roomId}:`, error); 
    return NextResponse.json({ message: (error as Error).message }, { status: 500 });
  }
}
