

import { NextResponse, type NextRequest } from 'next/server';
import { createRoomStore, addPlayerToRoomStore, getRoomStateForClient, startGameInRoomStore } from '@/lib/server/game-store';
import type { Player, GameSettings, OnlineGameTier, TierConfig, Room } from '@/types';
import { db } from '@/lib/firebase/config';
import { doc, runTransaction, increment, updateDoc, getDoc } from 'firebase/firestore';

const TIERS: Record<OnlineGameTier, TierConfig> = {
    quick: {
        name: "Quick", ticketPrice: 5, roomSize: 4, matchmakingTime: 15,
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
    const playerDocRef = doc(db, "users", player.id);
    let newCoinBalance = 0;

    // 1. Transaction to check coins and deduct them
    try {
        await runTransaction(db, async (transaction) => {
            const playerDoc = await transaction.get(playerDocRef);
            if (!playerDoc.exists()) {
                throw new Error("Player data not found.");
            }
            const currentCoins = playerDoc.data().stats?.coins || 0;
            if (currentCoins < totalCost) {
                throw new Error("Not enough coins to buy these tickets.");
            }
            newCoinBalance = currentCoins - totalCost;
            transaction.update(playerDocRef, { 'stats.coins': increment(-totalCost) });
        });
    } catch (err: any) {
         return NextResponse.json({ message: err.message || "An error occurred during the transaction." }, { status: 400 });
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
    const guestBotNames = Array.from({ length: 5 }, () => generateGuestBotName()); // Generate 5 Guest#xxxx names
    const onlineNamePool = shuffleArray([...ONLINE_BOT_NAMES, ...guestBotNames]);

    const botsToAdd = tierConfig.roomSize - 1;
    for (let i = 0; i < botsToAdd; i++) {
        const botId = `bot-${i+1}-${Date.now()}`;
        const botName = onlineNamePool[i % onlineNamePool.length];
        const botPlayer: Player = { id: botId, name: botName, isBot: true };
        const botTickets = 1 + Math.floor(Math.random() * 4);
        addPlayerToRoomStore(newRoom.id, botPlayer, botTickets);
    }
    
    // 5. Start the game immediately
    const startResult = startGameInRoomStore(newRoom.id, player.id);
    if (startResult && 'error' in startResult) {
        console.error(`Failed to start online game ${newRoom.id}:`, startResult.error);
        // We don't return an error to the client here, because the room is created
        // and they can still join, but we log it. The game might not auto-start.
    }
    
    // 6. Get the final state and return it
    const roomForClient = getRoomStateForClient(newRoom.id);
    if (!roomForClient) {
        return NextResponse.json({ message: 'Failed to retrieve online room after creation' }, { status: 500 });
    }
    
    const responsePayload: Room & { newCoinBalance: number } = {
        ...roomForClient,
        newCoinBalance: newCoinBalance
    };
    
    return NextResponse.json(responsePayload, { status: 201 });

  } catch (error) {
    console.error('Error creating online game room:', error);
    return NextResponse.json({ message: 'Error creating online game', error: (error as Error).message }, { status: 500 });
  }
}
