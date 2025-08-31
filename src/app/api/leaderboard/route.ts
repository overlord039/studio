
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import type { User } from '@/types';

export async function GET(request: Request) {
    if (!db) {
        return NextResponse.json({ message: 'Firestore is not configured.' }, { status: 500 });
    }

    try {
        const usersRef = collection(db, 'users');
        const q = query(
            usersRef,
            orderBy('stats.level', 'desc'),
            orderBy('stats.xp', 'desc'),
            limit(50) // Get top 50 players
        );

        const querySnapshot = await getDocs(q);

        const leaderboard = querySnapshot.docs.map((doc, index) => {
            const data = doc.data() as User;
            // Only return necessary fields to keep payload small
            return {
                rank: index + 1,
                uid: data.uid,
                displayName: data.displayName,
                photoURL: data.photoURL,
                stats: {
                    level: data.stats.level,
                    xp: data.stats.xp,
                    badges: data.stats.badges || [],
                }
            };
        });

        return NextResponse.json(leaderboard);

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return NextResponse.json(
            { success: false, message: (error as Error).message },
            { status: 500 }
        );
    }
}
