
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, runTransaction, collection, Timestamp, writeBatch } from 'firebase/firestore';
import type { FirestoreRoom, OnlineGameTier, TierConfig } from '@/types';

const TIERS: Record<OnlineGameTier, TierConfig> = {
    quick: { name: "Quick", ticketPrice: 5, roomSize: 4, matchmakingTime: 15, unlockRequirements: { matches: 0, coins: 0 } },
    classic: { name: "Classic", ticketPrice: 10, roomSize: 6, matchmakingTime: 30, unlockRequirements: { matches: 5, coins: 50 } },
    tournament: { name: "Tournament", ticketPrice: 20, roomSize: 10, matchmakingTime: 60, unlockRequirements: { matches: 15, coins: 150 } }
};

const ONLINE_BOT_NAMES = ["Alex", "Sam", "Jordan", "Taylor", "Casey", "Riley", "Jessie", "Morgan", "Skyler", "Drew"];

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
        const { roomId } = (await request.json()) as { roomId: string };
        if (!roomId) {
            return NextResponse.json({ message: 'Room ID is required.' }, { status: 400 });
        }

        const roomRef = doc(db, 'rooms', roomId);

        await runTransaction(db, async (transaction) => {
            const roomSnap = await transaction.get(roomRef);
            if (!roomSnap.exists()) {
                throw new Error("Room does not exist.");
            }

            const roomData = roomSnap.data() as FirestoreRoom;

            // --- Safety Checks ---
            if (roomData.status !== 'waiting') {
                // Another client already triggered this, so we can ignore.
                return;
            }

            const timerEndMs = roomData.timerEnd.toMillis();
            // Allow a small grace period for client-server clock differences
            if (timerEndMs > Date.now() + 2000 && roomData.playersCount < roomData.settings.lobbySize) {
                 // It's not time yet and room is not full, do nothing.
                return;
            }

            const playersCollectionRef = collection(db, "rooms", roomId, "players");
            const batch = writeBatch(db);

            // --- Add Bots ---
            const botsNeeded = roomData.settings.lobbySize - roomData.playersCount;
            if (botsNeeded > 0) {
                const namePool = shuffleArray([...ONLINE_BOT_NAMES]);
                for (let i = 0; i < botsNeeded; i++) {
                    const botId = `bot_${Date.now()}_${i}`;
                    const botRef = doc(playersCollectionRef, botId);
                    batch.set(botRef, {
                        id: botId,
                        name: namePool[i % namePool.length],
                        type: 'bot',
                        tickets: 1 + Math.floor(Math.random() * 4),
                    });
                }
            }

            // --- Update Room Status ---
            transaction.update(roomRef, {
                status: 'pre-game',
                preGameEndTime: Timestamp.fromMillis(Date.now() + 5000), // 5 second pre-game countdown
                playersCount: roomData.settings.lobbySize
            });
            
            // The reads (transaction.get) must come before writes.
            // Since we are writing to a different collection (players) using a batch,
            // we commit the batch after the transaction updates.
             await batch.commit();
        });

        return NextResponse.json({ success: true, message: 'Game successfully moved to pre-game.' });
    } catch (error) {
        console.error("Error starting game with bots:", error);
        return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
    }
}
