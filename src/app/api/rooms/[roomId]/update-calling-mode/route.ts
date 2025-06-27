
import { NextResponse, type NextRequest } from 'next/server';
import { updateCallingModeStore, getRoomStateForClient } from '@/lib/server/game-store';
import type { CallingMode } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;

  try {
    const { hostId, callingMode } = (await request.json()) as { hostId: string; callingMode: CallingMode };

    if (!hostId || !callingMode) {
      return NextResponse.json({ message: 'Host ID and new calling mode are required' }, { status: 400 });
    }
    if (callingMode !== 'auto' && callingMode !== 'manual') {
        return NextResponse.json({ message: 'Invalid calling mode specified' }, { status: 400 });
    }

    const result = updateCallingModeStore(roomId, hostId, callingMode);

    if (result && 'error' in result) {
      return NextResponse.json({ message: result.error }, { status: result.error === "Room not found." ? 404 : 400 });
    }

    const roomForClient = getRoomStateForClient(roomId);
    if (!roomForClient) {
        return NextResponse.json({ message: 'Failed to retrieve room after updating calling mode' }, { status: 500 });
    }
    return NextResponse.json(roomForClient, { status: 200 });

  } catch (error) {
    console.error(`Error updating calling mode in room ${roomId}:`, error);
    return NextResponse.json({ message: 'Error updating calling mode', error: (error as Error).message }, { status: 500 });
  }
}
