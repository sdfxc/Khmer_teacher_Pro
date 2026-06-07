/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Blook {
  id: string;
  name: string;
  emoji: string;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  rarityName: string;
}

export const BLOOKS: Blook[] = [
  { id: 'monkey', name: 'ហនុមាន (ស្តេចស្វា)', emoji: '🐒', color: 'bg-red-500', rarity: 'legendary', rarityName: 'ទេវកថា' },
  { id: 'lion', name: 'សិង្ហក្លាហាន', emoji: '🦁', color: 'bg-amber-500', rarity: 'rare', rarityName: 'កម្រ' },
  { id: 'dragon', name: 'នាគរាជ', emoji: '🐉', color: 'bg-teal-600', rarity: 'epic', rarityName: 'មហាកម្រ' },
  { id: 'elephant', name: 'ដំរីស', emoji: '🐘', color: 'bg-slate-400', rarity: 'rare', rarityName: 'កម្រ' },
  { id: 'tiger', name: 'ខ្លាធំ', emoji: '🐯', color: 'bg-orange-500', rarity: 'rare', rarityName: 'កម្រ' },
  { id: 'owl', name: 'មហាចាប (ឥន្ទ្រីយ៍)', emoji: '🦉', color: 'bg-emerald-600', rarity: 'common', rarityName: 'ធម្មតា' },
  { id: 'unicorn', name: 'សេះទេព', emoji: '🦄', color: 'bg-pink-500', rarity: 'epic', rarityName: 'មហាកម្រ' },
  { id: 'turtle', name: 'អណ្ដើកឆ្លាត', emoji: '🐢', color: 'bg-green-500', rarity: 'common', rarityName: 'ធម្មតា' },
  { id: 'fox', name: 'កញ្ជ្រោងល្បិច', emoji: '🦊', color: 'bg-orange-400', rarity: 'common', rarityName: 'ធម្មតា' },
  { id: 'crown', name: 'ភ្នំមាស', emoji: '👑', color: 'bg-yellow-500', rarity: 'legendary', rarityName: 'ទេវកថា' }
];

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
}

export const ACHIEVEMENTS: AchievementItem[] = [
  {
    id: 'first_game',
    title: 'អ្នករុករកដំបូង',
    description: 'ចូលរួមលេងហ្គេមលើកដំបូងរបស់អ្នក',
    icon: '🚀',
    xpReward: 100
  },
  {
    id: 'streak_3',
    title: 'កំពូលអ្នកតស៊ូ',
    description: 'ឆ្លើយត្រូវត្រួតគ្នា ៣ ដង',
    icon: '🔥',
    xpReward: 150
  },
  {
    id: 'speed_answer',
    title: 'លឿនដូចផ្លេកបន្ទោរ',
    description: 'ឆ្លើយត្រូវក្នុងរយៈពេលក្រោម ៣ វិនាទី',
    icon: '⚡',
    xpReward: 200
  },
  {
    id: 'perfect_score',
    title: 'ពិន្ទុឥតខ្ចោះ',
    description: 'ឆ្លើយត្រូវគ្រប់សំណួរទាំងអស់ក្នុងហ្គេមមួយ',
    icon: '🏆',
    xpReward: 500
  },
  {
    id: 'first_win',
    title: 'ជើងឯកលេខមួយ',
    description: 'ទទួលបានចំណាត់ថ្នាក់លេខ ១',
    icon: '🥇',
    xpReward: 300
  },
  {
    id: 'quiz_creator',
    title: 'ស្ថាបនិកចំណេះដឹង',
    description: 'បង្កើតកម្រងសំណួរផ្ទាល់ខ្លួនដំបូងបង្អស់',
    icon: '📝',
    xpReward: 250
  }
];

export const DAILY_CHALLENGES = [
  { id: 'daily_1', task: 'ឆ្លើយត្រូវ ៥ សំណួរក្នុងថ្ងៃនេះ', xp: 50, icon: '🎯' },
  { id: 'daily_2', task: 'ចូលរួមលេង ១ ហ្គេម', xp: 40, icon: '🎮' },
  { id: 'daily_3', task: 'បង្កើតពិន្ទុរហូតដល់ ១,០០០ ពិន្ទុ', xp: 60, icon: '✨' }
];

export function getLevelFromXP(xp: number): { level: number; currentLevelXp: number; nextLevelXp: number; progress: number } {
  // Simple level system: level 1 is 0-300, level 2 is 300-800, level 3 is 800-1500, etc.
  // We can use a formula: xp for level L = L * (L - 1) * 200
  let level = 1;
  const getXpForLevel = (l: number) => (l - 1) * 300;

  while (xp >= getXpForLevel(level + 1)) {
    level++;
  }

  const currentLevelXpBase = getXpForLevel(level);
  const nextLevelXpBase = getXpForLevel(level + 1);
  const range = nextLevelXpBase - currentLevelXpBase;
  const currentLevelXp = xp - currentLevelXpBase;
  const nextLevelXp = range;
  const progress = range > 0 ? (currentLevelXp / range) * 100 : 100;

  return {
    level,
    currentLevelXp,
    nextLevelXp,
    progress: Math.min(100, Math.max(0, progress))
  };
}

/**
 * Shuffles an array of options deterministically based on a seed (e.g. gameId + currentQuestionIndex).
 * This ensures that when students view options, they are randomized dynamically (A C D B, A D B C, etc.)
 * but are exactly synchronized between the host's screen and the players' screens so labels match perfectly.
 * When they play again, a new gameId generates a brand-new random shuffle pattern!
 */
export function shuffleOptionsDeterministically(options: string[] | undefined, seed: string): string[] {
  if (!options || options.length <= 1) return options || [];
  const result = [...options];

  // Simple deterministic hash of the seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Seeded linear congruential generator
  const lcg = () => {
    hash = (hash * 1664525 + 1013904223) % 4294967296;
    return hash / 4294967296;
  };

  // Fisher-Yates shuffle
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(lcg() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}

