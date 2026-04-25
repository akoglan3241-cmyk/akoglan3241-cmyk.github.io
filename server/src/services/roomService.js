import { CHEST_INTERACTION_RANGE, NPC_INTERACTION_RANGE, PICKUP_RANGE, ROOMS } from "../config/gameplayData.js";

function isWithinRange(pointA, pointB, range) {
  if (!pointA || !pointB) {
    return false;
  }

  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y) <= range;
}

export function getRoom(roomId) {
  return ROOMS[roomId] ?? ROOMS.town;
}

export function getSpawnPosition(roomId) {
  return getRoom(roomId).spawn;
}

export function canUsePortal(roomId, playerPosition, targetRoomId) {
  const room = getRoom(roomId);
  const portal = room.portals.find((entry) => entry.targetRoomId === targetRoomId);

  if (!portal) {
    return false;
  }

  return isWithinRange(playerPosition, portal.position, Math.max(PICKUP_RANGE, NPC_INTERACTION_RANGE, CHEST_INTERACTION_RANGE));
}
