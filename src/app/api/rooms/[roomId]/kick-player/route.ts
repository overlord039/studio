
import { NextResponse, type NextRequest } from 'next/server';
import { kickPlayerStore, getRoomStateForClient } from '@/lib/server/game-store';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;

  try {
    const { hostId, playerIdToKick } = (await request.json()) as { hostId: string; playerIdToKick: string };

    if (!hostId || !playerIdToKick) {
      return NextResponse.json({ message: 'Host ID and player ID to kick are required' }, { status: 400 });
    }
    
    const result = kickPlayerStore(roomId, hostId, playerIdToKick);

    if (result && 'error' in result) {
      return NextResponse.json({ message: result.error }, { status: result.error === "Room not found." ? 404 : 400 });
    }

    const roomForClient = getRoomStateForClient(roomId);
    if (!roomForClient) {
        return NextResponse.json({ message: 'Failed to retrieve room after kicking player' }, { status: 500 });
    }
    return NextResponse.json(roomForClient, { status: 200 });

  } catch (error) {
    console.error(`Error kicking player in room ${roomId}:`, error);
    return NextResponse.json({ message: 'Error kicking player', error: (error as Error).message }, { status: 500 });
  }
}
