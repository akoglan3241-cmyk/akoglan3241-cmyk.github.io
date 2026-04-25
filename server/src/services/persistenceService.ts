import { closeDbPool, isDatabaseConfigured, withDbTransaction } from "../db/client.ts";
import { initializeDatabaseSchema } from "../db/schema.ts";
import { findInventoryByUserId, replaceInventoryByUserId } from "../repositories/inventoryRepository.ts";
import { findPlayerProfileByUserId, savePlayerProfileByUserId } from "../repositories/playerProfilesRepository.ts";
import { findQuestProgressByUserId, saveQuestProgressByUserId } from "../repositories/questProgressRepository.ts";
import { findUserByUsername, upsertUser } from "../repositories/usersRepository.ts";
import { findWorldStateByUserId, replaceWorldStateByUserId } from "../repositories/worldStateRepository.ts";
import type { Appearance, AuthContext, PlayerProfile } from "../types.ts";
import { createAchievementsState } from "./achievementService.ts";
import { createBadgesState } from "./badgeService.ts";
import { createCosmeticsState } from "./cosmeticsService.ts";
import { createDailyLoginState } from "./dailyLoginRewardService.ts";
import { createDirectMessagesState } from "./directMessageService.ts";
import { createDailyQuestsState } from "./dailyQuestService.ts";
import { createHomeState } from "./homeStateService.ts";
import { createMailboxState } from "./mailboxService.ts";
import { createProgressionState } from "./progressionService.ts";
import { sanitizeProfileStatus } from "./statusService.ts";
import { createTutorialState } from "./tutorialService.ts";
import { createWeeklyTasksState } from "./weeklyTaskService.ts";

const guestProfiles = new Map<string, PlayerProfile>();

function inferTutorialState(rawTutorialState: PlayerProfile["tutorialState"] | null | undefined, signals: {
  xp?: number;
  level?: number;
  completedQuestIds?: string[];
  inventoryItems?: Record<string, number>;
  collectedPickupIds?: string[];
  openedChestIds?: string[];
}) {
  if (rawTutorialState && (rawTutorialState.isCompleted || rawTutorialState.isSkipped || (rawTutorialState.completedStepIds ?? []).length > 0)) {
    return createTutorialState(rawTutorialState);
  }

  const hasExistingProgress =
    Number(signals.xp ?? 0) > 0 ||
    Number(signals.level ?? 1) > 1 ||
    (signals.completedQuestIds?.length ?? 0) > 0 ||
    Object.values(signals.inventoryItems ?? {}).some((amount) => Number(amount) > 0) ||
    (signals.collectedPickupIds?.length ?? 0) > 0 ||
    (signals.openedChestIds?.length ?? 0) > 0;

  return createTutorialState(hasExistingProgress ? { isSkipped: true, skippedAt: Date.now() } : rawTutorialState);
}

export async function initializePersistence(): Promise<void> {
  await initializeDatabaseSchema();
}

export async function closePersistence(): Promise<void> {
  await closeDbPool();
}

