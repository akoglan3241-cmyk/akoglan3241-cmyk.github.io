import { normalizeShopDefinition, reportContentValidationWarnings, validateShopDefinition } from "./tooling/contentValidation.js";

const shopModules = import.meta.glob("./shops/*.json", {
  eager: true,
  import: "default",
});

const shops = Object.entries(shopModules).map(([source, entry]) => {
  const errors = validateShopDefinition(entry, source);
  reportContentValidationWarnings("shops", source, errors);
  return normalizeShopDefinition(entry);
});
const shopsById = new Map(shops.map((shop) => [shop.id, shop]));
const shopsByNpcId = new Map(shops.map((shop) => [shop.npcId, shop]));

export function getShopById(shopId) {
  return shopsById.get(shopId) ?? null;
}

export function getShopByNpcId(npcId) {
  return shopsByNpcId.get(npcId) ?? null;
}
