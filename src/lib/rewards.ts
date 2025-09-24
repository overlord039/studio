

export const WEEKLY_REWARDS = [
    5,   // Day 1
    10,  // Day 2
    2,   // Day 3
    20,  // Day 4
    25,  // Day 5
    30,  // Day 6
    50,  // Day 7
];

export const PERFECT_STREAK_BONUS = 100;

export const getCoinsForLevelUp = (level: number) => {
    // Rewards 10 coins per level reached, starting from level 2.
    // e.g., reaching level 2 gives 20 coins, level 10 gives 100 coins.
    return level * 10;
}