export async function loadPlayerProfile(profileKey: string): Promise<PlayerProfile | null> {
  const normalizedUsername = profileKey.toLowerCase();

  if (!isDatabaseConfigured()) {
    const existingUser = await findUserByUsername(normalizedUsername);
    const user = existingUser ?? (await upsertUser(normalizedUsername, profileKey));
    const [profileRow, inventoryItems, questProgress, worldState] = await Promise.all([
      findPlayerProfileByUserId(user.id),
      findInventoryByUserId(user.id),
      findQuestProgressByUserId(user.id),
      findWorldStateByUserId(user.id),
    ]);

    if (!profileRow) {
      return null;
    }

    return {
      name: user.displayName,
      roomId: profileRow.roomId,
      appearance: profileRow.appearance,
      statusText: sanitizeProfileStatus(profileRow.statusText),
      homeState: createHomeState(user.id, profileRow.homeState),
      tutorialState: inferTutorialState(profileRow.tutorialState, {
        xp: profileRow.xp,
        level: profileRow.level,
        completedQuestIds: questProgress?.completedQuestIds,
        inventoryItems,
        collectedPickupIds: worldState.collectedPickupIds,
        openedChestIds: worldState.openedChestIds,
      }),
      dailyLoginState: createDailyLoginState(profileRow.dailyLoginState),
      mailboxState: createMailboxState(profileRow.mailboxState),
      directMessagesState: createDirectMessagesState(profileRow.directMessagesState),
      gameplayState: {
        inventory: {
          items: inventoryItems,
        },
        quest: {
          activeQuest: questProgress?.activeQuest ?? null,
          completedQuestIds: questProgress?.completedQuestIds ?? [],
        },
        world: {
          collectedPickupIds: worldState.collectedPickupIds,
          openedChestIds: worldState.openedChestIds,
        },
        cosmetics: createCosmeticsState(
          {
            owned: profileRow.ownedCosmetics,
            equipped: profileRow.appearance,
          },
          profileRow.appearance,
        ),
        progression: createProgressionState({
          xp: profileRow.xp,
          level: profileRow.level,
        }),
        achievements: createAchievementsState(profileRow.achievements ?? undefined),
        badges: createBadgesState(
          profileRow.badges ?? undefined,
          createAchievementsState(profileRow.achievements ?? undefined).entries.filter((entry) => entry.isUnlocked).map((entry) => entry.id),
        ),
        dailyQuests: createDailyQuestsState(profileRow.dailyQuests ?? undefined, profileKey),
        weeklyTasks: createWeeklyTasksState(profileRow.weeklyTasks ?? undefined, profileKey),
      },
    };
  }

  return withDbTransaction(async (client) => {
    const existingUser = await findUserByUsername(normalizedUsername, client);
    const user = existingUser ?? (await upsertUser(normalizedUsername, profileKey, client));
    const [profileRow, inventoryItems, questProgress, worldState] = await Promise.all([
      findPlayerProfileByUserId(user.id, client),
      findInventoryByUserId(user.id, client),
      findQuestProgressByUserId(user.id, client),
      findWorldStateByUserId(user.id, client),
    ]);

    if (!profileRow) {
      return null;
    }

    return {
      name: user.displayName,
      roomId: profileRow.roomId,
      appearance: profileRow.appearance,
      statusText: sanitizeProfileStatus(profileRow.statusText),
      homeState: createHomeState(user.id, profileRow.homeState),
      tutorialState: inferTutorialState(profileRow.tutorialState, {
        xp: profileRow.xp,
        level: profileRow.level,
        completedQuestIds: questProgress?.completedQuestIds,
        inventoryItems,
        collectedPickupIds: worldState.collectedPickupIds,
        openedChestIds: worldState.openedChestIds,
      }),
      dailyLoginState: createDailyLoginState(profileRow.dailyLoginState),
      mailboxState: createMailboxState(profileRow.mailboxState),
      directMessagesState: createDirectMessagesState(profileRow.directMessagesState),
      gameplayState: {
        inventory: {
          items: inventoryItems,
        },
        quest: {
          activeQuest: questProgress?.activeQuest ?? null,
          completedQuestIds: questProgress?.completedQuestIds ?? [],
        },
        world: {
          collectedPickupIds: worldState.collectedPickupIds,
          openedChestIds: worldState.openedChestIds,
        },
        cosmetics: createCosmeticsState(
          {
            owned: profileRow.ownedCosmetics,
            equipped: profileRow.appearance,
          },
          profileRow.appearance,
        ),
        progression: createProgressionState({
          xp: profileRow.xp,
          level: profileRow.level,
        }),
        achievements: createAchievementsState(profileRow.achievements ?? undefined),
        badges: createBadgesState(
          profileRow.badges ?? undefined,
          createAchievementsState(profileRow.achievements ?? undefined).entries.filter((entry) => entry.isUnlocked).map((entry) => entry.id),
        ),
        dailyQuests: createDailyQuestsState(profileRow.dailyQuests ?? undefined, profileKey),
        weeklyTasks: createWeeklyTasksState(profileRow.weeklyTasks ?? undefined, profileKey),
      },
    };
  });
}

