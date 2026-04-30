import type { AchievementCounterState, AchievementEntry, AchievementDefinition, AchievementsState, GameplayState } from "../types.ts";
import { listAchievementDefinitions } from "./achievementContentService.ts";

type AchievementMetric = AchievementDefinition["metric"];

function normalizeCounters(rawCounters?: Partial<AchievementCounterState>): AchievementCounterState {
  return {
    questsCompleted: Math.max(0, Number(rawCounters?.questsCompleted ?? 0)),
    itemsCollected: Math.max(0, Number(rawCounters?.itemsCollected ?? 0)),
    chestsOpened: Math.max(0, Number(rawCounters?.chestsOpened ?? 0)),
    chatMessagesSent: Math.max(0, Number(rawCounters?.chatMessagesSent ?? 0)),
  };
}

function normalizeEntries(rawEntries: unknown): Record<string, number | null> {
  if (!Array.isArray(rawEntries)) {
    return {};
  }

  return rawEntries.reduce<Record<string, number | null>>((accumulator, entry) => {
    const record = entry as Partial<AchievementEntry>;
    if (record?.id) {
      accumulator[String(record.id)] = record.unlockedAt ? Number(record.unlockedAt) : null;
    }
    return accumulator;
  }, {});
}

function buildAchievementEntries(
  counters: AchievementCounterState,
  definitions: AchievementDefinition[],
  unlockedById: Record<string, number | null>,
): AchievementEntry[] {
  return definitions.map((definition) => {
    const progress = Math.min(counters[definition.metric], definition.target);
    const unlockedAt = unlockedById[definition.id] ?? null;
    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      category: definition.category,
      metric: definition.metric,
      target: definition.target,
      progress,
      isUnlocked: progress >= definition.target,
      unlockedAt,
    };
  });
}

export function createAchievementsState(rawState?: Partial<AchievementsState>): AchievementsState {
  const counters = normalizeCounters(rawState?.counters);
  const definitions = listAchievementDefinitions();
  const unlockedById = normalizeEntries(rawState?.entries);
  const entries = buildAchievementEntries(counters, definitions, unlockedById).map((entry) =>
    entry.isUnlocked && !entry.unlockedAt
      ? {
          ...entry,
          unlockedAt: Date.now(),
        }
      : entry,
  );

  return {
    counters,
    entries,
  };
}

export function recordAchievementMetric(
  gameplayState: GameplayState,
  metric: AchievementMetric,
  amount = 1,
): AchievementEntry[] {
  const currentState = createAchievementsState(gameplayState.achievements);
  const nextCounters = {
    ...currentState.counters,
    [metric]: currentState.counters[metric] + Math.max(0, Number(amount ?? 0)),
  } as AchievementCounterState;

  const nextState = createAchievementsState({
    counters: nextCounters,
    entries: currentState.entries,
  });
  const unlockedIds = new Set(currentState.entries.filter((entry) => entry.isUnlocked).map((entry) => entry.id));
  const newlyUnlocked = nextState.entries.filter((entry) => entry.isUnlocked && !unlockedIds.has(entry.id));

  gameplayState.achievements = nextState;
  return newlyUnlocked;
}
