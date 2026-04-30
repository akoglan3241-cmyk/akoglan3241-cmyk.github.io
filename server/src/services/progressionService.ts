import {
  CHEST_XP_REWARDS,
  DEFAULT_CHEST_XP_REWARD,
  DEFAULT_PICKUP_XP_REWARD,
  LEVEL_UNLOCKS,
  LEVEL_XP_THRESHOLDS,
  PICKUP_XP_REWARDS,
} from "../config/progressionData.ts";
import type { GameplayState, ProgressionState } from "../types.ts";

function clampXp(rawXp: unknown): number {
  return Math.max(0, Math.floor(Number(rawXp ?? 0) || 0));
}

function getLevelThreshold(level: number): number {
  return LEVEL_XP_THRESHOLDS[Math.max(0, level - 1)] ?? LEVEL_XP_THRESHOLDS[LEVEL_XP_THRESHOLDS.length - 1] ?? 0;
}

export function resolveLevelForXp(xp: number): number {
  let resolvedLevel = 1;

  LEVEL_XP_THRESHOLDS.forEach((threshold, index) => {
    if (xp >= threshold) {
      resolvedLevel = index + 1;
    }
  });

  return resolvedLevel;
}

export function createProgressionState(rawState?: Partial<ProgressionState>): ProgressionState {
  const xp = clampXp(rawState?.xp);
  const level = resolveLevelForXp(xp);
  const currentLevelXp = getLevelThreshold(level);
  const nextLevelXp = LEVEL_XP_THRESHOLDS[level] ?? null;
  const unlockedContentIds = LEVEL_UNLOCKS.filter((unlock) => level >= unlock.level).map((unlock) => unlock.id);
  const nextUnlock = LEVEL_UNLOCKS.find((unlock) => unlock.level > level) ?? null;
  const progressRatio =
    nextLevelXp === null || nextLevelXp <= currentLevelXp
      ? 1
      : Math.max(0, Math.min(1, (xp - currentLevelXp) / (nextLevelXp - currentLevelXp)));

  return {
    xp,
    level,
    currentLevelXp,
    nextLevelXp,
    progressRatio,
    unlockedContentIds,
    nextUnlockLevel: nextUnlock?.level ?? null,
    nextUnlockLabel: nextUnlock?.label ?? "",
  };
}

export function grantXp(gameplayState: GameplayState, amount: number): ProgressionState {
  const nextXp = clampXp(gameplayState.progression?.xp) + clampXp(amount);
  gameplayState.progression = createProgressionState({ xp: nextXp });
  return gameplayState.progression;
}

export function getPickupXpReward(pickupId: string): number {
  return PICKUP_XP_REWARDS[pickupId] ?? DEFAULT_PICKUP_XP_REWARD;
}

export function getChestXpReward(chestId: string): number {
  return CHEST_XP_REWARDS[chestId] ?? DEFAULT_CHEST_XP_REWARD;
}
