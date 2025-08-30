

import type { UserStats, PrizeType } from '@/types';
import { PRIZE_TYPES } from '@/types';

export interface Badge {
  name: string;
  description: string;
  icon: string; // URL or name of the icon component
  criteria: (stats: UserStats) => boolean;
}

export const BADGE_DEFINITIONS: Record<string, Badge> = {
  NOVICE: {
    name: "Novice Player",
    description: "Played your first game.",
    icon: "Shield",
    criteria: (stats) => (stats.matchesPlayed || 0) >= 1,
  },
  BRONZE_COMPETITOR: {
    name: "Bronze Competitor",
    description: "Reached Level 5 and won at least 2 different prize types (e.g., Early 5 and a Line).",
    icon: "Award",
    criteria: (stats) => {
      const prizesWon = stats.prizesWon || {};
      const uniquePrizesWon = Object.keys(prizesWon).filter(p => prizesWon[p as PrizeType] > 0).length;
      return (stats.level || 0) >= 5 && uniquePrizesWon >= 2;
    },
  },
  SILVER_VETERAN: {
    name: "Silver Veteran",
    description: "Reached Level 20, played 50 matches, and won at least 3 different prize types.",
    icon: "Badge",
    criteria: (stats) => {
      const prizesWon = stats.prizesWon || {};
      const uniquePrizesWon = Object.keys(prizesWon).filter(p => prizesWon[p as PrizeType] > 0).length;
      return (stats.level || 0) >= 20 && (stats.matchesPlayed || 0) >= 50 && uniquePrizesWon >= 3;
    },
  },
  GOLD_MASTER: {
    name: "Gold Master",
    description: "Reached Level 50, played 100 matches, and won all 5 prize types.",
    icon: "Medal",
    criteria: (stats) => {
      const prizesWon = stats.prizesWon || {};
      const uniquePrizesWon = Object.keys(prizesWon).filter(p => prizesWon[p as PrizeType] > 0).length;
      return (stats.level || 0) >= 50 && (stats.matchesPlayed || 0) >= 100 && uniquePrizesWon >= 5;
    },
  },
  FULL_HOUSE_PRO: {
    name: "Full House Pro",
    description: "Won Full House 10 times.",
    icon: "Trophy",
    criteria: (stats) => (stats.prizesWon?.[PRIZE_TYPES.FULL_HOUSE] || 0) >= 10,
  },
};


export function checkAndAwardBadges(stats: UserStats): string[] {
    const currentBadges = new Set(stats.badges || []);
    let newBadgesAwarded = false;

    Object.keys(BADGE_DEFINITIONS).forEach(badgeKey => {
        const badge = BADGE_DEFINITIONS[badgeKey];
        if (!currentBadges.has(badge.name) && badge.criteria(stats)) {
            currentBadges.add(badge.name);
            newBadgesAwarded = true;
        }
    });
    
    // The function can optionally return information about whether new badges were awarded,
    // but for now, we just return the full list of badges the user should have.
    return Array.from(currentBadges);
}
