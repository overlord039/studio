
import { NextResponse, type NextRequest } from 'next/server';
import { getRoomStore, getRoomStateForClient } from '@/lib/server/game-store';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import type { FirestoreRoom } from '@/types';


export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params; 

  try {
    if (!roomId) {
      return NextResponse.json({ message: 'Room ID is required' }, { status: 400 });
    }

    if (db) {
        const roomDocRef = doc(db, "rooms", roomId);
        const roomSnap = await getDoc(roomDocRef);
        if (roomSnap.exists()) {
            const roomData = roomSnap.data() as FirestoreRoom;
            // You might want to fetch players subcollection here too if needed
            return NextResponse.json(roomData);
        }
    }
    
    const memoryRoom = getRoomStateForClient(roomId);
    if (memoryRoom) {
      return NextResponse.json(memoryRoom);
    }

    return NextResponse.json({ message: 'Room not found.' }, { status: 404 });

  } catch (error) { 
    console.error(`Critical error in GET /api/rooms/${roomId}:`, error); 
    return NextResponse.json({ message: 'Server error fetching room.', error: (error as Error).message }, { status: 500 });
  }
}
