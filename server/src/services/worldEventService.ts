import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isSeasonalContentActive } from "./seasonalEventService.ts";
import type {
  ActiveWorldEvent,
  Position,
  RewardItem,
  WorldEventChestDefinition,
  WorldEventDefinition,
  WorldEventFestivalDefinition,
  WorldEventPickupDefinition,
} from "../types.ts";

const TILE_SIZE = 48;
const EVENT_TRIGGER_INTERVAL_MS = 45000;

function tileToWorld(tileX: number, tileY: number): Position {
  return {
    x: tileX * TILE_SIZE + 24,
    y: tileY * TILE_SIZE + 24,
  };
}

function normalizeRewardItem(rawItem: unknown): RewardItem {
  const record = (rawItem ?? {}) as Record<string, unknown>;
  return {
    itemId: String(record.itemId ?? ""),
    amount: Math.max(1, Number(record.amount ?? 1)),
  };
}

function normalizeFestival(rawFestival: unknown): WorldEventFestivalDefinition | null {
  const record = (rawFestival ?? {}) as Record<string, unknown>;
  const label = String(record.label ?? "").trim();
  const tileX = Number(record.tileX ?? Number.NaN);
  const tileY = Number(record.tileY ?? Number.NaN);

  if (!label || Number.isNaN(tileX) || Number.isNaN(tileY)) {
    return null;
  }

  return { label, tileX, tileY };
}

function normalizeEventDefinition(rawEvent: unknown): WorldEventDefinition {
  const record = (rawEvent ?? {}) as Record<string, unknown>;
  const pickupRecord = (record.pickup ?? null) as Record<string, unknown> | null;
  const chestRecord = (record.chest ?? null) as Record<string, unknown> | null;

  return {
    id: String(record.id ?? ""),
    type: record.type === "bonus-chest" || record.type === "npc-festival" ? record.type : "rare-collectible",
    roomId: String(record.roomId ?? "town"),
    title: String(record.title ?? record.id ?? ""),
    announcement: String(record.announcement ?? ""),
    durationMs: Math.max(10000, Number(record.durationMs ?? 60000)),
    weight: Math.max(1, Number(record.weight ?? 1)),
    eventTags: Array.isArray(record.eventTags) ? record.eventTags.map(String) : [],
    pickup: pickupRecord
      ? {
          itemId: String(pickupRecord.itemId ?? ""),
          amount: Math.max(1, Number(pickupRecord.amount ?? 1)),
          label: String(pickupRecord.label ?? pickupRecord.itemId ?? ""),
          texture: String(pickupRecord.texture ?? "pickupGiftBox"),
          tileX: Number(pickupRecord.tileX ?? 0),
          tileY: Number(pickupRecord.tileY ?? 0),
        }
      : null,
    chest: chestRecord
      ? {
          label: String(chestRecord.label ?? "Event Chest"),
          tileX: Number(chestRecord.tileX ?? 0),
          tileY: Number(chestRecord.tileY ?? 0),
          costs: Array.isArray(chestRecord.costs) ? chestRecord.costs.map(normalizeRewardItem).filter((entry) => entry.itemId) : [],
          lootTableId: String(chestRecord.lootTableId ?? ""),
        }
      : null,
    festival: normalizeFestival(record.festival),
  };
}

function loadWorldEvents(): WorldEventDefinition[] {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  const contentDir = path.resolve(serviceDir, "../../../client/src/game/content/worldEvents");
  const fileNames = readdirSync(contentDir).filter((fileName) => fileName.endsWith(".json"));

  return fileNames.flatMap((fileName) => {
    const rawContent = JSON.parse(readFileSync(path.join(contentDir, fileName), "utf8")) as unknown;
    return Array.isArray(rawContent) ? rawContent.map(normalizeEventDefinition) : [];
  });
}

function buildEventPickup(instanceId: string, roomId: string, definition: NonNullable<WorldEventDefinition["pickup"]>): WorldEventPickupDefinition {
  return {
    id: `${instanceId}-pickup`,
    itemId: definition.itemId,
    amount: definition.amount,
    label: definition.label,
    texture: definition.texture,
    roomId,
    tileX: definition.tileX,
    tileY: definition.tileY,
    position: tileToWorld(definition.tileX, definition.tileY),
  };
}

