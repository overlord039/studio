
import { NextResponse, type NextRequest } from 'next/server';
import { callNextNumberStore, getRoomStateForClient, getRoomStore } from '@/lib/server/game-store';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;

  try {
    const { hostId } = (await request.json()) as { hostId?: string };
    if (!hostId) {
      return NextResponse.json({ message: 'Host ID required to call number' }, { status: 400 });
    }
    
    const room = getRoomStore(roomId); 
    if (!room) {
      return NextResponse.json({ message: "Room not found." }, { status: 404 });
    }
    if (room.host.id !== hostId) {
      return NextResponse.json({ message: 'Only the host can call numbers manually' }, { status: 403 });
    }
    if (room.settings.callingMode !== 'manual') {
        return NextResponse.json({ message: 'This room is in automatic calling mode.' }, { status: 400 });
    }

    const result = callNextNumberStore(roomId);

    if (result && 'error' in result) {
      const errorResponse: { message: string, currentNumber?: number } = { message: result.error };
      if (result.number !== undefined) {
        errorResponse.currentNumber = result.number;
      }
      return NextResponse.json(errorResponse, { status: 400 });
    }
    
    const roomForClient = getRoomStateForClient(roomId);
     if (!roomForClient) {
        return NextResponse.json({ message: 'Failed to retrieve room after calling number' }, { status: 500 });
    }

    return NextResponse.json(roomForClient, { status: 200 });

  } catch (error) {
    console.error(`Error calling number in room ${roomId}:`, error);
    return NextResponse.json({ message: 'Error calling number', error: (error as Error).message }, { status: 500 });
  }
}
