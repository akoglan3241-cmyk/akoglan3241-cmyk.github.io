type AnalyticsEventName =
  | "player_login"
  | "room_enter"
  | "quest_accepted"
  | "quest_completed"
  | "item_purchased"
  | "chest_opened"
  | "minigame_played"
  | "chat_message_sent"
  | "onboarding_step"
  | "tutorial_completed"
  | "friend_added"
  | "retention_checkpoint";

interface AnalyticsEvent<TPayload = Record<string, unknown>> {
  name: AnalyticsEventName;
  timestamp: string;
  payload: TPayload;
}

interface AnalyticsSink {
  emit<TPayload>(event: AnalyticsEvent<TPayload>): void | Promise<void>;
}

interface FunnelState {
  login: boolean;
  tutorial_complete: boolean;
  first_quest_accepted: boolean;
  first_quest_completed: boolean;
  first_purchase: boolean;
  first_friend_added: boolean;
}

interface PlayerTelemetryState {
  firstSeenAt: number;
  funnel: FunnelState;
  completedRetentionCheckpoints: string[];
}

interface AnalyticsSummarySnapshot {
  generatedAt: string;
  totals: Record<string, number>;
  activePlayers: number;
  roomActivity: Record<string, number>;
  funnel: {
    login: number;
    tutorial_complete: number;
    first_quest_accepted: number;
    first_quest_completed: number;
    first_purchase: number;
    first_friend_added: number;
  };
  recentEvents: AnalyticsEvent[];
}

const MAX_RECENT_EVENTS = 250;

class ConsoleAnalyticsSink implements AnalyticsSink {
  emit<TPayload>(event: AnalyticsEvent<TPayload>): void {
    console.log(
      JSON.stringify({
        type: "analytics",
        name: event.name,
        timestamp: event.timestamp,
        payload: event.payload,
      }),
    );
  }
}

const sinks: AnalyticsSink[] = [new ConsoleAnalyticsSink()];
const recentEvents: AnalyticsEvent[] = [];
const totals = new Map<string, number>();
const roomActivity = new Map<string, number>();
const playerTelemetry = new Map<string, PlayerTelemetryState>();

function incrementCounter(counter: Map<string, number>, key: string | null | undefined): void {
  if (!key) {
    return;
  }

  counter.set(key, (counter.get(key) ?? 0) + 1);
}

function getPlayerTelemetryState(playerId: string, timestampMs: number): PlayerTelemetryState {
  const existing = playerTelemetry.get(playerId);

  if (existing) {
    return existing;
  }

  const created: PlayerTelemetryState = {
    firstSeenAt: timestampMs,
    funnel: {
      login: false,
      tutorial_complete: false,
      first_quest_accepted: false,
      first_quest_completed: false,
      first_purchase: false,
      first_friend_added: false,
    },
    completedRetentionCheckpoints: [],
  };
  playerTelemetry.set(playerId, created);
  return created;
}

function markFunnelStep(playerId: string | null | undefined, step: keyof FunnelState, timestampMs: number): void {
  if (!playerId) {
    return;
  }

  const state = getPlayerTelemetryState(playerId, timestampMs);
  state.funnel[step] = true;
}

function updateDerivedSummaries(event: AnalyticsEvent, timestampMs: number): void {
  incrementCounter(totals, event.name);
  recentEvents.unshift(event);
  if (recentEvents.length > MAX_RECENT_EVENTS) {
    recentEvents.length = MAX_RECENT_EVENTS;
  }

  const payload = event.payload as Record<string, unknown>;
  const playerId = typeof payload.playerId === "string" ? payload.playerId : null;
  const roomId = typeof payload.roomId === "string" ? payload.roomId : null;

  incrementCounter(roomActivity, roomId);

  switch (event.name) {
    case "player_login":
      markFunnelStep(playerId, "login", timestampMs);
      break;
    case "tutorial_completed":
      markFunnelStep(playerId, "tutorial_complete", timestampMs);
      break;
    case "quest_accepted":
      markFunnelStep(playerId, "first_quest_accepted", timestampMs);
      break;
    case "quest_completed":
      markFunnelStep(playerId, "first_quest_completed", timestampMs);
      break;
    case "item_purchased":
      markFunnelStep(playerId, "first_purchase", timestampMs);
      break;
    case "friend_added":
      markFunnelStep(playerId, "first_friend_added", timestampMs);
      break;
    default:
      break;
  }
}

export function trackAnalyticsEvent<TPayload = Record<string, unknown>>(name: AnalyticsEventName, payload: TPayload): void {
  const timestampMs = Date.now();
  const event: AnalyticsEvent<TPayload> = {
    name,
    timestamp: new Date(timestampMs).toISOString(),
    payload,
  };

  updateDerivedSummaries(event as AnalyticsEvent, timestampMs);

  for (const sink of sinks) {
    try {
      const result = sink.emit(event);
      if (result && typeof (result as Promise<void>).catch === "function") {
        void (result as Promise<void>).catch(() => {});
      }
    } catch {
      // Analytics failures must never affect gameplay flows.
    }
  }
}

export function trackRetentionCheckpoint(payload: {
  playerId: string;
  playerName?: string;
  roomId?: string;
  firstSessionAt?: number | null;
  guest?: boolean;
}): void {
  const timestampMs = Date.now();
  const state = getPlayerTelemetryState(payload.playerId, payload.firstSessionAt && payload.firstSessionAt > 0 ? payload.firstSessionAt : timestampMs);
  const elapsedMs = Math.max(0, timestampMs - (payload.firstSessionAt && payload.firstSessionAt > 0 ? payload.firstSessionAt : state.firstSeenAt));
  const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  const checkpoint = elapsedDays >= 30 ? "day_30_plus" : elapsedDays >= 7 ? "day_7_plus" : elapsedDays >= 1 ? "day_1_plus" : "day_0";

  if (state.completedRetentionCheckpoints.includes(checkpoint)) {
    return;
  }

  state.completedRetentionCheckpoints.push(checkpoint);
  trackAnalyticsEvent("retention_checkpoint", {
    playerId: payload.playerId,
    playerName: payload.playerName ?? null,
    roomId: payload.roomId ?? null,
    guest: Boolean(payload.guest),
    checkpoint,
    firstSessionAt: payload.firstSessionAt ?? state.firstSeenAt,
  });
}

export function getAnalyticsSummary(activePlayers: number): AnalyticsSummarySnapshot {
  const funnel = {
    login: 0,
    tutorial_complete: 0,
    first_quest_accepted: 0,
    first_quest_completed: 0,
    first_purchase: 0,
    first_friend_added: 0,
  };

  playerTelemetry.forEach((state) => {
    Object.keys(funnel).forEach((key) => {
      if (state.funnel[key as keyof FunnelState]) {
        funnel[key as keyof typeof funnel] += 1;
      }
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    totals: Object.fromEntries(totals.entries()),
    activePlayers,
    roomActivity: Object.fromEntries(roomActivity.entries()),
    funnel,
    recentEvents: recentEvents.slice(0, 50),
  };
}

export function getRecentAnalyticsEvents(limit = 100): AnalyticsEvent[] {
  return recentEvents.slice(0, Math.max(1, Math.min(limit, MAX_RECENT_EVENTS)));
}
