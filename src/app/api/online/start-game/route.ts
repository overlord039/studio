
'use server';

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { doc, runTransaction, serverTimestamp, getDoc, collection, getDocs } from "firebase/firestore";
import { MIN_LOBBY_SIZE } from "@/lib/constants";
import type { FirestoreRoom, FirestorePlayer } from "@/types";

export async function POST(request: Request) {
    if (!db) {
        return NextResponse.json({ message: 'Firestore is not configured.'}, { status: 500 });
    }

    try {
        const { roomId, hostId } = await request.json();
        if (!roomId || !hostId) {
            return NextResponse.json({ message: 'Room ID and Host ID are required.'}, { status: 400 });
        }

        const roomRef = doc(db, 'rooms', roomId);

        await runTransaction(db, async (transaction) => {
            const roomSnap = await transaction.get(roomRef);
            if (!roomSnap.exists()) {
                throw new Error('Room does not exist.');
            }

            const roomData = roomSnap.data() as FirestoreRoom;
            
            // Security check: Only the host can start the game.
            if (roomData.host.id !== hostId) {
                throw new Error('Only the host can start the game.');
            }

            // Idempotency: only transition from pre-game to in-progress
            if (roomData.status !== 'pre-game') {
                console.log(`Game start for room ${roomId} was attempted, but status is not 'pre-game'. Current status: ${roomData.status}`);
                return;
            }

            // Player count check
            const playersRef = collection(db, 'rooms', roomId, 'players');
            const playersSnap = await getDocs(playersRef);
            const players = playersSnap.docs.map(d => d.data() as FirestorePlayer);

            const playersWithTickets = players.filter(p => p.tickets > 0).length;

            if (playersWithTickets < MIN_LOBBY_SIZE) {
                throw new Error(`Need at least ${MIN_LOBBY_SIZE} players with tickets to start. Currently: ${playersWithTickets}.`);
            }
            
            transaction.update(roomRef, { 
                status: 'in-progress',
                gameStartTime: serverTimestamp(),
                // Initialize the cooldown period for the first number.
                lastNumberCall: serverTimestamp()
            });
        });
        
        console.log(`Game started for room ${roomId}. Client host will now trigger number calls.`);

        return NextResponse.json({ success: true, message: 'Game started successfully.'});

    } catch (error) {
        console.error("Error starting game:", error);
        return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
    }
}