export async function savePlayerProfile(profileKey: string, profile: PlayerProfile): Promise<void> {
  const normalizedUsername = profileKey.toLowerCase();

  if (!isDatabaseConfigured()) {
    const user = await upsertUser(normalizedUsername, profile.name);
    await savePlayerProfileByUserId(
      user.id,
      profile.roomId,
      profile.appearance as Appearance,
      profile.gameplayState.cosmetics?.owned ?? createCosmeticsState(undefined, profile.appearance).owned,
      sanitizeProfileStatus(profile.statusText),
      createHomeState(user.id, profile.homeState),
      createTutorialState(profile.tutorialState),
      createDailyLoginState(profile.dailyLoginState),
      createMailboxState(profile.mailboxState),
      createDirectMessagesState(profile.directMessagesState),
      Number(profile.gameplayState.progression?.xp ?? 0),
      Number(profile.gameplayState.progression?.level ?? 1),
      createAchievementsState(profile.gameplayState.achievements),
      createBadgesState(
        profile.gameplayState.badges,
        createAchievementsState(profile.gameplayState.achievements).entries.filter((entry) => entry.isUnlocked).map((entry) => entry.id),
      ),
      createDailyQuestsState(profile.gameplayState.dailyQuests, profileKey),
      createWeeklyTasksState(profile.gameplayState.weeklyTasks, profileKey),
    );
    await replaceInventoryByUserId(user.id, profile.gameplayState.inventory.items);
    await saveQuestProgressByUserId(
      user.id,
      profile.gameplayState.quest.activeQuest,
      profile.gameplayState.quest.completedQuestIds,
    );
    await replaceWorldStateByUserId(
      user.id,
      profile.gameplayState.world.collectedPickupIds,
      profile.gameplayState.world.openedChestIds,
    );
    return;
  }

  await withDbTransaction(async (client) => {
    const user = await upsertUser(normalizedUsername, profile.name, client);
    await savePlayerProfileByUserId(
      user.id,
      profile.roomId,
      profile.appearance as Appearance,
      profile.gameplayState.cosmetics?.owned ?? createCosmeticsState(undefined, profile.appearance).owned,
      sanitizeProfileStatus(profile.statusText),
      createHomeState(user.id, profile.homeState),
      createTutorialState(profile.tutorialState),
      createDailyLoginState(profile.dailyLoginState),
      createMailboxState(profile.mailboxState),
      createDirectMessagesState(profile.directMessagesState),
      Number(profile.gameplayState.progression?.xp ?? 0),
      Number(profile.gameplayState.progression?.level ?? 1),
      createAchievementsState(profile.gameplayState.achievements),
      createBadgesState(
        profile.gameplayState.badges,
        createAchievementsState(profile.gameplayState.achievements).entries.filter((entry) => entry.isUnlocked).map((entry) => entry.id),
      ),
      createDailyQuestsState(profile.gameplayState.dailyQuests, profileKey),
      createWeeklyTasksState(profile.gameplayState.weeklyTasks, profileKey),
      client,
    );
    await replaceInventoryByUserId(user.id, profile.gameplayState.inventory.items, client);
    await saveQuestProgressByUserId(
      user.id,
      profile.gameplayState.quest.activeQuest,
      profile.gameplayState.quest.completedQuestIds,
      client,
    );
    await replaceWorldStateByUserId(
      user.id,
      profile.gameplayState.world.collectedPickupIds,
      profile.gameplayState.world.openedChestIds,
      client,
    );
  });
}

export async function loadPlayerProfileForAuth(auth: AuthContext): Promise<PlayerProfile | null> {
  if (auth.isGuest) {
    return guestProfiles.get(auth.subjectId) ?? null;
  }

  return loadPlayerProfile(auth.username);
}

export async function savePlayerProfileForAuth(auth: AuthContext, profile: PlayerProfile): Promise<void> {
  if (auth.isGuest) {
    guestProfiles.set(auth.subjectId, profile);
    return;
  }

  await savePlayerProfile(auth.username, profile);
}
