function normalizeEventTags(rawTags) {
  return Array.isArray(rawTags) ? rawTags.map(String).filter(Boolean) : [];
}

function normalizeSeasonalEvent(rawEvent = {}) {
  return {
    id: String(rawEvent.id ?? ""),
    title: String(rawEvent.title ?? rawEvent.id ?? ""),
    bannerLabel: String(rawEvent.bannerLabel ?? rawEvent.title ?? rawEvent.id ?? ""),
    announcement: String(rawEvent.announcement ?? ""),
    startMonthDay: String(rawEvent.startMonthDay ?? "01-01"),
    endMonthDay: String(rawEvent.endMonthDay ?? "12-31"),
    roomIds: Array.isArray(rawEvent.roomIds) ? rawEvent.roomIds.map(String) : [],
    eventTags: normalizeEventTags(rawEvent.eventTags),
  };
}

function parseMonthDay(value, fallbackMonth, fallbackDay) {
  const [monthText, dayText] = String(value ?? "").split("-");
  const month = Number(monthText);
  const day = Number(dayText);
  return {
    month: Number.isFinite(month) ? month : fallbackMonth,
    day: Number.isFinite(day) ? day : fallbackDay,
  };
}

function getMonthDayNumber(month, day) {
  return month * 100 + day;
}

function isDateInWindow(event, now = new Date()) {
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

const seasonalModules = import.meta.glob("./seasonalEvents/*.json", {
  eager: true,
  import: "default",
});

const seasonalEvents = Object.values(seasonalModules)
  .flatMap((module) => (Array.isArray(module) ? module : []))
  .map(normalizeSeasonalEvent)
  .filter((event) => event.id);

export function listSeasonalEvents() {
  return seasonalEvents.map((event) => JSON.parse(JSON.stringify(event)));
}

export function getActiveSeasonalEvents(now = new Date()) {
  return seasonalEvents.filter((event) => isDateInWindow(event, now));
}

export function isSeasonalContentActive(eventTags, now = new Date()) {
  const tags = normalizeEventTags(eventTags);
  if (!tags.length) {
    return true;
  }

  const activeIds = new Set(getActiveSeasonalEvents(now).map((event) => event.id));
  return tags.some((tag) => activeIds.has(tag));
}

export function getSeasonalBannerForRoom(roomId, now = new Date()) {
  return (
    getActiveSeasonalEvents(now).find((event) => !event.roomIds.length || event.roomIds.includes(roomId)) ?? null
  );
}
