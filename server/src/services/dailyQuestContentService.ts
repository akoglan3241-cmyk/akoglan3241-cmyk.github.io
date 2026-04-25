import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DailyQuestDefinition } from "../types.ts";

function loadDailyQuestDefinitions(): DailyQuestDefinition[] {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  const contentDir = path.resolve(serviceDir, "../../../client/src/game/content/dailyQuests");
  const fileNames = readdirSync(contentDir).filter((fileName) => fileName.endsWith(".json"));

  return fileNames.flatMap((fileName) => {
    const rawContent = JSON.parse(readFileSync(path.join(contentDir, fileName), "utf8")) as Record<string, unknown>;
    const rawQuests = Array.isArray(rawContent.quests) ? rawContent.quests : [];

    return rawQuests.map((quest) => {
      const record = quest as Record<string, unknown>;
      return {
        id: String(record.id ?? ""),
        title: String(record.title ?? ""),
        description: String(record.description ?? ""),
        type: String(record.type ?? "collect-pickups") as DailyQuestDefinition["type"],
        targetCount: Math.max(1, Number(record.targetCount ?? 1)),
        targetRoomId: record.targetRoomId ? String(record.targetRoomId) : null,
        rewards: {
          coins: Math.max(0, Number((record.rewards as Record<string, unknown> | undefined)?.coins ?? 0)),
          xp: Math.max(0, Number((record.rewards as Record<string, unknown> | undefined)?.xp ?? 0)),
        },
      };
    });
  });
}

const dailyQuestDefinitions = loadDailyQuestDefinitions();
const dailyQuestDefinitionsById = new Map(dailyQuestDefinitions.map((quest) => [quest.id, quest]));

export function listDailyQuestDefinitions(): DailyQuestDefinition[] {
  return dailyQuestDefinitions.map((quest) => ({ ...quest, rewards: { ...quest.rewards } }));
}

export function getDailyQuestDefinition(questId: string): DailyQuestDefinition | null {
  return dailyQuestDefinitionsById.get(questId) ?? null;
}
