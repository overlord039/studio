
import { NextResponse, type NextRequest } from 'next/server';
import { startGameInRoomStore } from '@/lib/server/game-store';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const roomId = params.roomId;
    const { hostId } = (await request.json()) as { hostId: string };


    if (!roomId) {
      return NextResponse.json({ message: 'Room ID is required' }, { status: 400 });
    }
     if (!hostId) {
      return NextResponse.json({ message: 'Host ID is required to start the game' }, { status: 400 });
    }

    const result = startGameInRoomStore(roomId, hostId);

    if ('error' in result) {
      if (result.error === "Room not found.") return NextResponse.json({ message: result.error }, { status: 404 });
      return NextResponse.json({ message: result.error }, { status: 400 }); // e.g. Not host, game already started
    }
    
    const roomForClient = {
      ...result,
      createdAt: result.createdAt.toISOString(),
    };
    return NextResponse.json(roomForClient, { status: 200 });
  } catch (error) {
    console.error(`Error starting game in room ${params.roomId}:`, error);
    return NextResponse.json({ message: 'Error starting game', error: (error as Error).message }, { status: 500 });
  }
}
