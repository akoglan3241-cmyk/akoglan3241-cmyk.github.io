import test from "node:test";
import assert from "node:assert/strict";
import { addItem, getItemCount } from "./inventoryService.ts";
import { createPlayerConnection, purchaseShopItemForPlayer } from "./playerStateService.ts";

test("purchaseShopItemForPlayer buys inventory items when the player is in range", () => {
  const player = createPlayerConnection("socket-1", "Tester", "user-1", null);
  player.roomId = "cafe";
  player.x = 504;
  player.y = 408;
  addItem(player.gameplayState, "coin", 12);

  const result = purchaseShopItemForPlayer(player, "moon-cafe-counter", "shop-coffee");

  assert.equal(result.ok, true);
  assert.equal(result.itemId, "coffee");
  assert.equal(result.amount, 1);
  assert.equal(getItemCount(player.gameplayState, "coin"), 7);
  assert.equal(getItemCount(player.gameplayState, "coffee"), 1);
});

test("purchaseShopItemForPlayer rejects purchases when the player lacks coins", () => {
  const player = createPlayerConnection("socket-2", "Tester", "user-2", null);
  player.roomId = "cafe";
  player.x = 504;
  player.y = 408;
  addItem(player.gameplayState, "coin", 3);

  const result = purchaseShopItemForPlayer(player, "moon-cafe-counter", "shop-coffee");

  assert.equal(result.ok, false);
  assert.equal(result.code, "insufficient-coins");
  assert.equal(getItemCount(player.gameplayState, "coffee"), 0);
});
