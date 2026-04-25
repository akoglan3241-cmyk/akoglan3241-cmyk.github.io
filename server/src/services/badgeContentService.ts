import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BadgeDefinition } from "../types.ts";

function loadBadgeDefinitions(): BadgeDefinition[] {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  const contentDir = path.resolve(serviceDir, "../../../client/src/game/content/badges");
  const fileNames = readdirSync(contentDir).filter((fileName) => fileName.endsWith(".json"));

  return fileNames.flatMap((fileName) => {
    const rawContent = JSON.parse(readFileSync(path.join(contentDir, fileName), "utf8")) as Record<string, unknown>;
    const rawBadges = Array.isArray(rawContent.badges) ? rawContent.badges : [];

    return rawBadges.map((badge) => {
      const record = badge as Record<string, unknown>;
      return {
        id: String(record.id ?? ""),
        title: String(record.title ?? ""),
        shortLabel: String(record.shortLabel ?? "").slice(0, 12),
        description: String(record.description ?? ""),
        category: String(record.category ?? "general"),
        achievementIds: Array.isArray(record.achievementIds) ? record.achievementIds.map(String) : [],
        adminAssignable: Boolean(record.adminAssignable),
        seasonal: Boolean(record.seasonal),
      };
    });
  });
}

const badgeDefinitions = loadBadgeDefinitions();
const badgesById = new Map(badgeDefinitions.map((badge) => [badge.id, badge]));

export function listBadgeDefinitions(): BadgeDefinition[] {
  return badgeDefinitions.map((badge) => ({ ...badge, achievementIds: [...badge.achievementIds] }));
}

export function getBadgeDefinition(badgeId: string): BadgeDefinition | null {
  return badgesById.get(badgeId) ?? null;
}
