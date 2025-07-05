

import { NextResponse, type NextRequest } from 'next/server';
import { addPlayerToRoomStore, getRoomStateForClient } from '@/lib/server/game-store';
import type { Player } from '@/types';
import { DEFAULT_NUMBER_OF_TICKETS_PER_PLAYER } from '@/lib/constants';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params; 

  try {
    const { playerId, playerName, playerEmail, ticketsToBuy } = (await request.json()) as { playerId: string; playerName: string; playerEmail: string | null; ticketsToBuy?: number };

    if (!roomId) {
      return NextResponse.json({ message: 'Room ID is required' }, { status: 400 });
    }
    if (!playerId || !playerName) {
      return NextResponse.json({ message: 'Player ID and name are required' }, { status: 400 });
    }

    const numTickets = typeof ticketsToBuy === 'number' && ticketsToBuy > 0 ? ticketsToBuy : DEFAULT_NUMBER_OF_TICKETS_PER_PLAYER;

    const result = addPlayerToRoomStore(roomId, { id: playerId, name: playerName, email: playerEmail }, numTickets);

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
