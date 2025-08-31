
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, runTransaction, collection, getDocs, increment, writeBatch } from 'firebase/firestore';
import type { FirestoreRoom, FirestorePlayer, PrizeType, GameSettings, UserStats } from '@/types';
import { PRIZE_DEFINITIONS, PRIZE_DISTRIBUTION_PERCENTAGES, getXpForNextLevel, XP_PER_GAME_PARTICIPATION, XP_PER_PRIZE_WIN, XP_MODIFIER_ONLINE, getCoinsForLevelUp } from '@/lib/constants';
import { checkAndAwardBadges, type Badge } from '@/lib/badges';

// Helper function to calculate final prize distribution accurately
function calculatePrizes(totalPool: number, settings: GameSettings): Record<PrizeType, number> {
    const prizeFormat = settings.prizeFormat || 'Format 1';
    const prizeDefs = PRIZE_DEFINITIONS[prizeFormat] || [];
    const distPercentages = PRIZE_DISTRIBUTION_PERCENTAGES[prizeFormat] || {};
    
    const calculatedPrizes: Record<PrizeType, number> = {} as any;
    let sumOfPrizes = 0;
    
    // Calculate all prizes except Full House
    for (const prize of prizeDefs) {
        if (prize !== 'Full House') {
            const percentage = distPercentages[prize] || 0;
            const amount = Math.floor((totalPool * percentage) / 100);
            calculatedPrizes[prize] = amount;
            sumOfPrizes += amount;
        }
    }
    
    // Full House gets the remainder to ensure the total matches the pool
    if (prizeDefs.includes('Full House') && totalPool > 0) {
      calculatedPrizes['Full House'] = totalPool - sumOfPrizes;
    } else {
      calculatedPrizes['Full House'] = 0;
    }

    return calculatedPrizes;
}


