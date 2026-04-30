import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function normalizeShopItem(rawItem = {}) {
  return {
    id: String(rawItem.id ?? ""),
    itemId: String(rawItem.itemId ?? ""),
    label: String(rawItem.label ?? rawItem.itemId ?? ""),
    price: Number(rawItem.price ?? 0),
    amount: Number(rawItem.amount ?? 1),
  };
}

function normalizeShop(rawShop = {}) {
  return {
    id: String(rawShop.id ?? ""),
    npcId: String(rawShop.npcId ?? ""),
    roomId: String(rawShop.roomId ?? ""),
    position: rawShop.position
      ? {
          x: Number(rawShop.position.x ?? 0),
          y: Number(rawShop.position.y ?? 0),
        }
      : null,
    title: String(rawShop.title ?? "Shop"),
    greeting: String(rawShop.greeting ?? ""),
    items: Array.isArray(rawShop.items) ? rawShop.items.map(normalizeShopItem) : [],
  };
}

function loadShops() {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  const contentDir = path.resolve(serviceDir, "../../../client/src/game/content/shops");
  const fileNames = readdirSync(contentDir).filter((fileName) => fileName.endsWith(".json"));

  return fileNames
    .map((fileName) => {
      const rawContent = readFileSync(path.join(contentDir, fileName), "utf8");
      return normalizeShop(JSON.parse(rawContent));
    })
    .filter((shop) => shop.id && shop.npcId);
}

const shops = loadShops();
const shopsById = new Map(shops.map((shop) => [shop.id, shop]));

export function getShopById(shopId) {
  return shopsById.get(shopId) ?? null;
}

export function getShopItem(shopId, shopItemId) {
  const shop = getShopById(shopId);
  return shop?.items.find((item) => item.id === shopItemId) ?? null;
}
