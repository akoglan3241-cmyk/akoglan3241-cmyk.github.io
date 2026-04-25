import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DailyLoginRewardDefinition } from "../types.ts";

interface DailyLoginRewardContent {
  cycle: boolean;
  rewards: DailyLoginRewardDefinition[];
}

function loadDailyLoginRewardContent(): DailyLoginRewardContent {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  const contentDir = path.resolve(serviceDir, "../../../client/src/game/content/dailyLoginRewards");
  const fileName = readdirSync(contentDir).find((entry) => entry.endsWith(".json"));

  if (!fileName) {
    return {
      cycle: true,
      rewards: [],
    };
  }

  const rawContent = JSON.parse(readFileSync(path.join(contentDir, fileName), "utf8")) as Record<string, unknown>;
  const rawRewards = Array.isArray(rawContent.rewards) ? rawContent.rewards : [];

  return {
    cycle: rawContent.cycle !== false,
    rewards: rawRewards.map((entry, index) => {
      const record = entry as Record<string, unknown>;
      const rawItems = Array.isArray(record.items) ? record.items : [];
      return {
        day: Math.max(1, Number(record.day ?? index + 1)),
        coins: Math.max(0, Number(record.coins ?? 0)),
        xp: Math.max(0, Number(record.xp ?? 0)),
        items: rawItems.map((item) => {
          const itemRecord = item as Record<string, unknown>;
          return {
            itemId: String(itemRecord.itemId ?? ""),
            amount: Math.max(1, Number(itemRecord.amount ?? 1)),
          };
        }).filter((item) => item.itemId),
      };
    }).filter((entry) => entry.day > 0),
  };
}

const dailyLoginRewardContent = loadDailyLoginRewardContent();

export function getDailyLoginRewardContent(): DailyLoginRewardContent {
  return {
    cycle: dailyLoginRewardContent.cycle,
    rewards: dailyLoginRewardContent.rewards.map((entry) => ({
      day: entry.day,
      coins: entry.coins,
      xp: entry.xp,
      items: entry.items.map((item) => ({ ...item })),
    })),
  };
}
