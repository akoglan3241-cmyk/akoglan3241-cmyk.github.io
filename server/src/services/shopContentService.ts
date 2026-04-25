import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CosmeticSlot, Position, ShopDefinition, ShopItemDefinition } from "../types.ts";

function normalizePosition(rawPosition: unknown): Position | null {
  if (!rawPosition || typeof rawPosition !== "object") {
    return null;
  }

  const record = rawPosition as Partial<Position>;
  return {
    x: Number(record.x ?? 0),
    y: Number(record.y ?? 0),
  };
}

function normalizeShopItem(rawItem: unknown): ShopItemDefinition {
  const record = (rawItem ?? {}) as Record<string, unknown>;
  return {
    id: String(record.id ?? ""),
    itemId: String(record.itemId ?? ""),
    label: String(record.label ?? record.itemId ?? ""),
    price: Number(record.price ?? 0),
    amount: Number(record.amount ?? 1),
    rarity: ["common", "uncommon", "rare", "epic"].includes(String(record.rarity))
      ? (String(record.rarity) as ShopItemDefinition["rarity"])
      : "common",
    category: ["consumables", "quest-items", "cosmetics", "chair", "table", "lamp", "plant", "decoration"].includes(String(record.category))
      ? (String(record.category) as ShopItemDefinition["category"])
      : record.kind === "cosmetic"
        ? "cosmetics"
        : "consumables",
    kind: record.kind === "cosmetic" ? "cosmetic" : "inventory",
    cosmeticSlot: (record.cosmeticSlot ? String(record.cosmeticSlot) : null) as CosmeticSlot | null,
  };
}

function loadShops(): ShopDefinition[] {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  const contentDir = path.resolve(serviceDir, "../../../client/src/game/content/shops");
  const fileNames = readdirSync(contentDir).filter((fileName) => fileName.endsWith(".json"));

  return fileNames.map((fileName) => {
    const rawContent = JSON.parse(readFileSync(path.join(contentDir, fileName), "utf8")) as Record<string, unknown>;
    return {
      id: String(rawContent.id ?? ""),
      npcId: String(rawContent.npcId ?? ""),
      roomId: String(rawContent.roomId ?? ""),
      position: normalizePosition(rawContent.position),
      title: String(rawContent.title ?? "Shop"),
      greeting: String(rawContent.greeting ?? ""),
      items: Array.isArray(rawContent.items) ? rawContent.items.map(normalizeShopItem) : [],
    };
  });
}

const shops = loadShops();
const shopsById = new Map<string, ShopDefinition>(shops.map((shop) => [shop.id, shop]));

export function getShopById(shopId: string): ShopDefinition | null {
  return shopsById.get(shopId) ?? null;
}

export function getShopItem(shopId: string, shopItemId: string): ShopItemDefinition | null {
  return getShopById(shopId)?.items.find((item) => item.id === shopItemId) ?? null;
}
