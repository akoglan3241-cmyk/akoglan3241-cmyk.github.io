import { NPC_INTERACTION_RANGE } from "../config/gameplayData.ts";
import { NPCS } from "../config/npcData.ts";
import type { Position } from "../types.ts";

export function canTalkToNpc(roomId: string, npcId: string, playerPosition: Position): boolean {
  const npc = NPCS[npcId];

  if (!npc || npc.roomId !== roomId) {
    return false;
  }

  return Math.hypot(playerPosition.x - npc.position.x, playerPosition.y - npc.position.y) <= NPC_INTERACTION_RANGE;
}
