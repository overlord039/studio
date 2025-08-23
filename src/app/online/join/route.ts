
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
  increment,
} from 'firebase/firestore';

const TIERS: Record<OnlineGameTier, TierConfig> = {
  quick: {
    name: 'Quick',
    ticketPrice: 5,
    roomSize: 4,
    matchmakingTime: 15,
    unlockRequirements: { level: 1, matches: 0, coins: 0 },
  },
  classic: {
    name: 'Classic',
    ticketPrice: 10,
    roomSize: 6,
    matchmakingTime: 30,
    unlockRequirements: { level: 5, matches: 10, coins: 50 },
  },
  tournament: {
    name: 'Tournament',
    ticketPrice: 20,
    roomSize: 10,
    matchmakingTime: 60,
    unlockRequirements: { level: 10, matches: 25, coins: 150 },
  },
};

// This function cleans up rooms older than 1 hour that are stuck in waiting or finished states.
async function cleanupOldRooms() {
  if (!db) return;
  const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
  const roomsRef = collection(db, 'rooms');
  
  // **FIX:** The query now also targets 'finished' rooms, not just 'waiting' rooms.
  // This ensures that completed games are also cleaned up after a reasonable time.
  const q = query(roomsRef, 
    where('isPublic', '==', true),
    where('status', 'in', ['waiting', 'finished']), 
    where('createdAt', '<', oneHourAgo)
  );

  try {
    const oldRoomsSnapshot = await getDocs(q);
    if (oldRoomsSnapshot.empty) return;
    
    // We need to delete subcollections as well for finished rooms.
    const batch = writeBatch(db);
    
    for (const roomDoc of oldRoomsSnapshot.docs) {
      console.log(`Scheduling deletion for stale room: ${roomDoc.id} with status ${roomDoc.data().status}`);

      // If it's a finished room, we should also delete its players subcollection.
      if (roomDoc.data().status === 'finished') {
        const playersRef = collection(db, 'rooms', roomDoc.id, 'players');
        const playersSnap = await getDocs(playersRef);
        playersSnap.forEach(playerDoc => {
            batch.delete(playerDoc.ref);
        });
      }
      
      batch.delete(roomDoc.ref);
    }
    
    await batch.commit();
    console.log(`Cleaned up ${oldRoomsSnapshot.size} stale room(s).`);
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

      const querySnapshot = await getDocs(q);
      const suitableRoomDoc = querySnapshot.docs.find(
        (doc) => (doc.data() as FirestoreRoom).humanCount < doc.data().settings.lobbySize
      );

      if (suitableRoomDoc) {
        // --- Logic to JOIN an existing room ---
        targetRoomId = suitableRoomDoc.id;
        const roomRef = doc(db, 'rooms', targetRoomId);
        
        transaction.update(roomRef, { 
            humanCount: increment(1),
        });

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
          playersCount: 0, // This will be updated when bots are added
          humanCount: 1,
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
