
'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, runTransaction, arrayUnion, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { FirestoreRoom } from '@/types';
import { NUMBERS_RANGE_MIN, NUMBERS_RANGE_MAX, SERVER_CALL_INTERVAL } from '@/lib/constants';

// --- In-memory store for server-side timers ---
// NOTE: In a multi-instance/serverless environment, a more robust solution like
// a task queue (Cloud Tasks) would be better. For this app's scope, this is sufficient.
const activeRoomTimers = new Map<string, NodeJS.Timeout>();

// Helper to generate and shuffle a full number pool
function initializeNumberPool(): number[] {
    const pool = Array.from({ length: NUMBERS_RANGE_MAX - NUMBERS_RANGE_MIN + 1 }, (_, i) => NUMBERS_RANGE_MIN + i);
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
}

// Function to stop and clear a timer for a room
function stopTimerForRoom(roomId: string) {
    if (activeRoomTimers.has(roomId)) {
        clearTimeout(activeRoomTimers.get(roomId));
        activeRoomTimers.delete(roomId);
        console.log(`Timer stopped for room ${roomId}.`);
    }
}

// Main function to call a number and perpetuate the timer
async function callNumberAndScheduleNext(roomId: string) {
    if (!db) {
        console.error('Firestore is not configured. Cannot call number.');
        return;
    }

    let gameFinished = false;
    let isGameInProgress = false;

    try {
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

            if (roomData.status !== 'in-progress') {
                isGameInProgress = false;
                return;
            }
            isGameInProgress = true;

            let numberPool = roomData.numberPool || [];
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
                numberPool: numberPool,
                calledNumbers: arrayUnion(nextNumber),
                currentNumber: nextNumber,
                lastNumberCall: serverTimestamp()
            });
        });

        if (gameFinished || !isGameInProgress) {
            stopTimerForRoom(roomId);
        } else {
            // Schedule the next call
            const nextCallTimer = setTimeout(() => {
                callNumberAndScheduleNext(roomId);
            }, SERVER_CALL_INTERVAL);
            activeRoomTimers.set(roomId, nextCallTimer);
        }
    } catch (error) {
        console.error(`Error calling number for room ${roomId}:`, error);
        stopTimerForRoom(roomId);
    }
}


export async function POST(request: Request) {
    // This POST endpoint is now only used to INITIATE the timer loop from start-game.
    // It's a trigger, not the number caller itself.
    try {
        const { roomId } = await request.json();
        if (!roomId) {
            return NextResponse.json({ message: 'Room ID is required.' }, { status: 400 });
        }
        
        // Prevent duplicate timers
        if (activeRoomTimers.has(roomId)) {
             return NextResponse.json({ success: true, message: 'Timer already active.' });
        }

        console.log(`Initial number call trigger received for room ${roomId}. Starting loop.`);
        callNumberAndScheduleNext(roomId);

        return NextResponse.json({ success: true, message: 'Number calling loop initiated.' });

    } catch (error) {
        console.error("Error initiating number call loop:", error);
        return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
    }
}
