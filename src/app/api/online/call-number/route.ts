
'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, runTransaction, arrayUnion, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { FirestoreRoom } from '@/types';
import { NUMBERS_RANGE_MIN, NUMBERS_RANGE_MAX, SERVER_CALL_INTERVAL } from '@/lib/constants';

// This endpoint is now stateless. It does not manage timers.
// It relies on a client (the host) to "tick" the game forward.
// It uses a timestamp in Firestore to enforce a cooldown.

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
        const { roomId, hostId } = await request.json();
        if (!roomId || !hostId) {
            return NextResponse.json({ message: 'Room ID and Host ID are required.' }, { status: 400 });
        }

        let numberCalled = false;
        await runTransaction(db, async (transaction) => {
            const roomRef = doc(db, 'rooms', roomId);
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

            // Security check: Only the host can trigger a number call.
            if (roomData.host.id !== hostId) {
                throw new Error('Only the host can call numbers.');
            }

            if (roomData.status !== 'in-progress') {
                // Game is not active, so we don't call a number.
                // This is not an error, just a state where no action is needed.
                return;
            }
            
            // --- Cooldown Logic ---
            const now = Date.now();
            const lastCallTime = roomData.lastNumberCall?.toMillis() || 0;
            if (now - lastCallTime < SERVER_CALL_INTERVAL - 500) { // Allow a small buffer
                 // It's too soon to call another number.
                 // We don't throw an error, just return without doing anything.
                 return;
            }

            let numberPool = roomData.numberPool || [];
            if (numberPool.length === 0 && (!roomData.calledNumbers || roomData.calledNumbers.length === 0)) {
                numberPool = initializeNumberPool();
            }

            if (numberPool.length === 0) {
                transaction.update(roomRef, {
                    status: 'finished',
                    currentNumber: null,
                });
                return;
            }

            const nextNumber = numberPool.pop()!;
            transaction.update(roomRef, {
                numberPool: numberPool,
                calledNumbers: arrayUnion(nextNumber),
                currentNumber: nextNumber,
                lastNumberCall: serverTimestamp() // Update the timestamp
            });
            numberCalled = true;
        });

        if (numberCalled) {
          return NextResponse.json({ success: true, message: 'Number called successfully.' });
        } else {
          return NextResponse.json({ success: true, message: 'Cooldown active or game not in progress.' });
        }

    } catch (error) {
        console.error(`Error calling number for room:`, error);
        return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
    }
}
