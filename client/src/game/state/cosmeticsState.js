import { AVATAR_CATEGORIES, DEFAULT_APPEARANCE, getAppearanceLabel, normalizeAppearance } from "../avatar/avatarOptions.js";

export const COSMETIC_SLOTS = AVATAR_CATEGORIES.map((category) => category.key);

export function getDefaultCosmeticsState() {
  return {
    equipped: normalizeAppearance(DEFAULT_APPEARANCE),
    owned: {
      hair: [DEFAULT_APPEARANCE.hair],
      top: [DEFAULT_APPEARANCE.top],
      bottom: [DEFAULT_APPEARANCE.bottom],
      accessory: [DEFAULT_APPEARANCE.accessory],
    },
  };
}

export function normalizeCosmeticsState(rawState) {
  const equipped = normalizeAppearance(rawState?.equipped ?? DEFAULT_APPEARANCE);
  const defaults = getDefaultCosmeticsState().owned;

  const owned = COSMETIC_SLOTS.reduce((result, slot) => {
    const allowed = AVATAR_CATEGORIES.find((category) => category.key === slot)?.options?.map((entry) => entry.id) ?? [];
    const requested = Array.isArray(rawState?.owned?.[slot]) ? rawState.owned[slot] : [];
    result[slot] = Array.from(new Set([defaults[slot][0], equipped[slot], ...requested])).filter((entry) => allowed.includes(entry));
    return result;
  }, {});

  return {
    equipped,
    owned,
  };
}

export function isCosmeticOwned(cosmeticsState, slot, cosmeticId) {
  return normalizeCosmeticsState(cosmeticsState).owned[slot]?.includes(cosmeticId) ?? false;
}

export function isCosmeticEquipped(cosmeticsState, slot, cosmeticId) {
  return normalizeCosmeticsState(cosmeticsState).equipped[slot] === cosmeticId;
}

export function getOwnedCosmeticOptions(cosmeticsState, slot) {
  const normalized = normalizeCosmeticsState(cosmeticsState);
  const category = AVATAR_CATEGORIES.find((entry) => entry.key === slot);
  return (category?.options ?? []).filter((option) => normalized.owned[slot]?.includes(option.id));
}

export function getNextOwnedCosmeticId(cosmeticsState, slot, direction = 1) {
  const options = getOwnedCosmeticOptions(cosmeticsState, slot);

  if (!options.length) {
    return null;
  }

  const currentId = normalizeCosmeticsState(cosmeticsState).equipped[slot];
  const currentIndex = Math.max(0, options.findIndex((entry) => entry.id === currentId));
  const nextIndex = (currentIndex + direction + options.length) % options.length;
  return options[nextIndex]?.id ?? currentId;
}

export function getCosmeticDisplayState(cosmeticsState, slot, cosmeticId) {
  if (isCosmeticEquipped(cosmeticsState, slot, cosmeticId)) {
    return "equipped";
  }

  if (isCosmeticOwned(cosmeticsState, slot, cosmeticId)) {
    return "owned";
  }

  return "unowned";
}

export function getCosmeticLabel(slot, cosmeticId) {
  return getAppearanceLabel(slot, cosmeticId);
}
