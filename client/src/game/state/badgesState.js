export function getDefaultBadgesState() {
  return {
    adminGrantedBadgeIds: [],
    unlockedBadgeIds: [],
    equippedBadgeId: null,
    entries: [],
  };
}

export function normalizeBadgesState(rawState) {
  return {
    adminGrantedBadgeIds: Array.isArray(rawState?.adminGrantedBadgeIds) ? rawState.adminGrantedBadgeIds.map(String) : [],
    unlockedBadgeIds: Array.isArray(rawState?.unlockedBadgeIds) ? rawState.unlockedBadgeIds.map(String) : [],
    equippedBadgeId: rawState?.equippedBadgeId ? String(rawState.equippedBadgeId) : null,
    entries: Array.isArray(rawState?.entries)
      ? rawState.entries.map((entry) => ({
          id: String(entry?.id ?? ""),
          title: String(entry?.title ?? ""),
          shortLabel: String(entry?.shortLabel ?? ""),
          description: String(entry?.description ?? ""),
          category: String(entry?.category ?? "general"),
          seasonal: Boolean(entry?.seasonal),
          isUnlocked: Boolean(entry?.isUnlocked),
          isEquipped: Boolean(entry?.isEquipped),
          unlockedAt: entry?.unlockedAt ? Number(entry.unlockedAt) : null,
        }))
      : [],
  };
}

export function getEquippedBadgeLabel(badgesState) {
  return badgesState?.entries?.find((entry) => entry.isEquipped)?.shortLabel ?? "";
}
