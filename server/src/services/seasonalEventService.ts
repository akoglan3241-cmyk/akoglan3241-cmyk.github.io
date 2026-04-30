import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface SeasonalEventDefinition {
  id: string;
  title: string;
  bannerLabel: string;
  announcement: string;
  startMonthDay: string;
  endMonthDay: string;
  roomIds: string[];
  eventTags: string[];
}

function normalizeEventTags(rawTags: unknown): string[] {
  return Array.isArray(rawTags) ? rawTags.map(String).filter(Boolean) : [];
}

function normalizeSeasonalEvent(rawEvent: unknown): SeasonalEventDefinition {
  const record = (rawEvent ?? {}) as Record<string, unknown>;
  return {
    id: String(record.id ?? ""),
    title: String(record.title ?? record.id ?? ""),
    bannerLabel: String(record.bannerLabel ?? record.title ?? record.id ?? ""),
    announcement: String(record.announcement ?? ""),
    startMonthDay: String(record.startMonthDay ?? "01-01"),
    endMonthDay: String(record.endMonthDay ?? "12-31"),
    roomIds: Array.isArray(record.roomIds) ? record.roomIds.map(String) : [],
    eventTags: normalizeEventTags(record.eventTags),
  };
}

function parseMonthDay(value: string, fallbackMonth: number, fallbackDay: number) {
  const [monthText, dayText] = String(value ?? "").split("-");
  const month = Number(monthText);
  const day = Number(dayText);
  return {
    month: Number.isFinite(month) ? month : fallbackMonth,
    day: Number.isFinite(day) ? day : fallbackDay,
  };
}

function getMonthDayNumber(month: number, day: number): number {
  return month * 100 + day;
}

function isDateInWindow(event: SeasonalEventDefinition, now = new Date()): boolean {
  const start = parseMonthDay(event.startMonthDay, 1, 1);
  const end = parseMonthDay(event.endMonthDay, 12, 31);
  const current = getMonthDayNumber(now.getMonth() + 1, now.getDate());
  const startValue = getMonthDayNumber(start.month, start.day);
  const endValue = getMonthDayNumber(end.month, end.day);

  if (startValue <= endValue) {
    return current >= startValue && current <= endValue;
  }

  return current >= startValue || current <= endValue;
}

function loadSeasonalEvents(): SeasonalEventDefinition[] {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  const contentDir = path.resolve(serviceDir, "../../../client/src/game/content/seasonalEvents");
  const fileNames = readdirSync(contentDir).filter((fileName) => fileName.endsWith(".json"));

  return fileNames.flatMap((fileName) => {
    const rawContent = JSON.parse(readFileSync(path.join(contentDir, fileName), "utf8")) as unknown;
    return Array.isArray(rawContent) ? rawContent.map(normalizeSeasonalEvent) : [];
  });
}

const seasonalEvents = loadSeasonalEvents().filter((event) => event.id);

export function getActiveSeasonalEvents(now = new Date()): SeasonalEventDefinition[] {
  return seasonalEvents.filter((event) => isDateInWindow(event, now));
}

export function isSeasonalContentActive(eventTags: unknown, now = new Date()): boolean {
  const tags = normalizeEventTags(eventTags);
  if (!tags.length) {
    return true;
  }

  const activeIds = new Set(getActiveSeasonalEvents(now).map((event) => event.id));
  return tags.some((tag) => activeIds.has(tag));
}
