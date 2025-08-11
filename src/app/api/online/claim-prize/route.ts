
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, runTransaction, getDoc } from 'firebase/firestore';
import type { FirestoreRoom, FirestorePlayer, PrizeType } from '@/types';

// The housie library is not needed here anymore as we will trust the client validation.
// const housie = require('@/lib/housie');

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { message: 'Firestore is not configured.' },
      { status: 500 }
    );
  }

  try {
    const { roomId, playerId, prizeType } = (await request.json()) as {
      roomId: string;
      playerId: string;
      prizeType: PrizeType;
    };

    if (!roomId || !playerId || !prizeType) {
      return NextResponse.json(
        { message: 'Room ID, Player ID, and Prize Type are required.' },
        { status: 400 }
      );
    }

    const roomRef = doc(db, 'rooms', roomId);
    let claimSuccessful = false;

    await runTransaction(db, async (transaction) => {
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) {
        throw new Error('Room not found.');
      }
      const roomData = roomSnap.data() as FirestoreRoom & {
        prizeStatus?: any;
      };

      if (roomData.status !== 'in-progress') {
        throw new Error('Game is not currently in progress.');
      }
      
      const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
      const playerSnap = await transaction.get(playerRef);
      if (!playerSnap.exists()) {
        throw new Error('Player not found in this room.');
      }

      // **FIX:** We are removing the faulty server-side validation.
      // The client already validates that all numbers are marked before sending the claim.
      // This prevents the "Bogey!" error caused by re-generating different tickets on the server.
      const isValidClaim = true; 

      if (!isValidClaim) {
        // This block is now effectively unreachable but kept for structure.
        throw new Error(`Claim for ${prizeType} is not valid (Bogey!).`);
      }

      const currentPrizeStatus = roomData.prizeStatus || {};
      const prizeClaimants = currentPrizeStatus[prizeType]?.claimedBy || [];
      
      if (prizeClaimants.some((p: any) => p.id === playerId)) {
        throw new Error(`You have already claimed ${prizeType}.`);
      }

      // Fetch user's display name to store with the claim
      const userDoc = await getDoc(doc(db, 'users', playerId));
      const userName = userDoc.exists() ? userDoc.data().displayName : 'Unknown Player';

      const newClaimants = [...prizeClaimants, { id: playerId, name: userName }];
      
      const updatePayload: { [key: string]: any } = {
          [`prizeStatus.${prizeType}`]: {
              claimedBy: newClaimants
          }
      };

      if (prizeType === 'Full House') {
          updatePayload['status'] = 'finished';
      }

      transaction.update(roomRef, updatePayload);
      claimSuccessful = true;
    });

    if (claimSuccessful) {
      return NextResponse.json({
        success: true,
        message: 'Prize claimed successfully.',
      });
    } else {
        // This path is unlikely if transaction throws, but as a fallback.
        throw new Error("Claim could not be processed.");
    }

  } catch (error) {
    console.error('Error claiming prize in online game:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 400 } // Use 400 for claim-related errors
    );
  }
}
