
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Firestore is not configured.' }, { status: 500 });
  }

  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json({ message: 'A valid username is required.' }, { status: 400 });
    }

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
