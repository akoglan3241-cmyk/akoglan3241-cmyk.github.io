import type { BadgeEntry, BadgesState, GameplayState } from "../types.ts";
import { getBadgeDefinition, listBadgeDefinitions } from "./badgeContentService.ts";

function buildUnlockedMap(rawEntries: unknown, rawUnlockedIds: unknown): Record<string, number | null> {
  const unlockedMap: Record<string, number | null> = {};

  if (Array.isArray(rawUnlockedIds)) {
    rawUnlockedIds.forEach((badgeId) => {
      unlockedMap[String(badgeId)] = null;
    });
  }

  if (Array.isArray(rawEntries)) {
    rawEntries.forEach((entry) => {
      const record = entry as Partial<BadgeEntry>;
      if (record?.id) {
        unlockedMap[String(record.id)] = record.unlockedAt ? Number(record.unlockedAt) : unlockedMap[String(record.id)] ?? null;
      }
    });
  }

  return unlockedMap;
}

function buildBadgeEntries(rawState?: Partial<BadgesState>, achievementIds: string[] = []): BadgeEntry[] {
  const definitions = listBadgeDefinitions();
  const unlockedMap = buildUnlockedMap(rawState?.entries, rawState?.unlockedBadgeIds);
  const adminGrantedIds = new Set(Array.isArray(rawState?.adminGrantedBadgeIds) ? rawState.adminGrantedBadgeIds.map(String) : []);
  const unlockedAchievementIds = new Set(achievementIds);
  const equippedBadgeId = rawState?.equippedBadgeId ? String(rawState.equippedBadgeId) : null;

  return definitions.map((definition) => {
    const unlockedByAchievement =
      definition.achievementIds.length > 0 && definition.achievementIds.every((achievementId) => unlockedAchievementIds.has(achievementId));
    const unlockedByAdmin = adminGrantedIds.has(definition.id);
    const isUnlocked = unlockedByAchievement || unlockedByAdmin || Object.prototype.hasOwnProperty.call(unlockedMap, definition.id);
    const unlockedAt = isUnlocked ? unlockedMap[definition.id] ?? Date.now() : null;

    return {
      id: definition.id,
      title: definition.title,
      shortLabel: definition.shortLabel,
      description: definition.description,
      category: definition.category,
      seasonal: definition.seasonal,
      isUnlocked,
      isEquipped: isUnlocked && equippedBadgeId === definition.id,
      unlockedAt,
    };
  });
}

export function createBadgesState(rawState?: Partial<BadgesState>, achievementIds: string[] = []): BadgesState {
  const adminGrantedBadgeIds = Array.isArray(rawState?.adminGrantedBadgeIds) ? rawState.adminGrantedBadgeIds.map(String) : [];
  const entries = buildBadgeEntries(rawState, achievementIds);
  const unlockedBadgeIds = entries.filter((entry) => entry.isUnlocked).map((entry) => entry.id);
  const equippedBadgeId =
    rawState?.equippedBadgeId && unlockedBadgeIds.includes(String(rawState.equippedBadgeId)) ? String(rawState.equippedBadgeId) : null;

  return {
    adminGrantedBadgeIds,
    unlockedBadgeIds,
    equippedBadgeId,
    entries: entries.map((entry) => ({
      ...entry,
      isEquipped: entry.id === equippedBadgeId,
    })),
  };
}

export function synchronizeBadgesFromAchievements(gameplayState: GameplayState): BadgeEntry[] {
  const previousUnlocked = new Set((gameplayState.badges?.entries ?? []).filter((entry) => entry.isUnlocked).map((entry) => entry.id));
  const unlockedAchievementIds = (gameplayState.achievements?.entries ?? []).filter((entry) => entry.isUnlocked).map((entry) => entry.id);
  gameplayState.badges = createBadgesState(gameplayState.badges, unlockedAchievementIds);
  return gameplayState.badges.entries.filter((entry) => entry.isUnlocked && !previousUnlocked.has(entry.id));
}

export function equipBadge(gameplayState: GameplayState, badgeId: string | null): boolean {
  const targetBadgeId = badgeId ? String(badgeId) : null;

  if (targetBadgeId && !gameplayState.badges.entries.some((entry) => entry.id === targetBadgeId && entry.isUnlocked)) {
    return false;
  }

  gameplayState.badges = createBadgesState(
    {
      ...gameplayState.badges,
      equippedBadgeId: targetBadgeId,
    },
    gameplayState.achievements.entries.filter((entry) => entry.isUnlocked).map((entry) => entry.id),
  );
  return true;
}

export function grantAdminBadge(gameplayState: GameplayState, badgeId: string): BadgeEntry | null {
  const definition = getBadgeDefinition(badgeId);

  if (!definition || !definition.adminAssignable) {
    return null;
  }

  const alreadyUnlocked = gameplayState.badges?.entries?.some((entry) => entry.id === badgeId && entry.isUnlocked);
  const adminGrantedBadgeIds = new Set(gameplayState.badges?.adminGrantedBadgeIds ?? []);
  adminGrantedBadgeIds.add(badgeId);

  gameplayState.badges = createBadgesState(
    {
      ...gameplayState.badges,
      adminGrantedBadgeIds: [...adminGrantedBadgeIds],
    },
    gameplayState.achievements.entries.filter((entry) => entry.isUnlocked).map((entry) => entry.id),
  );

  if (alreadyUnlocked) {
    return gameplayState.badges.entries.find((entry) => entry.id === badgeId) ?? null;
  }

  return gameplayState.badges.entries.find((entry) => entry.id === badgeId && entry.isUnlocked) ?? null;
}

export function getEquippedBadgeLabel(gameplayState: GameplayState): string {
  return gameplayState.badges?.entries?.find((entry) => entry.isEquipped)?.shortLabel ?? "";
}
