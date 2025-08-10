

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, runTransaction, collection, Timestamp, writeBatch, getDoc, serverTimestamp } from 'firebase/firestore';
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

        // --- Step 1: Add Bots in a Batch ---
        const roomSnapForBotCheck = await getDoc(roomRef);
        if (!roomSnapForBotCheck.exists()) {
            throw new Error("Room does not exist.");
        }
        const roomData = roomSnapForBotCheck.data() as FirestoreRoom;

        // Safety check: only add bots if the room is still in 'waiting'
        if (roomData.status === 'waiting') {
            const botsNeeded = roomData.settings.lobbySize - roomData.playersCount;
            if (botsNeeded > 0) {
                const batch = writeBatch(db);
                const playersCollectionRef = collection(db, "rooms", roomId, "players");
                const namePool = shuffleArray([...ONLINE_BOT_NAMES]);
                
                for (let i = 0; i < botsNeeded; i++) {
                    const botId = `bot_${Date.now()}_${i}`;
                    const botRef = doc(playersCollectionRef, botId);
                    batch.set(botRef, {
                        id: botId,
                        name: namePool[i % namePool.length],
                        type: 'bot',
                        tickets: 1 + Math.floor(Math.random() * 4),
                        joinedAt: serverTimestamp()
                    });
                }
                await batch.commit();
            }
        }


        // --- Step 2: Transition Room Status in a Transaction ---
        await runTransaction(db, async (transaction) => {
            const roomSnap = await transaction.get(roomRef);
            if (!roomSnap.exists()) {
                throw new Error("Room does not exist.");
            }
            const currentData = roomSnap.data() as FirestoreRoom;

            // Final safety check inside transaction
            if (currentData.status !== 'waiting') {
                console.log(`Game start for room ${roomId} already processed. Current status: ${currentData.status}`);
                return;
            }

            transaction.update(roomRef, {
                status: 'pre-game',
                preGameEndTime: Timestamp.fromMillis(Date.now() + 5000), // 5 second countdown
                playersCount: currentData.settings.lobbySize // Set to full
            });
        });

        return NextResponse.json({ success: true, message: 'Game successfully moved to pre-game.' });

    } catch (error) {
        console.error("Error starting game with bots:", error);
        return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
    }
}
