
'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, runTransaction, arrayUnion, serverTimestamp } from 'firebase/firestore';
import type { FirestoreRoom } from '@/types';
import { NUMBERS_RANGE_MIN, NUMBERS_RANGE_MAX } from '@/lib/constants';

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

        await runTransaction(db, async (transaction) => {
            const roomSnap = await transaction.get(roomRef);
            if (!roomSnap.exists()) {
                throw new Error('Room not found.');
            }

            const roomData = roomSnap.data() as FirestoreRoom & {
                numberPool?: number[];
                calledNumbers?: number[];
                currentNumber?: number;
                lastNumberCall?: any;
            };
            
            // Only call a number if the game is in progress
            if (roomData.status !== 'in-progress') {
                return; // Not an error, just do nothing.
            }
            
            // Prevent calling too frequently (e.g., less than 4 seconds apart)
            const lastCallTimestamp = roomData.lastNumberCall?.toMillis() || 0;
            if (Date.now() - lastCallTimestamp < 4000) {
                return;
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
                return;
            }
            
            const nextNumber = numberPool.pop()!;
            
            transaction.update(roomRef, {
                numberPool: numberPool,
                calledNumbers: arrayUnion(nextNumber),
                currentNumber: nextNumber,
                lastNumberCall: serverTimestamp()
            });
        });
        
        return NextResponse.json({ success: true, message: 'Number called successfully.' });

    } catch (error) {
        console.error("Error calling number:", error);
        return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
    }
}
