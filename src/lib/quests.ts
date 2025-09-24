

import type { UserStats, PrizeType, QuestName, Quest } from '@/types';
import { isSameDay, startOfDay } from 'date-fns';

export interface QuestDefinition {
    title: string;
    description: string;
    target: number;
    reward: number;
    getProgress: (gameResult: { prizesWon: PrizeType[] }) => number;
}

export const QUEST_DEFINITIONS: Record<QuestName, QuestDefinition> = {
    playGames: {
        title: "Play 3 Games",
        description: "Complete 3 games in any mode.",
        target: 3,
        reward: 10,
        getProgress: () => 1, // Always increments by 1 per game
    },
    winPrizes: {
        title: "Win 2 Prizes",
        description: "Win a total of 2 prizes across all games.",
        target: 2,
        reward: 10,
        getProgress: (gameResult) => gameResult.prizesWon.length,
    },
    winFullHouse: {
        title: "Win a Full House",
        description: "Achieve the ultimate prize, a Full House!",
        target: 1,
        reward: 10,
        getProgress: (gameResult) => gameResult.prizesWon.filter(p => p === 'Full House').length,
    },
};

export const createDefaultQuests = (): Record<QuestName, Quest> => {
    return (Object.keys(QUEST_DEFINITIONS) as QuestName[]).reduce((acc, key) => {
        const def = QUEST_DEFINITIONS[key];
        acc[key] = {
            progress: 0,
            target: def.target,
            completed: false,
            claimed: false,
            reward: def.reward,
        };
        return acc;
    }, {} as Record<QuestName, Quest>);
};

export function getUpdatedQuests(stats: UserStats): UserStats['dailyQuests'] {
    const today = startOfDay(new Date());
    const lastReset = stats.dailyQuests ? startOfDay(new Date(stats.dailyQuests.lastReset)) : new Date(0);

    if (!stats.dailyQuests || !isSameDay(today, lastReset)) {
        // Time to reset the quests
        return {
            lastReset: today.toISOString(),
            quests: createDefaultQuests(),
        };
    }
    
    // Return existing quests if they are still valid for today
    return stats.dailyQuests;
}

export function updateQuestProgress(
    currentStats: UserStats, 
    gameResult: { prizesWon: PrizeType[] }
): Record<string, any> {
    const dailyQuests = getUpdatedQuests(currentStats).quests;
    const updates: Record<string, any> = {};

    (Object.keys(dailyQuests) as QuestName[]).forEach(key => {
        const quest = dailyQuests[key];
        if (quest.completed) {
            return; // Don't update completed quests
        }
        
        const progressIncrement = QUEST_DEFINITIONS[key].getProgress(gameResult);
        if (progressIncrement > 0) {
            const newProgress = quest.progress + progressIncrement;
            updates[`stats.dailyQuests.quests.${key}.progress`] = Math.min(newProgress, quest.target);
            
            if (newProgress >= quest.target) {
                updates[`stats.dailyQuests.quests.${key}.completed`] = true;
            }
        }
    });

    // Ensure the lastReset date is also set/updated in Firestore if it was reset
    const today = startOfDay(new Date());
    if (!currentStats.dailyQuests || !isSameDay(today, new Date(currentStats.dailyQuests.lastReset))) {
        updates['stats.dailyQuests.lastReset'] = today.toISOString();
    }
    
    return updates;
}
