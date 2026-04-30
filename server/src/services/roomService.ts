import { CHEST_INTERACTION_RANGE, NPC_INTERACTION_RANGE, PICKUP_RANGE, ROOMS } from "../config/gameplayData.ts";
import type { Position, RoomDefinition } from "../types.ts";

export const PERSONAL_HOME_BASE_ROOM_ID = "home";

function isWithinRange(pointA: Position | null | undefined, pointB: Position | null | undefined, range: number): boolean {
  if (!pointA || !pointB) {
    return false;
  }

  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y) <= range;
}

export function createPersonalHomeRoomId(ownerProfileId: string): string {
  return `${PERSONAL_HOME_BASE_ROOM_ID}:${ownerProfileId}`;
}

export function isPersonalHomeRoomId(roomId: string): boolean {
  return String(roomId ?? "").startsWith(`${PERSONAL_HOME_BASE_ROOM_ID}:`);
}

export function getRoomBaseId(roomId: string): string {
  return isPersonalHomeRoomId(roomId) ? PERSONAL_HOME_BASE_ROOM_ID : roomId;
}

export function getHomeOwnerProfileId(roomId: string): string | null {
  if (!isPersonalHomeRoomId(roomId)) {
    return null;
  }

  const [, ownerProfileId] = roomId.split(":");
  return ownerProfileId ? String(ownerProfileId) : null;
}

export function resolvePortalTargetRoomId(targetRoomId: string, ownerProfileId: string): string {
  if (targetRoomId === PERSONAL_HOME_BASE_ROOM_ID) {
    return createPersonalHomeRoomId(ownerProfileId);
  }

  return targetRoomId;
}

export function getRoom(roomId: string, ownerName?: string | null): RoomDefinition {
  const baseRoomId = getRoomBaseId(roomId);
  const baseRoom = ROOMS[baseRoomId] ?? ROOMS.town;

  if (baseRoomId !== PERSONAL_HOME_BASE_ROOM_ID || !isPersonalHomeRoomId(roomId)) {
    return {
      ...baseRoom,
      baseRoomId: baseRoom.id,
    };
  }

  const ownerProfileId = getHomeOwnerProfileId(roomId);
  const safeOwnerName = String(ownerName ?? "Traveler").trim() || "Traveler";
  return {
    ...baseRoom,
    id: roomId,
    baseRoomId,
    ownerProfileId,
    ownerName: safeOwnerName,
    isPersonalHome: true,
    name: `${safeOwnerName}'s Home`,
  };
}

export function getSpawnPosition(roomId: string): Position {
  return getRoom(roomId).spawn;
}

export function canUsePortal(roomId: string, playerPosition: Position, targetRoomId: string): boolean {
  const room = getRoom(getRoomBaseId(roomId));
  const portal = room.portals.find((entry) => entry.targetRoomId === targetRoomId);

  if (!portal) {
    return false;
  }

  return isWithinRange(playerPosition, portal.position, Math.max(PICKUP_RANGE, NPC_INTERACTION_RANGE, CHEST_INTERACTION_RANGE));
}
