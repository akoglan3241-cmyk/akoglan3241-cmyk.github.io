import { GAME_EVENTS } from "../events/gameEventBus.js";

export function bindTownUiEvents({ eventBus, panels }) {
  const cleanups = [];

  panels.audioPanel?.onChange((partialSettings) => eventBus.emit(GAME_EVENTS.AUDIO_SETTINGS_CHANGED, partialSettings));
  panels.craftingPanel?.onCraft((recipe) => eventBus.emit(GAME_EVENTS.CRAFT_REQUESTED, recipe));
  panels.friendsPanel?.onSubmit((playerName) => eventBus.emit(GAME_EVENTS.FRIEND_REQUESTED, playerName));
  panels.friendsPanel?.onRespond((playerId, action) => eventBus.emit(GAME_EVENTS.FRIEND_RESPONSE_REQUESTED, { playerId, action }));
  panels.friendsPanel?.onDirectMessage?.((payload) => eventBus.emit(GAME_EVENTS.DIRECT_MESSAGE_REQUESTED, payload));
  panels.friendsPanel?.onStatusSubmit((statusText) => eventBus.emit(GAME_EVENTS.PROFILE_STATUS_REQUESTED, statusText));
  panels.friendsPanel?.onHomeSubmit((isPublic) => eventBus.emit(GAME_EVENTS.HOME_ACCESS_REQUESTED, isPublic));
  panels.friendsPanel?.onVisitHome((ownerUserId) => eventBus.emit(GAME_EVENTS.HOME_VISIT_REQUESTED, ownerUserId));
  panels.friendsPanel?.onTrade((playerId) => eventBus.emit(GAME_EVENTS.TRADE_REQUESTED, { playerId, source: "friends" }));
  panels.friendsPanel?.onPartyInvite?.((playerId) => eventBus.emit(GAME_EVENTS.PARTY_INVITE_REQUESTED, { playerId, source: "friends" }));
  panels.mailboxPanel?.onClaim((mailId) => eventBus.emit(GAME_EVENTS.MAIL_CLAIM_REQUESTED, mailId));
  panels.mailboxPanel?.onSendGift((payload) => eventBus.emit(GAME_EVENTS.GIFT_SEND_REQUESTED, payload));
  panels.wardrobePanel?.onCycle((slot) => eventBus.emit(GAME_EVENTS.WARDROBE_CYCLE_REQUESTED, slot));
  panels.shopPanel?.onBuy((shopItem) => eventBus.emit(GAME_EVENTS.SHOP_BUY_REQUESTED, shopItem));
  panels.shopPanel?.onSell((inventoryEntry, quantity) => eventBus.emit(GAME_EVENTS.SHOP_SELL_REQUESTED, { inventoryEntry, quantity }));
  panels.shopPanel?.onBuyback((buybackEntry) => eventBus.emit(GAME_EVENTS.SHOP_BUYBACK_REQUESTED, buybackEntry));
  panels.cosmeticsShopPanel?.onBuy((shopItem) => eventBus.emit(GAME_EVENTS.COSMETIC_SHOP_BUY_REQUESTED, shopItem));
  panels.homeEditorPanel?.onSelectItem((itemId) => eventBus.emit(GAME_EVENTS.HOME_EDITOR_ITEM_SELECTED, itemId));
  panels.homeEditorPanel?.onAction((action) => eventBus.emit(GAME_EVENTS.HOME_EDITOR_ACTION_REQUESTED, action));
  panels.badgesPanel?.onEquip((badgeId) => eventBus.emit(GAME_EVENTS.BADGE_EQUIP_REQUESTED, badgeId));
  panels.playerProfilePanel?.onSendFriendRequest((profile) => eventBus.emit(GAME_EVENTS.PROFILE_FRIEND_REQUESTED, profile));
  panels.playerProfilePanel?.onVisitHome((profile) => eventBus.emit(GAME_EVENTS.PROFILE_HOME_VISIT_REQUESTED, profile));
  panels.playerProfilePanel?.onTradeRequest((profile) => eventBus.emit(GAME_EVENTS.PROFILE_TRADE_REQUESTED, profile));
  panels.playerProfilePanel?.onPartyInvite?.((profile) => eventBus.emit(GAME_EVENTS.PROFILE_PARTY_INVITE_REQUESTED, profile));
  panels.playerProfilePanel?.onReport?.((payload) => eventBus.emit(GAME_EVENTS.PROFILE_REPORT_REQUESTED, payload));
  panels.tradePanel?.onOfferUpdate((offer) => eventBus.emit(GAME_EVENTS.TRADE_OFFER_UPDATED, offer));
  panels.tradePanel?.onAction((action) => eventBus.emit(GAME_EVENTS.TRADE_ACTION_REQUESTED, action));
  panels.partyPanel?.onAction((action) => eventBus.emit(GAME_EVENTS.PARTY_ACTION_REQUESTED, action));

  const unsubscribeChatSubmit = panels.chatPanel?.onSubmit((messageText) => eventBus.emit(GAME_EVENTS.CHAT_SUBMITTED, messageText));
  if (typeof unsubscribeChatSubmit === "function") {
    cleanups.push(unsubscribeChatSubmit);
  }

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}
