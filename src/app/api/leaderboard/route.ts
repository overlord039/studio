
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import type { User } from '@/types';

export type RankingType = 'xp' | 'wins' | 'coins';

export async function GET(request: NextRequest) {
    if (!db) {
        return NextResponse.json({ message: 'Firestore is not configured.' }, { status: 500 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const rankingType = (searchParams.get('type') as RankingType) || 'xp';

        const usersRef = collection(db, 'users');
        let q;

        switch (rankingType) {
            case 'wins':
                q = query(
                    usersRef,
                    orderBy('stats.totalPrizesWon', 'desc'),
                    limit(10)
                );
                break;
            case 'coins':
                q = query(
                    usersRef,
                    orderBy('stats.coins', 'desc'),
                    limit(10)
                );
                break;
            case 'xp':
            default:
                 q = query(
                    usersRef,
                    orderBy('stats.level', 'desc'),
                    limit(10)
                );
                break;
        }

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
                    coins: data.stats.coins,
                    totalPrizesWon: data.stats.totalPrizesWon || 0,
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
