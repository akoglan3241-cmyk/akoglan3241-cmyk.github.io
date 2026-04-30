import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { LootReward, LootTableDefinition, LootTableEntryDefinition, PlayerConnection } from "../types.ts";
import { getItemDefinition } from "./itemContentService.ts";
import { unlockCosmetic } from "./cosmeticsService.ts";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizeLootEntry(rawEntry: unknown): LootTableEntryDefinition {
  const record = (rawEntry ?? {}) as Record<string, unknown>;
  return {
    id: String(record.id ?? ""),
    kind: record.kind === "cosmetic" ? "cosmetic" : "inventory",
    itemId: String(record.itemId ?? ""),
    cosmeticSlot: record.cosmeticSlot ? String(record.cosmeticSlot) : null,
    weight: Math.max(0, Number(record.weight ?? 0)),
    minAmount: Math.max(1, Number(record.minAmount ?? 1)),
    maxAmount: Math.max(1, Number(record.maxAmount ?? record.minAmount ?? 1)),
    eventTags: Array.isArray(record.eventTags) ? record.eventTags.map(String) : [],
  };
}

function normalizeLootTable(rawTable: unknown): LootTableDefinition {
  const record = (rawTable ?? {}) as Record<string, unknown>;
  return {
    id: String(record.id ?? ""),
    rolls: Math.max(1, Number(record.rolls ?? 1)),
    entries: Array.isArray(record.entries) ? record.entries.map(normalizeLootEntry) : [],
    eventTags: Array.isArray(record.eventTags) ? record.eventTags.map(String) : [],
  };
}

function loadLootTables(): LootTableDefinition[] {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  const contentDir = path.resolve(serviceDir, "../../../client/src/game/content/lootTables");
  const fileNames = readdirSync(contentDir).filter((fileName) => fileName.endsWith(".json"));

  return fileNames.flatMap((fileName) => {
    const rawContent = JSON.parse(readFileSync(path.join(contentDir, fileName), "utf8")) as unknown;
    return Array.isArray(rawContent) ? rawContent.map(normalizeLootTable) : [];
  });
}

const lootTables = loadLootTables();
const lootTablesById = new Map<string, LootTableDefinition>(lootTables.map((table) => [table.id, table]));

function selectWeightedEntry(entries: LootTableEntryDefinition[]): LootTableEntryDefinition | null {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight <= 0) {
    return null;
  }

  let roll = Math.random() * totalWeight;

  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry;
    }
  }

  return entries.at(-1) ?? null;
}

function buildInventoryReward(entry: LootTableEntryDefinition): LootReward | null {
  const item = getItemDefinition(entry.itemId);

  if (!item) {
    return null;
  }

  return {
    kind: "inventory",
    itemId: entry.itemId,
    label: item.label,
    amount: randomInt(entry.minAmount, entry.maxAmount),
    rarity: item.rarity,
    cosmeticSlot: null,
  };
}

function buildCosmeticReward(player: PlayerConnection, entry: LootTableEntryDefinition): LootReward | null {
  if (!entry.cosmeticSlot || !unlockCosmetic(player.gameplayState.cosmetics, entry.cosmeticSlot, entry.itemId)) {
    return null;
  }

  const item = getItemDefinition(entry.itemId);

  return {
    kind: "cosmetic",
    itemId: entry.itemId,
    label: item?.label ?? entry.itemId,
    amount: 1,
    rarity: item?.rarity ?? "epic",
    cosmeticSlot: entry.cosmeticSlot,
  };
}

export function resolveChestLoot(player: PlayerConnection, lootTableId: string): LootReward[] | null {
  const lootTable = lootTablesById.get(lootTableId);

  if (!lootTable) {
    return null;
  }

  const rewards: LootReward[] = [];

  for (let index = 0; index < lootTable.rolls; index += 1) {
    const eligibleEntries = lootTable.entries.filter((entry) => {
      if (entry.kind === "inventory") {
        return Boolean(getItemDefinition(entry.itemId));
      }

      return Boolean(entry.cosmeticSlot);
    });
    const selectedEntry = selectWeightedEntry(eligibleEntries);

    if (!selectedEntry) {
      continue;
    }

    const reward =
      selectedEntry.kind === "cosmetic"
        ? buildCosmeticReward(player, selectedEntry)
        : buildInventoryReward(selectedEntry);

    if (reward) {
      rewards.push(reward);
    }
  }

  return rewards;
}
