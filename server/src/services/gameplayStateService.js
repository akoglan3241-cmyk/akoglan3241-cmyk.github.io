import {
  CHESTS,
  CHEST_INTERACTION_RANGE,
  DEFAULT_INVENTORY_ITEMS,
  NPC_INTERACTION_RANGE,
  PICKUPS,
  PICKUP_RANGE,
  QUEST_TARGET_RANGE,
} from "../config/gameplayData.js";
import { getQuestDefinition } from "./questContentService.js";
import { getShopById, getShopItem } from "./shopContentService.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeActiveQuest(rawActiveQuest) {
  if (!rawActiveQuest) {
    return null;
  }

  if (rawActiveQuest.objective && rawActiveQuest.rewards) {
    return {
      ...rawActiveQuest,
      objective: clone(rawActiveQuest.objective),
      rewards: clone(rawActiveQuest.rewards),
      prerequisites: Array.isArray(rawActiveQuest.prerequisites) ? [...rawActiveQuest.prerequisites] : [],
    };
  }

  const questDefinition = getQuestDefinition(rawActiveQuest.id);
  return questDefinition ? buildActiveQuest(questDefinition) : null;
}

function isWithinRange(pointA, pointB, range) {
  if (!pointA || !pointB) {
    return false;
  }

  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y) <= range;
}

export function createGameplayState(rawState = {}) {
  return {
    inventory: {
      items: {
        ...DEFAULT_INVENTORY_ITEMS,
        ...rawState?.inventory?.items,
      },
    },
    quest: {
      activeQuest: normalizeActiveQuest(rawState?.quest?.activeQuest),
      completedQuestIds: Array.isArray(rawState?.quest?.completedQuestIds) ? rawState.quest.completedQuestIds : [],
    },
    world: {
      openedChestIds: Array.isArray(rawState?.world?.openedChestIds) ? rawState.world.openedChestIds : [],
      collectedPickupIds: Array.isArray(rawState?.world?.collectedPickupIds) ? rawState.world.collectedPickupIds : [],
    },
  };
}

export function getGameplaySnapshot(gameplayState) {
  return clone(gameplayState);
}

function getItemCount(gameplayState, itemId) {
  return Number(gameplayState.inventory.items[itemId] ?? 0);
}

function addItem(gameplayState, itemId, amount) {
  gameplayState.inventory.items[itemId] = Math.max(0, getItemCount(gameplayState, itemId) + amount);
}

function removeItem(gameplayState, itemId, amount) {
  gameplayState.inventory.items[itemId] = Math.max(0, getItemCount(gameplayState, itemId) - amount);
}

function hasEnoughItems(gameplayState, itemId, amount) {
  return getItemCount(gameplayState, itemId) >= amount;
}

function hasCompletedQuest(gameplayState, questId) {
  return gameplayState.quest.completedQuestIds.includes(questId);
}

function areQuestPrerequisitesMet(gameplayState, prerequisiteIds = []) {
  return prerequisiteIds.every((questId) => hasCompletedQuest(gameplayState, questId));
}

function buildActiveQuest(questDefinition) {
  return {
    id: questDefinition.id,
    questLineId: questDefinition.questLineId,
    npcId: questDefinition.npcId,
    roomId: questDefinition.roomId,
    title: questDefinition.title,
    description: questDefinition.description,
    type: questDefinition.type,
    objective: clone(questDefinition.objective),
    rewards: clone(questDefinition.rewards),
    prerequisites: clone(questDefinition.prerequisites ?? []),
    status: "active",
  };
}

function isQuestComplete(gameplayState, roomId, playerPosition) {
  const activeQuest = gameplayState.quest.activeQuest;

  if (!activeQuest) {
    return false;
  }

  if (activeQuest.objective?.type === "collect-item") {
    return hasEnoughItems(gameplayState, activeQuest.objective.itemId, activeQuest.objective.targetAmount);
  }

  if (activeQuest.objective?.type === "open-chest") {
    return gameplayState.world.openedChestIds.includes(activeQuest.objective.chestId);
  }

  if (
    activeQuest.objective?.type !== "go-to-location" ||
    !activeQuest.objective.position ||
    !playerPosition ||
    (activeQuest.objective.roomId && activeQuest.objective.roomId !== roomId)
  ) {
    return false;
  }

  const distance = Math.hypot(
    playerPosition.x - activeQuest.objective.position.x,
    playerPosition.y - activeQuest.objective.position.y,
  );
  return distance <= QUEST_TARGET_RANGE;
}

