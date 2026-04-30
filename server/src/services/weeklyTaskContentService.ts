import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CosmeticReward, WeeklyTaskDefinition } from "../types.ts";

function normalizeCosmeticRewards(rawRewards: unknown): CosmeticReward[] {
  if (!Array.isArray(rawRewards)) {
    return [];
  }

  return rawRewards.map((reward) => {
    const record = reward as Record<string, unknown>;
    return {
      slot: String(record.slot ?? "accessory") as CosmeticReward["slot"],
      cosmeticId: String(record.cosmeticId ?? ""),
    };
  });
}

function loadWeeklyTaskDefinitions(): WeeklyTaskDefinition[] {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  const contentDir = path.resolve(serviceDir, "../../../client/src/game/content/weeklyTasks");
  const fileNames = readdirSync(contentDir).filter((fileName) => fileName.endsWith(".json"));

  return fileNames.flatMap((fileName) => {
    const rawContent = JSON.parse(readFileSync(path.join(contentDir, fileName), "utf8")) as Record<string, unknown>;
    const rawTasks = Array.isArray(rawContent.tasks) ? rawContent.tasks : [];

    return rawTasks.map((task) => {
      const record = task as Record<string, unknown>;
      const rewards = (record.rewards ?? {}) as Record<string, unknown>;
      return {
        id: String(record.id ?? ""),
        title: String(record.title ?? ""),
        description: String(record.description ?? ""),
        type: String(record.type ?? "collect-pickups") as WeeklyTaskDefinition["type"],
        targetCount: Math.max(1, Number(record.targetCount ?? 1)),
        targetRoomId: record.targetRoomId ? String(record.targetRoomId) : null,
        rewards: {
          coins: Math.max(0, Number(rewards.coins ?? 0)),
          xp: Math.max(0, Number(rewards.xp ?? 0)),
          cosmetics: normalizeCosmeticRewards(rewards.cosmetics),
        },
      };
    });
  });
}

const weeklyTaskDefinitions = loadWeeklyTaskDefinitions();

export function listWeeklyTaskDefinitions(): WeeklyTaskDefinition[] {
  return weeklyTaskDefinitions.map((task) => ({
    ...task,
    rewards: {
      ...task.rewards,
      cosmetics: task.rewards.cosmetics.map((reward) => ({ ...reward })),
    },
  }));
}
