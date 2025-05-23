
import { NextResponse, type NextRequest } from 'next/server';
import { callNextNumberStore, getRoomStateForClient } from '@/lib/server/game-store';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;

  try {
    // Optional: Add hostId verification if only host can call numbers
    // const { hostId } = await request.json() as { hostId?: string };
    // if (!hostId) return NextResponse.json({ message: 'Host ID required' }, { status: 400 });
    // const room = getRoomStore(roomId); // fetch raw room to check host
    // if (room && room.host.id !== hostId) {
    //   return NextResponse.json({ message: 'Only host can call numbers' }, { status: 403 });
    // }


    const result = callNextNumberStore(roomId);

    if (result && 'error' in result) {
      // Send back the current number even if all numbers are called
      const errorResponse: { message: string, currentNumber?: number } = { message: result.error };
      if (result.number !== undefined) {
        errorResponse.currentNumber = result.number;
      }
      return NextResponse.json(errorResponse, { status: result.error === "Room not found." ? 404 : 400 });
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
