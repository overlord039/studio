
import { NextResponse, type NextRequest } from 'next/server';
import { createRoomStore, addPlayerToRoomStore, getRoomStateForClient, findPublicRoom, fillRoomWithBotsAndStart } from '@/lib/server/game-store';
import type { Player, GameSettings, OnlineGameTier, TierConfig, Room } from '@/types';
import { db } from '@/lib/firebase/config';
import { doc, runTransaction, increment } from 'firebase/firestore';

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

declare global {
  // eslint-disable-next-line no-var
  var roomTimers: Map<string, NodeJS.Timeout>;
}
// Ensure the global timer map exists
const roomTimers = global.roomTimers || (global.roomTimers = new Map<string, NodeJS.Timeout>());

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Firestore is not configured.' }, { status: 500 });
  }

  try {
    const { player, tier, tickets } = (await request.json()) as { player: Player; tier: OnlineGameTier, tickets: number };

    // --- Validation ---
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

    // --- Transaction to deduct coins ---
    try {
        await runTransaction(db, async (transaction) => {
            const playerDoc = await transaction.get(playerDocRef);
            if (!playerDoc.exists()) throw new Error("Player data not found.");
            
            const currentCoins = playerDoc.data().stats?.coins || 0;
            if (currentCoins < totalCost) throw new Error("Not enough coins to buy these tickets.");
            
            newCoinBalance = currentCoins - totalCost;
            transaction.update(playerDocRef, { 'stats.coins': increment(-totalCost) });
        });
    } catch (err: any) {
         return NextResponse.json({ message: err.message || "An error occurred during the transaction." }, { status: 400 });
    }
    
    // --- Matchmaking Logic ---
    let targetRoom: Room | { error: string } | undefined = findPublicRoom(tier);
    let roomCreated = false;

    if (!targetRoom || 'error' in targetRoom) {
      // Create a new room if none are available
      const roomSettings: Partial<GameSettings> = {
        lobbySize: tierConfig.roomSize,
        isPublic: true,
        callingMode: 'auto',
        gameMode: 'online',
        ticketPrice: tierConfig.ticketPrice,
        tier: tier,
      };
      targetRoom = createRoomStore(player, roomSettings);
      roomCreated = true;
    }
    
    if ('error' in targetRoom) {
       return NextResponse.json({ message: targetRoom.error }, { status: 500 });
    }

    // Add player to the found/created room
    addPlayerToRoomStore(targetRoom.id, { ...player, isHost: roomCreated }, tickets);

    // If we just created a new room, start the matchmaking timer
    if (roomCreated) {
        const matchmakingTimer = setTimeout(() => {
            fillRoomWithBotsAndStart(targetRoom!.id);
        }, tierConfig.matchmakingTime * 1000);
        roomTimers.set(targetRoom.id, matchmakingTimer);
    }
    
    const roomForClient = getRoomStateForClient(targetRoom.id);
    if (!roomForClient) {
        return NextResponse.json({ message: 'Failed to retrieve room after join/create' }, { status: 500 });
    }
    
    const responsePayload = {
        ...roomForClient,
        newCoinBalance: newCoinBalance
    };
    
    return NextResponse.json(responsePayload, { status: 201 });

  } catch (error) {
    console.error('Error in online join-or-create:', error);
    return NextResponse.json({ message: 'Error joining or creating online game', error: (error as Error).message }, { status: 500 });
  }
}
