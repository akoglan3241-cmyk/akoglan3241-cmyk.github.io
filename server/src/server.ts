import { createServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { getServerEnv } from "./config/env.ts";
import { createGuestLogin, authenticateToken, loginAccount, registerAccount } from "./services/authService.ts";
import { findUserById, findUserByUsername } from "./repositories/usersRepository.ts";
import { canUsePortal, getHomeOwnerProfileId, getRoom, getSpawnPosition, resolvePortalTargetRoomId } from "./services/roomService.ts";
import {
  attachAuthContext,
  buybackShopItemForPlayer,
  collectPickupForPlayer,
  craftRecipeForPlayer,
  createPlayerConnection,
  equipBadgeForPlayer,
  equipCosmeticForPlayer,
  getGameplaySnapshot,
  getShopSessionSnapshot,
  openChestForPlayer,
  processMovementForPlayer,
  purchaseShopItemForPlayer,
  recordChatMessageForPlayer,
  recordNpcTalkForPlayer,
  recordRoomVisitForPlayer,
  sellShopItemForPlayer,
  startQuestForPlayer,
  toPlayerProfile,
  toPublicPlayerState,
  updatePlayerTransform,
  updatePlayerStatus,
} from "./services/playerStateService.ts";
import { closePersistence, initializePersistence, loadPlayerProfile, loadPlayerProfileForAuth, savePlayerProfileForAuth } from "./services/persistenceService.ts";
import { createChatMessage, getRoomHistory, storeChatMessage } from "./services/chatService.ts";
import { clearChatModerationState, moderateChatMessage } from "./services/chatModerationService.ts";
import { DEFAULT_APPEARANCE, normalizeAppearance } from "./services/avatarService.ts";
import { grantAdminBadge } from "./services/badgeService.ts";
import { createHomeState } from "./services/homeStateService.ts";
import { claimDailyLoginReward } from "./services/dailyLoginRewardService.ts";
import { createDailyLoginState } from "./services/dailyLoginRewardService.ts";
import { appendDirectMessage, createDirectMessagesState } from "./services/directMessageService.ts";
import { getRoomHomeLayout, interactWithFurnitureForPlayer, moveFurnitureForPlayer, placeFurnitureForPlayer, removeFurnitureForPlayer, rotateFurnitureForPlayer } from "./services/homeLayoutService.ts";
import { getItemDefinition } from "./services/itemContentService.ts";
import { hasEnoughItems, removeItem } from "./services/inventoryService.ts";
import { claimMailForPlayer, createMailboxState, enqueueGiftMail, enqueueSystemRewardMail } from "./services/mailboxService.ts";
import { canTalkToNpc } from "./services/npcService.ts";
import { areUsersFriends, buildFriendsState, canVisitPlayerHome, respondToFriendRequest, sendFriendRequest } from "./services/friendsService.ts";
import { buildPlayerProfileSummary } from "./services/profileViewService.ts";
import { getActiveWorldEvents, getWorldEventTriggerIntervalMs, maybeTriggerRandomWorldEvent, pruneExpiredWorldEvents } from "./services/worldEventService.ts";
import { getWeatherRotationIntervalMs, getWeatherStateSnapshot, rotateWeatherStates } from "./services/weatherService.ts";
import { claimMiniGameReward } from "./services/miniGameService.ts";
import { cancelTradeForPlayer, executeTrade, getTradeSessionForPlayer, requestTrade, respondToTrade, setTradeConfirmation, updateTradeOffer } from "./services/tradeService.ts";
import { getPartyForPlayer, getPartyMemberIds, leaveParty, requestPartyInvite, respondToPartyInvite, syncPartyMemberRoom } from "./services/partyService.ts";
import { getMuteState, tryHandleAdminCommand } from "./services/adminModerationService.ts";
import { submitPlayerReport } from "./services/reportService.ts";
import { getAnalyticsSummary, getRecentAnalyticsEvents, trackAnalyticsEvent, trackRetentionCheckpoint } from "./services/analyticsService.ts";
import { createTutorialState, markTutorialStep, skipTutorial } from "./services/tutorialService.ts";
import { runPlayerMutation, runPlayerPairMutation } from "./services/playerMutationService.ts";
import { applyPlayerEmote, isValidEmoteId } from "./services/emoteService.ts";
import { logError, logInfo } from "./services/logger.ts";
import {
  validateDirectMessageSendPayload,
  validateCraftPayload,
  validateEmotePayload,
  validateGameplayChestPayload,
  validateGameplayPickupPayload,
  validateGameplayQuestPayload,
  validateMailboxClaimPayload,
  validateMailboxSendGiftPayload,
  validateMiniGameScorePayload,
  validateNpcTalkPayload,
  validatePlayerMovePayload,
  validateProfileStatusPayload,
  validateRoomChangePayload,
  validateShopBuybackPayload,
  validateShopPurchasePayload,
  validateShopSellPayload,
  validateTradeConfirmPayload,
  validateTradeOfferPayload,
  validateTradeRequestPayload,
  validateTradeRespondPayload,
  validateTutorialUpdatePayload,
  validateVisitHomePayload,
} from "./services/socketPayloadValidation.ts";
import { sanitizePlayerName, sanitizeProfileStatus, sanitizeUsername } from "./services/userContentValidation.ts";
import { getQuestDefinition } from "./services/questContentService.ts";
import type { AdminActionResult, AuthContext, ChatMessage, ChatBlockedPayload, CosmeticSlot, FriendsStatePayload, MiniGameRewardResult, PlayerConnection, UnlockNotification, UserRecord } from "./types.ts";
import { SOCKET_EVENTS } from "../../client/src/game/network/socketEvents.js";

const SERVER_ENV = getServerEnv();
const PORT = SERVER_ENV.port;
const ADMIN_BADGE_SECRET = SERVER_ENV.adminBadgeSecret;
const players = new Map<string, PlayerConnection>();
const PLAYER_JOIN_TIMEOUT_MS = 10000;

type AuthenticatedSocket = Socket & {
  data: {
    auth?: AuthContext;
    playerProfileId?: string;
  };
};

function getProfileKey(playerName: string): string {
  return sanitizePlayerName(playerName).toLowerCase();
}

async function persistPlayerState(player: PlayerConnection): Promise<void> {
  await savePlayerProfileForAuth(player.auth, toPlayerProfile(player));
}

function getAuthenticatedPlayer(socket: AuthenticatedSocket): PlayerConnection | null {
  return players.get(socket.id) ?? null;
}

function getPlayerBySubjectId(subjectId: string): PlayerConnection | null {
  return Array.from(players.values()).find((entry) => entry.auth.subjectId === subjectId) ?? null;
}

function emitGameplayState(socket: Socket, player: PlayerConnection): void {
  socket.emit(SOCKET_EVENTS.GAMEPLAY_STATE, getGameplaySnapshot(player.gameplayState));
}

function emitShopSessionState(socket: Socket, player: PlayerConnection): void {
  socket.emit(SOCKET_EVENTS.SHOP_SESSION_STATE, getShopSessionSnapshot(player));
}

function emitHomeState(socket: Socket, player: PlayerConnection): void {
  socket.emit(SOCKET_EVENTS.HOME_STATE, player.homeState);
}

function emitMailboxState(socket: Socket, player: PlayerConnection): void {
  socket.emit(SOCKET_EVENTS.MAILBOX_STATE, player.mailboxState);
}

function emitDirectMessagesState(socket: Socket, player: PlayerConnection): void {
  socket.emit(SOCKET_EVENTS.DIRECT_MESSAGES_STATE, player.directMessagesState);
}

function emitTutorialState(socket: Socket, player: PlayerConnection): void {
  socket.emit(SOCKET_EVENTS.TUTORIAL_STATE, player.tutorialState);
}

function emitPartyStateToPlayers(playerIds: string[]): void {
  playerIds.forEach((playerId) => {
    const playerSocket = io.sockets.sockets.get(playerId);
    if (!playerSocket) {
      return;
    }
    playerSocket.emit(SOCKET_EVENTS.PARTY_STATE, getPartyForPlayer(playerId));
  });
}

function emitTradeStateToPlayers(session: import("./types.ts").TradeSessionState): void {
  Object.keys(session.participants).forEach((playerId) => {
    io.to(playerId).emit(SOCKET_EVENTS.TRADE_STATE, session);
  });
}

function emitTradeClosedToPlayers(playerIds: string[], reason: string, completed = false): void {
  playerIds.forEach((playerId) => {
    io.to(playerId).emit(SOCKET_EVENTS.TRADE_CLOSED, { reason, completed });
  });
}

async function getRoomHomeStatePayload(roomId: string) {
  const ownerProfileId = getHomeOwnerProfileId(roomId);
  const attachOccupants = (entries: Array<Record<string, unknown>>) =>
    entries.map((entry) => {
      const occupant = Array.from(players.values()).find((player) => player.roomId === roomId && player.seatedFurnitureId === entry.id);
      return {
        ...entry,
        interactionState: {
          ...(entry.interactionState as Record<string, unknown> | undefined),
          occupiedByPlayerId: occupant?.id ?? null,
          occupiedByName: occupant?.name ?? null,
        },
      };
    });

  if (!ownerProfileId) {
    return null;
  }

  const liveOwner = Array.from(players.values()).find((entry) => entry.auth.subjectId === ownerProfileId);

  if (liveOwner) {
    return {
      ownerProfileId,
      placedFurniture: attachOccupants(getRoomHomeLayout(liveOwner)),
      lastUpdatedAt: liveOwner.homeState.lastUpdatedAt,
    };
  }

  const ownerUser = await findUserById(ownerProfileId);
  const ownerProfile = ownerUser ? await loadPlayerProfile(ownerUser.username) : null;

  if (!ownerProfile?.homeState) {
    return null;
  }

  return {
    ownerProfileId,
    placedFurniture: attachOccupants(ownerProfile.homeState.placedFurniture ?? []),
    lastUpdatedAt: ownerProfile.homeState.lastUpdatedAt ?? Date.now(),
  };
}

async function emitRoomHomeLayout(roomId: string): Promise<void> {
  io.to(roomId).emit(SOCKET_EVENTS.HOME_LAYOUT_STATE, await getRoomHomeStatePayload(roomId));
}

function emitWorldEventsState(): void {
  io.emit(SOCKET_EVENTS.WORLD_EVENTS_STATE, getActiveWorldEvents());
}

function emitWeatherState(): void {
  io.emit(SOCKET_EVENTS.WEATHER_STATE, getWeatherStateSnapshot());
}

function emitAchievementUnlocks(
  socket: Socket,
  unlockedEntries: Array<{ id: string; title: string; description: string; shortLabel?: string; kind?: UnlockNotification["kind"] }>,
): void {
  unlockedEntries.forEach((entry) => {
    const kind = entry.kind ?? (entry.shortLabel ? "badge" : "achievement");
    const payload: UnlockNotification = {
      id: entry.id,
      title: entry.title,
      description: entry.description,
      kind,
    };
    socket.emit(SOCKET_EVENTS.ACHIEVEMENT_UNLOCKED, payload);
  });
}

function emitRoomChatHistory(socket: Socket, roomId: string): void {
  socket.emit(SOCKET_EVENTS.CHAT_HISTORY, getRoomHistory(roomId));
}

function emitRoomSystemMessage(io: Server, roomId: string, text: string): void {
  const message = createChatMessage({
    name: "System",
    text,
    kind: "system",
    roomId,
  });
  storeChatMessage(roomId, message);
  io.to(roomId).emit(SOCKET_EVENTS.CHAT_MESSAGE, message);
}

function emitChatBlocked(socket: Socket, error: ChatBlockedPayload): void {
  socket.emit(SOCKET_EVENTS.CHAT_BLOCKED, error);
}

function emitAdminActionResult(socket: Socket, payload: AdminActionResult): void {
  socket.emit(SOCKET_EVENTS.ADMIN_ACTION_RESULT, payload);
}

function getQuestCompletionDelta(player: PlayerConnection, previousCompletedQuestIds: string[]): string[] {
  const previousIds = new Set(previousCompletedQuestIds);
  return (player.gameplayState.quest.completedQuestIds ?? []).filter((questId) => !previousIds.has(questId));
}

function trackQuestCompletionDelta(player: PlayerConnection, previousCompletedQuestIds: string[], source: string): void {
  const completedQuestIds = getQuestCompletionDelta(player, previousCompletedQuestIds);
  completedQuestIds.forEach((questId) => {
    const questDefinition = getQuestDefinition(questId);
    trackAnalyticsEvent("quest_completed", {
      source,
      playerId: player.auth.subjectId,
      playerName: player.name,
      roomId: player.roomId,
      questId,
      questTitle: questDefinition?.title ?? questId,
    });
  });
}

function trackFriendAdded(userId: string, playerName: string, otherUserId: string): void {
  trackAnalyticsEvent("friend_added", {
    playerId: userId,
    playerName,
    otherUserId,
  });
}

function getPlayersInRoom(roomId: string) {
  return Array.from(players.values())
    .filter((player) => player.roomId === roomId)
    .map(toPublicPlayerState);
}

async function movePlayerToRoom(player: PlayerConnection, socket: AuthenticatedSocket, targetRoomId: string, systemMessage?: string): Promise<void> {
  const previousRoomId = player.roomId;
  player.seatedFurnitureId = null;
  const nextRoom = getRoomPayload(targetRoomId, player.name);
  const nextSpawn = getSpawnPosition(targetRoomId);

  socket.leave(previousRoomId);
  socket.to(previousRoomId).emit(SOCKET_EVENTS.PLAYER_LEFT, { id: player.id });

  player.roomId = nextRoom.id;
  player.x = nextSpawn.x;
  player.y = nextSpawn.y;
  player.flipX = false;
  const dailyQuestUnlocks = recordRoomVisitForPlayer(player, nextRoom.id);
  const partyAfterMove = syncPartyMemberRoom(player);

  socket.join(player.roomId);
  socket.to(player.roomId).emit(SOCKET_EVENTS.PLAYER_JOINED, toPublicPlayerState(player));
  emitRoomSystemMessage(io, previousRoomId, `${player.name} ${nextRoom.name} odasina gitti.`);
  emitRoomSystemMessage(io, player.roomId, systemMessage ?? `${player.name} ${getRoom(previousRoomId, player.name).name} odasindan geldi.`);

  await persistPlayerState(player);
  trackAnalyticsEvent("room_enter", {
    source: "room_change",
    playerId: player.auth.subjectId,
    playerName: player.name,
    roomId: player.roomId,
    roomName: nextRoom.name,
    previousRoomId,
  });

  socket.emit(SOCKET_EVENTS.ROOM_CHANGED, {
    room: nextRoom,
    player: toPublicPlayerState(player),
    players: getPlayersInRoom(player.roomId),
    messages: getRoomHistory(player.roomId),
    gameplayState: getGameplaySnapshot(player.gameplayState),
    homeState: player.homeState,
    roomHomeState: await getRoomHomeStatePayload(player.roomId),
    worldEvents: getActiveWorldEvents(),
    weatherState: getWeatherStateSnapshot(),
  });
  emitRoomChatHistory(socket, player.roomId);
  await emitRoomHomeLayout(previousRoomId);
  await emitRoomHomeLayout(player.roomId);
  if (dailyQuestUnlocks.length) {
    emitGameplayState(socket, player);
    emitAchievementUnlocks(socket, dailyQuestUnlocks);
  }
  await emitFriendsStateToUserAndFriends(player.auth.subjectId);
  if (partyAfterMove) {
    emitPartyStateToPlayers(partyAfterMove.members.map((entry) => entry.playerId));
  }
}

function getRoomPayload(roomId: string, ownerName?: string | null) {
  return getRoom(roomId, ownerName);
}

function getPresenceByUserId(userId: string) {
  const onlinePlayer = Array.from(players.values()).find((player) => player.auth.subjectId === userId);

  if (!onlinePlayer) {
    return {
      isOnline: false,
      roomId: null,
      roomName: null,
    };
  }

    return {
      isOnline: true,
      roomId: onlinePlayer.roomId,
      roomName: getRoom(onlinePlayer.roomId, onlinePlayer.name).name,
    };
  }

function getSocketsForUserId(userId: string): AuthenticatedSocket[] {
  return Array.from(io.sockets.sockets.values()).filter((entry) => (entry as AuthenticatedSocket).data.auth?.subjectId === userId) as AuthenticatedSocket[];
}

async function removePlayerConnection(socket: AuthenticatedSocket, reason = "Baglanti kapatildi."): Promise<void> {
  const player = getAuthenticatedPlayer(socket);

  if (!player) {
    socket.data.playerProfileId = undefined;
    return;
  }

  players.delete(socket.id);
  socket.data.playerProfileId = undefined;
  clearChatModerationState(player.profileKey);
  const closedTrade = cancelTradeForPlayer(player.id, "Bir oyuncu ayrildigi icin trade iptal edildi.");
  const partyLeave = leaveParty(player.id);
  socket.leave(player.roomId);
  socket.to(player.roomId).emit(SOCKET_EVENTS.PLAYER_LEFT, { id: socket.id });
  emitRoomSystemMessage(io, player.roomId, `${player.name} ${reason}`);

  if (closedTrade) {
    emitTradeClosedToPlayers(closedTrade.participants, closedTrade.reason);
  }

  emitPartyStateToPlayers([...new Set([...partyLeave.closedMemberIds, ...partyLeave.partiesToEmit.flatMap((entry) => entry.members.map((member) => member.playerId))])]);
  await emitRoomHomeLayout(player.roomId);
  await emitFriendsStateToUserAndFriends(player.auth.subjectId);
}

async function disconnectExistingSessionsForSubject(subjectId: string, currentSocketId: string): Promise<void> {
  const sockets = getSocketsForUserId(subjectId).filter((entry) => entry.id !== currentSocketId);

  for (const staleSocket of sockets) {
    await removePlayerConnection(staleSocket, "oturumu baska bir yerde acti.");
    staleSocket.disconnect(true);
  }
}

async function getRegisteredUserFromAuth(auth: AuthContext): Promise<UserRecord | null> {
  if (auth.isGuest) {
    return null;
  }

  return findUserByUsername(auth.username);
}

async function emitFriendsStateToUserId(userId: string): Promise<void> {
  const user = await findUserById(userId);

  if (!user) {
    return;
  }

  const payload: FriendsStatePayload = await buildFriendsState(user.id, findUserById, getPresenceByUserId);
  getSocketsForUserId(userId).forEach((entry) => {
    entry.emit(SOCKET_EVENTS.FRIENDS_STATE, payload);
  });
}

async function emitMailboxStateToUserId(userId: string): Promise<void> {
  getSocketsForUserId(userId).forEach((entry) => {
    const player = players.get(entry.id);
    if (player) {
      emitMailboxState(entry, player);
    }
  });
}

async function emitFriendsStateToUserAndFriends(userId: string): Promise<void> {
  await emitFriendsStateToUserId(userId);
  const state = await buildFriendsState(userId, findUserById, getPresenceByUserId);
  const relatedUserIds = [...state.friends, ...state.incomingRequests, ...state.outgoingRequests].map((entry) => entry.playerId);

  for (const friendId of relatedUserIds) {
    await emitFriendsStateToUserId(friendId);
  }
}

function emitFriendsError(socket: Socket, message: string): void {
  socket.emit(SOCKET_EVENTS.FRIENDS_ERROR, { message });
}

function getHttpAuthContext(request: { headers: Record<string, string | string[] | undefined> }): AuthContext | null {
  const authorizationHeader = request.headers.authorization;
  const rawValue = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  const token = String(rawValue ?? "").replace(/^Bearer\s+/i, "");
  return authenticateToken(token);
}

function getAdminSecret(request: { headers: Record<string, string | string[] | undefined> }): string {
  const header = request.headers["x-admin-secret"];
  return String(Array.isArray(header) ? header[0] : header ?? "");
}

const httpServer = createServer((request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const readJsonBody = async () => {
    const chunks = [];
    for await (const chunk of request) {
      chunks.push(chunk);
    }

    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  };

  const sendJson = (statusCode: number, payload: unknown) => {
    response.writeHead(statusCode, { "Content-Type": "application/json" });
    response.end(JSON.stringify(payload));
  };

  if (request.method === "POST" && request.url === "/auth/register") {
    void readJsonBody()
      .then(async (body) => {
        const result = await registerAccount(body.username, body.password, body.playerName ?? body.username);
        trackAnalyticsEvent("player_login", {
          method: "register",
          playerId: result.auth.subjectId,
          username: result.auth.username,
          displayName: result.auth.displayName,
          guest: false,
        });
        sendJson(200, {
          token: result.token,
          playerName: result.auth.displayName,
          guest: false,
        });
      })
      .catch((error) => {
        sendJson(400, { error: error instanceof Error ? error.message : "Kayit basarisiz." });
      });
    return;
  }

  if (request.method === "POST" && request.url === "/auth/login") {
    void readJsonBody()
      .then(async (body) => {
        const result = await loginAccount(body.username, body.password);
        trackAnalyticsEvent("player_login", {
          method: "login",
          playerId: result.auth.subjectId,
          username: result.auth.username,
          displayName: result.auth.displayName,
          guest: false,
        });
        sendJson(200, {
          token: result.token,
          playerName: result.auth.displayName,
          guest: false,
        });
      })
      .catch((error) => {
        sendJson(401, { error: error instanceof Error ? error.message : "Giris basarisiz." });
      });
    return;
  }

  if (request.method === "POST" && request.url === "/auth/guest") {
    void readJsonBody()
      .then((body) => {
        const result = createGuestLogin(body.playerName);
        trackAnalyticsEvent("player_login", {
          method: "guest",
          playerId: result.auth.subjectId,
          username: result.auth.username,
          displayName: result.auth.displayName,
          guest: true,
        });
        sendJson(200, {
          token: result.token,
          playerName: result.auth.displayName,
          guest: true,
        });
      })
      .catch(() => {
        sendJson(400, { error: "Misafir girisi basarisiz." });
      });
    return;
  }

  if (request.method === "GET" && request.url === "/player/bootstrap") {
    const auth = getHttpAuthContext(request);

    if (!auth) {
      sendJson(401, { error: "Oturum dogrulanamadi." });
      return;
    }

    void loadPlayerProfileForAuth(auth)
      .then((profile) => {
        sendJson(200, {
          playerName: auth.displayName,
      appearance: normalizeAppearance(profile?.appearance ?? DEFAULT_APPEARANCE),
      cosmetics: profile?.gameplayState?.cosmetics,
      statusText: profile?.statusText ?? "",
      homeState: profile?.homeState ?? null,
      tutorialState: profile?.tutorialState ?? createTutorialState(),
      roomId: profile?.roomId ?? "town",
    });
      })
      .catch((error) => {
        sendJson(500, { error: error instanceof Error ? error.message : "Profil yuklenemedi." });
      });
    return;
  }

  if (request.method === "POST" && request.url === "/player/appearance") {
    const auth = getHttpAuthContext(request);

    if (!auth) {
      sendJson(401, { error: "Oturum dogrulanamadi." });
      return;
    }

    void readJsonBody()
      .then(async (body) => {
        const existingProfile = await loadPlayerProfileForAuth(auth);
        const appearance = normalizeAppearance(body?.appearance);
        const profile = {
          name: existingProfile?.name ?? auth.displayName,
          roomId: existingProfile?.roomId ?? "town",
          appearance,
          statusText: existingProfile?.statusText ?? "",
          homeState: existingProfile?.homeState ?? createHomeState(auth.subjectId),
          tutorialState: existingProfile?.tutorialState ?? createTutorialState(),
          dailyLoginState: existingProfile?.dailyLoginState ?? createDailyLoginState(),
          mailboxState: existingProfile?.mailboxState ?? createMailboxState(),
          gameplayState: existingProfile?.gameplayState ?? createPlayerConnection("bootstrap", auth.displayName, auth.subjectId, null).gameplayState,
        };
        profile.gameplayState.cosmetics.equipped = appearance;

        await savePlayerProfileForAuth(auth, profile);
        sendJson(200, { appearance, cosmetics: profile.gameplayState.cosmetics });
      })
      .catch((error) => {
        sendJson(400, { error: error instanceof Error ? error.message : "Gorunum kaydedilemedi." });
      });
    return;
  }

  if (request.method === "GET" && request.url === "/admin/analytics/summary") {
    if (!ADMIN_BADGE_SECRET || getAdminSecret(request) !== ADMIN_BADGE_SECRET) {
      sendJson(403, { error: "Yonetici yetkisi gerekli." });
      return;
    }

    sendJson(200, getAnalyticsSummary(players.size));
    return;
  }

  if (request.method === "GET" && request.url?.startsWith("/admin/analytics/events")) {
    if (!ADMIN_BADGE_SECRET || getAdminSecret(request) !== ADMIN_BADGE_SECRET) {
      sendJson(403, { error: "Yonetici yetkisi gerekli." });
      return;
    }

    const url = new URL(request.url, "http://localhost");
    const limit = Number(url.searchParams.get("limit") ?? 100);
    sendJson(200, {
      events: getRecentAnalyticsEvents(limit),
    });
    return;
  }

  if (request.method === "POST" && request.url === "/admin/badges/assign") {
    if (!ADMIN_BADGE_SECRET || getAdminSecret(request) !== ADMIN_BADGE_SECRET) {
      sendJson(403, { error: "Yonetici yetkisi gerekli." });
      return;
    }

    void readJsonBody()
      .then(async (body) => {
        const username = sanitizeUsername(body?.username);
        const badgeId = String(body?.badgeId ?? "").trim();

        if (!username || !badgeId) {
          sendJson(400, { error: "username ve badgeId gerekli." });
          return;
        }

        const user = await findUserByUsername(username);
        if (!user) {
          sendJson(404, { error: "Oyuncu bulunamadi." });
          return;
        }

        const livePlayer = Array.from(players.values()).find((player) => player.auth.username === username) ?? null;

        if (livePlayer) {
          const unlocked = grantAdminBadge(livePlayer.gameplayState, badgeId);
          if (!unlocked) {
            sendJson(400, { error: "Badge atanamadi." });
            return;
          }
          await persistPlayerState(livePlayer);
          getSocketsForUserId(user.id).forEach((entry) => {
            emitGameplayState(entry, livePlayer);
            emitAchievementUnlocks(entry, [unlocked]);
          });
          io.to(livePlayer.roomId).emit(SOCKET_EVENTS.PLAYER_MOVED, toPublicPlayerState(livePlayer));
          sendJson(200, { ok: true, badgeId });
          return;
        }

        const authContext: AuthContext = {
          subjectId: user.id,
          username: user.username,
          displayName: user.displayName,
          isGuest: false,
        };
        const profile = await loadPlayerProfileForAuth(authContext);
        if (!profile) {
          sendJson(404, { error: "Oyuncu profili bulunamadi." });
          return;
        }
        const unlocked = grantAdminBadge(profile.gameplayState, badgeId);
        if (!unlocked) {
          sendJson(400, { error: "Badge atanamadi." });
          return;
        }
        await savePlayerProfileForAuth(authContext, profile);
        sendJson(200, { ok: true, badgeId });
      })
      .catch((error) => {
        sendJson(400, { error: error instanceof Error ? error.message : "Badge atanamadi." });
      });
    return;
  }

  if (request.url === "/health") {
    sendJson(200, { ok: true, players: players.size });
    return;
  }

  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("Social RPG Socket.IO server");
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

io.use((socket: AuthenticatedSocket, next) => {
  const token = socket.handshake.auth?.token;
  const auth = authenticateToken(token);

  if (!auth) {
    next(new Error("Unauthorized"));
    return;
  }

  socket.data.auth = auth;
  next();
});

io.on("connection", (socket: AuthenticatedSocket) => {
  const joinTimeout = setTimeout(() => {
    if (!getAuthenticatedPlayer(socket)) {
      socket.disconnect(true);
    }
  }, PLAYER_JOIN_TIMEOUT_MS);

  socket.on(SOCKET_EVENTS.PLAYER_JOIN, async ({ appearance }: { name?: string; appearance?: unknown }) => {
    const auth = socket.data.auth as AuthContext;

    await runPlayerMutation(auth.subjectId, async () => {
      const normalizedName = sanitizePlayerName(auth.displayName);
      const profileKey = auth.subjectId;
      await disconnectExistingSessionsForSubject(auth.subjectId, socket.id);
      const profile = await loadPlayerProfileForAuth(auth);
      const dailyLoginReward = profile ? claimDailyLoginReward(profile) : null;
      const player = attachAuthContext(
        createPlayerConnection(socket.id, normalizedName, profileKey, profile, appearance as Record<string, string>),
        auth,
      );

      if (dailyLoginReward) {
        enqueueSystemRewardMail(
          player.mailboxState,
          dailyLoginReward.subject ?? `Gun ${dailyLoginReward.rewardDay} giris odulu`,
          `Seri ${dailyLoginReward.streakCount}. gunune ulasti. Odulunu mailbox'tan claim edebilirsin.`,
          dailyLoginReward.rewards,
        );
      }

      if (!socket.connected) {
        return;
      }

      players.set(socket.id, player);
      socket.data.playerProfileId = player.profileKey;
      clearTimeout(joinTimeout);
      socket.join(player.roomId);
      if (!auth.isGuest) {
        await persistPlayerState(player);
      }
      trackAnalyticsEvent("room_enter", {
        source: "initial_join",
        playerId: player.auth.subjectId,
        playerName: player.name,
        roomId: player.roomId,
        roomName: getRoomPayload(player.roomId, player.name).name,
      });
      trackRetentionCheckpoint({
        playerId: player.auth.subjectId,
        playerName: player.name,
        roomId: player.roomId,
        firstSessionAt: player.tutorialState.startedAt,
        guest: player.auth.isGuest,
      });

      socket.emit(SOCKET_EVENTS.WORLD_INIT, {
        selfId: socket.id,
        room: getRoomPayload(player.roomId, player.name),
        players: getPlayersInRoom(player.roomId),
        messages: getRoomHistory(player.roomId),
        gameplayState: getGameplaySnapshot(player.gameplayState),
        homeState: player.homeState,
        tutorialState: player.tutorialState,
        roomHomeState: await getRoomHomeStatePayload(player.roomId),
        worldEvents: getActiveWorldEvents(),
        weatherState: getWeatherStateSnapshot(),
        dailyLoginReward,
        mailboxState: player.mailboxState,
        directMessagesState: player.directMessagesState,
      });
      emitShopSessionState(socket, player);
      emitHomeState(socket, player);
      emitTutorialState(socket, player);
      emitMailboxState(socket, player);
      emitDirectMessagesState(socket, player);
      await emitRoomHomeLayout(player.roomId);
      emitRoomChatHistory(socket, player.roomId);
      await emitFriendsStateToUserAndFriends(auth.subjectId);

      socket.to(player.roomId).emit(SOCKET_EVENTS.PLAYER_JOINED, toPublicPlayerState(player));
      emitRoomSystemMessage(io, player.roomId, `${player.name} odaya katildi.`);
    });
  });

  socket.on(SOCKET_EVENTS.PLAYER_MOVE, async (rawPayload: unknown) => {
    const player = getAuthenticatedPlayer(socket);
    const payload = validatePlayerMovePayload(rawPayload);

    if (!player || player.seatedFurnitureId || !payload) {
      return;
    }

    const parsedInputSequence = Number(payload.inputSequence);
    player.lastProcessedInputSequence = Number.isFinite(parsedInputSequence) ? parsedInputSequence : null;
    updatePlayerTransform(player, payload.x, payload.y, payload.flipX);
    io.to(player.roomId).emit(SOCKET_EVENTS.PLAYER_MOVED, toPublicPlayerState(player));

    const previousCompletedQuestIds = [...(player.gameplayState.quest.completedQuestIds ?? [])];
    const unlocked = processMovementForPlayer(player);
    if (unlocked.length > 0) {
      await persistPlayerState(player);
      emitGameplayState(socket, player);
      emitAchievementUnlocks(socket, unlocked);
    }
    trackQuestCompletionDelta(player, previousCompletedQuestIds, "movement");
  });

  socket.on(SOCKET_EVENTS.GAMEPLAY_START_QUEST, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateGameplayQuestPayload(rawPayload);

    if (!auth || !payload) {
      return;
    }

    await runPlayerMutation(auth.subjectId, async () => {
      const player = getAuthenticatedPlayer(socket);
      if (!player || !startQuestForPlayer(player, payload.questId)) {
        return;
      }

      await persistPlayerState(player);
      emitGameplayState(socket, player);
      const questDefinition = getQuestDefinition(payload.questId);
      trackAnalyticsEvent("quest_accepted", {
        playerId: player.auth.subjectId,
        playerName: player.name,
        roomId: player.roomId,
        questId: payload.questId,
        questTitle: questDefinition?.title ?? payload.questId,
      });
    });
  });

  socket.on(SOCKET_EVENTS.GAMEPLAY_COLLECT_PICKUP, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateGameplayPickupPayload(rawPayload);

    if (!auth || !payload) {
      return;
    }

    await runPlayerMutation(auth.subjectId, async () => {
      const player = getAuthenticatedPlayer(socket);
      const previousCompletedQuestIds = player ? [...(player.gameplayState.quest.completedQuestIds ?? [])] : [];
      const unlocked = player ? collectPickupForPlayer(player, payload.pickupId) : null;

      if (!player || !unlocked) {
        return;
      }

      await persistPlayerState(player);
      emitGameplayState(socket, player);
      emitAchievementUnlocks(socket, unlocked);
      trackQuestCompletionDelta(player, previousCompletedQuestIds, "pickup");
    });
  });

  socket.on(SOCKET_EVENTS.GAMEPLAY_OPEN_CHEST, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateGameplayChestPayload(rawPayload);

    if (!auth || !payload) {
      return;
    }

    await runPlayerMutation(auth.subjectId, async () => {
      const player = getAuthenticatedPlayer(socket);
      const previousCompletedQuestIds = player ? [...(player.gameplayState.quest.completedQuestIds ?? [])] : [];
      const chestResult = player ? openChestForPlayer(player, payload.chestId) : null;

      if (!player || !chestResult) {
        return;
      }

      await persistPlayerState(player);
      emitGameplayState(socket, player);
      socket.emit(SOCKET_EVENTS.CHEST_LOOT_RESULT, {
        chestId: payload.chestId,
        rewards: chestResult.rewards,
      });
      emitAchievementUnlocks(socket, chestResult.unlocks);
      trackAnalyticsEvent("chest_opened", {
        playerId: player.auth.subjectId,
        playerName: player.name,
        roomId: player.roomId,
        chestId: payload.chestId,
        rewardCount: chestResult.rewards.length,
      });
      trackQuestCompletionDelta(player, previousCompletedQuestIds, "chest");
    });
  });

  socket.on(SOCKET_EVENTS.SHOP_PURCHASE, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateShopPurchasePayload(rawPayload);

    if (!auth || !payload) {
      return;
    }

    await runPlayerMutation(auth.subjectId, async () => {
      const player = getAuthenticatedPlayer(socket);
      if (!player) {
        return;
      }

      const result = purchaseShopItemForPlayer(player, payload.shopId, payload.shopItemId);

      if (!result.ok) {
        socket.emit(SOCKET_EVENTS.SHOP_PURCHASE_RESULT, result);
        return;
      }

      await persistPlayerState(player);
      emitGameplayState(socket, player);
      emitShopSessionState(socket, player);
      socket.emit(SOCKET_EVENTS.SHOP_PURCHASE_RESULT, result);
      trackAnalyticsEvent("item_purchased", {
        playerId: player.auth.subjectId,
        playerName: player.name,
        roomId: player.roomId,
        shopId: payload.shopId,
        shopItemId: payload.shopItemId,
        itemId: result.itemId ?? null,
        label: result.label ?? null,
        amount: result.amount ?? 0,
        price: result.price ?? 0,
        kind: result.kind ?? "inventory",
      });
    });
  });

  socket.on(SOCKET_EVENTS.SHOP_SELL, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateShopSellPayload(rawPayload);

    if (!auth || !payload) {
      return;
    }

    await runPlayerMutation(auth.subjectId, async () => {
      const player = getAuthenticatedPlayer(socket);
      if (!player) {
        return;
      }

      const result = sellShopItemForPlayer(player, payload.shopId, payload.itemId, payload.quantity);

      if (!result.ok) {
        socket.emit(SOCKET_EVENTS.SHOP_SELL_RESULT, result);
        return;
      }

      await persistPlayerState(player);
      emitGameplayState(socket, player);
      emitShopSessionState(socket, player);
      socket.emit(SOCKET_EVENTS.SHOP_SELL_RESULT, result);
    });
  });

  socket.on(SOCKET_EVENTS.SHOP_BUYBACK, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateShopBuybackPayload(rawPayload);

    if (!auth || !payload) {
      return;
    }

    await runPlayerMutation(auth.subjectId, async () => {
      const player = getAuthenticatedPlayer(socket);
      if (!player) {
        return;
      }

      const result = buybackShopItemForPlayer(player, payload.shopId, payload.buybackEntryId);

      if (!result.ok) {
        socket.emit(SOCKET_EVENTS.SHOP_BUYBACK_RESULT, result);
        return;
      }

      await persistPlayerState(player);
      emitGameplayState(socket, player);
      emitShopSessionState(socket, player);
      socket.emit(SOCKET_EVENTS.SHOP_BUYBACK_RESULT, result);
    });
  });

  socket.on(SOCKET_EVENTS.CRAFT_REQUEST, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateCraftPayload(rawPayload);

    if (!auth || !payload) {
      return;
    }

    await runPlayerMutation(auth.subjectId, async () => {
      const player = getAuthenticatedPlayer(socket);
      if (!player) {
        return;
      }

      const result = craftRecipeForPlayer(player, payload.recipeId);

      if (!result.ok) {
        socket.emit(SOCKET_EVENTS.CRAFT_RESULT, result);
        return;
      }

      await persistPlayerState(player);
      emitGameplayState(socket, player);
      socket.emit(SOCKET_EVENTS.CRAFT_RESULT, result);
    });
  });

  socket.on(SOCKET_EVENTS.MAILBOX_CLAIM, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateMailboxClaimPayload(rawPayload);

    if (!auth || !payload) {
      return;
    }

    await runPlayerMutation(auth.subjectId, async () => {
      const player = getAuthenticatedPlayer(socket);
      if (!player) {
        return;
      }

      const entry = claimMailForPlayer(player, payload.mailId);
      if (!entry) {
        socket.emit(SOCKET_EVENTS.MAILBOX_ERROR, { message: "Posta alinmadi." });
        return;
      }

      await persistPlayerState(player);
      emitMailboxState(socket, player);
      emitGameplayState(socket, player);
    });
  });

  socket.on(
    SOCKET_EVENTS.MAILBOX_SEND_GIFT,
    async (rawPayload: unknown) => {
      const auth = socket.data.auth;
      const payload = validateMailboxSendGiftPayload(rawPayload);

      if (!auth || !payload) {
        return;
      }

      await runPlayerPairMutation([auth.subjectId, payload.targetUserId], async () => {
        const player = getAuthenticatedPlayer(socket);

        if (!player) {
          return;
        }

        if (player.auth.isGuest) {
          socket.emit(SOCKET_EVENTS.MAILBOX_ERROR, { message: "Misafir hesaplar hediye gonderemez." });
          return;
        }

        if (!(await areUsersFriends(player.auth.subjectId, payload.targetUserId))) {
          socket.emit(SOCKET_EVENTS.MAILBOX_ERROR, { message: "Yalnizca arkadaslara hediye gonderebilirsin." });
          return;
        }

        if (payload.itemId === "coin" || !hasEnoughItems(player.gameplayState, payload.itemId, payload.quantity)) {
          socket.emit(SOCKET_EVENTS.MAILBOX_ERROR, { message: "Yeterli esya yok." });
          return;
        }

        const itemDefinition = getItemDefinition(payload.itemId);
        const targetUser = await findUserById(payload.targetUserId);

        if (!itemDefinition || !targetUser) {
          socket.emit(SOCKET_EVENTS.MAILBOX_ERROR, { message: "Hediye gonderilemedi." });
          return;
        }

        const targetAuth: AuthContext = {
          subjectId: targetUser.id,
          username: targetUser.username,
          displayName: targetUser.displayName,
          isGuest: false,
        };
        const targetProfile = await loadPlayerProfileForAuth(targetAuth);

        if (!targetProfile) {
          socket.emit(SOCKET_EVENTS.MAILBOX_ERROR, { message: "Alici profili bulunamadi." });
          return;
        }

        removeItem(player.gameplayState, payload.itemId, payload.quantity);
        targetProfile.mailboxState = createMailboxState(targetProfile.mailboxState);
        enqueueGiftMail(
          targetProfile.mailboxState,
          player.auth.subjectId,
          player.name,
          `${player.name} sana hediye gonderdi`,
          sanitizeProfileStatus(payload.message) || `${itemDefinition.label} hediyesi`,
          {
            items: [{ itemId: payload.itemId, amount: payload.quantity }],
          },
        );

        const liveTargetPlayer = getPlayerBySubjectId(targetUser.id);
        if (liveTargetPlayer) {
          liveTargetPlayer.mailboxState = createMailboxState(targetProfile.mailboxState);
        }

        await persistPlayerState(player);
        await savePlayerProfileForAuth(targetAuth, targetProfile);
        emitGameplayState(socket, player);
        emitMailboxState(socket, player);
        await emitMailboxStateToUserId(targetUser.id);
      });
    },
  );

  socket.on(SOCKET_EVENTS.TRADE_REQUEST, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateTradeRequestPayload(rawPayload);

    if (!auth || !payload) {
      return;
    }

    await runPlayerMutation(auth.subjectId, async () => {
      const player = getAuthenticatedPlayer(socket);
      const targetPlayer =
        players.get(payload.targetPlayerId) ?? Array.from(players.values()).find((entry) => entry.auth.subjectId === payload.targetPlayerId) ?? null;

      if (!player || !targetPlayer) {
        return;
      }

      const isFriend =
        !player.auth.isGuest && !targetPlayer.auth.isGuest
          ? await areUsersFriends(player.auth.subjectId, targetPlayer.auth.subjectId)
          : false;
      const result = requestTrade(player, targetPlayer, isFriend);

      if (!result.ok) {
        socket.emit(SOCKET_EVENTS.TRADE_ERROR, { message: result.message });
        return;
      }

      emitTradeStateToPlayers(result.session);
    });
  });

  socket.on(SOCKET_EVENTS.TRADE_RESPOND, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateTradeRespondPayload(rawPayload);

    if (!auth || !payload) {
      return;
    }

    await runPlayerMutation(auth.subjectId, async () => {
      const player = getAuthenticatedPlayer(socket);

      if (!player) {
        return;
      }

      const result = respondToTrade(player.id, payload.accept);
      if (!result.ok) {
        socket.emit(SOCKET_EVENTS.TRADE_ERROR, { message: result.message });
        return;
      }

      if (result.closed) {
        emitTradeClosedToPlayers(result.closed.participants, result.closed.reason);
        return;
      }

      if (result.session) {
        emitTradeStateToPlayers(result.session);
      }
    });
  });

  socket.on(SOCKET_EVENTS.TRADE_OFFER_UPDATE, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateTradeOfferPayload(rawPayload);

    if (!auth || !payload) {
      return;
    }

    await runPlayerMutation(auth.subjectId, async () => {
      const player = getAuthenticatedPlayer(socket);

      if (!player) {
        return;
      }

      const result = updateTradeOffer(player, payload.offer);
      if (!result.ok) {
        socket.emit(SOCKET_EVENTS.TRADE_ERROR, { message: result.message });
        return;
      }

      emitTradeStateToPlayers(result.session);
    });
  });

  socket.on(SOCKET_EVENTS.TRADE_CONFIRM, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateTradeConfirmPayload(rawPayload);

    if (!auth || !payload) {
      return;
    }

    const participantSubjectIds = [auth.subjectId];
    const requesterPlayer = getAuthenticatedPlayer(socket);
    const existingTradeState = requesterPlayer ? getTradeSessionForPlayer(requesterPlayer.id) : null;
    if (existingTradeState) {
      Object.keys(existingTradeState.participants).forEach((playerId) => {
        const tradePlayer = players.get(playerId);
        if (tradePlayer) {
          participantSubjectIds.push(tradePlayer.auth.subjectId);
        }
      });
    }

    await runPlayerPairMutation(participantSubjectIds, async () => {
      const player = getAuthenticatedPlayer(socket);

      if (!player) {
        return;
      }

      const result = setTradeConfirmation(player.id, payload.confirmed);
      if (!result.ok) {
        socket.emit(SOCKET_EVENTS.TRADE_ERROR, { message: result.message });
        return;
      }

      if (result.session) {
        emitTradeStateToPlayers(result.session);
      }

      if (!result.shouldComplete || !result.session) {
        return;
      }

      const execution = executeTrade(result.session.id, players);
      const participantIds = Object.keys(result.session.participants);

      if (!execution.ok) {
        emitTradeClosedToPlayers(participantIds, execution.message);
        return;
      }

      for (const playerId of participantIds) {
        const tradePlayer = players.get(playerId);
        const tradeSocket = io.sockets.sockets.get(playerId);
        if (tradePlayer && tradeSocket) {
          await persistPlayerState(tradePlayer);
          emitGameplayState(tradeSocket, tradePlayer);
        }
      }

      emitTradeClosedToPlayers(participantIds, "Trade tamamlandi.", true);
    });
  });

  socket.on(SOCKET_EVENTS.TRADE_CANCEL, () => {
    const player = getAuthenticatedPlayer(socket);

    if (!player) {
      return;
    }

    const closed = cancelTradeForPlayer(player.id, "Trade iptal edildi.");
    if (closed) {
      emitTradeClosedToPlayers(closed.participants, closed.reason);
    }
  });

  socket.on(SOCKET_EVENTS.MINIGAME_SCORE_SUBMIT, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateMiniGameScorePayload(rawPayload);

    if (!auth || !payload) {
      return;
    }

    await runPlayerMutation(auth.subjectId, async () => {
      const player = getAuthenticatedPlayer(socket);

      if (!player) {
        return;
      }

      const result: MiniGameRewardResult = claimMiniGameReward(player, payload.miniGameId, payload.score);
      socket.emit(SOCKET_EVENTS.MINIGAME_RESULT, result);

      if (!result.ok) {
        return;
      }

      await persistPlayerState(player);
      emitGameplayState(socket, player);
      trackAnalyticsEvent("minigame_played", {
        playerId: player.auth.subjectId,
        playerName: player.name,
        roomId: player.roomId,
        miniGameId: result.miniGameId ?? payload.miniGameId,
        score: result.score ?? 0,
        coins: result.coins ?? 0,
        xp: result.xp ?? 0,
        rankLabel: result.rankLabel ?? null,
      });
    });
  });

  socket.on(SOCKET_EVENTS.COSMETIC_EQUIP, async ({ slot, cosmeticId }: { slot?: CosmeticSlot; cosmeticId?: string }) => {
    const player = getAuthenticatedPlayer(socket);

    if (!player || !slot || !cosmeticId || !equipCosmeticForPlayer(player, slot, cosmeticId)) {
      return;
    }

    await persistPlayerState(player);
    emitGameplayState(socket, player);
    socket.to(player.roomId).emit(SOCKET_EVENTS.PLAYER_MOVED, toPublicPlayerState(player));
  });

  socket.on(SOCKET_EVENTS.BADGE_EQUIP, async ({ badgeId }: { badgeId?: string | null }) => {
    const player = getAuthenticatedPlayer(socket);

    if (!player || !equipBadgeForPlayer(player, badgeId ?? null)) {
      return;
    }

    await persistPlayerState(player);
    emitGameplayState(socket, player);
    socket.to(player.roomId).emit(SOCKET_EVENTS.PLAYER_MOVED, toPublicPlayerState(player));
  });

  socket.on(SOCKET_EVENTS.FRIEND_REQUEST_SEND, async ({ playerName }: { playerName?: string }) => {
    const auth = socket.data.auth as AuthContext;
    const user = await getRegisteredUserFromAuth(auth);

    if (!user) {
      emitFriendsError(socket, "Misafir hesaplar arkadas sistemini kullanamaz.");
      return;
    }

    const result = await sendFriendRequest(user, playerName ?? "");

    if (!result.ok) {
      emitFriendsError(socket, result.message);
      return;
    }

    const updatedState = await buildFriendsState(user.id, findUserById, getPresenceByUserId);
    if (updatedState.friends.some((entry) => entry.playerId === result.targetUserId)) {
      trackFriendAdded(user.id, user.displayName, result.targetUserId);
      const targetUser = await findUserById(result.targetUserId);
      if (targetUser) {
        trackFriendAdded(targetUser.id, targetUser.displayName, user.id);
      }
    }

    await emitFriendsStateToUserAndFriends(user.id);
    await emitFriendsStateToUserAndFriends(result.targetUserId);
  });

  socket.on(SOCKET_EVENTS.FRIEND_REQUEST_RESPOND, async ({ playerId, action }: { playerId?: string; action?: string }) => {
    const auth = socket.data.auth as AuthContext;
    const user = await getRegisteredUserFromAuth(auth);

    if (!user) {
      emitFriendsError(socket, "Misafir hesaplar arkadas sistemini kullanamaz.");
      return;
    }

    if (!playerId || (action !== "accept" && action !== "reject")) {
      emitFriendsError(socket, "Arkadas istegi guncellenemedi.");
      return;
    }

    const result = await respondToFriendRequest(user.id, playerId, action);

    if (!result.ok) {
      emitFriendsError(socket, result.message);
      return;
    }

    if (action === "accept") {
      trackFriendAdded(user.id, user.displayName, playerId);
      const otherUser = await findUserById(playerId);
      if (otherUser) {
        trackFriendAdded(otherUser.id, otherUser.displayName, user.id);
      }
    }

    await emitFriendsStateToUserAndFriends(user.id);
    await emitFriendsStateToUserAndFriends(playerId);
  });

  socket.on(SOCKET_EVENTS.DIRECT_MESSAGE_SEND, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateDirectMessageSendPayload(rawPayload);

    if (!auth || !payload) {
      return;
    }

    await runPlayerPairMutation([auth.subjectId, payload.targetUserId], async () => {
      const player = getAuthenticatedPlayer(socket);

      if (!player || player.auth.isGuest) {
        socket.emit(SOCKET_EVENTS.DIRECT_MESSAGE_ERROR, { message: "Misafir hesaplar ozel mesaj gonderemez." });
        return;
      }

      if (payload.targetUserId === player.auth.subjectId) {
        socket.emit(SOCKET_EVENTS.DIRECT_MESSAGE_ERROR, { message: "Kendine mesaj gonderemezsin." });
        return;
      }

      if (!(await areUsersFriends(player.auth.subjectId, payload.targetUserId))) {
        socket.emit(SOCKET_EVENTS.DIRECT_MESSAGE_ERROR, { message: "Sadece arkadaslara ozel mesaj gonderebilirsin." });
        return;
      }

      const moderationResult = moderateChatMessage(`dm:${player.profileKey}`, payload.text);
      if (!moderationResult.ok) {
        socket.emit(SOCKET_EVENTS.DIRECT_MESSAGE_ERROR, { message: moderationResult.error.message });
        return;
      }

      player.directMessagesState = createDirectMessagesState(player.directMessagesState);
      const senderEntry = appendDirectMessage(player.directMessagesState, payload.targetUserId, {
        senderUserId: player.auth.subjectId,
        senderName: player.name,
        targetUserId: payload.targetUserId,
        text: moderationResult.text,
      });

      const targetUser = await findUserById(payload.targetUserId);
      if (!targetUser) {
        socket.emit(SOCKET_EVENTS.DIRECT_MESSAGE_ERROR, { message: "Alici bulunamadi." });
        return;
      }

      const targetAuth: AuthContext = {
        subjectId: targetUser.id,
        username: targetUser.username,
        displayName: targetUser.displayName,
        isGuest: false,
      };
      const liveTargetPlayer = getPlayerBySubjectId(targetUser.id);

      if (liveTargetPlayer) {
        liveTargetPlayer.directMessagesState = createDirectMessagesState(liveTargetPlayer.directMessagesState);
        appendDirectMessage(liveTargetPlayer.directMessagesState, player.auth.subjectId, {
          senderUserId: player.auth.subjectId,
          senderName: player.name,
          targetUserId: targetUser.id,
          text: moderationResult.text,
        });
        await persistPlayerState(liveTargetPlayer);
        getSocketsForUserId(targetUser.id).forEach((entry) => emitDirectMessagesState(entry, liveTargetPlayer));
      } else {
        const targetProfile = await loadPlayerProfileForAuth(targetAuth);
        if (!targetProfile) {
          socket.emit(SOCKET_EVENTS.DIRECT_MESSAGE_ERROR, { message: "Alici profili bulunamadi." });
          return;
        }
        targetProfile.directMessagesState = createDirectMessagesState(targetProfile.directMessagesState);
        appendDirectMessage(targetProfile.directMessagesState, player.auth.subjectId, {
          senderUserId: player.auth.subjectId,
          senderName: player.name,
          targetUserId: targetUser.id,
          text: moderationResult.text,
        });
        await savePlayerProfileForAuth(targetAuth, targetProfile);
      }

      await persistPlayerState(player);
      emitDirectMessagesState(socket, player);
      trackAnalyticsEvent("chat_message_sent", {
        playerId: player.auth.subjectId,
        playerName: player.name,
        roomId: player.roomId,
        channel: "dm",
        messageLength: senderEntry.text.length,
      });
    });
  });

  socket.on(SOCKET_EVENTS.PARTY_INVITE, async ({ targetPlayerId }: { targetPlayerId?: string }) => {
    const player = getAuthenticatedPlayer(socket);
    const targetPlayer = targetPlayerId
      ? players.get(targetPlayerId) ?? Array.from(players.values()).find((entry) => entry.auth.subjectId === targetPlayerId) ?? null
      : null;

    if (!player || !targetPlayer) {
      return;
    }

    const isFriend =
      !player.auth.isGuest && !targetPlayer.auth.isGuest
        ? await areUsersFriends(player.auth.subjectId, targetPlayer.auth.subjectId)
        : false;
    const result = requestPartyInvite(player, targetPlayer, isFriend);

    if (!result.ok) {
      socket.emit(SOCKET_EVENTS.PARTY_ERROR, { message: result.message });
      return;
    }

    emitPartyStateToPlayers([player.id, targetPlayer.id]);
  });

  socket.on(SOCKET_EVENTS.PARTY_RESPOND, ({ accept }: { accept?: boolean }) => {
    const player = getAuthenticatedPlayer(socket);

    if (!player) {
      return;
    }

    const result = respondToPartyInvite(player, Boolean(accept), players);
    if (!result.ok) {
      socket.emit(SOCKET_EVENTS.PARTY_ERROR, { message: result.message });
      return;
    }

    const memberIds = result.partiesToEmit.flatMap((entry) => entry.members.map((member) => member.playerId));
    emitPartyStateToPlayers([...new Set([player.id, ...memberIds])]);
    if (result.reason) {
      socket.emit(SOCKET_EVENTS.PARTY_ERROR, { message: result.reason });
    }
  });

  socket.on(SOCKET_EVENTS.PARTY_LEAVE, () => {
    const player = getAuthenticatedPlayer(socket);

    if (!player) {
      return;
    }

    const result = leaveParty(player.id);
    emitPartyStateToPlayers([...new Set([...result.closedMemberIds, ...result.partiesToEmit.flatMap((entry) => entry.members.map((member) => member.playerId))])]);
  });

  socket.on(SOCKET_EVENTS.PROFILE_VIEW_REQUEST, ({ playerId }: { playerId?: string }) => {
    const viewer = getAuthenticatedPlayer(socket);
    const target = playerId ? players.get(playerId) : null;

    if (!viewer || !target || target.id === viewer.id || target.roomId !== viewer.roomId) {
      return;
    }

    const isNearby = Math.hypot(target.x - viewer.x, target.y - viewer.y) <= 120;

    if (!isNearby) {
      return;
    }

    socket.emit(SOCKET_EVENTS.PROFILE_VIEW_DATA, buildPlayerProfileSummary(target));
  });

  socket.on(SOCKET_EVENTS.PROFILE_REPORT_SUBMIT, async ({ targetPlayerId, reason }: { targetPlayerId?: string; reason?: string }) => {
    const reporter = getAuthenticatedPlayer(socket);
    const target = targetPlayerId ? players.get(targetPlayerId) : null;

    if (!reporter || !target || reporter.id === target.id) {
      socket.emit(SOCKET_EVENTS.PROFILE_REPORT_RESULT, {
        ok: false,
        message: "Rapor gonderilemedi.",
      });
      return;
    }

    const result = await submitPlayerReport(reporter, target, reason);
    socket.emit(SOCKET_EVENTS.PROFILE_REPORT_RESULT, result);
  });

  socket.on(SOCKET_EVENTS.PROFILE_STATUS_SET, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateProfileStatusPayload(rawPayload);

    if (!auth || !payload) {
      return;
    }

    await runPlayerMutation(auth.subjectId, async () => {
      const player = getAuthenticatedPlayer(socket);

      if (!player) {
        return;
      }

      updatePlayerStatus(player, payload.statusText);
      await persistPlayerState(player);
      emitGameplayState(socket, player);
      socket.to(player.roomId).emit(SOCKET_EVENTS.PLAYER_MOVED, toPublicPlayerState(player));
    });
  });

  socket.on(SOCKET_EVENTS.TUTORIAL_UPDATE, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateTutorialUpdatePayload(rawPayload);

    if (!auth || !payload) {
      return;
    }

    await runPlayerMutation(auth.subjectId, async () => {
      const player = getAuthenticatedPlayer(socket);

      if (!player) {
        return;
      }

      player.tutorialState = createTutorialState(player.tutorialState);

      if (payload.skipped) {
        skipTutorial(player.tutorialState);
        await persistPlayerState(player);
        emitTutorialState(socket, player);
        return;
      }

      if (!payload.completedStepId) {
        return;
      }

      if (!markTutorialStep(player.tutorialState, payload.completedStepId as import("./types.ts").TutorialStepId)) {
        return;
      }

       trackAnalyticsEvent("onboarding_step", {
        playerId: player.auth.subjectId,
        playerName: player.name,
        roomId: player.roomId,
        stepId: payload.completedStepId,
        completedCount: player.tutorialState.completedStepIds.length,
      });

      await persistPlayerState(player);
      emitTutorialState(socket, player);
      if (player.tutorialState.isCompleted) {
        trackAnalyticsEvent("tutorial_completed", {
          playerId: player.auth.subjectId,
          playerName: player.name,
          roomId: player.roomId,
          completedAt: player.tutorialState.completedAt,
        });
      }
    });
  });

  socket.on(SOCKET_EVENTS.HOME_ACCESS_SET, async ({ isPublic }: { isPublic?: boolean }) => {
    const auth = socket.data.auth;

    if (!auth) {
      return;
    }

    await runPlayerMutation(auth.subjectId, async () => {
      const player = getAuthenticatedPlayer(socket);

      if (!player) {
        return;
      }

      player.homeState.access.isPublic = Boolean(isPublic);
      player.homeState.lastUpdatedAt = Date.now();
      await persistPlayerState(player);
      emitHomeState(socket, player);
      await emitFriendsStateToUserAndFriends(player.auth.subjectId);
    });
  });

  socket.on(SOCKET_EVENTS.HOME_FURNITURE_PLACE, async ({ itemId, x, y, rotation }: { itemId?: string; x?: number; y?: number; rotation?: number }) => {
    const player = getAuthenticatedPlayer(socket);

    if (!player || !itemId) {
      return;
    }

    const result = placeFurnitureForPlayer(player, itemId, Number(x), Number(y), Number(rotation ?? 0));

    if (!result.ok) {
      socket.emit(SOCKET_EVENTS.HOME_ERROR, { message: "Mobilya yerlestirilemedi." });
      return;
    }

    await persistPlayerState(player);
    emitGameplayState(socket, player);
    emitHomeState(socket, player);
    await emitRoomHomeLayout(player.roomId);
  });

  socket.on(SOCKET_EVENTS.HOME_FURNITURE_MOVE, async ({ placementId, x, y }: { placementId?: string; x?: number; y?: number }) => {
    const player = getAuthenticatedPlayer(socket);

    if (!player || !placementId) {
      return;
    }

    const result = moveFurnitureForPlayer(player, placementId, Number(x), Number(y));

    if (!result.ok) {
      socket.emit(SOCKET_EVENTS.HOME_ERROR, { message: "Mobilya tasinamadi." });
      return;
    }

    await persistPlayerState(player);
    emitHomeState(socket, player);
    await emitRoomHomeLayout(player.roomId);
  });

  socket.on(SOCKET_EVENTS.HOME_FURNITURE_ROTATE, async ({ placementId }: { placementId?: string }) => {
    const player = getAuthenticatedPlayer(socket);

    if (!player || !placementId) {
      return;
    }

    const result = rotateFurnitureForPlayer(player, placementId);

    if (!result.ok) {
      socket.emit(SOCKET_EVENTS.HOME_ERROR, { message: "Mobilya dondurulemedi." });
      return;
    }

    await persistPlayerState(player);
    emitHomeState(socket, player);
    await emitRoomHomeLayout(player.roomId);
  });

  socket.on(SOCKET_EVENTS.HOME_FURNITURE_REMOVE, async ({ placementId }: { placementId?: string }) => {
    const player = getAuthenticatedPlayer(socket);

    if (!player || !placementId) {
      return;
    }

    const result = removeFurnitureForPlayer(player, placementId);

    if (!result.ok) {
      socket.emit(SOCKET_EVENTS.HOME_ERROR, { message: "Mobilya kaldirilamadi." });
      return;
    }

    await persistPlayerState(player);
    emitGameplayState(socket, player);
    emitHomeState(socket, player);
    await emitRoomHomeLayout(player.roomId);
  });

  socket.on(SOCKET_EVENTS.HOME_FURNITURE_INTERACT, async ({ placementId }: { placementId?: string }) => {
    const player = getAuthenticatedPlayer(socket);

    if (!player || !placementId) {
      return;
    }

    const result = interactWithFurnitureForPlayer(player, placementId, Array.from(players.values()));

    if (!result.ok) {
      socket.emit(SOCKET_EVENTS.HOME_ERROR, {
        message:
          result.code === "forbidden"
            ? "Bu esyayi sadece ev sahibi duzenleyebilir."
            : result.code === "blocked"
              ? "Bu esya su an kullanilamiyor."
              : "Mobilya etkilesimi basarisiz.",
      });
      return;
    }

    if (result.action === "toggle") {
      await persistPlayerState(player);
      emitHomeState(socket, player);
    }

    if (result.action === "sit" || result.action === "stand") {
      io.to(player.roomId).emit(SOCKET_EVENTS.PLAYER_MOVED, toPublicPlayerState(player));
    }

    await emitRoomHomeLayout(player.roomId);
  });

  socket.on(SOCKET_EVENTS.NPC_TALKED, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateNpcTalkPayload(rawPayload);

    if (!auth || !payload) {
      return;
    }

    await runPlayerMutation(auth.subjectId, async () => {
      const player = getAuthenticatedPlayer(socket);

      if (!player || !canTalkToNpc(player.roomId, payload.npcId, { x: player.x, y: player.y })) {
        return;
      }

      const previousCompletedQuestIds = [...(player.gameplayState.quest.completedQuestIds ?? [])];
      const unlocked = recordNpcTalkForPlayer(player, payload.npcId);
      await persistPlayerState(player);
      emitGameplayState(socket, player);
      if (unlocked.length) {
        emitAchievementUnlocks(socket, unlocked);
      }
      trackQuestCompletionDelta(player, previousCompletedQuestIds, "npc_talk");
    });
  });

  socket.on(SOCKET_EVENTS.EMOTE_PLAY, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateEmotePayload(rawPayload);

    if (!auth || !payload || !isValidEmoteId(payload.emoteId)) {
      return;
    }

    await runPlayerMutation(auth.subjectId, async () => {
      const player = getAuthenticatedPlayer(socket);

      if (!player) {
        return;
      }

      if (!applyPlayerEmote(player, payload.emoteId)) {
        return;
      }

      io.to(player.roomId).emit(SOCKET_EVENTS.PLAYER_MOVED, toPublicPlayerState(player));
    });
  });

  socket.on(SOCKET_EVENTS.ROOM_CHANGE, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateRoomChangePayload(rawPayload);

    if (!auth || !payload) {
      return;
    }

    await runPlayerMutation(auth.subjectId, async () => {
      const player = getAuthenticatedPlayer(socket);

      if (!player || !canUsePortal(player.roomId, { x: player.x, y: player.y }, payload.targetRoomId)) {
        return;
      }

      const closedTrade = cancelTradeForPlayer(player.id, "Bir oyuncu oda degistirdigi icin trade iptal edildi.");
      if (closedTrade) {
        emitTradeClosedToPlayers(closedTrade.participants, closedTrade.reason);
      }

      const previousRoomId = player.roomId;
      player.seatedFurnitureId = null;
      const resolvedTargetRoomId = resolvePortalTargetRoomId(payload.targetRoomId, player.auth.subjectId);
      const nextRoom = getRoomPayload(resolvedTargetRoomId, player.name);
      const nextSpawn = getSpawnPosition(resolvedTargetRoomId);

      socket.leave(previousRoomId);
      socket.to(previousRoomId).emit(SOCKET_EVENTS.PLAYER_LEFT, { id: player.id });

      player.roomId = nextRoom.id;
      player.x = nextSpawn.x;
      player.y = nextSpawn.y;
      player.flipX = false;
      const dailyQuestUnlocks = recordRoomVisitForPlayer(player, nextRoom.id);
      const partyAfterMove = syncPartyMemberRoom(player);

      socket.join(player.roomId);
      socket.to(player.roomId).emit(SOCKET_EVENTS.PLAYER_JOINED, toPublicPlayerState(player));
      emitRoomSystemMessage(io, previousRoomId, `${player.name} ${nextRoom.name} odasina gitti.`);
      emitRoomSystemMessage(io, player.roomId, `${player.name} ${getRoom(previousRoomId, player.name).name} odasindan geldi.`);

      await persistPlayerState(player);

      socket.emit(SOCKET_EVENTS.ROOM_CHANGED, {
        room: nextRoom,
        player: toPublicPlayerState(player),
        players: getPlayersInRoom(player.roomId),
        messages: getRoomHistory(player.roomId),
        gameplayState: getGameplaySnapshot(player.gameplayState),
        homeState: player.homeState,
        roomHomeState: await getRoomHomeStatePayload(player.roomId),
        worldEvents: getActiveWorldEvents(),
        weatherState: getWeatherStateSnapshot(),
      });
      emitRoomChatHistory(socket, player.roomId);
      await emitRoomHomeLayout(previousRoomId);
      await emitRoomHomeLayout(player.roomId);
      if (dailyQuestUnlocks.length) {
        emitGameplayState(socket, player);
        emitAchievementUnlocks(socket, dailyQuestUnlocks);
      }
      await emitFriendsStateToUserAndFriends(player.auth.subjectId);
      if (partyAfterMove) {
        emitPartyStateToPlayers(partyAfterMove.members.map((entry) => entry.playerId));
      }
    });
  });

  socket.on(SOCKET_EVENTS.HOME_VISIT_REQUEST, async (rawPayload: unknown) => {
    const auth = socket.data.auth;
    const payload = validateVisitHomePayload(rawPayload);

    if (!auth || !payload) {
      return;
    }

    await runPlayerMutation(auth.subjectId, async () => {
      const player = getAuthenticatedPlayer(socket);

      if (!player) {
        return;
      }

      const closedTrade = cancelTradeForPlayer(player.id, "Bir oyuncu oda degistirdigi icin trade iptal edildi.");
      if (closedTrade) {
        emitTradeClosedToPlayers(closedTrade.participants, closedTrade.reason);
      }

      const canVisit = await canVisitPlayerHome(player.auth.subjectId, payload.ownerUserId);

      if (!canVisit) {
        socket.emit(SOCKET_EVENTS.HOME_ERROR, { message: "Bu eve giris iznin yok." });
        return;
      }

      const ownerUser = await findUserById(payload.ownerUserId);

      if (!ownerUser) {
        socket.emit(SOCKET_EVENTS.HOME_ERROR, { message: "Ev sahibi bulunamadi." });
        return;
      }

      const previousRoomId = player.roomId;
      player.seatedFurnitureId = null;
      const resolvedTargetRoomId = resolvePortalTargetRoomId("home", payload.ownerUserId);
      const nextRoom = getRoomPayload(resolvedTargetRoomId, ownerUser.displayName);
      const nextSpawn = getSpawnPosition(resolvedTargetRoomId);

      socket.leave(previousRoomId);
      socket.to(previousRoomId).emit(SOCKET_EVENTS.PLAYER_LEFT, { id: player.id });

      player.roomId = nextRoom.id;
      player.x = nextSpawn.x;
      player.y = nextSpawn.y;
      player.flipX = false;
      const dailyQuestUnlocks = recordRoomVisitForPlayer(player, nextRoom.id);
      const partyAfterMove = syncPartyMemberRoom(player);

      socket.join(player.roomId);
      socket.to(player.roomId).emit(SOCKET_EVENTS.PLAYER_JOINED, toPublicPlayerState(player));
      emitRoomSystemMessage(io, previousRoomId, `${player.name} ${nextRoom.name} odasina gitti.`);
      emitRoomSystemMessage(io, player.roomId, `${player.name} ziyarete geldi.`);

      await persistPlayerState(player);

      socket.emit(SOCKET_EVENTS.ROOM_CHANGED, {
        room: nextRoom,
        player: toPublicPlayerState(player),
        players: getPlayersInRoom(player.roomId),
        messages: getRoomHistory(player.roomId),
        gameplayState: getGameplaySnapshot(player.gameplayState),
        homeState: player.homeState,
        roomHomeState: await getRoomHomeStatePayload(player.roomId),
        worldEvents: getActiveWorldEvents(),
        weatherState: getWeatherStateSnapshot(),
      });
      emitRoomChatHistory(socket, player.roomId);
      emitHomeState(socket, player);
      await emitRoomHomeLayout(previousRoomId);
      await emitRoomHomeLayout(player.roomId);
      if (dailyQuestUnlocks.length) {
        emitGameplayState(socket, player);
        emitAchievementUnlocks(socket, dailyQuestUnlocks);
      }
      await emitFriendsStateToUserAndFriends(player.auth.subjectId);
      if (partyAfterMove) {
        emitPartyStateToPlayers(partyAfterMove.members.map((entry) => entry.playerId));
      }
    });
  });

  socket.on(SOCKET_EVENTS.CHAT_SEND, ({ text }: { text?: string }) => {
    const player = getAuthenticatedPlayer(socket);

    if (!player) {
      return;
    }

    const adminCommandResult = tryHandleAdminCommand(player, text ?? "", players);
    if (adminCommandResult.handled) {
      emitAdminActionResult(socket, adminCommandResult.result ?? { ok: false, message: "Admin komutu islenemedi." });

      if (adminCommandResult.action?.type === "kick") {
        const targetSocket = io.sockets.sockets.get(adminCommandResult.action.targetPlayerId);
        targetSocket?.emit(SOCKET_EVENTS.ADMIN_ACTION_RESULT, {
          ok: false,
          message: adminCommandResult.action.reason,
        });
        targetSocket?.disconnect(true);
      } else if (adminCommandResult.action?.type === "teleport") {
        void movePlayerToRoom(player, socket, adminCommandResult.action.roomId, `${player.name} admin teleport ile geldi.`);
      } else if (adminCommandResult.action?.type === "mute") {
        const targetSocket = io.sockets.sockets.get(adminCommandResult.action.targetPlayerId);
        targetSocket?.emit(SOCKET_EVENTS.ADMIN_ACTION_RESULT, {
          ok: false,
          message: `${adminCommandResult.action.durationMinutes} dakika susturuldun.`,
        });
      } else if (adminCommandResult.action?.type === "grant") {
        const targetPlayer = players.get(adminCommandResult.action.targetPlayerId);
        const targetSocket = io.sockets.sockets.get(adminCommandResult.action.targetPlayerId);
        if (targetPlayer) {
          void persistPlayerState(targetPlayer).then(() => {
            if (targetSocket) {
              emitGameplayState(targetSocket, targetPlayer);
              emitAdminActionResult(targetSocket, {
                ok: true,
                message:
                  adminCommandResult.action?.grantKind === "coins"
                    ? "Bir admin sana coin verdi."
                    : "Bir admin envanterine yeni esya ekledi.",
              });
            }
          });
        }
      }
      return;
    }

    const muteState = getMuteState(player);
    if (muteState.isMuted) {
      emitChatBlocked(socket, {
        code: "rate-limit",
        message: `Susturuldun. ${Math.ceil(muteState.remainingMs / 60000)} dakika sonra tekrar yazabilirsin.`,
      });
      return;
    }

    const moderationResult = moderateChatMessage(player.profileKey, text);

    if (!moderationResult.ok) {
      emitChatBlocked(socket, moderationResult.error);
      return;
    }

    const isPartyChat = moderationResult.text.startsWith("/p ") || moderationResult.text.startsWith("/party ");
    const messageText = isPartyChat ? moderationResult.text.replace(/^\/p(arty)?\s+/i, "").trim() : moderationResult.text;
    const channel = isPartyChat ? "party" : "room";
    const message: ChatMessage = createChatMessage({
      name: player.name,
      text: messageText || moderationResult.text,
      kind: "player",
      playerId: player.id,
      roomId: isPartyChat ? null : player.roomId,
      channel,
    });

    if (isPartyChat) {
      const memberIds = getPartyMemberIds(player.id);
      if (memberIds.length === 0) {
        emitChatBlocked(socket, { code: "rate-limit", message: "Party chat icin once bir party kur." });
        return;
      }
      memberIds.forEach((memberId) => {
        io.to(memberId).emit(SOCKET_EVENTS.CHAT_MESSAGE, message);
      });
    } else {
      storeChatMessage(player.roomId, message);
      io.to(player.roomId).emit(SOCKET_EVENTS.CHAT_MESSAGE, message);
    }
    trackAnalyticsEvent("chat_message_sent", {
      playerId: player.auth.subjectId,
      playerName: player.name,
      roomId: player.roomId,
      channel,
      messageLength: messageText.length,
    });
    const unlocked = recordChatMessageForPlayer(player);
    void persistPlayerState(player).then(() => {
      emitGameplayState(socket, player);
      emitAchievementUnlocks(socket, unlocked);
    });
  });

  socket.on("disconnect", () => {
    clearTimeout(joinTimeout);
    void removePlayerConnection(socket, "baglantiyi kapatti.");
  });
});

