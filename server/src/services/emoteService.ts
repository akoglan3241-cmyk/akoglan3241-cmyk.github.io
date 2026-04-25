import type { PlayerConnection } from "../types.ts";

const EMOTE_DEFINITIONS = {
  wave: { durationMs: 2400 },
  dance: { durationMs: 4200 },
  sit: { durationMs: 60000 },
  laugh: { durationMs: 2400 },
  cry: { durationMs: 2400 },
  surprised: { durationMs: 1800 },
} as const;

export function isValidEmoteId(emoteId: string): boolean {
  return Object.prototype.hasOwnProperty.call(EMOTE_DEFINITIONS, emoteId);
}

export function applyPlayerEmote(player: PlayerConnection, emoteId: string): boolean {
  if (!isValidEmoteId(emoteId)) {
    return false;
  }

  player.activeEmoteId = emoteId;
  player.emoteEndsAt = Date.now() + EMOTE_DEFINITIONS[emoteId as keyof typeof EMOTE_DEFINITIONS].durationMs;
  return true;
}
