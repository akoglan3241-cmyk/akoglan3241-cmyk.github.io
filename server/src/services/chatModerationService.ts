import type { ChatBlockedPayload } from "../types.ts";
import { getChatMessageMaxLength, sanitizeChatMessage } from "./userContentValidation.ts";

const CHAT_MAX_LENGTH = getChatMessageMaxLength();
const CHAT_RATE_LIMIT_WINDOW_MS = 6000;
const CHAT_RATE_LIMIT_MAX_MESSAGES = 4;
const CHAT_REPEAT_WINDOW_MS = 12000;
const CHAT_REPEAT_MAX_MATCHES = 2;

const moderationState = new Map<
  string,
  {
    timestamps: number[];
    recentMessages: Array<{ text: string; timestamp: number }>;
  }
>();

const bannedWords = String(process.env.CHAT_BANNED_WORDS ?? "")
  .split(",")
  .map((word) => word.trim().toLowerCase())
  .filter(Boolean);

function getModerationState(playerId: string) {
  if (!moderationState.has(playerId)) {
    moderationState.set(playerId, {
      timestamps: [],
      recentMessages: [],
    });
  }

  return moderationState.get(playerId)!;
}

function createBlockedResult(code: ChatBlockedPayload["code"], message: string) {
  return {
    ok: false as const,
    error: {
      code,
      message,
    },
  };
}

function createAllowedResult(text: string) {
  return {
    ok: true as const,
    text,
  };
}

export function moderateChatMessage(playerId: string, rawMessage: unknown) {
  const normalized = sanitizeChatMessage(rawMessage);

  if (!normalized) {
    return createBlockedResult("empty-message", "Bos mesaj gonderemezsin.");
  }

  if (normalized.length > CHAT_MAX_LENGTH) {
    return createBlockedResult("max-length", `Mesaj en fazla ${CHAT_MAX_LENGTH} karakter olabilir.`);
  }

  const loweredText = normalized.toLowerCase();

  if (bannedWords.some((word) => loweredText.includes(word))) {
    return createBlockedResult("banned-word", "Bu mesaj kullanilamayan bir ifade iceriyor.");
  }

  const state = getModerationState(playerId);
  const now = Date.now();
  state.timestamps = state.timestamps.filter((timestamp) => now - timestamp < CHAT_RATE_LIMIT_WINDOW_MS);

  if (state.timestamps.length >= CHAT_RATE_LIMIT_MAX_MESSAGES) {
    return createBlockedResult("rate-limit", "Cok hizli mesaj gonderiyorsun. Biraz bekle.");
  }

  state.recentMessages = state.recentMessages.filter((entry) => now - entry.timestamp < CHAT_REPEAT_WINDOW_MS);
  const repeatedCount = state.recentMessages.filter((entry) => entry.text === loweredText).length;

  if (repeatedCount >= CHAT_REPEAT_MAX_MATCHES) {
    return createBlockedResult("repeated-message", "Ayni mesaji cok sik gonderemezsin.");
  }

  state.timestamps.push(now);
  state.recentMessages.push({
    text: loweredText,
    timestamp: now,
  });

  return createAllowedResult(normalized);
}

export function clearChatModerationState(playerId: string): void {
  moderationState.delete(playerId);
}
