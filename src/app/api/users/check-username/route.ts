

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, limit, doc, runTransaction, increment } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Firestore is not configured.' }, { status: 500 });
  }

  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json({ isAvailable: false, message: 'A valid username (3+ characters) is required.' }, { status: 400 });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const usernameDocRef = doc(db, 'usernames', normalizedUsername);

    const docSnap = await getDocs(query(collection(db, 'usernames'), where('username', '==', normalizedUsername), limit(1)));

    if (!docSnap.empty) {
        return NextResponse.json({ isAvailable: false, message: 'This username is already taken.' });
    }
    
    // As a fallback, also check the displayNames in the users collection for any legacy data
    const usersCollection = collection(db, 'users');
    const q = query(
      usersCollection, 
      where('displayName', '==', username.trim()),
      limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json({ isAvailable: true });
    } else {
      return NextResponse.json({ isAvailable: false, message: 'This username is already taken.' });
    }
  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json({ message: 'An error occurred while checking the username.', error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
    if (!db) {
        return NextResponse.json({ message: 'Firestore is not configured.' }, { status: 500 });
    }

    try {
        const { username, userId, oldUsername, cost } = await request.json();

        if (!username || !userId) {
            return NextResponse.json({ message: 'New username and user ID are required.' }, { status: 400 });
        }
        
        const normalizedUsername = username.trim().toLowerCase();
        const usernameDocRef = doc(db, 'usernames', normalizedUsername);
        const oldUsernameDocRef = oldUsername ? doc(db, 'usernames', oldUsername.trim().toLowerCase()) : null;
        
        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, 'users', userId);
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("User not found.");

            const currentCoins = userDoc.data().stats?.coins || 0;
            if (currentCoins < cost) {
                throw new Error(`You need ${cost} coins to change your name.`);
            }

            const usernameDoc = await transaction.get(usernameDocRef);
            if (usernameDoc.exists() && usernameDoc.data().userId !== userId) {
                throw new Error("This username is already taken.");
            }

            if (oldUsernameDocRef) {
                transaction.delete(oldUsernameDocRef);
            }
            
            transaction.set(usernameDocRef, {
                username: username.trim(),
                userId: userId,
                updatedAt: new Date(),
            });

            // Deduct coins and increment change count
            const newStats = {
                'stats.coins': increment(-cost),
                'stats.usernameChangeCount': increment(1)
            };
            transaction.update(userRef, newStats);
        });

        return NextResponse.json({ success: true, message: 'Username updated successfully.' });

    } catch (error) {
        console.error('Error reserving username:', error);
        return NextResponse.json({ success: false, message: (error as Error).message }, { status: 400 });
    }
}
