import { NPC } from "../entities/NPC.js";
import { tileToWorld } from "./roomUtils.js";

export function createRoomNpcs(scene, room) {
  return room.npcs.map((npcData) => {
    const position = tileToWorld(npcData.x, npcData.y);

    return new NPC(scene, {
      ...npcData,
      x: position.x,
      y: position.y,
    });
  });
}
