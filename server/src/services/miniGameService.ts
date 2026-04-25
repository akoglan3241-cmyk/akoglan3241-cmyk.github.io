import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MiniGameRewardResult, PlayerConnection } from "../types.ts";
import { addItem } from "./inventoryService.ts";
import { grantXp } from "./progressionService.ts";
import { getRoomBaseId } from "./roomService.ts";

interface MiniGameRewardTier {
  minScore: number;
  coins: number;
  xp: number;
  rankLabel: string;
}

interface MiniGameDefinition {
  id: string;
  roomId: string;
  scoreCap: number;
  rewards: MiniGameRewardTier[];
}

interface MiniGameBalanceContent {
  rewardCooldownMs?: unknown;
  games?: Record<string, unknown>;
}

function loadMiniGameBalance(): MiniGameBalanceContent {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  const filePath = path.resolve(serviceDir, "../../../client/src/game/content/balance/minigames.json");
  return JSON.parse(readFileSync(filePath, "utf8")) as MiniGameBalanceContent;
}

function normalizeRewardTier(rawTier: unknown): MiniGameRewardTier {
  const record = (rawTier ?? {}) as Record<string, unknown>;
  return {
    minScore: Math.max(0, Number(record.minScore ?? 0)),
    coins: Math.max(0, Number(record.coins ?? 0)),
    xp: Math.max(0, Number(record.xp ?? 0)),
    rankLabel: String(record.rankLabel ?? "Practice"),
  };
}

function normalizeGameDefinition(rawDefinition: unknown, fallbackId: string): MiniGameDefinition {
  const record = (rawDefinition ?? {}) as Record<string, unknown>;
  return {
    id: String(record.id ?? fallbackId),
    roomId: String(record.roomId ?? "arcade"),
    scoreCap: Math.max(1, Number(record.scoreCap ?? 100)),
    rewards: Array.isArray(record.rewards) ? record.rewards.map(normalizeRewardTier).sort((a, b) => b.minScore - a.minScore) : [],
  };
}

const miniGameBalance = loadMiniGameBalance();
const MINIGAME_REWARD_COOLDOWN_MS = Math.max(500, Number(miniGameBalance.rewardCooldownMs ?? 3500));
const MINI_GAME_DEFINITIONS = Object.fromEntries(
  Object.entries(miniGameBalance.games ?? {}).map(([gameId, definition]) => [gameId, normalizeGameDefinition(definition, gameId)]),
);

export function claimMiniGameReward(player: PlayerConnection, miniGameId: string, rawScore: unknown): MiniGameRewardResult {
  const miniGame = MINI_GAME_DEFINITIONS[miniGameId as keyof typeof MINI_GAME_DEFINITIONS];
  const score = Math.max(0, Math.min(Math.floor(Number(rawScore ?? 0) || 0), 9999));

  if (!miniGame) {
    return {
      ok: false,
      code: "invalid-minigame",
      message: "Mini-game bulunamadi.",
    };
  }

  if (!Number.isFinite(score)) {
    return {
      ok: false,
      code: "invalid-score",
      message: "Gecersiz skor.",
    };
  }

  if (getRoomBaseId(player.roomId) !== miniGame.roomId) {
    return {
      ok: false,
      code: "not-allowed",
      message: "Bu odada odul alinmiyor.",
    };
  }

  const now = Date.now();
  const lastClaimAt = Number(player.miniGameSessionState.lastRewardClaimAtByGame[miniGameId] ?? 0);
  if (now - lastClaimAt < MINIGAME_REWARD_COOLDOWN_MS) {
    return {
      ok: false,
      code: "cooldown",
      message: "Yeni deneme icin bir an bekle.",
    };
  }

  const clampedScore = Math.min(score, miniGame.scoreCap);
  const rewardTier =
    miniGame.rewards.find((entry) => clampedScore >= entry.minScore) ??
    { minScore: 0, coins: 0, xp: 0, rankLabel: "Practice" };

  player.miniGameSessionState.lastRewardClaimAtByGame[miniGameId] = now;
  if (rewardTier.coins > 0) {
    addItem(player.gameplayState, "coin", rewardTier.coins);
  }
  if (rewardTier.xp > 0) {
    grantXp(player.gameplayState, rewardTier.xp);
  }

  return {
    ok: true,
    code: "ok",
    miniGameId,
    score: clampedScore,
    coins: rewardTier.coins,
    xp: rewardTier.xp,
    rankLabel: rewardTier.rankLabel,
    message: `${rewardTier.rankLabel}: +${rewardTier.coins} coin, +${rewardTier.xp} XP`,
  };
}
