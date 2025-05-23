
import { NextResponse, type NextRequest } from 'next/server';
import { getRoomStore, getRoomStateForClient } from '@/lib/server/game-store';

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params; 

  try {
    if (!roomId) {
      return NextResponse.json({ message: 'Room ID is required' }, { status: 400 });
    }

    const roomForClient = getRoomStateForClient(roomId);

    if (!roomForClient) {
      return NextResponse.json({ message: 'Room not found' }, { status: 404 });
    }
    
    return NextResponse.json(roomForClient, { status: 200 });
  } catch (error) {
    console.error(`Error fetching room ${roomId}:`, error); 
    return NextResponse.json({ message: 'Error fetching room details', error: (error as Error).message }, { status: 500 });
  }
}
