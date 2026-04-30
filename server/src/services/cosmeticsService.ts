import type { Appearance, CosmeticSlot, CosmeticsState } from "../types.ts";
import { AVATAR_CATALOG, DEFAULT_APPEARANCE, normalizeAppearance } from "./avatarService.ts";

export const COSMETIC_SLOTS = Object.keys(AVATAR_CATALOG) as CosmeticSlot[];

function createDefaultOwnedCosmetics(): CosmeticsState["owned"] {
  return {
    hair: [DEFAULT_APPEARANCE.hair],
    top: [DEFAULT_APPEARANCE.top],
    bottom: [DEFAULT_APPEARANCE.bottom],
    accessory: [DEFAULT_APPEARANCE.accessory],
  };
}

export function normalizeOwnedCosmetics(
  rawOwned: Partial<Record<CosmeticSlot, string[]>> = {},
  equipped: Appearance = DEFAULT_APPEARANCE,
): CosmeticsState["owned"] {
  const fallbackOwned = createDefaultOwnedCosmetics();

  return COSMETIC_SLOTS.reduce(
    (owned, slot) => {
      const catalog = AVATAR_CATALOG[slot];
      const requested = Array.isArray(rawOwned?.[slot]) ? rawOwned[slot] : [];
      const filtered = requested.filter((entry, index) => catalog.includes(entry) && requested.indexOf(entry) === index);
      const guaranteed = new Set([fallbackOwned[slot][0], equipped[slot], ...filtered]);
      owned[slot] = catalog.filter((entry) => guaranteed.has(entry));
      return owned;
    },
    {} as CosmeticsState["owned"],
  );
}

export function createCosmeticsState(rawState?: Partial<CosmeticsState>, fallbackAppearance?: Partial<Appearance>): CosmeticsState {
  const equipped = normalizeAppearance(rawState?.equipped ?? fallbackAppearance ?? DEFAULT_APPEARANCE);
  return {
    equipped,
    owned: normalizeOwnedCosmetics(rawState?.owned, equipped),
  };
}

export function hasOwnedCosmetic(cosmeticsState: CosmeticsState, slot: CosmeticSlot, cosmeticId: string): boolean {
  return cosmeticsState.owned[slot]?.includes(cosmeticId) ?? false;
}

export function unlockCosmetic(cosmeticsState: CosmeticsState, slot: CosmeticSlot, cosmeticId: string): boolean {
  if (!AVATAR_CATALOG[slot].includes(cosmeticId) || hasOwnedCosmetic(cosmeticsState, slot, cosmeticId)) {
    return false;
  }

  cosmeticsState.owned[slot] = [...cosmeticsState.owned[slot], cosmeticId];
  return true;
}

export function equipCosmetic(cosmeticsState: CosmeticsState, slot: CosmeticSlot, cosmeticId: string): boolean {
  if (!hasOwnedCosmetic(cosmeticsState, slot, cosmeticId)) {
    return false;
  }

  cosmeticsState.equipped = normalizeAppearance({
    ...cosmeticsState.equipped,
    [slot]: cosmeticId,
  });
  return true;
}
