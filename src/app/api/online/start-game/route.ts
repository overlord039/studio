
'use server';

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { SERVER_CALL_INTERVAL } from "@/lib/constants";

// This will store timers on the server instance.
// NOTE: In a serverless/multi-instance environment, this is not a robust solution for long-running tasks.
// A more durable solution would involve a cron job service (e.g., Cloud Scheduler) or a task queue.
// For the scope of this app, we'll manage timers in-memory per instance.
const activeRoomTimers = new Map<string, NodeJS.Timeout>();

async function callNumberForRoom(roomId: string, host: string) {
    const url = `${host}/api/online/call-number`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId }),
        });
        // Self-perpetuating timer is now handled on the call-number endpoint itself.
        // The start-game endpoint just gives it the initial kick.
        if (!response.ok) {
            console.error(`API call to call number for room ${roomId} failed with status: ${response.status}`);
        }

    } catch (error) {
        console.error(`Failed to call number for room ${roomId}:`, error);
    }
}


export async function POST(request: Request) {
    if (!db) {
        return NextResponse.json({ message: 'Firestore is not configured.'}, { status: 500 });
    }

    try {
        const { roomId } = await request.json();
        if (!roomId) {
            return NextResponse.json({ message: 'Room ID is required.'}, { status: 400 });
        }

        const roomRef = doc(db, 'rooms', roomId);

        await runTransaction(db, async (transaction) => {
            const roomSnap = await transaction.get(roomRef);
            if (!roomSnap.exists()) {
                throw new Error('Room does not exist.');
            }

            const roomData = roomSnap.data();
            // Idempotency: only transition from pre-game to in-progress
            if (roomData.status === 'pre-game') {
                transaction.update(roomRef, { 
                    status: 'in-progress',
                    gameStartTime: serverTimestamp() 
                });
            }
        });
        
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
        const hostUrl = `${protocol}://${host}`;

        // Call the first number after a short delay
        setTimeout(() => {
            callNumberForRoom(roomId, hostUrl);
        }, 1000); 
        
        console.log(`Initial number call scheduled for room ${roomId}.`);

        return NextResponse.json({ success: true, message: 'Game started successfully.'});

    } catch (error) {
        console.error("Error starting game:", error);
        return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
    }
}