export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { message: 'Firestore is not configured.' },
      { status: 500 }
    );
  }

  try {
    const { roomId, userId } = (await request.json()) as {
      roomId: string;
      userId: string;
    };

    if (!roomId || !userId) {
      return NextResponse.json(
        { message: 'Room ID and User ID are required.' },
        { status: 400 }
      );
    }
    
    let totalWinnings = 0;
    let newlyEarnedBadges: Badge[] = [];
    
    await runTransaction(db, async (transaction) => {
        const roomRef = doc(db, 'rooms', roomId);
        const roomSnap = await transaction.get(roomRef);

        if (!roomSnap.exists()) {
            console.log(`Room ${roomId} not found for stats update, likely already deleted.`);
            return;
        }
        
        const roomData = roomSnap.data() as FirestoreRoom & { prizeStatus?: any, playersWhoUpdatedStats?: string[], botTickets?: any };
        if (roomData.status !== 'finished') {
            console.log(`Stats update for room ${roomId} called, but game not finished. Status: ${roomData.status}`);
            return;
        }
        
        const playerRef = doc(db, 'users', userId);
        const playerSnap = await transaction.get(playerRef);
        if (!playerSnap.exists()) {
            console.warn(`User document for userId ${userId} not found in room ${roomId}. Cannot update stats.`);
            return;
        }
        const currentStats: UserStats = playerSnap.data().stats || {};

        // --- Idempotency: Check if this user's stats have been updated for this room ---
        if (roomData.playersWhoUpdatedStats?.includes(userId)) {
            console.log(`Stats for room ${roomId} already processed for user ${userId}.`);
            return;
        }

        const playersColRef = collection(db, 'rooms', roomId, 'players');
        const playersSnap = await getDocs(playersColRef);
        const playersList = playersSnap.docs.map(d => d.data() as FirestorePlayer);
        
        const humanPlayers = playersList.filter(p => p.type === 'human');
        const totalHumanTicketsSold = humanPlayers.reduce((acc, p) => acc + (p.tickets || 0), 0);
        
        const botTicketsCount = roomData.botTickets ? Object.values(roomData.botTickets).reduce((acc: number, tickets: any) => acc + tickets.length, 0) : 0;
        const totalTicketsSold = totalHumanTicketsSold + botTicketsCount;
        const totalPrizePool = (roomData.settings.ticketPrice || 0) * totalTicketsSold;
        
        const finalPrizes = calculatePrizes(totalPrizePool, roomData.settings);

        const prizesForFormat = PRIZE_DEFINITIONS[roomData.settings.prizeFormat || 'Format 1'] || [];
        
        const statsUpdate: { [key: string]: any } = {
            'stats.matchesPlayed': increment(1),
        };
        
        let xpGained = Math.round(XP_PER_GAME_PARTICIPATION * XP_MODIFIER_ONLINE);
        let coinsEarned = 0;
        const prizesWonByPlayer: PrizeType[] = [];

        prizesForFormat.forEach(prize => {
            const claimInfo = roomData.prizeStatus?.[prize as PrizeType];
            if (claimInfo && claimInfo.claimedBy?.some((c: {id: string}) => c.id === userId)) {
                prizesWonByPlayer.push(prize as PrizeType);
                statsUpdate[`stats.prizesWon.${prize}`] = increment(1);
                
                const basePrizeXp = XP_PER_PRIZE_WIN[prize as PrizeType] || 0;
                xpGained += Math.round(basePrizeXp * XP_MODIFIER_ONLINE);
                
                const prizeAmount = finalPrizes[prize as PrizeType] || 0;
                const prizePerWinner = claimInfo.claimedBy.length > 0 ? Math.floor(prizeAmount / claimInfo.claimedBy.length) : 0;
                coinsEarned += prizePerWinner;
            }
        });
        
        if (prizesWonByPlayer.length > 0) {
            statsUpdate['stats.totalPrizesWon'] = increment(prizesWonByPlayer.length);
        }

        // Leveling up logic
        let currentLevel = currentStats.level || 1;
        let currentXp = (currentStats.xp || 0) + xpGained;
        let xpForNext = getXpForNextLevel(currentLevel);

        while (currentXp >= xpForNext) {
            currentLevel++;
            currentXp -= xpForNext;
            coinsEarned += getCoinsForLevelUp(currentLevel); // Add level up reward
            xpForNext = getXpForNextLevel(currentLevel);
        }

        const prospectiveStats: UserStats = {
          ...currentStats,
          matchesPlayed: (currentStats.matchesPlayed || 0) + 1,
          prizesWon: prizesWonByPlayer.reduce((acc, prize) => {
              acc[prize] = (currentStats.prizesWon?.[prize] || 0) + 1;
              return acc;
          }, { ...currentStats.prizesWon }),
          totalPrizesWon: (currentStats.totalPrizesWon || 0) + prizesWonByPlayer.length,
          level: currentLevel,
          xp: currentXp
        };

        const badgeResult = checkAndAwardBadges(currentStats, prospectiveStats);
        coinsEarned += badgeResult.coinsAwarded;
        statsUpdate['stats.badges'] = badgeResult.badgeNames;
        newlyEarnedBadges = badgeResult.newlyEarnedBadges;
        
        if (coinsEarned > 0) {
            statsUpdate['stats.coins'] = increment(coinsEarned);
        }
        totalWinnings = coinsEarned;

        statsUpdate['stats.level'] = currentLevel;
        statsUpdate['stats.xp'] = currentXp;
        
        // --- Update player stats and mark as updated for this room ---
        transaction.update(playerRef, statsUpdate);
        
        const updatedStatsPlayers = [...(roomData.playersWhoUpdatedStats || []), userId];
        transaction.update(roomRef, {
            playersWhoUpdatedStats: updatedStatsPlayers
        });
    });
    
    return NextResponse.json({ success: true, winnings: totalWinnings, newlyEarnedBadges });

  } catch (error) {
    console.error('Error updating online game stats:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
