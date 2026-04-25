import { ROOM_CONTENT_DEFINITIONS } from "../content/roomContent.js";
import { isSeasonalContentActive } from "../content/seasonalEventContent.js";

function filterSeasonalEntries(entries) {
  return (Array.isArray(entries) ? entries : []).filter((entry) => isSeasonalContentActive(entry?.eventTags));
}

function materializeRoomDefinition(room) {
  return {
    ...room,
    decorations: filterSeasonalEntries(room.decorations),
    labels: filterSeasonalEntries(room.labels),
    npcs: filterSeasonalEntries(room.npcs),
    pickups: filterSeasonalEntries(room.pickups),
    chests: filterSeasonalEntries(room.chests),
    portals: filterSeasonalEntries(room.portals),
  };
}

export const ROOM_DEFINITIONS = Object.fromEntries(
  Object.entries(ROOM_CONTENT_DEFINITIONS).map(([roomId, roomDefinition]) => [roomId, roomDefinition]),
);

export function listRoomDefinitions() {
  return Object.values(ROOM_DEFINITIONS).map(materializeRoomDefinition);
}

export function getRoomDefinition(roomId) {
  return materializeRoomDefinition(ROOM_DEFINITIONS[roomId] ?? ROOM_DEFINITIONS.town);
}

export function findRoomByNpcId(npcId) {
  return listRoomDefinitions().find((room) => room.npcs?.some((npc) => npc.id === npcId)) ?? null;
}

export function findRoomByChestId(chestId) {
  return listRoomDefinitions().find((room) => room.chests?.some((chest) => chest.id === chestId)) ?? null;
}

export function findRoomByPickupItemId(itemId, predicate = null) {
  return (
    listRoomDefinitions().find((room) =>
      room.pickups?.some((pickup) => pickup.itemId === itemId && (typeof predicate === "function" ? predicate(pickup) : true)),
    ) ?? null
  );
}
