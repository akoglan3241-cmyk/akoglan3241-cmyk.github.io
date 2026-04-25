import {
  CHESTS,
  CHEST_INTERACTION_RANGE,
  NPC_INTERACTION_RANGE,
  PICKUPS,
  PICKUP_RANGE,
  SPAWN_POINT,
} from "../config/gameplayData.ts";
import type {
  Appearance,
  BuybackEntry,
  BuybackResult,
  GameplayState,
  PlayerConnection,
  PlayerProfile,
  Position,
  PublicPlayerState,
  PurchaseResult,
  SellResult,
  ShopSessionState,
  UnlockNotification,
  WorldState,
  CosmeticSlot,
} from "../types.ts";
import { createAchievementsState, recordAchievementMetric } from "./achievementService.ts";
import { normalizeAppearance } from "./avatarService.ts";
import { createBadgesState, equipBadge, getEquippedBadgeLabel, synchronizeBadgesFromAchievements } from "./badgeService.ts";
import { createCosmeticsState, equipCosmetic, unlockCosmetic } from "./cosmeticsService.ts";
import {
  createDailyQuestsState,
  recordChestOpenedForDailyQuests,
  recordNpcTalkForDailyQuests,
  recordPickupForDailyQuests,
  recordRoomVisitForDailyQuests,
} from "./dailyQuestService.ts";
import { createDailyLoginState } from "./dailyLoginRewardService.ts";
import { createDirectMessagesState } from "./directMessageService.ts";
import { addItem, createInventoryState, hasEnoughItems, removeItem } from "./inventoryService.ts";
import { createProgressionState, getChestXpReward, getPickupXpReward, grantXp } from "./progressionService.ts";
import { completeActiveQuest, createQuestState, isQuestComplete, processQuestMovement, processQuestNpcTalk, startQuest } from "./questService.ts";
import { createHomeState } from "./homeStateService.ts";
import { createMailboxState } from "./mailboxService.ts";
import { createPersonalHomeRoomId, getRoom, getRoomBaseId, getSpawnPosition } from "./roomService.ts";
import { getShopById, getShopItem } from "./shopContentService.ts";
import { getItemDefinition } from "./itemContentService.ts";
import { getCraftingRecipe } from "./craftingContentService.ts";
import { resolveChestLoot } from "./lootTableService.ts";
import { sanitizeProfileStatus } from "./statusService.ts";
import { getActiveEventChestById, getActiveEventPickupById } from "./worldEventService.ts";
import { createTutorialState } from "./tutorialService.ts";
import {
  createWeeklyTasksState,
  recordChestOpenedForWeeklyTasks,
  recordNpcTalkForWeeklyTasks,
  recordPickupForWeeklyTasks,
  recordRoomVisitForWeeklyTasks,
} from "./weeklyTaskService.ts";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isWithinRange(pointA: Position | null | undefined, pointB: Position | null | undefined, range: number): boolean {
  if (!pointA || !pointB) {
    return false;
  }

  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y) <= range;
}

function createWorldState(rawState?: Partial<WorldState>): WorldState {
  return {
    openedChestIds: Array.isArray(rawState?.openedChestIds) ? [...rawState.openedChestIds] : [],
    collectedPickupIds: Array.isArray(rawState?.collectedPickupIds) ? [...rawState.collectedPickupIds] : [],
  };
}

function createShopSessionState(rawState?: Partial<ShopSessionState>): ShopSessionState {
  return {
    buybackItems: Array.isArray(rawState?.buybackItems)
      ? rawState.buybackItems.map((entry) => ({
          id: String(entry.id ?? ""),
          itemId: String(entry.itemId ?? ""),
          label: String(entry.label ?? entry.itemId ?? ""),
          quantity: Number(entry.quantity ?? 0),
          unitPrice: Number(entry.unitPrice ?? 0),
        }))
      : [],
  };
}