await initializePersistence();

const worldEventInterval = setInterval(() => {
  const expiredEvents = pruneExpiredWorldEvents();
  const activatedEvent = maybeTriggerRandomWorldEvent();

  if (expiredEvents.length > 0 || activatedEvent) {
    emitWorldEventsState();
  }

  expiredEvents.forEach((entry) => {
    emitRoomSystemMessage(io, entry.roomId, `${entry.title} sona erdi.`);
  });

  if (activatedEvent) {
    emitRoomSystemMessage(io, activatedEvent.roomId, activatedEvent.announcement);
    io.to(activatedEvent.roomId).emit(SOCKET_EVENTS.WORLD_EVENT_ANNOUNCEMENT, {
      roomId: activatedEvent.roomId,
      title: activatedEvent.title,
      announcement: activatedEvent.announcement,
      type: activatedEvent.type,
    });
  }
}, getWorldEventTriggerIntervalMs());

const weatherInterval = setInterval(() => {
  const changedStates = rotateWeatherStates();

  if (changedStates.length > 0) {
    emitWeatherState();
  }
}, getWeatherRotationIntervalMs());

const shutdown = async (): Promise<void> => {
  clearInterval(worldEventInterval);
  clearInterval(weatherInterval);
  await closePersistence();
  httpServer.close();
};

process.once("SIGINT", () => {
  void shutdown();
});

process.once("SIGTERM", () => {
  void shutdown();
});

httpServer.listen(PORT, () => {
  logInfo("server_listening", {
    port: PORT,
    mode: SERVER_ENV.nodeEnv,
    persistence: SERVER_ENV.databaseUrl ? "postgres" : "memory-fallback",
  });
});
