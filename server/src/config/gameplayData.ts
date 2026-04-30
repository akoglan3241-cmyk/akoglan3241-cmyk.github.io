export { CHESTS, PICKUPS, ROOMS } from "./worldContent.ts";

export const SPAWN_POINT = { x: 312, y: 744 };

export const DEFAULT_INVENTORY_ITEMS: Record<string, number> = {
  coin: 0,
  key: 0,
  giftBox: 0,
  coffee: 0,
  specialGift: 0,
  goldenKey: 0,
};

export const QUEST_TARGET_RANGE = 44;
export const NPC_INTERACTION_RANGE = 84;
export const PICKUP_RANGE = 34;
export const CHEST_INTERACTION_RANGE = 52;
