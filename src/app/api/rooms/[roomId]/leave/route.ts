
import { NextResponse, type NextRequest } from 'next/server';
import { removePlayerFromRoomStore } from '@/lib/server/game-store';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;

  try {
    const { playerId } = await request.json() as { playerId: string };

    if (!playerId) {
      return NextResponse.json({ message: 'Player ID is required' }, { status: 400 });
    }
    
    const result = removePlayerFromRoomStore(roomId, playerId);

    if (!result.success) {
      return NextResponse.json({ message: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, message: 'Player left successfully' });

  } catch (error) {
    console.error(`Error removing player from room ${roomId}:`, error);
    return NextResponse.json({ message: 'Error leaving room', error: (error as Error).message }, { status: 500 });
  }
}
