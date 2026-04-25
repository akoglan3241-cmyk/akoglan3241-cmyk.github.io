import type { DailyQuestDefinition, DailyQuestEntry, DailyQuestsState, GameplayState, UnlockNotification } from "../types.ts";
import { addItem } from "./inventoryService.ts";
import { grantXp } from "./progressionService.ts";
import { listDailyQuestDefinitions } from "./dailyQuestContentService.ts";

const DAILY_RESET_TIME_ZONE = "Europe/Istanbul";
const DAILY_QUESTS_PER_PLAYER = 3;

function getDateKey(timestamp = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DAILY_RESET_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

function getTimestampForDateKey(dateKey: string): number {
  return Date.parse(`${dateKey}T00:00:00+03:00`);
}

function hashText(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function buildEntry(definition: DailyQuestDefinition): DailyQuestEntry {
  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    type: definition.type,
    targetCount: definition.targetCount,
    targetRoomId: definition.targetRoomId ?? null,
    progress: 0,
    isCompleted: false,
    rewards: { ...definition.rewards },
    seenNpcIds: [],
  };
}

function buildDailyEntries(profileKey: string, dateKey: string): DailyQuestEntry[] {
  const definitions = listDailyQuestDefinitions()
    .sort((left, right) => hashText(`${profileKey}:${dateKey}:${left.id}`) - hashText(`${profileKey}:${dateKey}:${right.id}`))
    .slice(0, DAILY_QUESTS_PER_PLAYER);

  return definitions.map(buildEntry);
}

function normalizeEntry(rawEntry: Partial<DailyQuestEntry>, definition: DailyQuestDefinition): DailyQuestEntry {
  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    type: definition.type,
    targetCount: definition.targetCount,
    targetRoomId: definition.targetRoomId ?? null,
    progress: Math.max(0, Math.min(definition.targetCount, Number(rawEntry.progress ?? 0))),
    isCompleted: Boolean(rawEntry.isCompleted),
    rewards: { ...definition.rewards },
    seenNpcIds: Array.isArray(rawEntry.seenNpcIds) ? rawEntry.seenNpcIds.map(String) : [],
  };
}

export function createDailyQuestsState(rawState: Partial<DailyQuestsState> | undefined, profileKey: string, now = Date.now()): DailyQuestsState {
  const currentDateKey = getDateKey(now);
  const lastResetAt = getTimestampForDateKey(currentDateKey);
  const nextResetAt = lastResetAt + 24 * 60 * 60 * 1000;

  if (rawState?.dateKey !== currentDateKey || !Array.isArray(rawState?.entries) || rawState.entries.length === 0) {
    return {
      dateKey: currentDateKey,
      lastResetAt,
      nextResetAt,
      entries: buildDailyEntries(profileKey, currentDateKey),
    };
  }

  const definitionsById = new Map(listDailyQuestDefinitions().map((definition) => [definition.id, definition]));
  const entries = rawState.entries
    .map((entry) => {
      const definition = definitionsById.get(String(entry?.id ?? ""));
      return definition ? normalizeEntry(entry, definition) : null;
    })
    .filter(Boolean) as DailyQuestEntry[];

  return {
    dateKey: currentDateKey,
    lastResetAt,
    nextResetAt,
    entries: entries.length > 0 ? entries : buildDailyEntries(profileKey, currentDateKey),
  };
}

function completeEntry(gameplayState: GameplayState, entry: DailyQuestEntry): UnlockNotification {
  addItem(gameplayState, "coin", entry.rewards.coins);
  grantXp(gameplayState, entry.rewards.xp);
  entry.isCompleted = true;
  return {
    id: entry.id,
    title: entry.title,
    description: `${entry.rewards.coins} coin ve ${entry.rewards.xp} XP kazandin.`,
    kind: "daily-quest",
  };
}

function syncState(gameplayState: GameplayState, profileKey: string): DailyQuestsState {
  gameplayState.dailyQuests = createDailyQuestsState(gameplayState.dailyQuests, profileKey);
  return gameplayState.dailyQuests;
}

export function recordPickupForDailyQuests(gameplayState: GameplayState, profileKey: string): UnlockNotification[] {
  const state = syncState(gameplayState, profileKey);
  const notifications: UnlockNotification[] = [];

  state.entries.forEach((entry) => {
    if (entry.isCompleted || entry.type !== "collect-pickups") {
      return;
    }

    entry.progress = Math.min(entry.targetCount, entry.progress + 1);
    if (entry.progress >= entry.targetCount) {
      notifications.push(completeEntry(gameplayState, entry));
    }
  });

  return notifications;
}

export function recordNpcTalkForDailyQuests(gameplayState: GameplayState, profileKey: string, npcId: string): UnlockNotification[] {
  const state = syncState(gameplayState, profileKey);
  const notifications: UnlockNotification[] = [];

  state.entries.forEach((entry) => {
    if (entry.isCompleted || entry.type !== "talk-to-npcs" || entry.seenNpcIds.includes(npcId)) {
      return;
    }

    entry.seenNpcIds = [...entry.seenNpcIds, npcId];
    entry.progress = Math.min(entry.targetCount, entry.seenNpcIds.length);
    if (entry.progress >= entry.targetCount) {
      notifications.push(completeEntry(gameplayState, entry));
    }
  });

  return notifications;
}

export function recordChestOpenedForDailyQuests(gameplayState: GameplayState, profileKey: string): UnlockNotification[] {
  const state = syncState(gameplayState, profileKey);
  const notifications: UnlockNotification[] = [];

  state.entries.forEach((entry) => {
    if (entry.isCompleted || entry.type !== "open-chests") {
      return;
    }

    entry.progress = Math.min(entry.targetCount, entry.progress + 1);
    if (entry.progress >= entry.targetCount) {
      notifications.push(completeEntry(gameplayState, entry));
    }
  });

  return notifications;
}

export function recordRoomVisitForDailyQuests(gameplayState: GameplayState, profileKey: string, roomId: string): UnlockNotification[] {
  const state = syncState(gameplayState, profileKey);
  const notifications: UnlockNotification[] = [];

  state.entries.forEach((entry) => {
    if (entry.isCompleted || entry.type !== "visit-room" || entry.targetRoomId !== roomId) {
      return;
    }

    entry.progress = entry.targetCount;
    notifications.push(completeEntry(gameplayState, entry));
  });

  return notifications;
}
