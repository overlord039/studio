

import type { UserStats, PrizeType } from '@/types';
import { PRIZE_TYPES } from '@/types';

export interface BadgeCriterion {
  label: string;
  target: number;
  getCurrent: (stats: UserStats) => number;
}

export interface Badge {
  name: string;
  description: string;
  icon: string; // URL or name of the icon component
  criteria: BadgeCriterion[];
  isAchieved: (stats: UserStats) => boolean;
}

export const BADGE_DEFINITIONS: Record<string, Badge> = {
  NOVICE: {
    name: "Novice Player",
    description: "",
    icon: "Shield",
    criteria: [
        { label: 'Early 5 Claims', target: 5, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.EARLY_5] || 0 },
        { label: 'Total Line Claims', target: 5, getCurrent: (stats) => (stats.prizesWon?.[PRIZE_TYPES.FIRST_LINE] || 0) + (stats.prizesWon?.[PRIZE_TYPES.SECOND_LINE] || 0) + (stats.prizesWon?.[PRIZE_TYPES.THIRD_LINE] || 0) },
        { label: 'Full House Claims', target: 1, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.FULL_HOUSE] || 0 },
    ],
    isAchieved: (stats) => {
        const prizesWon = stats.prizesWon || {};
        const linePrizesCount = (prizesWon[PRIZE_TYPES.FIRST_LINE] || 0) + (prizesWon[PRIZE_TYPES.SECOND_LINE] || 0) + (prizesWon[PRIZE_TYPES.THIRD_LINE] || 0);
        return (prizesWon[PRIZE_TYPES.EARLY_5] || 0) >= 5 && linePrizesCount >= 5 && (prizesWon[PRIZE_TYPES.FULL_HOUSE] || 0) >= 1;
    },
  },
  BRONZE_COMPETITOR: {
    name: "Bronze Competitor",
    description: "",
    icon: "Award",
    criteria: [
        { label: 'Early 5 Claims', target: 10, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.EARLY_5] || 0 },
        { label: 'First Line Claims', target: 5, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.FIRST_LINE] || 0 },
        { label: 'Second Line Claims', target: 5, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.SECOND_LINE] || 0 },
        { label: 'Third Line Claims', target: 5, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.THIRD_LINE] || 0 },
        { label: 'Full House Claims', target: 3, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.FULL_HOUSE] || 0 },
    ],
    isAchieved: (stats) => {
      const prizesWon = stats.prizesWon || {};
      return (prizesWon[PRIZE_TYPES.EARLY_5] || 0) >= 10 &&
             (prizesWon[PRIZE_TYPES.FIRST_LINE] || 0) >= 5 &&
             (prizesWon[PRIZE_TYPES.SECOND_LINE] || 0) >= 5 &&
             (prizesWon[PRIZE_TYPES.THIRD_LINE] || 0) >= 5 &&
             (prizesWon[PRIZE_TYPES.FULL_HOUSE] || 0) >= 3;
    },
  },
  SILVER_VETERAN: {
    name: "Silver Veteran",
    description: "",
    icon: "Badge",
    criteria: [
        { label: 'Early 5 Claims', target: 20, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.EARLY_5] || 0 },
        { label: 'First Line Claims', target: 10, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.FIRST_LINE] || 0 },
        { label: 'Second Line Claims', target: 10, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.SECOND_LINE] || 0 },
        { label: 'Third Line Claims', target: 10, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.THIRD_LINE] || 0 },
        { label: 'Full House Claims', target: 7, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.FULL_HOUSE] || 0 },
    ],
    isAchieved: (stats) => {
      const prizesWon = stats.prizesWon || {};
      return (prizesWon[PRIZE_TYPES.EARLY_5] || 0) >= 20 &&
             (prizesWon[PRIZE_TYPES.FIRST_LINE] || 0) >= 10 &&
             (prizesWon[PRIZE_TYPES.SECOND_LINE] || 0) >= 10 &&
             (prizesWon[PRIZE_TYPES.THIRD_LINE] || 0) >= 10 &&
             (prizesWon[PRIZE_TYPES.FULL_HOUSE] || 0) >= 7;
    },
  },
  GOLD_MASTER: {
    name: "Gold Master",
    description: "",
    icon: "Medal",
    criteria: [
        { label: 'Early 5 Claims', target: 50, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.EARLY_5] || 0 },
        { label: 'First Line Claims', target: 25, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.FIRST_LINE] || 0 },
        { label: 'Second Line Claims', target: 25, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.SECOND_LINE] || 0 },
        { label: 'Third Line Claims', target: 25, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.THIRD_LINE] || 0 },
        { label: 'Full House Claims', target: 15, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.FULL_HOUSE] || 0 },
    ],
    isAchieved: (stats) => {
      const prizesWon = stats.prizesWon || {};
      return (prizesWon[PRIZE_TYPES.EARLY_5] || 0) >= 50 &&
             (prizesWon[PRIZE_TYPES.FIRST_LINE] || 0) >= 25 &&
             (prizesWon[PRIZE_TYPES.SECOND_LINE] || 0) >= 25 &&
             (prizesWon[PRIZE_TYPES.THIRD_LINE] || 0) >= 25 &&
             (prizesWon[PRIZE_TYPES.FULL_HOUSE] || 0) >= 15;
    },
  },
  FULL_HOUSE_PRO: {
    name: "Full House Pro",
    description: "",
    icon: "Trophy",
    criteria: [
        { label: 'Full House Claims', target: 25, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.FULL_HOUSE] || 0 },
    ],
    isAchieved: (stats) => (stats.prizesWon?.[PRIZE_TYPES.FULL_HOUSE] || 0) >= 25,
  },
};


export function checkAndAwardBadges(stats: UserStats): string[] {
    const currentBadges = new Set(stats.badges || []);
    let newBadgesAwarded = false;

    Object.keys(BADGE_DEFINITIONS).forEach(badgeKey => {
        const badge = BADGE_DEFINITIONS[badgeKey];
        if (!currentBadges.has(badge.name) && badge.isAchieved(stats)) {
            currentBadges.add(badge.name);
            newBadgesAwarded = true;
        }
    });
    
    // The function can optionally return information about whether new badges were awarded,
    // but for now, we just return the full list of badges the user should have.
    return Array.from(currentBadges);
}
