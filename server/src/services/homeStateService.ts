import type { HomeState } from "../types.ts";

function createDefaultPlacedFurniture() {
  return [];
}

export function createHomeState(ownerProfileId: string, rawState?: Partial<HomeState> | null): HomeState {
  return {
    ownerProfileId: String(rawState?.ownerProfileId ?? ownerProfileId),
    access: {
      isPublic: Boolean(rawState?.access?.isPublic ?? false),
    },
    placedFurniture: Array.isArray(rawState?.placedFurniture)
      ? rawState.placedFurniture
          .filter((entry) => entry && entry.id && entry.itemId)
          .map((entry) => ({
            id: String(entry.id),
            itemId: String(entry.itemId),
            x: Number(entry.x ?? 0),
            y: Number(entry.y ?? 0),
            rotation: Number(entry.rotation ?? 0),
            width: Math.max(1, Number(entry.width ?? 1)),
            height: Math.max(1, Number(entry.height ?? 1)),
            interactionState: {
              isOn: Boolean(entry.interactionState?.isOn ?? false),
            },
          }))
      : createDefaultPlacedFurniture(),
    layoutVersion: Number(rawState?.layoutVersion ?? 1),
    lastUpdatedAt: Number(rawState?.lastUpdatedAt ?? Date.now()),
  };
}
