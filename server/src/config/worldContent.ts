import rawRoomDefinitions from "../../../client/src/game/content/rooms/core-rooms.json" with { type: "json" };
import type { ChestDefinition, PickupDefinition, RewardItem, RoomDefinition } from "../types.ts";

function tileToWorld(tileX: number, tileY: number) {
  return {
    x: tileX * 48 + 24,
    y: tileY * 48 + 24,
  };
}

function normalizeRewardItems(rawItems: unknown): RewardItem[] {
  return Array.isArray(rawItems)
    ? rawItems.map((item) => ({
        itemId: String((item as { itemId?: unknown })?.itemId ?? ""),
        amount: Number((item as { amount?: unknown })?.amount ?? 0),
      }))
    : [];
}

export const ROOM_CONTENT = rawRoomDefinitions;

export const ROOMS: Record<string, RoomDefinition> = Object.fromEntries(
  Object.entries(rawRoomDefinitions).map(([roomId, rawRoom]) => [
    roomId,
    {
      id: String(rawRoom?.id ?? roomId),
      name: String(rawRoom?.name ?? roomId),
      spawn: tileToWorld(Number(rawRoom?.spawn?.x ?? 1), Number(rawRoom?.spawn?.y ?? 1)),
      portals: Array.isArray(rawRoom?.portals)
        ? rawRoom.portals.map((portal) => ({
            id: String(portal?.id ?? ""),
            position: tileToWorld(Number(portal?.x ?? 0), Number(portal?.y ?? 0)),
            targetRoomId: String(portal?.targetRoomId ?? ""),
          }))
        : [],
    },
  ]),
);

export const PICKUPS: Record<string, PickupDefinition> = Object.fromEntries(
  Object.entries(rawRoomDefinitions).flatMap(([roomId, rawRoom]) =>
    (Array.isArray(rawRoom?.pickups) ? rawRoom.pickups : []).map((pickup) => [
      String(pickup?.id ?? ""),
      {
        id: String(pickup?.id ?? ""),
        itemId: String(pickup?.itemId ?? ""),
        amount: Number(pickup?.amount ?? 0),
        roomId: String(rawRoom?.id ?? roomId),
        position: tileToWorld(Number(pickup?.x ?? 0), Number(pickup?.y ?? 0)),
      },
    ]),
  ),
);

export const CHESTS: Record<string, ChestDefinition> = Object.fromEntries(
  Object.entries(rawRoomDefinitions).flatMap(([roomId, rawRoom]) =>
    (Array.isArray(rawRoom?.chests) ? rawRoom.chests : []).map((chest) => [
      String(chest?.id ?? ""),
      {
        id: String(chest?.id ?? ""),
        roomId: String(rawRoom?.id ?? roomId),
        position: tileToWorld(Number(chest?.x ?? 0), Number(chest?.y ?? 0)),
        costs: normalizeRewardItems(chest?.costs),
        lootTableId: String(chest?.lootTableId ?? ""),
      },
    ]),
  ),
);
