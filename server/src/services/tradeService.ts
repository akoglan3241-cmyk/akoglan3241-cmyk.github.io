import type { PlayerConnection, TradeOffer, TradeParticipantState, TradeSessionState } from "../types.ts";
import { hasEnoughItems } from "./inventoryService.ts";

const tradeSessions = new Map<string, TradeSessionState>();
const tradeSessionIdsByPlayerId = new Map<string, string>();

function createTradeId(): string {
  return `trade-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isNearby(left: PlayerConnection, right: PlayerConnection): boolean {
  return Math.hypot(left.x - right.x, left.y - right.y) <= 140;
}

function normalizeOffer(rawOffer?: Partial<TradeOffer> | null): TradeOffer {
  return {
    coins: Math.max(0, Math.floor(Number(rawOffer?.coins ?? 0) || 0)),
    items: Array.isArray(rawOffer?.items)
      ? rawOffer.items
          .map((entry) => ({
            itemId: String(entry?.itemId ?? ""),
            amount: Math.max(1, Math.floor(Number(entry?.amount ?? 1) || 1)),
          }))
          .filter((entry) => entry.itemId && entry.itemId !== "coin")
      : [],
  };
}

function hasDuplicateItems(offer: TradeOffer): boolean {
  const ids = offer.items.map((entry) => entry.itemId);
  return new Set(ids).size !== ids.length;
}

function validateOffer(player: PlayerConnection, offer: TradeOffer): boolean {
  if (offer.coins > 0 && !hasEnoughItems(player.gameplayState, "coin", offer.coins)) {
    return false;
  }

  if (hasDuplicateItems(offer)) {
    return false;
  }

  return offer.items.every((entry) => hasEnoughItems(player.gameplayState, entry.itemId, entry.amount));
}

export function getTradeSessionForPlayer(playerId: string): TradeSessionState | null {
  const tradeId = tradeSessionIdsByPlayerId.get(playerId);
  return tradeId ? clone(tradeSessions.get(tradeId) ?? null) : null;
}

export function requestTrade(
  requester: PlayerConnection,
  responder: PlayerConnection,
  areFriends: boolean,
): { ok: true; session: TradeSessionState } | { ok: false; message: string } {
  if (requester.id === responder.id) {
    return { ok: false, message: "Kendinle trade baslatamazsin." };
  }

  if (tradeSessionIdsByPlayerId.has(requester.id) || tradeSessionIdsByPlayerId.has(responder.id)) {
    return { ok: false, message: "Taraflardan biri zaten trade icinde." };
  }

  if (requester.roomId !== responder.roomId) {
    return { ok: false, message: "Trade icin ayni odada olmalisiniz." };
  }

  if (!areFriends && !isNearby(requester, responder)) {
    return { ok: false, message: "Trade icin hedef oyuncuya yakinlas." };
  }

  const id = createTradeId();
  const session: TradeSessionState = {
    id,
    requesterId: requester.id,
    responderId: responder.id,
    roomId: requester.roomId,
    status: "pending",
    createdAt: Date.now(),
    participants: {
      [requester.id]: {
        playerId: requester.id,
        playerName: requester.name,
        confirmed: false,
        offer: { coins: 0, items: [] },
      },
      [responder.id]: {
        playerId: responder.id,
        playerName: responder.name,
        confirmed: false,
        offer: { coins: 0, items: [] },
      },
    },
  };

  tradeSessions.set(id, session);
  tradeSessionIdsByPlayerId.set(requester.id, id);
  tradeSessionIdsByPlayerId.set(responder.id, id);
  return { ok: true, session: clone(session) };
}

export function respondToTrade(playerId: string, accept: boolean): { ok: true; session?: TradeSessionState; closed?: { sessionId: string; participants: string[]; reason: string } } | { ok: false; message: string } {
  const tradeId = tradeSessionIdsByPlayerId.get(playerId);
  const session = tradeId ? tradeSessions.get(tradeId) : null;

  if (!session || session.status !== "pending") {
    return { ok: false, message: "Bekleyen trade bulunamadi." };
  }

  if (session.responderId !== playerId) {
    return { ok: false, message: "Yanit verme yetkin yok." };
  }

  if (!accept) {
    const participants = Object.keys(session.participants);
    clearTradeSession(session.id);
    return { ok: true, closed: { sessionId: session.id, participants, reason: "Trade reddedildi." } };
  }

  session.status = "active";
  return { ok: true, session: clone(session) };
}

export function updateTradeOffer(player: PlayerConnection, rawOffer: Partial<TradeOffer> | null): { ok: true; session: TradeSessionState } | { ok: false; message: string } {
  const tradeId = tradeSessionIdsByPlayerId.get(player.id);
  const session = tradeId ? tradeSessions.get(tradeId) : null;

  if (!session || session.status !== "active") {
    return { ok: false, message: "Aktif trade bulunamadi." };
  }

  if (player.roomId !== session.roomId) {
    return { ok: false, message: "Trade ayni odada devam etmeli." };
  }

  const nextOffer = normalizeOffer(rawOffer);
  if (!validateOffer(player, nextOffer)) {
    return { ok: false, message: "Teklifindeki coin veya item miktari gecersiz." };
  }

  session.participants[player.id].offer = nextOffer;
  Object.values(session.participants).forEach((participant) => {
    participant.confirmed = false;
  });
  return { ok: true, session: clone(session) };
}

export function setTradeConfirmation(playerId: string, confirmed: boolean): { ok: true; session?: TradeSessionState; shouldComplete?: boolean } | { ok: false; message: string } {
  const tradeId = tradeSessionIdsByPlayerId.get(playerId);
  const session = tradeId ? tradeSessions.get(tradeId) : null;

  if (!session || session.status !== "active") {
    return { ok: false, message: "Aktif trade bulunamadi." };
  }

  session.participants[playerId].confirmed = Boolean(confirmed);
  const shouldComplete = Object.values(session.participants).every((participant) => participant.confirmed);
  return { ok: true, session: clone(session), shouldComplete };
}

export function executeTrade(sessionId: string, playersById: Map<string, PlayerConnection>): { ok: true } | { ok: false; message: string } {
  const session = tradeSessions.get(sessionId);
  if (!session || session.status !== "active") {
    clearTradeSession(sessionId);
    return { ok: false, message: "Trade oturumu bulunamadi." };
  }

  const requester = playersById.get(session.requesterId);
  const responder = playersById.get(session.responderId);
  if (!requester || !responder) {
    clearTradeSession(sessionId);
    return { ok: false, message: "Oyunculardan biri bagli degil." };
  }

  if (requester.roomId !== responder.roomId || requester.roomId !== session.roomId) {
    clearTradeSession(sessionId);
    return { ok: false, message: "Trade icin ayni odada kalmalisiniz." };
  }

  const requesterOffer = session.participants[requester.id].offer;
  const responderOffer = session.participants[responder.id].offer;

  if (!validateOffer(requester, requesterOffer) || !validateOffer(responder, responderOffer)) {
    clearTradeSession(sessionId);
    return { ok: false, message: "Trade dogrulamasi basarisiz oldu." };
  }

  requester.gameplayState.inventory.items.coin = Math.max(0, (requester.gameplayState.inventory.items.coin ?? 0) - requesterOffer.coins + responderOffer.coins);
  responder.gameplayState.inventory.items.coin = Math.max(0, (responder.gameplayState.inventory.items.coin ?? 0) - responderOffer.coins + requesterOffer.coins);

  requesterOffer.items.forEach((entry) => {
    requester.gameplayState.inventory.items[entry.itemId] -= entry.amount;
    responder.gameplayState.inventory.items[entry.itemId] = (responder.gameplayState.inventory.items[entry.itemId] ?? 0) + entry.amount;
  });
  responderOffer.items.forEach((entry) => {
    responder.gameplayState.inventory.items[entry.itemId] -= entry.amount;
    requester.gameplayState.inventory.items[entry.itemId] = (requester.gameplayState.inventory.items[entry.itemId] ?? 0) + entry.amount;
  });

  clearTradeSession(session.id);
  return { ok: true };
}

export function cancelTradeForPlayer(playerId: string, reason = "Trade iptal edildi."): { sessionId: string; participants: string[]; reason: string } | null {
  const tradeId = tradeSessionIdsByPlayerId.get(playerId);
  const session = tradeId ? tradeSessions.get(tradeId) : null;
  if (!session) {
    return null;
  }

  const participants = Object.keys(session.participants);
  clearTradeSession(session.id);
  return {
    sessionId: session.id,
    participants,
    reason,
  };
}

function clearTradeSession(sessionId: string): void {
  const session = tradeSessions.get(sessionId);
  if (!session) {
    return;
  }

  Object.keys(session.participants).forEach((playerId) => {
    tradeSessionIdsByPlayerId.delete(playerId);
  });
  tradeSessions.delete(sessionId);
}
