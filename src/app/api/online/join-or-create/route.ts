

import { NextResponse, type NextRequest } from 'next/server';
import { createRoomStore, addPlayerToRoomStore, getRoomStateForClient, startGameInRoomStore, findPublicRoom, fillRoomWithBotsAndStart } from '@/lib/server/game-store';
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
    
    // 2. Find an available public room for the selected tier
    let targetRoom: Room | { error: string } | undefined = findPublicRoom(tier);
    let roomCreated = false;

    // 3. If no room is found, create a new one
    if (!targetRoom || 'error' in targetRoom) {
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

    // 4. Add player to the found/created room
    addPlayerToRoomStore(targetRoom.id, { ...player, isHost: true }, tickets);

    // If we just created this room, set a timer to fill it with bots and start
    if (roomCreated) {
        setTimeout(() => {
            fillRoomWithBotsAndStart(targetRoom!.id, player.id, tierConfig.roomSize);
        }, tierConfig.matchmakingTime * 1000);
    }
    
    // 5. Get the final state and return it
    const roomForClient = getRoomStateForClient(targetRoom.id);
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
