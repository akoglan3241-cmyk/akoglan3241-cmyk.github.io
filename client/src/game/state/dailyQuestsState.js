export function getDefaultDailyQuestsState() {
  return {
    dateKey: "",
    lastResetAt: 0,
    nextResetAt: 0,
    entries: [],
  };
}

export function normalizeDailyQuestsState(rawState) {
  return {
    dateKey: String(rawState?.dateKey ?? ""),
    lastResetAt: Number(rawState?.lastResetAt ?? 0),
    nextResetAt: Number(rawState?.nextResetAt ?? 0),
    entries: Array.isArray(rawState?.entries)
      ? rawState.entries.map((entry) => ({
          id: String(entry?.id ?? ""),
          title: String(entry?.title ?? ""),
          description: String(entry?.description ?? ""),
          type: String(entry?.type ?? ""),
          targetCount: Math.max(1, Number(entry?.targetCount ?? 1)),
          targetRoomId: entry?.targetRoomId ? String(entry.targetRoomId) : null,
          progress: Math.max(0, Number(entry?.progress ?? 0)),
          isCompleted: Boolean(entry?.isCompleted),
          rewards: {
            coins: Math.max(0, Number(entry?.rewards?.coins ?? 0)),
            xp: Math.max(0, Number(entry?.rewards?.xp ?? 0)),
          },
          seenNpcIds: Array.isArray(entry?.seenNpcIds) ? entry.seenNpcIds.map(String) : [],
        }))
      : [],
  };
}
