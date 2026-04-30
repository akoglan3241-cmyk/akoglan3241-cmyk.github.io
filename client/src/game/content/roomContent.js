import rawRoomDefinitions from "./rooms/core-rooms.json";
import { normalizeRoomDefinition, reportContentValidationWarnings, validateRoomsCollection } from "./tooling/contentValidation.js";

function parseColor(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized.startsWith("0x")) {
      const parsed = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(parsed) ? parsed : fallback;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

const roomValidationErrors = validateRoomsCollection(rawRoomDefinitions, "core-rooms.json");
reportContentValidationWarnings("rooms", "core-rooms.json", roomValidationErrors);

export const ROOM_CONTENT_DEFINITIONS = Object.fromEntries(
  Object.entries(rawRoomDefinitions).map(([roomId, rawRoom]) => [
    roomId,
    {
      ...normalizeRoomDefinition(roomId, rawRoom),
      npcs: Array.isArray(rawRoom?.npcs)
        ? rawRoom.npcs.map((npc) => ({
            ...npc,
            tint: parseColor(npc?.tint, 0xffffff),
          }))
        : [],
      ambiance: {
        skyColor: parseColor(rawRoom?.ambiance?.skyColor, 0x8cd4ff),
        glowColor: parseColor(rawRoom?.ambiance?.glowColor, 0xffd98a),
        bandColor: parseColor(rawRoom?.ambiance?.bandColor, 0x214f2e),
        dayNight: {
          enabled: Boolean(rawRoom?.ambiance?.dayNight?.enabled),
          cycleDurationMs: Number(rawRoom?.ambiance?.dayNight?.cycleDurationMs ?? 180000),
        },
        weather: {
          enabled: Boolean(rawRoom?.ambiance?.weather?.enabled),
        },
      },
    },
  ]),
);
