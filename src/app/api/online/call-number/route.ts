
'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, runTransaction, arrayUnion, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { FirestoreRoom } from '@/types';
import { NUMBERS_RANGE_MIN, NUMBERS_RANGE_MAX, SERVER_CALL_INTERVAL } from '@/lib/constants';

// Helper to generate and shuffle a full number pool
function initializeNumberPool(): number[] {
    const pool = Array.from({ length: NUMBERS_RANGE_MAX - NUMBERS_RANGE_MIN + 1 }, (_, i) => NUMBERS_RANGE_MIN + i);
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
}

export async function POST(request: Request) {
    if (!db) {
        return NextResponse.json({ message: 'Firestore is not configured.' }, { status: 500 });
    }

    try {
        const { roomId } = await request.json();
        if (!roomId) {
            return NextResponse.json({ message: 'Room ID is required.' }, { status: 400 });
        }

        const roomRef = doc(db, 'rooms', roomId);
        let gameFinished = false;

        await runTransaction(db, async (transaction) => {
            const roomSnap = await transaction.get(roomRef);
            if (!roomSnap.exists()) {
                throw new Error('Room not found.');
            }

            const roomData = roomSnap.data() as FirestoreRoom & {
                numberPool?: number[];
                calledNumbers?: number[];
                currentNumber?: number;
                lastNumberCall?: Timestamp;
            };
            
            // Only call a number if the game is in progress
            if (roomData.status !== 'in-progress') {
                return; // Not an error, just do nothing.
            }
            
            // --- Server-side Cooldown ---
            // Enforce a strict cooldown period between number calls to maintain game pace.
            const now = Timestamp.now();
            if (roomData.lastNumberCall) {
                const timeSinceLastCall = now.toMillis() - roomData.lastNumberCall.toMillis();
                if (timeSinceLastCall < SERVER_CALL_INTERVAL - 1000) { // Allow a 1s buffer
                    // It's too soon to call another number. Silently exit.
                    return;
                }
            }


            let numberPool = roomData.numberPool || [];
            
            // Initialize pool if it doesn't exist
            if (numberPool.length === 0 && (!roomData.calledNumbers || roomData.calledNumbers.length === 0)) {
                numberPool = initializeNumberPool();
            }
            
            if (numberPool.length === 0) {
                 transaction.update(roomRef, {
                    status: 'finished',
                    currentNumber: null,
                });
                gameFinished = true;
                return;
            }
            
            const nextNumber = numberPool.pop()!;
            
            transaction.update(roomRef, {
                numberPool: numberPool, // Save the updated (shorter) pool back to Firestore
                calledNumbers: arrayUnion(nextNumber),
                currentNumber: nextNumber,
                lastNumberCall: now // Use the server's authoritative timestamp
            });
        });
        
        if (gameFinished) {
            // If the game just finished, we might need to stop a timer or do other cleanup.
            // For now, just logging it.
            console.log(`Game finished in room ${roomId}. All numbers called.`);
        }

        return NextResponse.json({ success: true, message: 'Number called successfully.' });

    } catch (error) {
        console.error("Error calling number:", error);
        return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
    }
}
