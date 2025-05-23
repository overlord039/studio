
import { NextResponse, type NextRequest } from 'next/server';
import { createRoomStore } from '@/lib/server/game-store';
import type { Player, GameSettings } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { host, settings } = (await request.json()) as { host: Player; settings: GameSettings };

    if (!host || !host.id || !host.name || !settings) {
      return NextResponse.json({ message: 'Missing host or settings data' }, { status: 400 });
    }
    
    // Ensure host has isHost flag
    const hostPlayer: Player = { ...host, isHost: true };

    const newRoom = createRoomStore(hostPlayer, settings);
    // Convert Date to string for JSON serialization if necessary
    const roomForClient = {
      ...newRoom,
      createdAt: newRoom.createdAt.toISOString(),
    };
    return NextResponse.json(roomForClient, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ message: 'Error creating room', error: (error as Error).message }, { status: 500 });
  }
}
