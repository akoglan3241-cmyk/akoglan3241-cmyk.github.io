import { TILE_SIZE } from "../constants.js";
import { TreasureChest } from "../entities/TreasureChest.js";
import { WorldPickup } from "../entities/WorldPickup.js";
import { TOWN_LAYOUT } from "./townData.js";

function tileToWorld(tileX, tileY) {
  return {
    x: tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tileY * TILE_SIZE + TILE_SIZE / 2,
  };
}

export function createTownInteractives(scene) {
  const pickups = TOWN_LAYOUT.pickups.map((pickupData) => {
    const position = tileToWorld(pickupData.x, pickupData.y);
    return new WorldPickup(scene, {
      ...pickupData,
      x: position.x,
      y: position.y,
    });
  });

  const chests = TOWN_LAYOUT.chests.map((chestData) => {
    const position = tileToWorld(chestData.x, chestData.y);
    return new TreasureChest(scene, {
      ...chestData,
      x: position.x,
      y: position.y,
    });
  });

  return { pickups, chests };
}
