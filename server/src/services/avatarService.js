const HAIR_OPTIONS = ["short", "spiky", "bob"];
const TOP_OPTIONS = ["blue", "green", "red"];
const BOTTOM_OPTIONS = ["navy", "brown", "black"];
const ACCESSORY_OPTIONS = ["none", "glasses", "flower"];

export const DEFAULT_APPEARANCE = {
  hair: HAIR_OPTIONS[0],
  top: TOP_OPTIONS[0],
  bottom: BOTTOM_OPTIONS[0],
  accessory: ACCESSORY_OPTIONS[0],
};

export function normalizeAppearance(rawAppearance = {}) {
  return {
    hair: HAIR_OPTIONS.includes(rawAppearance?.hair) ? rawAppearance.hair : DEFAULT_APPEARANCE.hair,
    top: TOP_OPTIONS.includes(rawAppearance?.top) ? rawAppearance.top : DEFAULT_APPEARANCE.top,
    bottom: BOTTOM_OPTIONS.includes(rawAppearance?.bottom) ? rawAppearance.bottom : DEFAULT_APPEARANCE.bottom,
    accessory: ACCESSORY_OPTIONS.includes(rawAppearance?.accessory) ? rawAppearance.accessory : DEFAULT_APPEARANCE.accessory,
  };
}
