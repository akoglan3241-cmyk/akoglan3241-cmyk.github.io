import { addItem, hasEnoughItems, removeItem } from "./inventoryService.ts";
import { createHomeState } from "./homeStateService.ts";
import { getItemDefinition } from "./itemContentService.ts";
import { getHomeOwnerProfileId, isPersonalHomeRoomId } from "./roomService.ts";
import type { FurniturePlacement, PlayerConnection } from "../types.ts";

const HOME_GRID_BOUNDS = {
  minX: 1,
  minY: 2,
  maxX: 16,
  maxY: 10,
};

function clonePlacement(entry: FurniturePlacement): FurniturePlacement {
  return {
    id: entry.id,
    itemId: entry.itemId,
    x: entry.x,
    y: entry.y,
    rotation: entry.rotation,
    width: entry.width,
    height: entry.height,
    interactionState: {
      isOn: Boolean(entry.interactionState?.isOn ?? false),
    },
  };
}

function normalizeRotation(rotation: number): number {
  const normalized = Number(rotation ?? 0) % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function isRotated(rotation: number): boolean {
  return normalizeRotation(rotation) % 180 !== 0;
}

function getFurnitureFootprint(itemId: string, rotation: number): { width: number; height: number } | null {
  const item = getItemDefinition(itemId);

  if (!item?.placeable || !item.furniture) {
    return null;
  }

  const base = {
    width: Math.max(1, item.furniture.width),
    height: Math.max(1, item.furniture.height),
  };

  return isRotated(rotation)
    ? {
        width: base.height,
        height: base.width,
      }
    : base;
}

function isWithinBounds(x: number, y: number, width: number, height: number): boolean {
  return (
    x >= HOME_GRID_BOUNDS.minX &&
    y >= HOME_GRID_BOUNDS.minY &&
    x + width - 1 <= HOME_GRID_BOUNDS.maxX &&
    y + height - 1 <= HOME_GRID_BOUNDS.maxY
  );
}

function overlaps(a: FurniturePlacement, b: FurniturePlacement): boolean {
  const aWidth = Math.max(1, Number(a.width ?? 1));
  const aHeight = Math.max(1, Number(a.height ?? 1));
  const bWidth = Math.max(1, Number(b.width ?? 1));
  const bHeight = Math.max(1, Number(b.height ?? 1));

  return !(
    a.x + aWidth - 1 < b.x ||
    b.x + bWidth - 1 < a.x ||
    a.y + aHeight - 1 < b.y ||
    b.y + bHeight - 1 < a.y
  );
}

function canEditHome(player: PlayerConnection): boolean {
  return isPersonalHomeRoomId(player.roomId) && getHomeOwnerProfileId(player.roomId) === player.auth.subjectId;
}

function upsertHomeState(player: PlayerConnection): void {
  player.homeState = createHomeState(player.auth.subjectId, player.homeState);
}

function createPlacement(itemId: string, x: number, y: number, rotation: number): FurniturePlacement | null {
  const footprint = getFurnitureFootprint(itemId, rotation);

  if (!footprint) {
    return null;
  }

  return {
    id: `${itemId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    itemId,
    x,
    y,
    rotation: normalizeRotation(rotation),
    width: footprint.width,
    height: footprint.height,
    interactionState: {
      isOn: false,
    },
  };
}

function canPlaceAgainstExisting(placedFurniture: FurniturePlacement[], candidate: FurniturePlacement, ignoreId?: string): boolean {
  return placedFurniture
    .filter((entry) => entry.id !== ignoreId)
    .every((entry) => !overlaps(entry, candidate));
}

export function getRoomHomeLayout(player: PlayerConnection): FurniturePlacement[] {
  upsertHomeState(player);
  return player.homeState.placedFurniture.map(clonePlacement);
}

export function placeFurnitureForPlayer(player: PlayerConnection, itemId: string, x: number, y: number, rotation = 0) {
  upsertHomeState(player);

  if (!canEditHome(player)) {
    return { ok: false, code: "forbidden" as const };
  }

  const item = getItemDefinition(itemId);
  const candidate = createPlacement(itemId, Number(x), Number(y), Number(rotation));

  if (!item || !item.placeable || !candidate) {
    return { ok: false, code: "invalid-item" as const };
  }

  if (!hasEnoughItems(player.gameplayState, itemId, 1)) {
    return { ok: false, code: "missing-item" as const };
  }

  if (!isWithinBounds(candidate.x, candidate.y, Number(candidate.width ?? 1), Number(candidate.height ?? 1))) {
    return { ok: false, code: "invalid-position" as const };
  }

  if (!canPlaceAgainstExisting(player.homeState.placedFurniture, candidate)) {
    return { ok: false, code: "occupied" as const };
  }

  removeItem(player.gameplayState, itemId, 1);
  player.homeState.placedFurniture = [...player.homeState.placedFurniture, candidate];
  player.homeState.lastUpdatedAt = Date.now();
  return { ok: true, placement: clonePlacement(candidate) };
}

export function moveFurnitureForPlayer(player: PlayerConnection, placementId: string, x: number, y: number) {
  upsertHomeState(player);

  if (!canEditHome(player)) {
    return { ok: false, code: "forbidden" as const };
  }

  const existing = player.homeState.placedFurniture.find((entry) => entry.id === placementId);

  if (!existing) {
    return { ok: false, code: "missing-placement" as const };
  }

  const candidate = {
    ...clonePlacement(existing),
    x: Number(x),
    y: Number(y),
  };

  if (!isWithinBounds(candidate.x, candidate.y, Number(candidate.width ?? 1), Number(candidate.height ?? 1))) {
    return { ok: false, code: "invalid-position" as const };
  }

  if (!canPlaceAgainstExisting(player.homeState.placedFurniture, candidate, placementId)) {
    return { ok: false, code: "occupied" as const };
  }

  player.homeState.placedFurniture = player.homeState.placedFurniture.map((entry) => (entry.id === placementId ? candidate : entry));
  player.homeState.lastUpdatedAt = Date.now();
  return { ok: true, placement: candidate };
}

export function rotateFurnitureForPlayer(player: PlayerConnection, placementId: string) {
  upsertHomeState(player);

  if (!canEditHome(player)) {
    return { ok: false, code: "forbidden" as const };
  }

  const existing = player.homeState.placedFurniture.find((entry) => entry.id === placementId);

  if (!existing) {
    return { ok: false, code: "missing-placement" as const };
  }

  const nextRotation = normalizeRotation(Number(existing.rotation ?? 0) + 90);
  const footprint = getFurnitureFootprint(existing.itemId, nextRotation);

  if (!footprint) {
    return { ok: false, code: "invalid-item" as const };
  }

  const candidate = {
    ...clonePlacement(existing),
    rotation: nextRotation,
    width: footprint.width,
    height: footprint.height,
  };

  if (!isWithinBounds(candidate.x, candidate.y, footprint.width, footprint.height)) {
    return { ok: false, code: "invalid-position" as const };
  }

  if (!canPlaceAgainstExisting(player.homeState.placedFurniture, candidate, placementId)) {
    return { ok: false, code: "occupied" as const };
  }

  player.homeState.placedFurniture = player.homeState.placedFurniture.map((entry) => (entry.id === placementId ? candidate : entry));
  player.homeState.lastUpdatedAt = Date.now();
  return { ok: true, placement: candidate };
}

export function removeFurnitureForPlayer(player: PlayerConnection, placementId: string) {
  upsertHomeState(player);

  if (!canEditHome(player)) {
    return { ok: false, code: "forbidden" as const };
  }

  const existing = player.homeState.placedFurniture.find((entry) => entry.id === placementId);

  if (!existing) {
    return { ok: false, code: "missing-placement" as const };
  }

  player.homeState.placedFurniture = player.homeState.placedFurniture.filter((entry) => entry.id !== placementId);
  player.homeState.lastUpdatedAt = Date.now();
  addItem(player.gameplayState, existing.itemId, 1);
  return { ok: true, placementId, itemId: existing.itemId };
}

function getPlacement(player: PlayerConnection, placementId: string): FurniturePlacement | null {
  upsertHomeState(player);
  return player.homeState.placedFurniture.find((entry) => entry.id === placementId) ?? null;
}

function getFurnitureBehaviorType(itemId: string): "chair" | "lamp" | "decor" | null {
  const item = getItemDefinition(itemId);
  const category = String(item?.category ?? "");

  if (category === "chair") {
    return "chair";
  }

  if (category === "lamp") {
    return "lamp";
  }

  if (["table", "plant", "decoration"].includes(category)) {
    return "decor";
  }

  return null;
}

function toWorldPosition(x: number, y: number) {
  return {
    x: x * 48 + 24,
    y: y * 48 + 24,
  };
}

export function getFurnitureBehavior(itemId: string): "chair" | "lamp" | "decor" | null {
  return getFurnitureBehaviorType(itemId);
}

export function interactWithFurnitureForPlayer(
  player: PlayerConnection,
  placementId: string,
  allPlayers: PlayerConnection[],
): { ok: boolean; code: "ok" | "forbidden" | "missing-placement" | "blocked"; behavior?: "chair" | "lamp" | "decor"; action?: "sit" | "stand" | "toggle" | "inspect"; placement?: FurniturePlacement } {
  const placement = getPlacement(player, placementId);

  if (!placement || !isPersonalHomeRoomId(player.roomId)) {
    return { ok: false, code: "missing-placement" };
  }

  const behavior = getFurnitureBehaviorType(placement.itemId);

  if (!behavior) {
    return { ok: false, code: "blocked" };
  }

  if (behavior === "chair") {
    const occupant = allPlayers.find((entry) => entry.roomId === player.roomId && entry.seatedFurnitureId === placementId);

    if (occupant && occupant.id !== player.id) {
      return { ok: false, code: "blocked", behavior };
    }

    if (player.seatedFurnitureId === placementId) {
      player.seatedFurnitureId = null;
      return { ok: true, code: "ok", behavior, action: "stand", placement: clonePlacement(placement) };
    }

    const worldPosition = toWorldPosition(placement.x, placement.y);
    player.x = worldPosition.x;
    player.y = worldPosition.y + 8;
    player.seatedFurnitureId = placementId;
    return { ok: true, code: "ok", behavior, action: "sit", placement: clonePlacement(placement) };
  }

  if (behavior === "lamp") {
    if (!canEditHome(player)) {
      return { ok: false, code: "forbidden", behavior };
    }

    placement.interactionState = {
      isOn: !Boolean(placement.interactionState?.isOn),
    };
    player.homeState.lastUpdatedAt = Date.now();
    return { ok: true, code: "ok", behavior, action: "toggle", placement: clonePlacement(placement) };
  }

  return { ok: true, code: "ok", behavior, action: "inspect", placement: clonePlacement(placement) };
}
