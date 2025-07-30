

import { NextResponse, type NextRequest } from 'next/server';
import { addPlayerToRoomStore, getRoomStateForClient, getRoomStore } from '@/lib/server/game-store';
import type { Player } from '@/types';
import { DEFAULT_NUMBER_OF_TICKETS_PER_PLAYER } from '@/lib/constants';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, runTransaction, increment } from 'firebase/firestore';


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

    const numTickets = typeof ticketsToBuy === 'number' && ticketsToBuy > 0 ? ticketsToBuy : DEFAULT_NUMBER_OF_TICKETS_PER_PLAYER;
    
    // Server-side validation of coin balance before adding/updating player
    if(db) {
        const room = getRoomStore(roomId);
        if (room && room.settings.ticketPrice > 0 && room.settings.gameMode === 'multiplayer') {
            const ticketCost = room.settings.ticketPrice * numTickets;
            
            const playerDocRef = doc(db, "users", playerId);
            const playerDoc = await getDoc(playerDocRef);

            if (!playerDoc.exists()) {
                return NextResponse.json({ message: "Player data not found." }, { status: 404 });
            }
            if (playerDoc.data().isGuest) {
                 return NextResponse.json({ message: "Guests cannot join rooms with an entry fee." }, { status: 403 });
            }

            const currentCoins = playerDoc.data().stats?.coins || 0;
            if (currentCoins < ticketCost) {
                return NextResponse.json({ message: `Not enough coins. You need ${ticketCost} coins but have ${currentCoins}.` }, { status: 400 });
            }
        }
    }


    const result = addPlayerToRoomStore(roomId, { id: playerId, name: playerName }, numTickets);

    if (result && 'error' in result) {
        if (result.error === "Room not found.") return NextResponse.json({ message: result.error }, { status: 404 });
        return NextResponse.json({ message: result.error }, { status: 400 }); 
    }
    
    const roomForClient = getRoomStateForClient(roomId);
     if (!roomForClient) {
        return NextResponse.json({ message: 'Failed to retrieve room after player join' }, { status: 500 });
    }

    return NextResponse.json(roomForClient, { status: 200 });
  } catch (error) {
    console.error(`Error joining room ${roomId}:`, error); 
    return NextResponse.json({ message: 'Error joining room', error: (error as Error).message }, { status: 500 });
  }
}
