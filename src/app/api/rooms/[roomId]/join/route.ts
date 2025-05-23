
import { NextResponse, type NextRequest } from 'next/server';
import { addPlayerToRoomStore } from '@/lib/server/game-store';
import type { Player } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const roomId = params.roomId;
    const player = (await request.json()) as Player;

    if (!roomId) {
      return NextResponse.json({ message: 'Room ID is required' }, { status: 400 });
    }
    if (!player || !player.id || !player.name) {
      return NextResponse.json({ message: 'Player details are required' }, { status: 400 });
    }

    const result = addPlayerToRoomStore(roomId, player);

    if ('error' in result) {
        if (result.error === "Room not found.") return NextResponse.json({ message: result.error }, { status: 404 });
        return NextResponse.json({ message: result.error }, { status: 400 }); // e.g. Room full, game started
    }
    
    const roomForClient = {
      ...result,
      createdAt: result.createdAt.toISOString(),
    };
    return NextResponse.json(roomForClient, { status: 200 });
  } catch (error) {
    console.error(`Error joining room ${params.roomId}:`, error);
    return NextResponse.json({ message: 'Error joining room', error: (error as Error).message }, { status: 500 });
  }
}
