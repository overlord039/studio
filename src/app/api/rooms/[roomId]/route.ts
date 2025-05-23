
import { NextResponse, type NextRequest } from 'next/server';
import { getRoomStore, getRoomStateForClient } from '@/lib/server/game-store';

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params; 

  try {
    if (!roomId) {
      return NextResponse.json({ message: 'Room ID is required' }, { status: 400 });
    }

    const roomForClient = getRoomStateForClient(roomId);

    if (!roomForClient) {
      // This means either room not found, or getRoomStateForClient had an internal error and returned undefined
      return NextResponse.json({ message: 'Room not found or unable to process room data.' }, { status: 404 });
    }
    
    return NextResponse.json(roomForClient, { status: 200 });

  } catch (error) { // This catch is for truly unexpected errors within this GET handler
    let errorMessage = 'An unexpected error occurred while fetching room details.';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    // Using console.error for server-side logging
    console.error(`Critical error in GET /api/rooms/${roomId}:`, error); 
    
    // Attempt to return a structured error response
    try {
      return NextResponse.json({ message: 'Server error fetching room.', errorDetail: errorMessage }, { status: 500 });
    } catch (responseError) {
      // If even NextResponse.json fails (highly unlikely but for robustness)
      console.error(`Error creating NextResponse in GET /api/rooms/${roomId} catch block:`, responseError);
      return new Response('Internal Server Error', { status: 500, headers: { 'Content-Type': 'text/plain' } });
    }
  }
}
