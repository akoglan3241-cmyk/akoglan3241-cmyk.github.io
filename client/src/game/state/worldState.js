export function getDefaultWorldState() {
  return {
    collectedPickupIds: [],
    openedChestIds: [],
  };
}

export function normalizeWorldState(rawState) {
  return {
    collectedPickupIds: Array.isArray(rawState?.collectedPickupIds) ? rawState.collectedPickupIds : [],
    openedChestIds: Array.isArray(rawState?.openedChestIds) ? rawState.openedChestIds : [],
  };
}

export function isPickupCollected(worldState, pickupId) {
  return worldState.collectedPickupIds.includes(pickupId);
}

export function isChestOpened(worldState, chestId) {
  return worldState.openedChestIds.includes(chestId);
}
