

import { NextResponse, type NextRequest } from 'next/server';
import { createRoomStore, getRoomStateForClient } from '@/lib/server/game-store';
import type { Player, GameSettings } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { host, settings } = (await request.json()) as { host: Player; settings?: Partial<GameSettings> };

    if (!host || !host.id || !host.name) {
      return NextResponse.json({ message: 'Host details are required (id, name)' }, { status: 400 });
    }
    
    const newRoom = createRoomStore(host, settings);
    const roomForClient = getRoomStateForClient(newRoom.id);

    if (!roomForClient) {
        // This should ideally not happen if createRoomStore was successful
        return NextResponse.json({ message: 'Failed to retrieve room after creation' }, { status: 500 });
    }
    
    return NextResponse.json(roomForClient, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ message: 'Error creating room', error: (error as Error).message }, { status: 500 });
  }
}
