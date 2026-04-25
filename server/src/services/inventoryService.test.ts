import test from "node:test";
import assert from "node:assert/strict";
import { addItem, createInventoryState, getItemCount, hasEnoughItems, removeItem } from "./inventoryService.ts";
import { createGameplayState } from "./playerStateService.ts";

test("createInventoryState merges defaults with provided values", () => {
  const inventory = createInventoryState({
    items: {
      coin: 12,
      key: 2,
    },
  });

  assert.equal(inventory.items.coin, 12);
  assert.equal(inventory.items.key, 2);
  assert.equal(inventory.items.giftBox, 0);
});

test("inventory item helpers add, remove and validate quantities safely", () => {
  const gameplayState = createGameplayState();

  addItem(gameplayState, "coin", 10);
  addItem(gameplayState, "giftBox", 2);

  assert.equal(getItemCount(gameplayState, "coin"), 10);
  assert.equal(getItemCount(gameplayState, "giftBox"), 2);
  assert.equal(hasEnoughItems(gameplayState, "giftBox", 2), true);
  assert.equal(hasEnoughItems(gameplayState, "giftBox", 3), false);

  removeItem(gameplayState, "giftBox", 1);
  removeItem(gameplayState, "coin", 99);

  assert.equal(getItemCount(gameplayState, "giftBox"), 1);
  assert.equal(getItemCount(gameplayState, "coin"), 0);
});
