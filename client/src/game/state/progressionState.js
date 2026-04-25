export function getDefaultProgressionState() {
  return {
    xp: 0,
    level: 1,
    currentLevelXp: 0,
    nextLevelXp: 60,
    progressRatio: 0,
    unlockedContentIds: [],
    nextUnlockLevel: 2,
    nextUnlockLabel: "Moon Cafe sosyal alanlari",
  };
}

export function normalizeProgressionState(rawState) {
  const fallback = getDefaultProgressionState();
  return {
    xp: Number(rawState?.xp ?? fallback.xp),
    level: Math.max(1, Number(rawState?.level ?? fallback.level)),
    currentLevelXp: Number(rawState?.currentLevelXp ?? fallback.currentLevelXp),
    nextLevelXp: rawState?.nextLevelXp === null ? null : Number(rawState?.nextLevelXp ?? fallback.nextLevelXp),
    progressRatio: Math.max(0, Math.min(1, Number(rawState?.progressRatio ?? fallback.progressRatio))),
    unlockedContentIds: Array.isArray(rawState?.unlockedContentIds) ? rawState.unlockedContentIds.map(String) : fallback.unlockedContentIds,
    nextUnlockLevel: rawState?.nextUnlockLevel === null ? null : Number(rawState?.nextUnlockLevel ?? fallback.nextUnlockLevel),
    nextUnlockLabel: String(rawState?.nextUnlockLabel ?? fallback.nextUnlockLabel),
  };
}

export function getXpProgressText(progressionState) {
  const levelStartXp = Number(progressionState?.currentLevelXp ?? 0);
  const nextLevelXp = progressionState?.nextLevelXp;

  if (nextLevelXp === null || nextLevelXp === undefined) {
    return "MAX LEVEL";
  }

  const currentXp = Math.max(0, Number(progressionState?.xp ?? 0) - levelStartXp);
  const targetXp = Math.max(1, Number(nextLevelXp) - levelStartXp);
  return `${currentXp}/${targetXp} XP`;
}
