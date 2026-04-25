import { io } from "socket.io-client";
import { SERVER_URL } from "../constants.js";
import { SOCKET_EVENTS } from "./socketEvents.js";

export function createMultiplayerClient({
  playerName,
  appearance,
  authToken,
  onSocketConnected,
  onSocketDisconnected,
  onConnectError,
  onInit,
  onRoomChanged,
  onGameplayState,
  onPurchaseResult,
  onSellResult,
  onBuybackResult,
  onShopSessionState,
  onCraftResult,
  onMiniGameResult,
  onChestLootResult,
  onPlayerJoined,
  onPlayerMoved,
  onPlayerLeft,
  onChatMessage,
  onChatBlocked,
  onAdminActionResult,
  onRoomChatHistory,
  onAchievementUnlocked,
  onWorldEventsState,
  onWorldEventAnnouncement,
  onWeatherState,
  onFriendsState,
  onFriendsError,
  onDirectMessagesState,
  onDirectMessageError,
  onMailboxState,
  onMailboxError,
  onTradeState,
  onTradeClosed,
  onTradeError,
  onPartyState,
  onPartyError,
  onProfileData,
  onProfileReportResult,
  onHomeState,
  onHomeLayoutState,
  onHomeError,
  onTutorialState,
}) {
  const socket = io(SERVER_URL, {
    transports: ["websocket"],
    auth: {
      token: authToken,
    },
  });

  socket.on("connect", () => {
    onSocketConnected?.({
      id: socket.id,
      connected: socket.connected,
    });
    socket.emit(SOCKET_EVENTS.PLAYER_JOIN, { name: playerName, appearance });
  });

  socket.on(SOCKET_EVENTS.CONNECT_ERROR, (error) => {
    onConnectError?.(error);
  });

  socket.on("disconnect", (reason) => {
    onSocketDisconnected?.({
      reason,
      connected: socket.connected,
    });
  });

  socket.on(SOCKET_EVENTS.WORLD_INIT, (payload) => {
    onInit?.(payload);
  });

  socket.on(SOCKET_EVENTS.ROOM_CHANGED, (payload) => {
    onRoomChanged?.(payload);
  });

  socket.on(SOCKET_EVENTS.GAMEPLAY_STATE, (gameplayState) => {
    onGameplayState?.(gameplayState);
  });

  socket.on(SOCKET_EVENTS.SHOP_PURCHASE_RESULT, (payload) => {
    onPurchaseResult?.(payload);
  });

  socket.on(SOCKET_EVENTS.SHOP_SELL_RESULT, (payload) => {
    onSellResult?.(payload);
  });

  socket.on(SOCKET_EVENTS.SHOP_BUYBACK_RESULT, (payload) => {
    onBuybackResult?.(payload);
  });

  socket.on(SOCKET_EVENTS.SHOP_SESSION_STATE, (payload) => {
    onShopSessionState?.(payload);
  });

  socket.on(SOCKET_EVENTS.CRAFT_RESULT, (payload) => {
    onCraftResult?.(payload);
  });

  socket.on(SOCKET_EVENTS.MINIGAME_RESULT, (payload) => {
    onMiniGameResult?.(payload);
  });

  socket.on(SOCKET_EVENTS.CHEST_LOOT_RESULT, (payload) => {
    onChestLootResult?.(payload);
  });

  socket.on(SOCKET_EVENTS.PLAYER_JOINED, (player) => {
    onPlayerJoined?.(player);
  });

  socket.on(SOCKET_EVENTS.PLAYER_MOVED, (player) => {
    onPlayerMoved?.(player);
  });

  socket.on(SOCKET_EVENTS.PLAYER_LEFT, ({ id }) => {
    onPlayerLeft?.(id);
  });

  socket.on(SOCKET_EVENTS.CHAT_MESSAGE, (message) => {
    onChatMessage?.(message);
  });

  socket.on(SOCKET_EVENTS.CHAT_BLOCKED, (payload) => {
    onChatBlocked?.(payload);
  });

  socket.on(SOCKET_EVENTS.ADMIN_ACTION_RESULT, (payload) => {
    onAdminActionResult?.(payload);
  });

  socket.on(SOCKET_EVENTS.CHAT_HISTORY, (messages) => {
    onRoomChatHistory?.(messages);
  });

  socket.on(SOCKET_EVENTS.ACHIEVEMENT_UNLOCKED, (payload) => {
    onAchievementUnlocked?.(payload);
  });

  socket.on(SOCKET_EVENTS.WORLD_EVENTS_STATE, (payload) => {
    onWorldEventsState?.(payload);
  });

  socket.on(SOCKET_EVENTS.WORLD_EVENT_ANNOUNCEMENT, (payload) => {
    onWorldEventAnnouncement?.(payload);
  });

  socket.on(SOCKET_EVENTS.WEATHER_STATE, (payload) => {
    onWeatherState?.(payload);
  });

  socket.on(SOCKET_EVENTS.FRIENDS_STATE, (payload) => {
    onFriendsState?.(payload);
  });

  socket.on(SOCKET_EVENTS.FRIENDS_ERROR, (payload) => {
    onFriendsError?.(payload);
  });

  socket.on(SOCKET_EVENTS.DIRECT_MESSAGES_STATE, (payload) => {
    onDirectMessagesState?.(payload);
  });

  socket.on(SOCKET_EVENTS.DIRECT_MESSAGE_ERROR, (payload) => {
    onDirectMessageError?.(payload);
  });

  socket.on(SOCKET_EVENTS.MAILBOX_STATE, (payload) => {
    onMailboxState?.(payload);
  });

  socket.on(SOCKET_EVENTS.MAILBOX_ERROR, (payload) => {
    onMailboxError?.(payload);
  });

  socket.on(SOCKET_EVENTS.TRADE_STATE, (payload) => {
    onTradeState?.(payload);
  });

  socket.on(SOCKET_EVENTS.TRADE_CLOSED, (payload) => {
    onTradeClosed?.(payload);
  });

  socket.on(SOCKET_EVENTS.TRADE_ERROR, (payload) => {
    onTradeError?.(payload);
  });

  socket.on(SOCKET_EVENTS.PARTY_STATE, (payload) => {
    onPartyState?.(payload);
  });

  socket.on(SOCKET_EVENTS.PARTY_ERROR, (payload) => {
    onPartyError?.(payload);
  });

  socket.on(SOCKET_EVENTS.PROFILE_VIEW_DATA, (payload) => {
    onProfileData?.(payload);
  });

  socket.on(SOCKET_EVENTS.PROFILE_REPORT_RESULT, (payload) => {
    onProfileReportResult?.(payload);
  });

  socket.on(SOCKET_EVENTS.HOME_STATE, (payload) => {
    onHomeState?.(payload);
  });

  socket.on(SOCKET_EVENTS.HOME_LAYOUT_STATE, (payload) => {
    onHomeLayoutState?.(payload);
  });

  socket.on(SOCKET_EVENTS.HOME_ERROR, (payload) => {
    onHomeError?.(payload);
  });

  socket.on(SOCKET_EVENTS.TUTORIAL_STATE, (payload) => {
    onTutorialState?.(payload);
  });

  return {
    sendMovement(payload) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.PLAYER_MOVE, payload);
      }
    },
    requestStartQuest(questId) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.GAMEPLAY_START_QUEST, { questId });
      }
    },
    requestCollectPickup(pickupId) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.GAMEPLAY_COLLECT_PICKUP, { pickupId });
      }
    },
    requestOpenChest(chestId) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.GAMEPLAY_OPEN_CHEST, { chestId });
      }
    },
    requestPurchase(shopId, shopItemId) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.SHOP_PURCHASE, { shopId, shopItemId });
      }
    },
    requestSell(shopId, itemId, quantity = 1) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.SHOP_SELL, { shopId, itemId, quantity });
      }
    },
    requestBuyback(shopId, buybackEntryId) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.SHOP_BUYBACK, { shopId, buybackEntryId });
      }
    },
    requestCraft(recipeId) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.CRAFT_REQUEST, { recipeId });
      }
    },
    requestMiniGameScore(miniGameId, score) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.MINIGAME_SCORE_SUBMIT, { miniGameId, score });
      }
    },
    requestEquipCosmetic(slot, cosmeticId) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.COSMETIC_EQUIP, { slot, cosmeticId });
      }
    },
    requestSendFriendRequest(playerName) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.FRIEND_REQUEST_SEND, { playerName });
      }
    },
    requestRespondToFriendRequest(playerId, action) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.FRIEND_REQUEST_RESPOND, { playerId, action });
      }
    },
    requestSendDirectMessage(targetUserId, text) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.DIRECT_MESSAGE_SEND, { targetUserId, text });
      }
    },
    requestClaimMail(mailId) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.MAILBOX_CLAIM, { mailId });
      }
    },
    requestSendGift(targetUserId, itemId, quantity = 1, message = "") {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.MAILBOX_SEND_GIFT, { targetUserId, itemId, quantity, message });
      }
    },
    requestTrade(targetPlayerId) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.TRADE_REQUEST, { targetPlayerId });
      }
    },
    respondTrade(accept) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.TRADE_RESPOND, { accept });
      }
    },
    updateTradeOffer(offer) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.TRADE_OFFER_UPDATE, { offer });
      }
    },
    confirmTrade(confirmed = true) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.TRADE_CONFIRM, { confirmed });
      }
    },
    cancelTrade() {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.TRADE_CANCEL);
      }
    },
    requestPartyInvite(targetPlayerId) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.PARTY_INVITE, { targetPlayerId });
      }
    },
    respondPartyInvite(accept) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.PARTY_RESPOND, { accept });
      }
    },
    leaveParty() {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.PARTY_LEAVE);
      }
    },
    requestProfileView(playerId) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.PROFILE_VIEW_REQUEST, { playerId });
      }
    },
    requestReportPlayer(targetPlayerId, reason) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.PROFILE_REPORT_SUBMIT, { targetPlayerId, reason });
      }
    },
    requestSetProfileStatus(statusText) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.PROFILE_STATUS_SET, { statusText });
      }
    },
    requestSetHomeAccess(isPublic) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.HOME_ACCESS_SET, { isPublic });
      }
    },
    requestVisitHome(ownerUserId) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.HOME_VISIT_REQUEST, { ownerUserId });
      }
    },
    requestPlaceFurniture(itemId, x, y, rotation = 0) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.HOME_FURNITURE_PLACE, { itemId, x, y, rotation });
      }
    },
    requestMoveFurniture(placementId, x, y) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.HOME_FURNITURE_MOVE, { placementId, x, y });
      }
    },
    requestRotateFurniture(placementId) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.HOME_FURNITURE_ROTATE, { placementId });
      }
    },
    requestRemoveFurniture(placementId) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.HOME_FURNITURE_REMOVE, { placementId });
      }
    },
    requestInteractFurniture(placementId) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.HOME_FURNITURE_INTERACT, { placementId });
      }
    },
    requestNpcTalk(npcId) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.NPC_TALKED, { npcId });
      }
    },
    requestTutorialUpdate(payload) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.TUTORIAL_UPDATE, payload);
      }
    },
    requestEquipBadge(badgeId) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.BADGE_EQUIP, { badgeId });
      }
    },
    requestRoomChange(targetRoomId) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.ROOM_CHANGE, { targetRoomId });
      }
    },
    sendChat(text) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.CHAT_SEND, { text });
      }
    },
    requestPlayEmote(emoteId) {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.EMOTE_PLAY, { emoteId });
      }
    },
    disconnect() {
      socket.disconnect();
    },
    isConnected() {
      return socket.connected;
    },
  };
}
