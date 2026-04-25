function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asOptionalNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export interface PlayerMovePayload {
  x: number;
  y: number;
  flipX: boolean;
  inputSequence?: number;
}

export interface GameplayQuestPayload {
  questId: string;
}

export interface GameplayPickupPayload {
  pickupId: string;
}

export interface GameplayChestPayload {
  chestId: string;
}

export interface ShopPurchasePayload {
  shopId: string;
  shopItemId: string;
}

export interface ShopSellPayload {
  shopId: string;
  itemId: string;
  quantity: number;
}

export interface ShopBuybackPayload {
  shopId: string;
  buybackEntryId: string;
}

export interface CraftPayload {
  recipeId: string;
}

export interface MiniGameScorePayload {
  miniGameId: string;
  score?: number;
}

export interface NpcTalkPayload {
  npcId: string;
}

export interface RoomChangePayload {
  targetRoomId: string;
}

export interface MailboxClaimPayload {
  mailId: string;
}

export interface MailboxSendGiftPayload {
  targetUserId: string;
  itemId: string;
  quantity: number;
  message?: string;
}

export interface DirectMessageSendPayload {
  targetUserId: string;
  text: string;
}

export interface TradeOfferPayload {
  offer: {
    coins: number;
    items: Array<{
      itemId: string;
      amount: number;
    }>;
  };
}

export interface TutorialUpdatePayload {
  completedStepId?: string;
  skipped?: boolean;
}

export interface EmotePayload {
  emoteId: string;
}

export function validatePlayerMovePayload(payload: unknown): PlayerMovePayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const x = asNumber(payload.x);
  const y = asNumber(payload.y);
  const flipX = asBoolean(payload.flipX);
  const inputSequence = asOptionalNumber(payload.inputSequence);

  if (x === null || y === null || flipX === null) {
    return null;
  }

  return { x, y, flipX, inputSequence };
}

export function validateGameplayQuestPayload(payload: unknown): GameplayQuestPayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const questId = asString(payload.questId);
  return questId ? { questId } : null;
}

export function validateGameplayPickupPayload(payload: unknown): GameplayPickupPayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const pickupId = asString(payload.pickupId);
  return pickupId ? { pickupId } : null;
}

export function validateGameplayChestPayload(payload: unknown): GameplayChestPayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const chestId = asString(payload.chestId);
  return chestId ? { chestId } : null;
}

export function validateShopPurchasePayload(payload: unknown): ShopPurchasePayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const shopId = asString(payload.shopId);
  const shopItemId = asString(payload.shopItemId);
  return shopId && shopItemId ? { shopId, shopItemId } : null;
}

export function validateShopSellPayload(payload: unknown): ShopSellPayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const shopId = asString(payload.shopId);
  const itemId = asString(payload.itemId);
  const quantity = asNumber(payload.quantity);

  if (!shopId || !itemId || quantity === null) {
    return null;
  }

  return {
    shopId,
    itemId,
    quantity: Math.max(1, Math.min(999, Math.floor(quantity))),
  };
}

export function validateShopBuybackPayload(payload: unknown): ShopBuybackPayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const shopId = asString(payload.shopId);
  const buybackEntryId = asString(payload.buybackEntryId);
  return shopId && buybackEntryId ? { shopId, buybackEntryId } : null;
}

export function validateCraftPayload(payload: unknown): CraftPayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const recipeId = asString(payload.recipeId);
  return recipeId ? { recipeId } : null;
}

export function validateMiniGameScorePayload(payload: unknown): MiniGameScorePayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const miniGameId = asString(payload.miniGameId);
  const score = asOptionalNumber(payload.score);
  return miniGameId ? { miniGameId, score } : null;
}

export function validateNpcTalkPayload(payload: unknown): NpcTalkPayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const npcId = asString(payload.npcId);
  return npcId ? { npcId } : null;
}

export function validateRoomChangePayload(payload: unknown): RoomChangePayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const targetRoomId = asString(payload.targetRoomId);
  return targetRoomId ? { targetRoomId } : null;
}

export function validateVisitHomePayload(payload: unknown): { ownerUserId: string } | null {
  if (!isRecord(payload)) {
    return null;
  }

  const ownerUserId = asString(payload.ownerUserId);
  return ownerUserId ? { ownerUserId } : null;
}

export function validateProfileStatusPayload(payload: unknown): { statusText?: string } | null {
  if (!isRecord(payload)) {
    return null;
  }

  return { statusText: asOptionalString(payload.statusText) };
}

export function validateMailboxClaimPayload(payload: unknown): MailboxClaimPayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const mailId = asString(payload.mailId);
  return mailId ? { mailId } : null;
}

export function validateMailboxSendGiftPayload(payload: unknown): MailboxSendGiftPayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const targetUserId = asString(payload.targetUserId);
  const itemId = asString(payload.itemId);
  const quantity = asNumber(payload.quantity);

  if (!targetUserId || !itemId || quantity === null) {
    return null;
  }

  return {
    targetUserId,
    itemId,
    quantity: Math.max(1, Math.min(99, Math.floor(quantity))),
    message: asOptionalString(payload.message),
  };
}

export function validateDirectMessageSendPayload(payload: unknown): DirectMessageSendPayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const targetUserId = asString(payload.targetUserId);
  const text = asString(payload.text);

  if (!targetUserId || !text) {
    return null;
  }

  return {
    targetUserId,
    text,
  };
}

export function validateTradeRequestPayload(payload: unknown): { targetPlayerId: string } | null {
  if (!isRecord(payload)) {
    return null;
  }

  const targetPlayerId = asString(payload.targetPlayerId);
  return targetPlayerId ? { targetPlayerId } : null;
}

export function validateTradeRespondPayload(payload: unknown): { accept: boolean } | null {
  if (!isRecord(payload)) {
    return null;
  }

  const accept = asBoolean(payload.accept);
  return accept === null ? null : { accept };
}

export function validateTradeOfferPayload(payload: unknown): TradeOfferPayload | null {
  if (!isRecord(payload) || !isRecord(payload.offer)) {
    return null;
  }

  const coins = asNumber(payload.offer.coins);
  const items = Array.isArray(payload.offer.items)
    ? payload.offer.items
        .filter(isRecord)
        .map((entry) => {
          const itemId = asString(entry.itemId);
          const amount = asNumber(entry.amount);
          if (!itemId || amount === null) {
            return null;
          }
          return {
            itemId,
            amount: Math.max(1, Math.min(999, Math.floor(amount))),
          };
        })
        .filter((entry): entry is { itemId: string; amount: number } => Boolean(entry))
    : null;

  if (coins === null || !items) {
    return null;
  }

  return {
    offer: {
      coins: Math.max(0, Math.floor(coins)),
      items,
    },
  };
}

export function validateTradeConfirmPayload(payload: unknown): { confirmed: boolean } | null {
  if (!isRecord(payload)) {
    return null;
  }

  const confirmed = asBoolean(payload.confirmed);
  return confirmed === null ? null : { confirmed };
}

export function validateTutorialUpdatePayload(payload: unknown): TutorialUpdatePayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const completedStepId = asOptionalString(payload.completedStepId);
  const skipped = asBoolean(payload.skipped);

  if (!completedStepId && skipped === null) {
    return null;
  }

  return {
    completedStepId,
    skipped: skipped === null ? undefined : skipped,
  };
}

export function validateEmotePayload(payload: unknown): EmotePayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const emoteId = asString(payload.emoteId);
  return emoteId ? { emoteId } : null;
}
