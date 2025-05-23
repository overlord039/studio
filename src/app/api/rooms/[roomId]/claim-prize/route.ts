
import { NextResponse, type NextRequest } from 'next/server';
import { claimPrizeStore, getRoomStateForClient } from '@/lib/server/game-store';
import type { PrizeType } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;

  try {
    const { playerId, prizeType, ticketIndex } = (await request.json()) as { 
      playerId: string; 
      prizeType: PrizeType; 
      ticketIndex: number; // Index of the ticket on which the prize is claimed
    };

    if (!playerId || !prizeType || typeof ticketIndex !== 'number') {
      return NextResponse.json({ message: 'Player ID, prize type, and ticket index are required' }, { status: 400 });
    }
    
    const result = claimPrizeStore(roomId, playerId, prizeType, ticketIndex);

    if (result && 'error' in result) {
      return NextResponse.json({ message: result.error }, { status: result.error === "Room not found." ? 404 : 400 });
    }

    const roomForClient = getRoomStateForClient(roomId);
    if (!roomForClient) {
        return NextResponse.json({ message: 'Failed to retrieve room after prize claim' }, { status: 500 });
    }
    return NextResponse.json(roomForClient, { status: 200 });

  } catch (error) {
    console.error(`Error claiming prize in room ${roomId}:`, error);
    return NextResponse.json({ message: 'Error claiming prize', error: (error as Error).message }, { status: 500 });
  }
}
