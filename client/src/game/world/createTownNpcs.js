import { NPC } from "../entities/NPC.js";
import { TILE_SIZE } from "../constants.js";
import { TOWN_LAYOUT } from "./townData.js";

function tileToWorld(tileX, tileY) {
  return {
    x: tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tileY * TILE_SIZE + TILE_SIZE / 2,
  };
}

export function createTownNpcs(scene) {
  return TOWN_LAYOUT.npcs.map((npcData) => {
    const position = tileToWorld(npcData.x, npcData.y);

    return new NPC(scene, {
      ...npcData,
      x: position.x,
      y: position.y,
    });
  });
}