function completeQuest(gameplayState) {
  const activeQuest = gameplayState.quest.activeQuest;

  if (!activeQuest) {
    return false;
  }

  if (activeQuest.rewards?.coins > 0) {
    addItem(gameplayState, "coin", activeQuest.rewards.coins);
  }

  activeQuest.rewards?.items?.forEach((rewardItem) => {
    addItem(gameplayState, rewardItem.itemId, rewardItem.amount);
  });

  gameplayState.quest.completedQuestIds = [...gameplayState.quest.completedQuestIds, activeQuest.id];
  gameplayState.quest.activeQuest = null;
  return true;
}

export function startQuest(gameplayState, questId, roomId, playerPosition) {
  const questDefinition = getQuestDefinition(questId);

  if (!questDefinition || gameplayState.quest.activeQuest || hasCompletedQuest(gameplayState, questId)) {
    return false;
  }

  if (!isWithinRange(playerPosition, questDefinition?.giverPosition ?? null, NPC_INTERACTION_RANGE) || roomId !== questDefinition.roomId) {
    return false;
  }

  if (!areQuestPrerequisitesMet(gameplayState, questDefinition.prerequisites)) {
    return false;
  }

  gameplayState.quest.activeQuest = buildActiveQuest(questDefinition);
  return true;
}

export function collectPickup(gameplayState, pickupId, roomId, playerPosition) {
  const pickup = PICKUPS[pickupId];

  if (!pickup || gameplayState.world.collectedPickupIds.includes(pickupId)) {
    return false;
  }

  if (!isWithinRange(playerPosition, pickup.position, PICKUP_RANGE) || pickup.roomId !== roomId) {
    return false;
  }

  gameplayState.world.collectedPickupIds = [...gameplayState.world.collectedPickupIds, pickupId];
  addItem(gameplayState, pickup.itemId, pickup.amount);

  if (isQuestComplete(gameplayState, roomId, playerPosition)) {
    completeQuest(gameplayState);
  }

  return true;
}

export function openChest(gameplayState, chestId, roomId, playerPosition) {
  const chest = CHESTS[chestId];

  if (!chest || gameplayState.world.openedChestIds.includes(chestId)) {
    return false;
  }

  if (!isWithinRange(playerPosition, chest.position, CHEST_INTERACTION_RANGE) || chest.roomId !== roomId) {
    return false;
  }

  const canPay = chest.costs.every((cost) => hasEnoughItems(gameplayState, cost.itemId, cost.amount));

  if (!canPay) {
    return false;
  }

  chest.costs.forEach((cost) => removeItem(gameplayState, cost.itemId, cost.amount));
  chest.rewards.forEach((reward) => addItem(gameplayState, reward.itemId, reward.amount));
  gameplayState.world.openedChestIds = [...gameplayState.world.openedChestIds, chestId];

  if (isQuestComplete(gameplayState, roomId, playerPosition)) {
    completeQuest(gameplayState);
  }

  return true;
}

export function processMovement(gameplayState, roomId, playerPosition) {
  if (!isQuestComplete(gameplayState, roomId, playerPosition)) {
    return false;
  }

  return completeQuest(gameplayState);
}

export function purchaseShopItem(gameplayState, roomId, playerPosition, shopId, shopItemId) {
  const shop = getShopById(shopId);
  const shopItem = getShopItem(shopId, shopItemId);

  if (!shop || !shopItem || shopItem.price < 0 || shopItem.amount <= 0) {
    return { ok: false, code: "invalid-item" };
  }

  if (roomId !== shop.roomId || !isWithinRange(playerPosition, shop.position, NPC_INTERACTION_RANGE)) {
    return { ok: false, code: "not-in-range" };
  }

  if (!hasEnoughItems(gameplayState, "coin", shopItem.price)) {
    return { ok: false, code: "insufficient-coins" };
  }

  removeItem(gameplayState, "coin", shopItem.price);
  addItem(gameplayState, shopItem.itemId, shopItem.amount);

  return {
    ok: true,
    code: "ok",
    itemId: shopItem.itemId,
    amount: shopItem.amount,
    price: shopItem.price,
    label: shopItem.label,
  };
}
