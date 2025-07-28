
import { NextResponse, type NextRequest } from 'next/server';
import { createRoomStore, addPlayerToRoomStore, getRoomStateForClient, startGameInRoomStore } from '@/lib/server/game-store';
import type { Player, GameSettings, Room } from '@/types';

// Bot names for OFFLINE mode - more tech-themed
const OFFLINE_BOT_NAMES = ["Chip", "Glitch", "Byte", "Pixel", "Vector", "Domino", "Rookie", "Unit 734", "Signal", "Apex"];


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
    const { host, mode, tickets } = (await request.json()) as { host: Player; mode: 'easy' | 'medium' | 'hard', tickets?: number };

    if (!host || !host.id || !host.name) {
      return NextResponse.json({ message: 'Host details are required' }, { status: 400 });
    }
    if (!mode || (mode !== 'easy' && mode !== 'medium' && mode !== 'hard')) {
        return NextResponse.json({ message: 'A valid game mode (easy/medium/hard) is required' }, { status: 400 });
    }
    if ((mode === 'easy' || mode === 'medium') && (typeof tickets !== 'number' || tickets < 1 || tickets > 4)) {
        return NextResponse.json({ message: `For ${mode} mode, a ticket count between 1 and 4 is required` }, { status: 400 });
    }
    
    // 1. Create the room with bot-specific settings
    const roomSettings: Partial<GameSettings> = {
      lobbySize: 5, // 1 human + 4 bots
      isPublic: false,
      callingMode: 'auto',
      gameMode: mode,
      ticketPrice: 0, // No prize money in bot games
    };
    const newRoom = createRoomStore(host, roomSettings);

    // 2. Add the human player (host)
    let hostTickets = tickets;
    if (mode === 'hard') {
        hostTickets = 1 + Math.floor(Math.random() * 4);
    }
    addPlayerToRoomStore(newRoom.id, { ...host, isHost: true }, hostTickets);

    // 3. Add bot players
    const shuffledBotNames = shuffleArray([...OFFLINE_BOT_NAMES]);
    for (let i = 0; i < 4; i++) {
        const botId = `bot-${i+1}-${Date.now()}`;
        const botName = shuffledBotNames[i];
        const botPlayer: Player = { id: botId, name: botName, isBot: true };

        let botTickets;
        if (mode === 'easy') {
            botTickets = tickets;
        } else { // medium and hard mode have random bot tickets
            botTickets = 1 + Math.floor(Math.random() * 4);
        }
        addPlayerToRoomStore(newRoom.id, botPlayer, botTickets);
    }

    // 4. Start the game immediately
    const startResult = startGameInRoomStore(newRoom.id, host.id);
    if (startResult && 'error' in startResult) {
        console.error(`Failed to start bot game ${newRoom.id}:`, startResult.error);
        return NextResponse.json({ message: 'Failed to start bot game after creation', error: startResult.error }, { status: 500 });
    }

    // 5. Get the final state and return it
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
