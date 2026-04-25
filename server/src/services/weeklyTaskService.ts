import type { GameplayState, UnlockNotification, WeeklyTaskDefinition, WeeklyTaskEntry, WeeklyTasksState } from "../types.ts";
import { unlockCosmetic } from "./cosmeticsService.ts";
import { addItem } from "./inventoryService.ts";
import { grantXp } from "./progressionService.ts";
import { listWeeklyTaskDefinitions } from "./weeklyTaskContentService.ts";

const WEEKLY_RESET_TIME_ZONE = "Europe/Istanbul";
const WEEKLY_TASKS_PER_PLAYER = 3;
const MONDAY_DAY_INDEX = 1;

function getWeekStartDate(timestamp = Date.now()): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: WEEKLY_RESET_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]));
  const currentDate = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00+03:00`);
  const weekdayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const weekday = weekdayMap[parts.weekday] ?? MONDAY_DAY_INDEX;
  const diff = weekday - MONDAY_DAY_INDEX;
  currentDate.setUTCDate(currentDate.getUTCDate() - diff);
  return currentDate;
}

function getWeekKey(timestamp = Date.now()): string {
  return getWeekStartDate(timestamp).toISOString().slice(0, 10);
}

function hashText(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function buildEntry(definition: WeeklyTaskDefinition): WeeklyTaskEntry {
  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    type: definition.type,
    targetCount: definition.targetCount,
    targetRoomId: definition.targetRoomId ?? null,
    progress: 0,
    isCompleted: false,
    rewards: {
      coins: definition.rewards.coins,
      xp: definition.rewards.xp,
      cosmetics: definition.rewards.cosmetics.map((reward) => ({ ...reward })),
    },
    seenNpcIds: [],
  };
}

function buildWeeklyEntries(profileKey: string, weekKey: string): WeeklyTaskEntry[] {
  const definitions = listWeeklyTaskDefinitions()
    .sort((left, right) => hashText(`${profileKey}:${weekKey}:${left.id}`) - hashText(`${profileKey}:${weekKey}:${right.id}`))
    .slice(0, WEEKLY_TASKS_PER_PLAYER);

  return definitions.map(buildEntry);
}

function normalizeEntry(rawEntry: Partial<WeeklyTaskEntry>, definition: WeeklyTaskDefinition): WeeklyTaskEntry {
  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    type: definition.type,
    targetCount: definition.targetCount,
    targetRoomId: definition.targetRoomId ?? null,
    progress: Math.max(0, Math.min(definition.targetCount, Number(rawEntry.progress ?? 0))),
    isCompleted: Boolean(rawEntry.isCompleted),
    rewards: {
      coins: definition.rewards.coins,
      xp: definition.rewards.xp,
      cosmetics: definition.rewards.cosmetics.map((reward) => ({ ...reward })),
    },
    seenNpcIds: Array.isArray(rawEntry.seenNpcIds) ? rawEntry.seenNpcIds.map(String) : [],
  };
}

export function createWeeklyTasksState(rawState: Partial<WeeklyTasksState> | undefined, profileKey: string, now = Date.now()): WeeklyTasksState {
  const weekKey = getWeekKey(now);
  const lastResetAt = getWeekStartDate(now).getTime();
  const nextResetAt = lastResetAt + 7 * 24 * 60 * 60 * 1000;

  if (rawState?.weekKey !== weekKey || !Array.isArray(rawState?.entries) || rawState.entries.length === 0) {
    return {
      weekKey,
      lastResetAt,
      nextResetAt,
      entries: buildWeeklyEntries(profileKey, weekKey),
    };
  }

  const definitionsById = new Map(listWeeklyTaskDefinitions().map((definition) => [definition.id, definition]));
  const entries = rawState.entries
    .map((entry) => {
      const definition = definitionsById.get(String(entry?.id ?? ""));
      return definition ? normalizeEntry(entry, definition) : null;
    })
    .filter(Boolean) as WeeklyTaskEntry[];

  return {
    weekKey,
    lastResetAt,
    nextResetAt,
    entries: entries.length > 0 ? entries : buildWeeklyEntries(profileKey, weekKey),
  };
}

function completeEntry(gameplayState: GameplayState, entry: WeeklyTaskEntry): UnlockNotification {
  addItem(gameplayState, "coin", entry.rewards.coins);
  grantXp(gameplayState, entry.rewards.xp);
  entry.rewards.cosmetics.forEach((reward) => {
    unlockCosmetic(gameplayState.cosmetics, reward.slot, reward.cosmeticId);
  });
  entry.isCompleted = true;
  const cosmeticRewardText = entry.rewards.cosmetics.length > 0 ? " ve nadir kozmetik odulu" : "";
  return {
    id: entry.id,
    title: entry.title,
    description: `${entry.rewards.coins} coin, ${entry.rewards.xp} XP${cosmeticRewardText} kazandin.`,
    kind: "weekly-task",
  };
}

function syncState(gameplayState: GameplayState, profileKey: string): WeeklyTasksState {
  gameplayState.weeklyTasks = createWeeklyTasksState(gameplayState.weeklyTasks, profileKey);
  return gameplayState.weeklyTasks;
}

export function recordPickupForWeeklyTasks(gameplayState: GameplayState, profileKey: string): UnlockNotification[] {
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

export function recordNpcTalkForWeeklyTasks(gameplayState: GameplayState, profileKey: string, npcId: string): UnlockNotification[] {
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

export function recordChestOpenedForWeeklyTasks(gameplayState: GameplayState, profileKey: string): UnlockNotification[] {
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

export function recordRoomVisitForWeeklyTasks(gameplayState: GameplayState, profileKey: string, roomId: string): UnlockNotification[] {
  const state = syncState(gameplayState, profileKey);
  const notifications: UnlockNotification[] = [];
  state.entries.forEach((entry) => {
    if (entry.isCompleted || entry.type !== "visit-room" || entry.targetRoomId !== roomId) {
      return;
    }
    entry.progress = Math.min(entry.targetCount, entry.progress + 1);
    if (entry.progress >= entry.targetCount) {
      notifications.push(completeEntry(gameplayState, entry));
    }
  });
  return notifications;
}
