
import { NextResponse, type NextRequest } from 'next/server';
import { getRoomStore } from '@/lib/server/game-store';

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params; // Destructure roomId immediately

  try {
    if (!roomId) {
      return NextResponse.json({ message: 'Room ID is required' }, { status: 400 });
    }

    const room = getRoomStore(roomId);

    if (!room) {
      return NextResponse.json({ message: 'Room not found' }, { status: 404 });
    }
    
    // Convert Date to string for JSON serialization if necessary
    const roomForClient = {
      ...room,
      createdAt: room.createdAt.toISOString(),
    };
    return NextResponse.json(roomForClient, { status: 200 });
  } catch (error) {
    console.error(`Error fetching room ${roomId}:`, error); // Use destructured roomId
    return NextResponse.json({ message: 'Error fetching room details', error: (error as Error).message }, { status: 500 });
  }
}

