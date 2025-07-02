
import { NextResponse, type NextRequest } from 'next/server';
import { transferHostStore, getRoomStateForClient } from '@/lib/server/game-store';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;

  try {
    const { hostId, newHostId } = (await request.json()) as { hostId: string; newHostId: string };

    if (!hostId || !newHostId) {
      return NextResponse.json({ message: 'Current host ID and new host ID are required' }, { status: 400 });
    }
    
    const result = transferHostStore(roomId, hostId, newHostId);

    if (result && 'error' in result) {
      return NextResponse.json({ message: result.error }, { status: result.error === "Room not found." ? 404 : 400 });
    }

    const roomForClient = getRoomStateForClient(roomId);
    if (!roomForClient) {
        return NextResponse.json({ message: 'Failed to retrieve room after host transfer' }, { status: 500 });
    }
    return NextResponse.json(roomForClient, { status: 200 });

  } catch (error) {
    console.error(`Error transferring host in room ${roomId}:`, error);
    return NextResponse.json({ message: 'Error transferring host', error: (error as Error).message }, { status: 500 });
  }
}
