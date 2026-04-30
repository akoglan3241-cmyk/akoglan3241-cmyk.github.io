export function getDefaultAchievementsState() {
  return {
    counters: {
      questsCompleted: 0,
      itemsCollected: 0,
      chestsOpened: 0,
      chatMessagesSent: 0,
    },
    entries: [],
  };
}

export function normalizeAchievementsState(rawState) {
  const fallback = getDefaultAchievementsState();
  return {
    counters: {
      ...fallback.counters,
      ...rawState?.counters,
    },
    entries: Array.isArray(rawState?.entries)
      ? rawState.entries.map((entry) => ({
          id: String(entry?.id ?? ""),
          title: String(entry?.title ?? ""),
          description: String(entry?.description ?? ""),
          category: String(entry?.category ?? "general"),
          metric: String(entry?.metric ?? ""),
          target: Math.max(1, Number(entry?.target ?? 1)),
          progress: Math.max(0, Number(entry?.progress ?? 0)),
          isUnlocked: Boolean(entry?.isUnlocked),
          unlockedAt: entry?.unlockedAt ? Number(entry.unlockedAt) : null,
        }))
      : [],
  };
}
