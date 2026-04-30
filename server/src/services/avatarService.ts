import type { Appearance } from "../types.ts";

export const AVATAR_CATALOG = {
  hair: ["short", "spiky", "bob", "soft-wave", "short-bob"],
  top: ["blue", "green", "red", "striped-sweater", "cafe-apron"],
  bottom: ["navy", "brown", "black", "denim-shorts", "soft-skirt"],
  accessory: ["none", "glasses", "flower", "straw-hat", "mini-backpack"],
} satisfies Record<keyof Appearance, string[]>;

export const DEFAULT_APPEARANCE: Appearance = {
  hair: AVATAR_CATALOG.hair[0],
  top: AVATAR_CATALOG.top[0],
  bottom: AVATAR_CATALOG.bottom[0],
  accessory: AVATAR_CATALOG.accessory[0],
};

export function normalizeAppearance(rawAppearance: Partial<Appearance> = {}): Appearance {
  return {
    hair: AVATAR_CATALOG.hair.includes(rawAppearance.hair ?? "") ? rawAppearance.hair! : DEFAULT_APPEARANCE.hair,
    top: AVATAR_CATALOG.top.includes(rawAppearance.top ?? "") ? rawAppearance.top! : DEFAULT_APPEARANCE.top,
    bottom: AVATAR_CATALOG.bottom.includes(rawAppearance.bottom ?? "") ? rawAppearance.bottom! : DEFAULT_APPEARANCE.bottom,
    accessory: AVATAR_CATALOG.accessory.includes(rawAppearance.accessory ?? "") ? rawAppearance.accessory! : DEFAULT_APPEARANCE.accessory,
  };
}
