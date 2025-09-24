

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
  icon: string; 
  reward: number; 
  criteria: BadgeCriterion[];
  isAchieved: (stats: UserStats) => boolean;
}

export const BADGE_DEFINITIONS: Record<string, Badge> = {
  NOVICE: {
    name: "Novice Player",
    description: "Beginner – quick to earn",
    icon: "/badges/novice.png",
    reward: 10,
    criteria: [
        { label: 'Early 5', target: 3, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.EARLY_5] || 0 },
        { label: 'First Line', target: 2, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.FIRST_LINE] || 0 },
        { label: 'Second Line', target: 2, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.SECOND_LINE] || 0 },
        { label: 'Third Line', target: 2, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.THIRD_LINE] || 0 },
        { label: 'Full House', target: 1, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.FULL_HOUSE] || 0 },
    ],
    isAchieved: (stats) => {
        const prizesWon = stats.prizesWon || {};
        return (prizesWon[PRIZE_TYPES.EARLY_5] || 0) >= 3 &&
               (prizesWon[PRIZE_TYPES.FIRST_LINE] || 0) >= 2 &&
               (prizesWon[PRIZE_TYPES.SECOND_LINE] || 0) >= 2 &&
               (prizesWon[PRIZE_TYPES.THIRD_LINE] || 0) >= 2 &&
               (prizesWon[PRIZE_TYPES.FULL_HOUSE] || 0) >= 1;
    },
  },
  BRONZE_COMPETITOR: {
    name: "Bronze Competitor",
    description: "Starter grind – encourages play variety",
    icon: "/badges/bronze.png",
    reward: 25,
    criteria: [
        { label: 'Early 5', target: 10, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.EARLY_5] || 0 },
        { label: 'First Line', target: 7, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.FIRST_LINE] || 0 },
        { label: 'Second Line', target: 7, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.SECOND_LINE] || 0 },
        { label: 'Third Line', target: 7, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.THIRD_LINE] || 0 },
        { label: 'Full House', target: 5, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.FULL_HOUSE] || 0 },
    ],
    isAchieved: (stats) => {
      const prizesWon = stats.prizesWon || {};
      return (prizesWon[PRIZE_TYPES.EARLY_5] || 0) >= 10 &&
             (prizesWon[PRIZE_TYPES.FIRST_LINE] || 0) >= 7 &&
             (prizesWon[PRIZE_TYPES.SECOND_LINE] || 0) >= 7 &&
             (prizesWon[PRIZE_TYPES.THIRD_LINE] || 0) >= 7 &&
             (prizesWon[PRIZE_TYPES.FULL_HOUSE] || 0) >= 5;
    },
  },
  SILVER_VETERAN: {
    name: "Silver Veteran",
    description: "Intermediate – steady players",
    icon: "/badges/silver.png",
    reward: 50,
    criteria: [
        { label: 'Early 5', target: 25, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.EARLY_5] || 0 },
        { label: 'First Line', target: 15, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.FIRST_LINE] || 0 },
        { label: 'Second Line', target: 15, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.SECOND_LINE] || 0 },
        { label: 'Third Line', target: 15, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.THIRD_LINE] || 0 },
        { label: 'Full House', target: 10, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.FULL_HOUSE] || 0 },
    ],
    isAchieved: (stats) => {
      const prizesWon = stats.prizesWon || {};
      return (prizesWon[PRIZE_TYPES.EARLY_5] || 0) >= 25 &&
             (prizesWon[PRIZE_TYPES.FIRST_LINE] || 0) >= 15 &&
             (prizesWon[PRIZE_TYPES.SECOND_LINE] || 0) >= 15 &&
             (prizesWon[PRIZE_TYPES.THIRD_LINE] || 0) >= 15 &&
             (prizesWon[PRIZE_TYPES.FULL_HOUSE] || 0) >= 10;
    },
  },
  GOLD_MASTER: {
    name: "Gold Master",
    description: "Advanced – consistent winners",
    icon: "/badges/gold.png",
    reward: 100,
    criteria: [
        { label: 'Early 5', target: 50, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.EARLY_5] || 0 },
        { label: 'First Line', target: 30, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.FIRST_LINE] || 0 },
        { label: 'Second Line', target: 30, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.SECOND_LINE] || 0 },
        { label: 'Third Line', target: 30, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.THIRD_LINE] || 0 },
        { label: 'Full House', target: 20, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.FULL_HOUSE] || 0 },
    ],
    isAchieved: (stats) => {
      const prizesWon = stats.prizesWon || {};
      return (prizesWon[PRIZE_TYPES.EARLY_5] || 0) >= 50 &&
             (prizesWon[PRIZE_TYPES.FIRST_LINE] || 0) >= 30 &&
             (prizesWon[PRIZE_TYPES.SECOND_LINE] || 0) >= 30 &&
             (prizesWon[PRIZE_TYPES.THIRD_LINE] || 0) >= 30 &&
             (prizesWon[PRIZE_TYPES.FULL_HOUSE] || 0) >= 20;
    },
  },
  PLATINUM_PLAYER: {
    name: "Platinum Player",
    description: "Elite Tier – true masters",
    icon: "/badges/platinum.png",
    reward: 250,
    criteria: [
        { label: 'Early 5', target: 100, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.EARLY_5] || 0 },
        { label: 'First Line', target: 60, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.FIRST_LINE] || 0 },
        { label: 'Second Line', target: 60, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.SECOND_LINE] || 0 },
        { label: 'Third Line', target: 60, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.THIRD_LINE] || 0 },
        { label: 'Full House', target: 40, getCurrent: (stats) => stats.prizesWon?.[PRIZE_TYPES.FULL_HOUSE] || 0 },
    ],
    isAchieved: (stats) => {
        const prizesWon = stats.prizesWon || {};
        return (prizesWon[PRIZE_TYPES.EARLY_5] || 0) >= 100 &&
               (prizesWon[PRIZE_TYPES.FIRST_LINE] || 0) >= 60 &&
               (prizesWon[PRIZE_TYPES.SECOND_LINE] || 0) >= 60 &&
               (prizesWon[PRIZE_TYPES.THIRD_LINE] || 0) >= 60 &&
               (prizesWon[PRIZE_TYPES.FULL_HOUSE] || 0) >= 40;
    },
  },
};

export interface BadgeCheckResult {
    badgeNames: string[];
    newlyEarnedBadges: Badge[];
    coinsAwarded: number;
}

export function checkAndAwardBadges(currentStats: UserStats, prospectiveStats: UserStats): BadgeCheckResult {
    const currentBadges = new Set(currentStats.badges || []);
    const prospectiveBadges = new Set(currentStats.badges || []);
    const newlyEarnedBadges: Badge[] = [];
    let coinsAwarded = 0;

    Object.keys(BADGE_DEFINITIONS).forEach(badgeKey => {
        const badge = BADGE_DEFINITIONS[badgeKey];
        if (!currentBadges.has(badge.name) && badge.isAchieved(prospectiveStats)) {
            prospectiveBadges.add(badge.name);
            newlyEarnedBadges.push(badge);
            coinsAwarded += badge.reward;
        }
    });
    
    return {
        badgeNames: Array.from(prospectiveBadges),
        newlyEarnedBadges,
        coinsAwarded,
    };
}
