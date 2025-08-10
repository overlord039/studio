
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import type { Player, OnlineGameTier, TierConfig, FirestoreRoom } from '@/types';
import { db } from '@/lib/firebase/config';
import {
  doc,
  runTransaction,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  writeBatch,
  serverTimestamp,
  limit,
} from 'firebase/firestore';

const TIERS: Record<OnlineGameTier, TierConfig> = {
  quick: {
    name: 'Quick',
    ticketPrice: 5,
    roomSize: 4,
    matchmakingTime: 15,
    unlockRequirements: { matches: 0, coins: 0 },
  },
  classic: {
    name: 'Classic',
    ticketPrice: 10,
    roomSize: 6,
    matchmakingTime: 30,
    unlockRequirements: { matches: 5, coins: 50 },
  },
  tournament: {
    name: 'Tournament',
    ticketPrice: 20,
    roomSize: 10,
    matchmakingTime: 60,
    unlockRequirements: { matches: 15, coins: 150 },
  },
};

// This function cleans up rooms older than 1 hour to prevent clutter.
async function cleanupOldRooms() {
  if (!db) return;
  const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
  const roomsRef = collection(db, 'rooms');
  const q = query(roomsRef, where('createdAt', '<', oneHourAgo));
  try {
    const oldRoomsSnapshot = await getDocs(q);
    if (oldRoomsSnapshot.empty) return;
    const batch = writeBatch(db);
    oldRoomsSnapshot.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`Cleaned up ${oldRoomsSnapshot.size} old room(s).`);
  } catch (error) {
    console.error('Error cleaning up old rooms:', error);
  }
}

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { message: 'Firestore is not configured.' },
      { status: 500 }
    );
  }

  // Run cleanup in the background, don't wait for it.
  cleanupOldRooms();

  try {
    const { player, tier, tickets } = (await request.json()) as {
      player: Player;
      tier: OnlineGameTier;
      tickets: number;
    };

    // --- Validation ---
    if (!player || !player.id || !player.name) {
      return NextResponse.json(
        { message: 'Player details are required' },
        { status: 400 }
      );
    }
    if (!tier || !TIERS[tier]) {
      return NextResponse.json(
        { message: 'A valid game tier is required' },
        { status: 400 }
      );
    }
    if (typeof tickets !== 'number' || tickets < 1 || tickets > 4) {
      return NextResponse.json(
        { message: 'A valid ticket count (1-4) is required.' },
        { status: 400 }
      );
    }

    const tierConfig = TIERS[tier];
    const totalCost = tierConfig.ticketPrice * tickets;
    let newCoinBalance = 0;
    let targetRoomId: string | null = null;

    // --- Transaction to join/create room and deduct coins ---
    await runTransaction(db, async (transaction) => {
      const playerDocRef = doc(db, 'users', player.id);
      const playerDoc = await transaction.get(playerDocRef);
      if (!playerDoc.exists()) throw new Error('Player data not found.');

      const currentCoins = playerDoc.data().stats?.coins || 0;
      if (currentCoins < totalCost) throw new Error('Not enough coins.');

      newCoinBalance = currentCoins - totalCost;

      // --- Matchmaking Logic (inside transaction) ---
      const roomsRef = collection(db, 'rooms');
      const q = query(
        roomsRef,
        where('status', '==', 'waiting'),
        where('tier', '==', tier),
        where('isPublic', '==', true),
        limit(20) // Search a limited number of rooms for performance
      );

      // Note: We get rooms inside the transaction to ensure data consistency.
      const availableRoomsSnapshot = await getDocs(q);
      const suitableRoomDoc = availableRoomsSnapshot.docs.find(
        (doc) => (doc.data() as FirestoreRoom).playersCount < doc.data().settings.lobbySize
      );

      if (suitableRoomDoc) {
        // --- Logic to JOIN an existing room ---
        targetRoomId = suitableRoomDoc.id;
        const roomRef = doc(db, 'rooms', targetRoomId);
        const roomData = suitableRoomDoc.data() as FirestoreRoom;
        const newPlayerCount = roomData.playersCount + 1;

        transaction.update(roomRef, { playersCount: newPlayerCount });
        const playerSubcollectionRef = doc(
          collection(db, 'rooms', targetRoomId, 'players'),
          player.id
        );
        transaction.set(playerSubcollectionRef, {
          id: player.id,
          name: player.name,
          tickets,
          type: 'human',
          joinedAt: serverTimestamp(),
        });

      } else {
        // --- Logic to CREATE a new room ---
        const newRoomRef = doc(collection(db, 'rooms'));
        targetRoomId = newRoomRef.id;

        const newRoomData: FirestoreRoom = {
          id: targetRoomId,
          host: { id: 'system', name: 'System' }, // System is the host
          settings: {
            lobbySize: tierConfig.roomSize,
            isPublic: true,
            callingMode: 'auto',
            gameMode: 'online',
            ticketPrice: tierConfig.ticketPrice,
            tier: tier,
          },
          status: 'waiting',
          playersCount: 1,
          botCount: 0,
          tier: tier,
          isPublic: true,
          createdAt: Timestamp.now(),
          timerEnd: Timestamp.fromMillis(
            Date.now() + tierConfig.matchmakingTime * 1000
          ),
        };

        transaction.set(newRoomRef, newRoomData);
        const playerSubcollectionRef = doc(
          collection(db, 'rooms', targetRoomId, 'players'),
          player.id
        );
        transaction.set(playerSubcollectionRef, {
          id: player.id,
          name: player.name,
          tickets,
          type: 'human',
          joinedAt: serverTimestamp(),
        });
      }

      // Deduct coins at the end of the transaction, only if everything else succeeded.
      transaction.update(playerDocRef, { 'stats.coins': newCoinBalance });
    });

    if (!targetRoomId) {
      throw new Error('Failed to find or create a room. Please try again.');
    }

    return NextResponse.json(
      { roomId: targetRoomId, newCoinBalance },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in online join-or-create:', error);
    return NextResponse.json(
      { message: (error as Error).message || 'Error joining or creating game' },
      { status: 500 }
    );
  }
}
