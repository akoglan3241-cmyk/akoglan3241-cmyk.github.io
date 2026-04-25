import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isSeasonalContentActive } from "./seasonalEventService.ts";
import type {
  Position,
  QuestDefinition,
  QuestObjective,
  QuestRewards,
  RewardItem,
} from "../types.ts";

function normalizeRewardItems(rawItems: unknown): RewardItem[] {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems.map((item) => {
    const record = item as Partial<RewardItem>;
    return {
      itemId: String(record.itemId ?? ""),
      amount: Number(record.amount ?? 0),
    };
  });
}

function normalizeRewards(rawRewards: unknown): QuestRewards {
  const record = (rawRewards ?? {}) as { coins?: unknown; xp?: unknown; items?: unknown };
  return {
    coins: Number(record.coins ?? 0),
    xp: Number(record.xp ?? 0),
    items: normalizeRewardItems(record.items),
  };
}

function normalizePosition(rawPosition: unknown): Position | null {
  if (!rawPosition || typeof rawPosition !== "object") {
    return null;
  }

  const record = rawPosition as Partial<Position>;
  return {
    x: Number(record.x ?? 0),
    y: Number(record.y ?? 0),
  };
}

function normalizeObjective(rawObjective: unknown, defaultRoomId: string): QuestObjective {
  const record = (rawObjective ?? {}) as Record<string, unknown>;
  const type = String(record.type ?? "");

  if (type === "go-to-location") {
    return {
      type,
      targetLabel: String(record.targetLabel ?? ""),
      roomId: String(record.roomId ?? defaultRoomId),
      position: normalizePosition(record.position),
    };
  }

  if (type === "collect-item") {
    return {
      type,
      targetLabel: String(record.targetLabel ?? record.itemId ?? ""),
      itemId: String(record.itemId ?? ""),
      targetAmount: Number(record.targetAmount ?? 1),
    };
  }

  if (type === "talk-to-npc") {
    return {
      type,
      targetLabel: String(record.targetLabel ?? record.npcId ?? ""),
      npcId: String(record.npcId ?? ""),
    };
  }

  return {
    type: "open-chest",
    targetLabel: String(record.targetLabel ?? record.chestId ?? ""),
    chestId: String(record.chestId ?? ""),
  };
}

function normalizeObjectives(rawObjectives: unknown, fallbackObjective: unknown, defaultRoomId: string): QuestObjective[] {
  if (Array.isArray(rawObjectives) && rawObjectives.length > 0) {
    return rawObjectives.map((entry) => normalizeObjective(entry, defaultRoomId));
  }

  return [normalizeObjective(fallbackObjective, defaultRoomId)];
}

function loadQuestDefinitions(): QuestDefinition[] {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  const contentDir = path.resolve(serviceDir, "../../../client/src/game/content/quests");
  const fileNames = readdirSync(contentDir).filter((fileName) => fileName.endsWith(".json"));

  return fileNames.flatMap((fileName) => {
    const rawContent = JSON.parse(readFileSync(path.join(contentDir, fileName), "utf8")) as Record<string, unknown>;
    if (!isSeasonalContentActive(rawContent.eventTags)) {
      return [];
    }
    const roomId = String(rawContent.roomId ?? "town");
    const npcId = String(rawContent.npcId ?? rawContent.id ?? "");
    const giverPosition = normalizePosition(rawContent.position);
    const defaultLinks = ((rawContent.dialogue as { links?: Record<string, string> } | undefined)?.links ?? {}) as Record<string, string>;
    const rawQuests = Array.isArray(rawContent.quests) ? rawContent.quests : [];

    return rawQuests.map((rawQuest) => {
      const quest = rawQuest as Record<string, unknown>;
      const objectives = normalizeObjectives(quest.objectives, quest.objective, roomId);
      const objective = objectives[0];
      return {
        id: String(quest.id ?? ""),
        questLineId: String(rawContent.id ?? ""),
        npcId,
        roomId,
        giverPosition,
        type: objective.type,
        title: String(quest.title ?? ""),
        description: String(quest.description ?? ""),
        objective,
        objectives,
        prerequisites: Array.isArray(quest.prerequisites) ? quest.prerequisites.map(String) : [],
        rewards: normalizeRewards(quest.rewards),
        dialogueLinks: {
          ...defaultLinks,
          ...((quest.dialogueLinks ?? {}) as Record<string, string>),
        },
      };
    });
  });
}

const questDefinitions = loadQuestDefinitions();
const questsById = new Map<string, QuestDefinition>(questDefinitions.map((quest) => [quest.id, quest]));

export function getQuestDefinition(questId: string): QuestDefinition | null {
  return questsById.get(questId) ?? null;
}