function createBuybackEntryId(itemId: string): string {
  return `${itemId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function addBuybackEntry(player: PlayerConnection, itemId: string, label: string, quantity: number, unitPrice: number): void {
  const existingEntry = player.shopSessionState.buybackItems.find((entry) => entry.itemId === itemId && entry.unitPrice === unitPrice);

  if (existingEntry) {
    existingEntry.quantity += quantity;
  } else {
    player.shopSessionState.buybackItems.unshift({
      id: createBuybackEntryId(itemId),
      itemId,
      label,
      quantity,
      unitPrice,
    });
  }

  player.shopSessionState.buybackItems = player.shopSessionState.buybackItems.slice(0, 8);
}

export function createGameplayState(rawState?: Partial<GameplayState>): GameplayState {
  const cosmetics = createCosmeticsState(rawState?.cosmetics);
  const achievements = createAchievementsState(rawState?.achievements);
  return {
    inventory: createInventoryState(rawState?.inventory),
    quest: createQuestState(rawState?.quest),
    world: createWorldState(rawState?.world),
    cosmetics,
    progression: createProgressionState(rawState?.progression),
    achievements,
    badges: createBadgesState(
      rawState?.badges,
      achievements.entries.filter((entry) => entry.isUnlocked).map((entry) => entry.id),
    ),
    dailyQuests: createDailyQuestsState(rawState?.dailyQuests, "guest"),
    weeklyTasks: createWeeklyTasksState(rawState?.weeklyTasks, "guest"),
  };
}

export function createPlayerConnection(
  socketId: string,
  playerName: string,
  profileKey: string,
  profile: PlayerProfile | null,
  requestedAppearance?: Partial<Appearance>,
): PlayerConnection {
  const requestedRoomId = profile?.roomId ?? "town";
  const roomId = requestedRoomId === "home" ? createPersonalHomeRoomId(profileKey) : getRoom(requestedRoomId, profile?.name ?? playerName).id;
  const spawnPoint = getSpawnPosition(roomId) ?? SPAWN_POINT;
  const gameplayState = createGameplayState({
    ...profile?.gameplayState,
    cosmetics: profile?.gameplayState?.cosmetics
      ? profile.gameplayState.cosmetics
      : createCosmeticsState(undefined, profile?.appearance ?? requestedAppearance),
  });
  const appearance = normalizeAppearance(
    profile?.gameplayState?.cosmetics?.equipped ?? profile?.appearance ?? requestedAppearance ?? gameplayState.cosmetics.equipped,
  );
  gameplayState.cosmetics = createCosmeticsState(gameplayState.cosmetics, appearance);
  gameplayState.badges = createBadgesState(
    gameplayState.badges,
    gameplayState.achievements.entries.filter((entry) => entry.isUnlocked).map((entry) => entry.id),
  );
  gameplayState.dailyQuests = createDailyQuestsState(profile?.gameplayState?.dailyQuests ?? gameplayState.dailyQuests, profileKey);
  gameplayState.weeklyTasks = createWeeklyTasksState(profile?.gameplayState?.weeklyTasks ?? gameplayState.weeklyTasks, profileKey);

  return {
    id: socketId,
    auth: {
      subjectId: profileKey,
      username: playerName,
      displayName: playerName,
      isGuest: false,
    },
    profileKey,
    name: playerName,
    roomId,
    x: spawnPoint.x,
    y: spawnPoint.y,
    flipX: false,
    appearance,
    statusText: sanitizeProfileStatus(profile?.statusText),
    homeState: createHomeState(profileKey, profile?.homeState),
    tutorialState: createTutorialState(profile?.tutorialState),
    dailyLoginState: createDailyLoginState(profile?.dailyLoginState),
    mailboxState: createMailboxState(profile?.mailboxState),
    directMessagesState: createDirectMessagesState(profile?.directMessagesState),
    seatedFurnitureId: null,
    activeEmoteId: null,
    emoteEndsAt: null,
    gameplayState,
    chatTimestamps: [],
    shopSessionState: createShopSessionState(),
    miniGameSessionState: {
      lastRewardClaimAtByGame: {},
    },
    lastProcessedInputSequence: null,
  };
}

export function attachAuthContext(player: PlayerConnection, authContext: PlayerConnection["auth"]): PlayerConnection {
  player.auth = authContext;
  return player;
}

export function toPublicPlayerState(player: PlayerConnection): PublicPlayerState {
  return {
    id: player.id,
    name: player.name,
    roomId: player.roomId,
    appearance: player.appearance,
    statusText: player.statusText,
    level: player.gameplayState.progression.level,
    equippedBadgeLabel: getEquippedBadgeLabel(player.gameplayState),
    partyId: null,
    activeEmoteId: player.activeEmoteId,
    emoteEndsAt: player.emoteEndsAt,
    lastProcessedInputSequence: player.lastProcessedInputSequence ?? null,
    x: player.x,
    y: player.y,
    flipX: player.flipX,
  };
}

export function toPlayerProfile(player: PlayerConnection): PlayerProfile {
  player.gameplayState.cosmetics = createCosmeticsState(player.gameplayState.cosmetics, player.appearance);
  return {
    name: player.name,
    roomId: player.roomId,
    appearance: player.appearance,
    statusText: sanitizeProfileStatus(player.statusText),
    homeState: createHomeState(player.profileKey, player.homeState),
    tutorialState: createTutorialState(player.tutorialState),
    dailyLoginState: createDailyLoginState(player.dailyLoginState),
    mailboxState: createMailboxState(player.mailboxState),
    directMessagesState: createDirectMessagesState(player.directMessagesState),
    gameplayState: getGameplaySnapshot(player.gameplayState),
  };
}

export function getGameplaySnapshot(gameplayState: GameplayState): GameplayState {
  return clone(gameplayState);
}

export function getShopSessionSnapshot(player: PlayerConnection): ShopSessionState {
  return clone(player.shopSessionState);
}

export function updatePlayerTransform(player: PlayerConnection, x: number, y: number, flipX: boolean): void {
  const movedDistance = Math.hypot(player.x - x, player.y - y);
  player.x = x;
  player.y = y;
  player.flipX = flipX;
  if (movedDistance > 2 && player.activeEmoteId) {
    player.activeEmoteId = null;
    player.emoteEndsAt = null;
  }
}

export function updatePlayerStatus(player: PlayerConnection, rawStatusText: unknown): void {
  player.statusText = sanitizeProfileStatus(rawStatusText);
}

export function processMovementForPlayer(player: PlayerConnection): UnlockNotification[] {
  const unlocked = processQuestMovement(player.gameplayState, getRoomBaseId(player.roomId), { x: player.x, y: player.y });
  unlocked.push(...synchronizeBadgesFromAchievements(player.gameplayState));
  return unlocked;
}

export function startQuestForPlayer(player: PlayerConnection, questId: string): boolean {
  return startQuest(player.gameplayState, questId, getRoomBaseId(player.roomId), { x: player.x, y: player.y });
}

export function collectPickupForPlayer(player: PlayerConnection, pickupId: string): UnlockNotification[] | null {
  const pickup = PICKUPS[pickupId] ?? getActiveEventPickupById(pickupId);
  const itemDefinition = pickup ? getItemDefinition(pickup.itemId) : null;

  if (!pickup || !itemDefinition || player.gameplayState.world.collectedPickupIds.includes(pickupId)) {
    return null;
  }

  if (!isWithinRange({ x: player.x, y: player.y }, pickup.position, PICKUP_RANGE) || pickup.roomId !== getRoomBaseId(player.roomId)) {
    return null;
  }

  player.gameplayState.world.collectedPickupIds = [...player.gameplayState.world.collectedPickupIds, pickupId];
  addItem(player.gameplayState, pickup.itemId, pickup.amount);
  grantXp(player.gameplayState, getPickupXpReward(pickupId));
  const unlocked = recordAchievementMetric(player.gameplayState, "itemsCollected", pickup.amount);
  unlocked.push(...recordPickupForDailyQuests(player.gameplayState, player.profileKey));
  unlocked.push(...recordPickupForWeeklyTasks(player.gameplayState, player.profileKey));

  if (isQuestComplete(player.gameplayState, getRoomBaseId(player.roomId), { x: player.x, y: player.y })) {
    unlocked.push(...completeActiveQuest(player.gameplayState));
  }

  unlocked.push(...synchronizeBadgesFromAchievements(player.gameplayState));
  return unlocked;
}

export function openChestForPlayer(player: PlayerConnection, chestId: string): { unlocks: UnlockNotification[]; rewards: import("../types.ts").LootReward[] } | null {
  const chest = CHESTS[chestId] ?? getActiveEventChestById(chestId);

  if (!chest || player.gameplayState.world.openedChestIds.includes(chestId)) {
    return null;
  }

  if (!isWithinRange({ x: player.x, y: player.y }, chest.position, CHEST_INTERACTION_RANGE) || chest.roomId !== getRoomBaseId(player.roomId)) {
    return null;
  }

  const canPay = chest.costs.every((cost) => hasEnoughItems(player.gameplayState, cost.itemId, cost.amount));

  if (!canPay) {
    return null;
  }

  const rewards = resolveChestLoot(player, chest.lootTableId);

  if (!rewards) {
    return null;
  }

  chest.costs.forEach((cost) => removeItem(player.gameplayState, cost.itemId, cost.amount));
  rewards
    .filter((reward) => reward.kind === "inventory")
    .forEach((reward) => addItem(player.gameplayState, reward.itemId, reward.amount));
  player.gameplayState.world.openedChestIds = [...player.gameplayState.world.openedChestIds, chestId];
  grantXp(player.gameplayState, getChestXpReward(chestId));
  const unlocked = recordAchievementMetric(player.gameplayState, "chestsOpened", 1);
  unlocked.push(...recordChestOpenedForDailyQuests(player.gameplayState, player.profileKey));
  unlocked.push(...recordChestOpenedForWeeklyTasks(player.gameplayState, player.profileKey));

  if (isQuestComplete(player.gameplayState, getRoomBaseId(player.roomId), { x: player.x, y: player.y })) {
    unlocked.push(...completeActiveQuest(player.gameplayState));
  }

  unlocked.push(...synchronizeBadgesFromAchievements(player.gameplayState));
  return {
    unlocks: unlocked,
    rewards,
  };
}

export function purchaseShopItemForPlayer(player: PlayerConnection, shopId: string, shopItemId: string): PurchaseResult {
  const shop = getShopById(shopId);
  const shopItem = getShopItem(shopId, shopItemId);

  if (!shop || !shopItem || shopItem.price < 0 || shopItem.amount <= 0) {
    return { ok: false, code: "invalid-item" };
  }

  if (player.roomId !== shop.roomId || !isWithinRange({ x: player.x, y: player.y }, shop.position, NPC_INTERACTION_RANGE)) {
    return { ok: false, code: "not-in-range" };
  }

  if (!hasEnoughItems(player.gameplayState, "coin", shopItem.price)) {
    return { ok: false, code: "insufficient-coins" };
  }

  if (shopItem.kind === "cosmetic") {
    const slot = shopItem.cosmeticSlot;

    if (!slot || !unlockCosmetic(player.gameplayState.cosmetics, slot, shopItem.itemId)) {
      return {
        ok: false,
        code: hasOwnedCosmeticForPurchase(player.gameplayState, slot, shopItem.itemId) ? "already-owned" : "invalid-item",
      };
    }

    removeItem(player.gameplayState, "coin", shopItem.price);
    return {
      ok: true,
      code: "ok",
      itemId: shopItem.itemId,
      amount: 1,
      price: shopItem.price,
      label: shopItem.label,
      kind: "cosmetic",
      cosmeticSlot: slot,
    };
  }

  removeItem(player.gameplayState, "coin", shopItem.price);
  addItem(player.gameplayState, shopItem.itemId, shopItem.amount);

  return {
    ok: true,
    code: "ok",
    itemId: shopItem.itemId,
    amount: shopItem.amount,
    price: shopItem.price,
    label: shopItem.label,
    kind: "inventory",
    cosmeticSlot: shopItem.cosmeticSlot ?? null,
  };
}

export function sellShopItemForPlayer(player: PlayerConnection, shopId: string, itemId: string, quantity: number): SellResult {
  const shop = getShopById(shopId);
  const itemDefinition = getItemDefinition(itemId);
  const requestedQuantity = Math.max(1, Number(quantity ?? 1));

  if (!shop || !itemDefinition) {
    return { ok: false, code: "invalid-item" };
  }

  if (player.roomId !== shop.roomId || !isWithinRange({ x: player.x, y: player.y }, shop.position, NPC_INTERACTION_RANGE)) {
    return { ok: false, code: "not-in-range" };
  }

  if (!itemDefinition.sellable || itemDefinition.sellPrice <= 0) {
    return { ok: false, code: "not-sellable" };
  }

  if (!hasEnoughItems(player.gameplayState, itemId, requestedQuantity)) {
    return { ok: false, code: "insufficient-quantity" };
  }

  removeItem(player.gameplayState, itemId, requestedQuantity);
  addItem(player.gameplayState, "coin", itemDefinition.sellPrice * requestedQuantity);
  addBuybackEntry(player, itemId, itemDefinition.label, requestedQuantity, itemDefinition.sellPrice);

  return {
    ok: true,
    code: "ok",
    itemId,
    amount: requestedQuantity,
    price: itemDefinition.sellPrice * requestedQuantity,
    label: itemDefinition.label,
  };
}

export function buybackShopItemForPlayer(player: PlayerConnection, shopId: string, buybackEntryId: string): BuybackResult {
  const shop = getShopById(shopId);
  const buybackEntry = player.shopSessionState.buybackItems.find((entry) => entry.id === buybackEntryId) ?? null;

  if (!shop || !buybackEntry) {
    return { ok: false, code: "invalid-item" };
  }

  if (player.roomId !== shop.roomId || !isWithinRange({ x: player.x, y: player.y }, shop.position, NPC_INTERACTION_RANGE)) {
    return { ok: false, code: "not-in-range" };
  }

  const totalPrice = buybackEntry.unitPrice * buybackEntry.quantity;

  if (!hasEnoughItems(player.gameplayState, "coin", totalPrice)) {
    return { ok: false, code: "insufficient-coins" };
  }

  removeItem(player.gameplayState, "coin", totalPrice);
  addItem(player.gameplayState, buybackEntry.itemId, buybackEntry.quantity);
  player.shopSessionState.buybackItems = player.shopSessionState.buybackItems.filter((entry) => entry.id !== buybackEntryId);

  return {
    ok: true,
    code: "ok",
    buybackEntryId,
    itemId: buybackEntry.itemId,
    amount: buybackEntry.quantity,
    price: totalPrice,
    label: buybackEntry.label,
  };
}

export function craftRecipeForPlayer(player: PlayerConnection, recipeId: string): import("../types.ts").CraftResult {
  const recipe = getCraftingRecipe(recipeId);
  const recipeItemsAreValid = recipe
    ? [...recipe.requirements, ...recipe.outputs].every((entry) => Boolean(getItemDefinition(entry.itemId)))
    : false;

  if (!recipe || !recipe.requirements.length || !recipe.outputs.length || !recipeItemsAreValid) {
    return { ok: false, code: "invalid-recipe" };
  }

  if (!hasEnoughItems(player.gameplayState, "coin", recipe.coinCost)) {
    return { ok: false, code: "insufficient-coins" };
  }

  if (!recipe.requirements.every((entry) => hasEnoughItems(player.gameplayState, entry.itemId, entry.amount))) {
    return { ok: false, code: "insufficient-items" };
  }

  recipe.requirements.forEach((entry) => {
    removeItem(player.gameplayState, entry.itemId, entry.amount);
  });
  removeItem(player.gameplayState, "coin", recipe.coinCost);
  recipe.outputs.forEach((entry) => {
    addItem(player.gameplayState, entry.itemId, entry.amount);
  });

  return {
    ok: true,
    code: "ok",
    recipeId: recipe.id,
    title: recipe.title,
    coinCost: recipe.coinCost,
    outputs: recipe.outputs.map((entry) => {
      const itemDefinition = getItemDefinition(entry.itemId);
      return {
        kind: "inventory",
        itemId: entry.itemId,
        label: itemDefinition?.label ?? entry.itemId,
        amount: entry.amount,
        rarity: itemDefinition?.rarity ?? "common",
      };
    }),
  };
}

function hasOwnedCosmeticForPurchase(gameplayState: GameplayState, slot: CosmeticSlot | null | undefined, cosmeticId: string): boolean {
  return Boolean(slot && gameplayState.cosmetics.owned[slot]?.includes(cosmeticId));
}

export function equipCosmeticForPlayer(player: PlayerConnection, slot: CosmeticSlot, cosmeticId: string): boolean {
  const updated = equipCosmetic(player.gameplayState.cosmetics, slot, cosmeticId);

  if (!updated) {
    return false;
  }

  player.appearance = normalizeAppearance(player.gameplayState.cosmetics.equipped);
  return true;
}

export function recordChatMessageForPlayer(player: PlayerConnection): UnlockNotification[] {
  const unlocked = recordAchievementMetric(player.gameplayState, "chatMessagesSent", 1);
  unlocked.push(...synchronizeBadgesFromAchievements(player.gameplayState));
  return unlocked;
}

export function equipBadgeForPlayer(player: PlayerConnection, badgeId: string | null): boolean {
  return equipBadge(player.gameplayState, badgeId);
}

export function recordNpcTalkForPlayer(player: PlayerConnection, npcId: string): UnlockNotification[] {
  return [
    ...processQuestNpcTalk(player.gameplayState, npcId),
    ...recordNpcTalkForDailyQuests(player.gameplayState, player.profileKey, npcId),
    ...recordNpcTalkForWeeklyTasks(player.gameplayState, player.profileKey, npcId),
  ];
}

export function recordRoomVisitForPlayer(player: PlayerConnection, roomId: string): UnlockNotification[] {
  const normalizedRoomId = getRoomBaseId(roomId);
  return [
    ...recordRoomVisitForDailyQuests(player.gameplayState, player.profileKey, normalizedRoomId),
    ...recordRoomVisitForWeeklyTasks(player.gameplayState, player.profileKey, normalizedRoomId),
  ];
}
