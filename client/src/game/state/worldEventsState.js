export function normalizeWorldEventsState(rawEvents) {
  return Array.isArray(rawEvents)
    ? rawEvents
        .map((entry) => ({
          instanceId: String(entry?.instanceId ?? ""),
          definitionId: String(entry?.definitionId ?? ""),
          roomId: String(entry?.roomId ?? "town"),
          type: String(entry?.type ?? "rare-collectible"),
          title: String(entry?.title ?? ""),
          announcement: String(entry?.announcement ?? ""),
          startedAt: Number(entry?.startedAt ?? 0),
          expiresAt: Number(entry?.expiresAt ?? 0),
          pickup: entry?.pickup
            ? {
                id: String(entry.pickup.id ?? ""),
                itemId: String(entry.pickup.itemId ?? ""),
                amount: Number(entry.pickup.amount ?? 1),
                label: String(entry.pickup.label ?? entry.pickup.itemId ?? ""),
                texture: String(entry.pickup.texture ?? "pickupGiftBox"),
                tileX: Number(entry.pickup.tileX ?? 0),
                tileY: Number(entry.pickup.tileY ?? 0),
              }
            : null,
          chest: entry?.chest
            ? {
                id: String(entry.chest.id ?? ""),
                label: String(entry.chest.label ?? "Event Chest"),
                tileX: Number(entry.chest.tileX ?? 0),
                tileY: Number(entry.chest.tileY ?? 0),
              }
            : null,
          festival: entry?.festival
            ? {
                label: String(entry.festival.label ?? ""),
                tileX: Number(entry.festival.tileX ?? 0),
                tileY: Number(entry.festival.tileY ?? 0),
              }
            : null,
        }))
        .filter((entry) => entry.instanceId)
    : [];
}

export function getRoomWorldEvents(worldEvents, roomId) {
  return normalizeWorldEventsState(worldEvents).filter((entry) => entry.roomId === roomId);
}
