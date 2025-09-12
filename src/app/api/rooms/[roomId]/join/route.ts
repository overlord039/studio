

import { NextResponse, type NextRequest } from 'next/server';
import { getRoomStore, generateMultipleUniqueTickets } from '@/lib/server/game-store';
import type { Player } from '@/types';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, runTransaction, increment, collection, setDoc } from 'firebase/firestore';


export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params; 

  try {
    const { playerId, playerName, ticketsToBuy } = (await request.json()) as { playerId: string; playerName: string; ticketsToBuy?: number };

    if (!roomId) {
      return NextResponse.json({ message: 'Room ID is required' }, { status: 400 });
    }
    if (!playerId || !playerName) {
      return NextResponse.json({ message: 'Player ID and name are required' }, { status: 400 });
    }
    if (!db) {
        return NextResponse.json({ message: 'Database not configured'}, {status: 500});
    }

    const roomRef = doc(db, "rooms", roomId);
    let updatedRoomData;

    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) {
            throw new Error("Room not found.");
        }
        const roomData = roomDoc.data();
        if (roomData.status !== 'waiting') {
            throw new Error("Game has already started. Cannot join now.");
        }

        const playerDocRef = doc(db, "users", playerId);
        const playerRoomRef = doc(collection(db, "rooms", roomId, "players"), playerId);

        const playerDoc = await transaction.get(playerDocRef);
        if (!playerDoc.exists()) throw new Error("Player data not found.");

        const playerRoomDoc = await transaction.get(playerRoomRef);

        const numTickets = ticketsToBuy ?? 1;
        const ticketPrice = roomData.settings.ticketPrice || 0;
        const currentCoins = playerDoc.data().stats?.coins || 0;
        
        const existingTicketCount = playerRoomDoc.exists() ? (playerRoomDoc.data().tickets || 0) : 0;
        const existingCost = existingTicketCount * ticketPrice;
        
        const newCost = numTickets * ticketPrice;
        const costDifference = newCost - existingCost;

        if (currentCoins < costDifference) {
            throw new Error(`Not enough coins. You need ${costDifference} more coins.`);
        }
        
        // All reads are done, now do writes
        if (costDifference !== 0) {
            transaction.update(playerDocRef, { 'stats.coins': increment(-costDifference) });
        }
        
        transaction.set(playerRoomRef, {
            id: playerId,
            name: playerName,
            isHost: roomData.host.id === playerId,
            isBot: false,
            tickets: numTickets, // Store ticket count, not the grid
        }, { merge: true });

        const humanCount = roomData.humanCount || 0;
        if (!playerRoomDoc.exists()) {
            transaction.update(roomRef, { humanCount: increment(1) });
        }
    });

    // After transaction, fetch the complete room data to return
    const finalRoomDoc = await getDoc(roomRef);
    if (!finalRoomDoc.exists()) throw new Error("Room disappeared after transaction.");
    
    const playersCol = collection(db, "rooms", roomId, "players");
    const playersSnap = await getDocs(playersCol);
    const playersList = playersSnap.docs.map(doc => doc.data());

    updatedRoomData = {
        ...finalRoomDoc.data(),
        players: playersList
    };

    return NextResponse.json(updatedRoomData, { status: 200 });
    
  } catch (error) {
    console.error(`Error joining room ${roomId}:`, error); 
    return NextResponse.json({ message: (error as Error).message }, { status: 500 });
  }
}
