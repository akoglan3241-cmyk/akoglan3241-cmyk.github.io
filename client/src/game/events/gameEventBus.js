export const GAME_EVENTS = {
  AUDIO_SETTINGS_CHANGED: "audio:settings-changed",
  CRAFT_REQUESTED: "craft:requested",
  FRIEND_REQUESTED: "friends:requested",
  FRIEND_RESPONSE_REQUESTED: "friends:response-requested",
  DIRECT_MESSAGE_REQUESTED: "dm:requested",
  PROFILE_STATUS_REQUESTED: "profile:status-requested",
  HOME_ACCESS_REQUESTED: "home:access-requested",
  HOME_VISIT_REQUESTED: "home:visit-requested",
  TRADE_REQUESTED: "trade:requested",
  PARTY_INVITE_REQUESTED: "party:invite-requested",
  MAIL_CLAIM_REQUESTED: "mail:claim-requested",
  GIFT_SEND_REQUESTED: "mail:gift-send-requested",
  WARDROBE_CYCLE_REQUESTED: "wardrobe:cycle-requested",
  SHOP_BUY_REQUESTED: "shop:buy-requested",
  SHOP_SELL_REQUESTED: "shop:sell-requested",
  SHOP_BUYBACK_REQUESTED: "shop:buyback-requested",
  COSMETIC_SHOP_BUY_REQUESTED: "cosmetic-shop:buy-requested",
  HOME_EDITOR_ITEM_SELECTED: "home-editor:item-selected",
  HOME_EDITOR_ACTION_REQUESTED: "home-editor:action-requested",
  BADGE_EQUIP_REQUESTED: "badge:equip-requested",
  PROFILE_FRIEND_REQUESTED: "profile:friend-requested",
  PROFILE_HOME_VISIT_REQUESTED: "profile:home-visit-requested",
  PROFILE_TRADE_REQUESTED: "profile:trade-requested",
  PROFILE_PARTY_INVITE_REQUESTED: "profile:party-invite-requested",
  PROFILE_REPORT_REQUESTED: "profile:report-requested",
  NOTIFICATION_PUSHED: "notification:pushed",
  TRADE_OFFER_UPDATED: "trade:offer-updated",
  TRADE_ACTION_REQUESTED: "trade:action-requested",
  PARTY_ACTION_REQUESTED: "party:action-requested",
  CHAT_SUBMITTED: "chat:submitted",
};

export function createGameEventBus() {
  const listeners = new Map();

  function on(eventName, handler) {
    if (!listeners.has(eventName)) {
      listeners.set(eventName, new Set());
    }

    listeners.get(eventName).add(handler);
    return () => {
      listeners.get(eventName)?.delete(handler);
      if (!listeners.get(eventName)?.size) {
        listeners.delete(eventName);
      }
    };
  }

  function emit(eventName, payload) {
    listeners.get(eventName)?.forEach((handler) => handler(payload));
  }

  function clear() {
    listeners.clear();
  }

  return {
    on,
    emit,
    clear,
  };
}
