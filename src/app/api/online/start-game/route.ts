

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, runTransaction, collection, Timestamp, serverTimestamp } from 'firebase/firestore';
import type { FirestoreRoom } from '@/types';

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
                console.log(`Game start for room ${roomId} already triggered. Current status: ${roomData.status}`);
                return; // Gracefully exit if already processed
            }
            
            const playersCollectionRef = collection(db, "rooms", roomId, "players");
            
            // --- Add Bots ---
            const botsNeeded = roomData.settings.lobbySize - roomData.playersCount;
            if (botsNeeded > 0) {
                const namePool = shuffleArray([...ONLINE_BOT_NAMES]);
                for (let i = 0; i < botsNeeded; i++) {
                    const botId = `bot_${Date.now()}_${i}`;
                    const botRef = doc(playersCollectionRef, botId);
                    // This now happens *inside* the main transaction
                    transaction.set(botRef, {
                        id: botId,
                        name: namePool[i % namePool.length],
                        type: 'bot',
                        tickets: 1 + Math.floor(Math.random() * 4),
                        joinedAt: serverTimestamp()
                    });
                }
            }
            
            // --- Update Room Status (Critical Change) ---
            transaction.update(roomRef, {
                status: 'pre-game',
                preGameEndTime: Timestamp.fromMillis(Date.now() + 5000), // 5 second countdown
                playersCount: roomData.settings.lobbySize // Update count to include bots
            });
        });

        return NextResponse.json({ success: true, message: 'Game successfully moved to pre-game.' });

    } catch (error) {
        console.error("Error starting game with bots:", error);
        return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
    }
}
