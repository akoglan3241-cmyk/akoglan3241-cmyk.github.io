import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface LevelUnlockDefinition {
  id: string;
  level: number;
  label: string;
}

interface ProgressionBalanceContent {
  levelXpThresholds?: unknown;
  pickupXpRewards?: Record<string, unknown>;
  defaultPickupXpReward?: unknown;
  chestXpRewards?: Record<string, unknown>;
  defaultChestXpReward?: unknown;
  levelUnlocks?: unknown;
}

function loadProgressionBalance(): ProgressionBalanceContent {
  const configDir = path.dirname(fileURLToPath(import.meta.url));
  const filePath = path.resolve(configDir, "../../../client/src/game/content/balance/progression.json");
  return JSON.parse(readFileSync(filePath, "utf8")) as ProgressionBalanceContent;
}

function normalizeThresholds(rawThresholds: unknown): number[] {
  const thresholds = Array.isArray(rawThresholds) ? rawThresholds.map((entry) => Math.max(0, Number(entry ?? 0))) : [];
  return thresholds.length > 0 ? thresholds : [0, 70, 170, 320, 540, 830, 1190, 1620, 2120, 2690];
}

function normalizeRewardMap(rawRewards: Record<string, unknown> | undefined, defaultValue: number): Record<string, number> {
  return Object.fromEntries(
    Object.entries(rawRewards ?? {}).map(([key, value]) => [key, Math.max(0, Number(value ?? defaultValue))]),
  );
}

function normalizeUnlocks(rawUnlocks: unknown): LevelUnlockDefinition[] {
  if (!Array.isArray(rawUnlocks)) {
    return [];
  }

  return rawUnlocks
    .map((entry) => {
      const record = (entry ?? {}) as Record<string, unknown>;
      return {
        id: String(record.id ?? ""),
        level: Math.max(1, Number(record.level ?? 1)),
        label: String(record.label ?? ""),
      };
    })
    .filter((entry) => entry.id && entry.label);
}

const progressionBalance = loadProgressionBalance();

export const LEVEL_XP_THRESHOLDS = normalizeThresholds(progressionBalance.levelXpThresholds);
export const DEFAULT_PICKUP_XP_REWARD = Math.max(0, Number(progressionBalance.defaultPickupXpReward ?? 5));
export const DEFAULT_CHEST_XP_REWARD = Math.max(0, Number(progressionBalance.defaultChestXpReward ?? 14));
export const PICKUP_XP_REWARDS = normalizeRewardMap(progressionBalance.pickupXpRewards, DEFAULT_PICKUP_XP_REWARD);
export const CHEST_XP_REWARDS = normalizeRewardMap(progressionBalance.chestXpRewards, DEFAULT_CHEST_XP_REWARD);
export const LEVEL_UNLOCKS = normalizeUnlocks(progressionBalance.levelUnlocks);
