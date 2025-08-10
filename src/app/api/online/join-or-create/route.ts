

import { NextResponse, type NextRequest } from 'next/server';
import type { Player, OnlineGameTier, TierConfig, FirestoreRoom } from '@/types';
import { db } from '@/lib/firebase/config';
import { doc, runTransaction, collection, query, where, getDocs, Timestamp, writeBatch, serverTimestamp, orderBy, limit } from 'firebase/firestore';

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

async function cleanupOldRooms() {
    if (!db) return;

    const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
    const roomsRef = collection(db, "rooms");
    const q = query(roomsRef, where("createdAt", "<", oneHourAgo));

    try {
        const oldRoomsSnapshot = await getDocs(q);
        if (oldRoomsSnapshot.empty) {
            return;
        }

        const batch = writeBatch(db);
        oldRoomsSnapshot.forEach(doc => {
            console.log(`Deleting expired room ${doc.id}`);
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Successfully deleted ${oldRoomsSnapshot.size} old room(s).`);
    } catch (error) {
        console.error("Error cleaning up old rooms:", error);
    }
}


export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Firestore is not configured.' }, { status: 500 });
  }

  // Run cleanup in the background, don't wait for it to complete
  cleanupOldRooms();

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
    let newCoinBalance = 0;
    
    // --- Phase 1: Find a suitable room OUTSIDE the transaction ---
    const roomsRef = collection(db, "rooms");
    const q = query(
        roomsRef,
        where("status", "==", "waiting"),
        where("tier", "==", tier),
        where("isPublic", "==", true),
        limit(20) // Limit search to improve performance
    );
    const availableRoomsSnapshot = await getDocs(q);
    const suitableRoomDoc = availableRoomsSnapshot.docs.find(doc => doc.data().playersCount < doc.data().settings.lobbySize);

    let targetRoomId: string | null = null;
    
    // --- Phase 2: Run Transaction to join/create room and deduct coins ---
     await runTransaction(db, async (transaction) => {
        const playerDocRef = doc(db, "users", player.id);
        const playerDoc = await transaction.get(playerDocRef);
        if (!playerDoc.exists()) throw new Error("Player data not found.");
        
        const currentCoins = playerDoc.data().stats?.coins || 0;
        if (currentCoins < totalCost) throw new Error("Not enough coins to buy these tickets.");
        
        newCoinBalance = currentCoins - totalCost;
        
        if (suitableRoomDoc) {
            // --- Logic to JOIN an existing room ---
            targetRoomId = suitableRoomDoc.id;
            const roomRef = doc(db, "rooms", targetRoomId);
            const roomDoc = await transaction.get(roomRef); // Re-read inside transaction for consistency

            if (!roomDoc.exists() || roomDoc.data().status !== 'waiting' || roomDoc.data().playersCount >= roomDoc.data().settings.lobbySize) {
                // The room was filled or changed status between our initial query and this transaction.
                // We'll let this transaction fail and the client can retry, which will then attempt to create a new room.
                throw new Error("Room is no longer available. Please try again.");
            }
            
            // The room is still available, so join it.
            const playerSubcollectionRef = doc(collection(db, "rooms", targetRoomId, "players"), player.id);
            
            transaction.set(playerSubcollectionRef, {
                id: player.id,
                name: player.name,
                tickets,
                type: 'human',
                joinedAt: serverTimestamp()
            });
            
            const newPlayerCount = roomDoc.data().playersCount + 1;
            transaction.update(roomRef, { playersCount: newPlayerCount });

             // If room is now full, transition it immediately
            if (newPlayerCount >= tierConfig.roomSize) {
                transaction.update(roomRef, {
                    status: 'pre-game',
                    preGameEndTime: Timestamp.fromMillis(Date.now() + 5000)
                });
            }

        } else {
            // --- Logic to CREATE a new room ---
            const newRoomRef = doc(collection(db, "rooms"));
            targetRoomId = newRoomRef.id;
            
            const newRoomData: FirestoreRoom = {
                id: targetRoomId,
                host: player,
                settings: {
                    lobbySize: tierConfig.roomSize,
                    isPublic: true,
                    callingMode: 'auto',
                    gameMode: 'online',
                    ticketPrice: tierConfig.ticketPrice,
                    tier: tier,
                    prizeFormat: 'Format 1',
                    numberOfTicketsPerPlayer: 1
                },
                status: 'waiting',
                playersCount: 1,
                tier: tier,
                isPublic: true,
                createdAt: Timestamp.now(),
                timerEnd: Timestamp.fromMillis(Date.now() + tierConfig.matchmakingTime * 1000),
            };

            transaction.set(newRoomRef, newRoomData);
            const playerSubcollectionRef = doc(collection(db, "rooms", targetRoomId, "players"), player.id);
            transaction.set(playerSubcollectionRef, {
                id: player.id,
                name: player.name,
                tickets,
                type: 'human',
                joinedAt: serverTimestamp()
            });
        }

        // Deduct coins at the end of the transaction, only if everything else succeeded.
        transaction.update(playerDocRef, { 'stats.coins': newCoinBalance });
    });
    
    if (!targetRoomId) {
        throw new Error("Failed to find or create a room. Please try again.");
    }

    return NextResponse.json({ roomId: targetRoomId, newCoinBalance }, { status: 201 });

  } catch (error) {
    console.error('Error in online join-or-create:', error);
    // TODO: Add refund logic if coin deduction succeeded but room join failed.
    return NextResponse.json({ message: (error as Error).message || 'Error joining or creating online game' }, { status: 500 });
  }
}
