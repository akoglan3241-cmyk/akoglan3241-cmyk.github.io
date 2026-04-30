import { listItemDefinitions } from "../content/itemContent.js";

export const INVENTORY_ITEMS = Object.fromEntries(
  listItemDefinitions().map((item) => [
    item.id,
    {
      id: item.id,
      label: item.label,
      icon: item.icon,
      category: item.category,
      rarity: item.rarity,
      sellable: item.sellable,
      sellPrice: item.sellPrice,
      placeable: item.placeable,
      texture: item.texture,
      furniture: item.furniture,
    },
  ]),
);

export function getDefaultInventoryState() {
  return {
    items: {
      coin: 0,
      key: 0,
      giftBox: 0,
      coffee: 0,
      specialGift: 0,
      goldenKey: 0,
      woodChair: 1,
      smallTable: 1,
      warmLamp: 1,
      pottedPlant: 1,
      wallPoster: 1,
    },
  };
}

export function normalizeInventoryState(rawState) {
  return {
    items: {
      ...getDefaultInventoryState().items,
      ...rawState?.items,
    },
  };
}

export function getItemCount(inventoryState, itemId) {
  return Number(inventoryState?.items?.[itemId] ?? 0);
}

export function hasEnoughItems(inventoryState, itemId, amount = 1) {
  return getItemCount(inventoryState, itemId) >= amount;
}

export function getInventoryEntries(inventoryState) {
  return Object.values(INVENTORY_ITEMS)
    .map((item) => ({
      ...item,
      amount: getItemCount(inventoryState, item.id),
    }))
    .filter((item) => item.amount > 0 || item.id === "coin")
    .sort((left, right) => {
      if (left.amount !== right.amount) {
        return right.amount - left.amount;
      }

      return left.label.localeCompare(right.label, "tr");
    });
}
