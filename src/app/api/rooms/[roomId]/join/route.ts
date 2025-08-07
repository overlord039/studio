

import { NextResponse, type NextRequest } from 'next/server';
import { addPlayerToRoomStore, getRoomStateForClient, getRoomStore, generateMultipleUniqueTickets } from '@/lib/server/game-store';
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

    const room = getRoomStore(roomId);
    if (!room) {
        return NextResponse.json({ message: "Room not found." }, { status: 404 });
    }

    let numTickets: number;
    if (room.settings.gameMode === 'rush') {
        numTickets = 1 + Math.floor(Math.random() * 4);
    } else {
        numTickets = ticketsToBuy ?? 0;
    }
    
    if(db) {
        if (room && room.settings.ticketPrice > 0 && room.settings.gameMode !== 'rush' && ticketsToBuy && ticketsToBuy > 0) {
            
            try {
              await runTransaction(db, async (transaction) => {
                  const playerDocRef = doc(db, "users", playerId);
                  const playerDoc = await transaction.get(playerDocRef);

                  if (!playerDoc.exists()) {
                      throw new Error("Player data not found.");
                  }

                  const currentCoins = playerDoc.data().stats?.coins || 0;
                  const existingPlayerInRoom = room.players.find(p => p.id === playerId);
                  const oldCost = existingPlayerInRoom?.confirmedTicketCost || 0;
                  const newCost = room.settings.ticketPrice * numTickets;
                  const costDifference = newCost - oldCost;

                  if (currentCoins < costDifference) {
                      throw new Error(`Not enough coins. You need ${costDifference} more coins.`);
                  }
                  
                  transaction.update(playerDocRef, { 'stats.coins': increment(-costDifference) });
              });
            } catch (err) {
              return NextResponse.json({ message: (err as Error).message }, { status: 400 });
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
