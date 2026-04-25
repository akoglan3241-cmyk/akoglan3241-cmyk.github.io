import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface ItemDefinition {
  id: string;
  label: string;
  icon: string;
  category: string;
  rarity: "common" | "uncommon" | "rare" | "epic";
  sellable: boolean;
  sellPrice: number;
  placeable: boolean;
  texture: string;
  furniture: {
    width: number;
    height: number;
  } | null;
}

function normalizeItem(rawItem: unknown): ItemDefinition {
  const record = (rawItem ?? {}) as Record<string, unknown>;
  return {
    id: String(record.id ?? ""),
    label: String(record.label ?? record.id ?? ""),
    icon: String(record.icon ?? "?"),
    category: String(record.category ?? "misc"),
    rarity: ["common", "uncommon", "rare", "epic"].includes(String(record.rarity))
      ? (String(record.rarity) as ItemDefinition["rarity"])
      : "common",
    sellable: Boolean(record.sellable),
    sellPrice: Number(record.sellPrice ?? 0),
    placeable: Boolean(record.placeable),
    texture: String(record.texture ?? ""),
    furniture: record.furniture
      ? {
          width: Math.max(1, Number((record.furniture as Record<string, unknown>).width ?? 1)),
          height: Math.max(1, Number((record.furniture as Record<string, unknown>).height ?? 1)),
        }
      : null,
  };
}

function loadItems(): ItemDefinition[] {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  const contentDir = path.resolve(serviceDir, "../../../client/src/game/content/items");
  const fileNames = readdirSync(contentDir).filter((fileName) => fileName.endsWith(".json"));

  return fileNames.flatMap((fileName) => {
    const rawContent = JSON.parse(readFileSync(path.join(contentDir, fileName), "utf8")) as unknown;
    return Array.isArray(rawContent) ? rawContent.map(normalizeItem) : [];
  });
}

const items = loadItems();
const itemsById = new Map<string, ItemDefinition>(items.map((item) => [item.id, item]));

export function getItemDefinition(itemId: string): ItemDefinition | null {
  return itemsById.get(itemId) ?? null;
}
