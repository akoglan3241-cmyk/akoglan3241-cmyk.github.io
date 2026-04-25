import { normalizeItemDefinition, reportContentValidationWarnings, validateItemCollection } from "./tooling/contentValidation.js";

const itemModules = import.meta.glob("./items/*.json", {
  eager: true,
  import: "default",
});

const itemDefinitions = Object.entries(itemModules)
  .flatMap(([source, entry]) => {
    const errors = validateItemCollection(entry, source);
    reportContentValidationWarnings("items", source, errors);
    return Array.isArray(entry) ? entry : [];
  })
  .map(normalizeItemDefinition)
  .filter((item) => item.id);

const itemsById = new Map(itemDefinitions.map((item) => [item.id, item]));

export function getItemDefinition(itemId) {
  return itemsById.get(itemId) ?? null;
}

export function listItemDefinitions() {
  return itemDefinitions.map((item) => ({ ...item }));
}

export const ITEM_RARITY_META = {
  common: {
    label: "Common",
    color: "#c5d3df",
    accent: 0xc5d3df,
  },
  uncommon: {
    label: "Uncommon",
    color: "#8fe3a8",
    accent: 0x8fe3a8,
  },
  rare: {
    label: "Rare",
    color: "#72c8ff",
    accent: 0x72c8ff,
  },
  epic: {
    label: "Epic",
    color: "#ffb36b",
    accent: 0xffb36b,
  },
};

export function getItemRarityMeta(rarity) {
  return ITEM_RARITY_META[rarity] ?? ITEM_RARITY_META.common;
}
