import type { Position } from "../types.ts";

function tileToWorld(tileX: number, tileY: number): Position {
  return {
    x: tileX * 48 + 24,
    y: tileY * 48 + 24,
  };
}

export const NPCS: Record<string, { id: string; roomId: string; position: Position }> = {
  mira: { id: "mira", roomId: "town", position: tileToWorld(8, 12) },
  toren: { id: "toren", roomId: "town", position: tileToWorld(14, 8) },
  selin: { id: "selin", roomId: "town", position: tileToWorld(23, 14) },
  duru: { id: "duru", roomId: "town", position: tileToWorld(17, 12) },
  baris: { id: "baris", roomId: "cafe", position: tileToWorld(10, 8) },
  nana: { id: "nana", roomId: "home", position: tileToWorld(9, 8) },
  lina: { id: "lina", roomId: "beach", position: tileToWorld(15, 9) },
  mert: { id: "mert", roomId: "beach", position: tileToWorld(10, 11) },
};
