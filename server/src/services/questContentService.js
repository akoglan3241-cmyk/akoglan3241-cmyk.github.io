import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeRewards(rawRewards = {}) {
  return {
    coins: Number(rawRewards.coins ?? 0),
    items: Array.isArray(rawRewards.items)
      ? rawRewards.items.map((item) => ({
          itemId: String(item.itemId ?? ""),
          amount: Number(item.amount ?? 0),
        }))
      : [],
  };
}

function normalizeObjective(rawObjective = {}, defaultRoomId = null) {
  const type = String(rawObjective.type ?? "");

  if (type === "go-to-location") {
    return {
      type,
      targetLabel: String(rawObjective.targetLabel ?? ""),
      roomId: String(rawObjective.roomId ?? defaultRoomId ?? ""),
      position: rawObjective.position
        ? {
            x: Number(rawObjective.position.x ?? 0),
            y: Number(rawObjective.position.y ?? 0),
          }
        : null,
    };
  }

  if (type === "collect-item") {
    return {
      type,
      targetLabel: String(rawObjective.targetLabel ?? rawObjective.itemId ?? ""),
      itemId: String(rawObjective.itemId ?? ""),
      targetAmount: Number(rawObjective.targetAmount ?? 1),
    };
  }

  if (type === "open-chest") {
    return {
      type,
      targetLabel: String(rawObjective.targetLabel ?? rawObjective.chestId ?? ""),
      chestId: String(rawObjective.chestId ?? ""),
    };
  }

  return {
    type,
  };
}

function normalizeQuestLine(rawLine = {}) {
  const roomId = String(rawLine.roomId ?? "town");
  const npcId = String(rawLine.npcId ?? rawLine.id ?? "");
  const dialogueEntries = rawLine.dialogue?.entries ?? {};
  const defaultLinks = rawLine.dialogue?.links ?? {};

  const quests = Array.isArray(rawLine.quests)
      ? rawLine.quests.map((quest) => ({
        id: String(quest.id ?? ""),
        questLineId: String(rawLine.id ?? ""),
        npcId,
        roomId,
        giverPosition: rawLine.position
          ? {
              x: Number(rawLine.position.x ?? 0),
              y: Number(rawLine.position.y ?? 0),
            }
          : null,
        type: String(quest.type ?? quest.objective?.type ?? ""),
        title: String(quest.title ?? ""),
        description: String(quest.description ?? ""),
        objective: normalizeObjective(quest.objective, roomId),
        prerequisites: Array.isArray(quest.prerequisites) ? quest.prerequisites.map(String) : [],
        rewards: normalizeRewards(quest.rewards),
        dialogueLinks: {
          ...defaultLinks,
          ...(quest.dialogueLinks ?? {}),
        },
      }))
    : [];

  return {
    id: String(rawLine.id ?? ""),
    npcId,
    roomId,
    position: rawLine.position
      ? {
          x: Number(rawLine.position.x ?? 0),
          y: Number(rawLine.position.y ?? 0),
        }
      : null,
    dialogueEntries,
    quests,
  };
}

function loadQuestLines() {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  const contentDir = path.resolve(serviceDir, "../../../client/src/game/content/quests");
  const fileNames = readdirSync(contentDir).filter((fileName) => fileName.endsWith(".json"));

  return fileNames
    .map((fileName) => {
      const rawContent = readFileSync(path.join(contentDir, fileName), "utf8");
      return normalizeQuestLine(JSON.parse(rawContent));
    })
    .filter((line) => line.id && line.npcId);
}

const questLines = loadQuestLines();
const questLinesById = new Map(questLines.map((line) => [line.id, line]));
const questLinesByNpcId = new Map(questLines.map((line) => [line.npcId, line]));
const questsById = new Map(
  questLines.flatMap((line) => line.quests.map((quest) => [quest.id, quest])),
);

export function listQuestLines() {
  return clone(questLines);
}

export function getQuestLineById(questLineId) {
  return questLinesById.get(questLineId) ?? null;
}

export function getQuestLineByNpcId(npcId) {
  return questLinesByNpcId.get(npcId) ?? null;
}

export function getQuestDefinition(questId) {
  return questsById.get(questId) ?? null;
}