function buildEventChest(instanceId: string, roomId: string, definition: NonNullable<WorldEventDefinition["chest"]>): WorldEventChestDefinition {
  return {
    id: `${instanceId}-chest`,
    label: definition.label,
    roomId,
    tileX: definition.tileX,
    tileY: definition.tileY,
    position: tileToWorld(definition.tileX, definition.tileY),
    costs: definition.costs.map((entry) => ({ ...entry })),
    lootTableId: definition.lootTableId,
  };
}

const eventDefinitions = loadWorldEvents().filter((entry) => {
  if (!isSeasonalContentActive(entry.eventTags)) {
    return false;
  }

  if (!entry.id || !entry.title || !entry.roomId) {
    return false;
  }

  if (entry.type === "bonus-chest") {
    return Boolean(entry.chest?.lootTableId);
  }

  if (entry.type === "rare-collectible") {
    return Boolean(entry.pickup?.itemId);
  }

  return Boolean(entry.festival?.label);
});
const activeEvents = new Map<string, ActiveWorldEvent>();
let lastTriggerAt = 0;

function selectWeightedDefinition(definitions: WorldEventDefinition[]): WorldEventDefinition | null {
  const totalWeight = definitions.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight <= 0) {
    return null;
  }

  let roll = Math.random() * totalWeight;

  for (const definition of definitions) {
    roll -= definition.weight;
    if (roll <= 0) {
      return definition;
    }
  }

  return definitions.at(-1) ?? null;
}

function createActiveEvent(definition: WorldEventDefinition, now: number): ActiveWorldEvent {
  const instanceId = `${definition.id}-${now}`;
  return {
    instanceId,
    definitionId: definition.id,
    roomId: definition.roomId,
    type: definition.type,
    title: definition.title,
    announcement: definition.announcement,
    startedAt: now,
    expiresAt: now + definition.durationMs,
    pickup: definition.pickup ? buildEventPickup(instanceId, definition.roomId, definition.pickup) : null,
    chest: definition.chest ? buildEventChest(instanceId, definition.roomId, definition.chest) : null,
    festival: definition.festival ? { ...definition.festival } : null,
  };
}

export function getWorldEventTriggerIntervalMs(): number {
  return EVENT_TRIGGER_INTERVAL_MS;
}

export function getActiveWorldEvents(now = Date.now()): ActiveWorldEvent[] {
  pruneExpiredWorldEvents(now);
  return Array.from(activeEvents.values()).map((entry) => JSON.parse(JSON.stringify(entry)) as ActiveWorldEvent);
}

export function getRoomWorldEvents(roomId: string, now = Date.now()): ActiveWorldEvent[] {
  return getActiveWorldEvents(now).filter((entry) => entry.roomId === roomId);
}

export function getActiveEventPickupById(pickupId: string, now = Date.now()): WorldEventPickupDefinition | null {
  return getActiveWorldEvents(now).find((entry) => entry.pickup?.id === pickupId)?.pickup ?? null;
}

export function getActiveEventChestById(chestId: string, now = Date.now()): WorldEventChestDefinition | null {
  return getActiveWorldEvents(now).find((entry) => entry.chest?.id === chestId)?.chest ?? null;
}

export function pruneExpiredWorldEvents(now = Date.now()): ActiveWorldEvent[] {
  const expiredEvents: ActiveWorldEvent[] = [];

  activeEvents.forEach((entry, key) => {
    if (entry.expiresAt <= now) {
      expiredEvents.push(entry);
      activeEvents.delete(key);
    }
  });

  return expiredEvents;
}

export function maybeTriggerRandomWorldEvent(now = Date.now()): ActiveWorldEvent | null {
  pruneExpiredWorldEvents(now);

  if (now - lastTriggerAt < EVENT_TRIGGER_INTERVAL_MS) {
    return null;
  }

  const occupiedRooms = new Set(Array.from(activeEvents.values()).map((entry) => entry.roomId));
  const eligibleDefinitions = eventDefinitions.filter((entry) => !occupiedRooms.has(entry.roomId));
  const selectedDefinition = selectWeightedDefinition(eligibleDefinitions);

  lastTriggerAt = now;

  if (!selectedDefinition) {
    return null;
  }

  const activeEvent = createActiveEvent(selectedDefinition, now);
  activeEvents.set(activeEvent.instanceId, activeEvent);
  return JSON.parse(JSON.stringify(activeEvent)) as ActiveWorldEvent;
}
