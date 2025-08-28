
'use server';

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";

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

        // 1. Transition the room state to 'in-progress'
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
            } else {
                // If it's already in-progress or finished, do nothing.
                console.log(`Game start for room ${roomId} was already triggered. Current status: ${roomData.status}`);
            }
        });
        
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
        const hostUrl = `${protocol}://${host}`;

        // 2. Trigger the self-perpetuating number calling loop
        // We do this with a fetch so we don't block the response of this endpoint.
        fetch(`${hostUrl}/api/online/call-number`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId }),
        }).catch(err => {
            // Log the error but don't fail the request, as the game has officially started.
            console.error(`Failed to trigger number calling loop for room ${roomId}:`, err);
        });
        
        console.log(`Game started and initial number call triggered for room ${roomId}.`);

        return NextResponse.json({ success: true, message: 'Game started successfully.'});

    } catch (error) {
        console.error("Error starting game:", error);
        return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
    }
}
