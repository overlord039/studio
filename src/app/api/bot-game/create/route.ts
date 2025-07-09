
import { NextResponse, type NextRequest } from 'next/server';
import { createRoomStore, addPlayerToRoomStore, getRoomStateForClient } from '@/lib/server/game-store';
import type { Player, GameSettings, Room } from '@/types';

const BOT_NAMES = ["Chip", "Glitch", "Byte", "Pixel", "Unit 734", "Rookie", "Vector", "Domino"];

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}


export async function POST(request: NextRequest) {
  try {
    const { host, mode, tickets } = (await request.json()) as { host: Player; mode: 'easy' | 'hard', tickets?: number };

    if (!host || !host.id || !host.name) {
      return NextResponse.json({ message: 'Host details are required' }, { status: 400 });
    }
    if (!mode || (mode !== 'easy' && mode !== 'hard')) {
        return NextResponse.json({ message: 'A valid game mode (easy/hard) is required' }, { status: 400 });
    }
    if (mode === 'easy' && (typeof tickets !== 'number' || tickets < 1 || tickets > 4)) {
        return NextResponse.json({ message: 'For easy mode, a ticket count between 1 and 4 is required' }, { status: 400 });
    }
    
    // 1. Create the room with bot-specific settings
    const roomSettings: Partial<GameSettings> = {
      lobbySize: 5, // 1 human + 4 bots
      isPublic: false,
      callingMode: 'auto',
      gameMode: mode,
      // Ticket price and other settings can use defaults
    };
    const newRoom = createRoomStore(host, roomSettings);

    // 2. Add the human player (host)
    let hostTickets = tickets;
    if (mode === 'hard') {
        hostTickets = 1 + Math.floor(Math.random() * 4);
    }
    addPlayerToRoomStore(newRoom.id, { ...host, isHost: true }, hostTickets);

    // 3. Add bot players
    const shuffledBotNames = shuffleArray([...BOT_NAMES]);
    for (let i = 0; i < 4; i++) {
        const botId = `bot-${i+1}-${Date.now()}`;
        const botName = `Bot ${shuffledBotNames[i]}`;
        const botPlayer: Player = { id: botId, name: botName, isBot: true };

        let botTickets = tickets;
        if (mode === 'hard') {
            botTickets = 1 + Math.floor(Math.random() * 4);
        }
        addPlayerToRoomStore(newRoom.id, botPlayer, botTickets);
    }

    const roomForClient = getRoomStateForClient(newRoom.id);
    if (!roomForClient) {
        return NextResponse.json({ message: 'Failed to retrieve bot room after creation' }, { status: 500 });
    }
    
    return NextResponse.json(roomForClient, { status: 201 });

  } catch (error) {
    console.error('Error creating bot game room:', error);
    return NextResponse.json({ message: 'Error creating bot game', error: (error as Error).message }, { status: 500 });
  }
}
