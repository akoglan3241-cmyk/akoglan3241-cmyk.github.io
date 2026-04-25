import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AchievementDefinition } from "../types.ts";

function loadAchievementDefinitions(): AchievementDefinition[] {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  const contentDir = path.resolve(serviceDir, "../../../client/src/game/content/achievements");
  const fileNames = readdirSync(contentDir).filter((fileName) => fileName.endsWith(".json"));

  return fileNames.flatMap((fileName) => {
    const rawContent = JSON.parse(readFileSync(path.join(contentDir, fileName), "utf8")) as Record<string, unknown>;
    const rawAchievements = Array.isArray(rawContent.achievements) ? rawContent.achievements : [];

    return rawAchievements.map((achievement) => {
      const record = achievement as Record<string, unknown>;
      return {
        id: String(record.id ?? ""),
        title: String(record.title ?? ""),
        description: String(record.description ?? ""),
        category: String(record.category ?? "general"),
        metric: String(record.metric ?? "questsCompleted") as AchievementDefinition["metric"],
        target: Math.max(1, Number(record.target ?? 1)),
      };
    });
  });
}

const achievementDefinitions = loadAchievementDefinitions();

export function listAchievementDefinitions(): AchievementDefinition[] {
  return achievementDefinitions.map((definition) => ({ ...definition }));
}
