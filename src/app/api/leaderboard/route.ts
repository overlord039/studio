
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import type { User } from '@/types';

export type RankingType = 'xp' | 'wins' | 'coins';

// Helper function to sort the results with a secondary condition
function sortLeaderboard(
    players: any[],
    primaryKey: 'totalPrizesWon' | 'coins' | 'level',
    secondaryKey: 'level' | 'coins'
) {
    return players.sort((a, b) => {
        const primaryA = a.stats[primaryKey] || 0;
        const primaryB = b.stats[primaryKey] || 0;
        
        if (primaryA !== primaryB) {
            return primaryB - primaryA;
        }

        const secondaryA = a.stats[secondaryKey] || 0;
        const secondaryB = b.stats[secondaryKey] || 0;
        return secondaryB - secondaryA;
    });
}


export async function GET(request: NextRequest) {
    if (!db) {
        return NextResponse.json({ message: 'Firestore is not configured.' }, { status: 500 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const rankingType = (searchParams.get('type') as RankingType) || 'xp';

        const usersRef = collection(db, 'users');
        let q;
        let players;

        switch (rankingType) {
            case 'wins':
                q = query(
                    usersRef,
                    orderBy('stats.totalPrizesWon', 'desc'),
                    orderBy('stats.level', 'desc'), // Firestore requires index for this
                    limit(50) // Fetch more to sort in backend
                );
                const winsSnapshot = await getDocs(q);
                players = winsSnapshot.docs.map(doc => doc.data());
                // No need to sort again if Firestore handles it
                break;
            case 'coins':
                q = query(
                    usersRef,
                    orderBy('stats.coins', 'desc'),
                    orderBy('stats.level', 'desc'), // Firestore requires index for this
                    limit(50)
                );
                const coinsSnapshot = await getDocs(q);
                players = coinsSnapshot.docs.map(doc => doc.data());
                 // No need to sort again if Firestore handles it
                break;
            case 'xp': // Top Players
            default:
                 q = query(
                    usersRef,
                    orderBy('stats.totalPrizesWon', 'desc'),
                    orderBy('stats.coins', 'desc'),
                    limit(50) // Firestore requires index
                );
                const xpSnapshot = await getDocs(q);
                players = xpSnapshot.docs.map(doc => doc.data());
                break;
        }


        const top10Players = players.slice(0, 10);

        const leaderboard = top10Players.map((data, index) => {
            // Only return necessary fields to keep payload small
            return {
                rank: index + 1,
                uid: data.uid,
                displayName: data.displayName,
                photoURL: data.photoURL,
                stats: {
                    level: data.stats.level || 0,
                    xp: data.stats.xp || 0,
                    coins: data.stats.coins || 0,
                    totalPrizesWon: data.stats.totalPrizesWon || 0,
                    badges: data.stats.badges || [],
                }
            };
        });

        return NextResponse.json(leaderboard);

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        
        let errorMessage = (error as Error).message;
        if (errorMessage.includes('requires an index')) {
             errorMessage = 'The leaderboard query needs a database index. Please create it in your Firebase console.';
        }

        return NextResponse.json(
            { success: false, message: errorMessage },
            { status: 500 }
        );
    }
}
