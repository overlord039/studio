

import { NextResponse, type NextRequest } from 'next/server';
import { createRoomStore, addPlayerToRoomStore, getRoomStateForClient, startGameInRoomStore } from '@/lib/server/game-store';
import type { Player, GameSettings, OnlineGameTier, TierConfig } from '@/types';
import { db } from '@/lib/firebase/config';
import { doc, runTransaction, increment, updateDoc, getDoc } from 'firebase/firestore';

const TIERS: Record<OnlineGameTier, TierConfig> = {
    quick: {
        name: "Quick Play", ticketPrice: 5, roomSize: 4, matchmakingTime: 15,
        unlockRequirements: { matches: 0, coins: 0 },
    },
    classic: {
        name: "Classic", ticketPrice: 10, roomSize: 6, matchmakingTime: 30,
        unlockRequirements: { matches: 5, coins: 50 },
    },
    tournament: {
        name: "Tournament", ticketPrice: 20, roomSize: 10, matchmakingTime: 60,
        unlockRequirements: { matches: 15, coins: 150 },
    }
};

// Bot names for ONLINE mode - more human-like or generic
const ONLINE_BOT_NAMES = ["Alex", "Sam", "Jordan", "Taylor", "Casey", "Riley", "Jessie", "Morgan", "Skyler", "Drew"];

function generateGuestBotName(): string {
  const guestId = Math.floor(1000 + Math.random() * 9000); // e.g., 1234
  return `Guest#${guestId}`;
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}


export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Firestore is not configured.' }, { status: 500 });
  }

  try {
    const { player, tier, tickets } = (await request.json()) as { player: Player; tier: OnlineGameTier, tickets: number };

    if (!player || !player.id || !player.name) {
      return NextResponse.json({ message: 'Player details are required' }, { status: 400 });
    }
    if (!tier || !TIERS[tier]) {
        return NextResponse.json({ message: 'A valid game tier is required' }, { status: 400 });
    }
    if (typeof tickets !== 'number' || tickets < 1 || tickets > 4) {
        return NextResponse.json({ message: 'A valid ticket count (1-4) is required.' }, { status: 400 });
    }

    const tierConfig = TIERS[tier];
    const totalCost = tierConfig.ticketPrice * tickets;

    // 1. Check if the player has enough coins
    const playerDocRef = doc(db, "users", player.id);
    const playerDoc = await getDoc(playerDocRef);
    if (!playerDoc.exists()) {
        return NextResponse.json({ message: "Player data not found." }, { status: 404 });
    }
    const playerData = playerDoc.data();
    const currentCoins = playerData.stats?.coins || 0;
    if (currentCoins < totalCost) {
        return NextResponse.json({ message: "Not enough coins to buy these tickets." }, { status: 400 });
    }
    
    // 2. Create the room with online-specific settings
    const roomSettings: Partial<GameSettings> = {
      lobbySize: tierConfig.roomSize,
      isPublic: true,
      callingMode: 'auto',
      gameMode: 'online',
      ticketPrice: tierConfig.ticketPrice,
      tier: tier, // Add the tier to settings
    };
    // The player joining is the temporary "host" for creation purposes
    const newRoom = createRoomStore(player, roomSettings);

    // 3. Add the human player with their chosen number of tickets
    addPlayerToRoomStore(newRoom.id, { ...player, isHost: true }, tickets);

    // 4. Add bot players to fill the room
    // Create a mixed pool of bot names for online mode
    const guestBotNames = Array.from({ length: 5 }, () => generateGuestBotName()); // Generate 5 Guest#xxxx names
    const onlineNamePool = shuffleArray([...ONLINE_BOT_NAMES, ...guestBotNames]);

    const botsToAdd = tierConfig.roomSize - 1;
    for (let i = 0; i < botsToAdd; i++) {
        const botId = `bot-${i+1}-${Date.now()}`;
        const botName = onlineNamePool[i % onlineNamePool.length]; // Use modulo to prevent running out of names
        const botPlayer: Player = { id: botId, name: botName, isBot: true };
        // Bots in online mode also get a random number of tickets to make it interesting
        const botTickets = 1 + Math.floor(Math.random() * 4);
        addPlayerToRoomStore(newRoom.id, botPlayer, botTickets);
    }
    
    // 5. Get the final state and return it (DO NOT START THE GAME)
    const roomForClient = getRoomStateForClient(newRoom.id);
    if (!roomForClient) {
        return NextResponse.json({ message: 'Failed to retrieve online room after creation' }, { status: 500 });
    }
    
    return NextResponse.json(roomForClient, { status: 201 });

  } catch (error) {
    console.error('Error creating online game room:', error);
    return NextResponse.json({ message: 'Error creating online game', error: (error as Error).message }, { status: 500 });
  }
}
