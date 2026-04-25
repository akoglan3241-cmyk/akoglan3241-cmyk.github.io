import { addItem } from "./inventoryService.ts";
import { getItemDefinition } from "./itemContentService.ts";
import { createPersonalHomeRoomId, getRoomBaseId } from "./roomService.ts";
import { ROOMS } from "../config/gameplayData.ts";
import type { AdminActionResult, AuthContext, PlayerConnection } from "../types.ts";

const ADMIN_USER_IDS = new Set(
  String(process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean),
);

const ADMIN_USERNAMES = new Set(
  String(process.env.ADMIN_USERNAMES ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean),
);

const mutedPlayers = new Map<string, number>();

function logAdminAction(action: string, actor: AuthContext, details: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      kind: "admin-action",
      action,
      actorId: actor.subjectId,
      actorUsername: actor.username,
      actorDisplayName: actor.displayName,
      timestamp: new Date().toISOString(),
      ...details,
    }),
  );
}

function getPlayerLookupKey(playerName: string): string {
  return String(playerName ?? "").trim().toLowerCase();
}

export function isAdminAuth(auth: AuthContext): boolean {
  return ADMIN_USER_IDS.has(auth.subjectId) || ADMIN_USERNAMES.has(String(auth.username ?? "").toLowerCase());
}

export function getMuteState(player: PlayerConnection): { isMuted: boolean; remainingMs: number } {
  const expiresAt = mutedPlayers.get(player.auth.subjectId) ?? 0;

  if (!expiresAt || expiresAt <= Date.now()) {
    mutedPlayers.delete(player.auth.subjectId);
    return { isMuted: false, remainingMs: 0 };
  }

  return {
    isMuted: true,
    remainingMs: Math.max(0, expiresAt - Date.now()),
  };
}

function findPlayerByName(players: Map<string, PlayerConnection>, playerName: string): PlayerConnection | null {
  const lookupKey = getPlayerLookupKey(playerName);
  return Array.from(players.values()).find((entry) => getPlayerLookupKey(entry.name) === lookupKey) ?? null;
}

export function tryHandleAdminCommand(
  actor: PlayerConnection,
  rawText: string,
  players: Map<string, PlayerConnection>,
): {
  handled: boolean;
  result?: AdminActionResult;
  action?:
    | { type: "kick"; targetPlayerId: string; reason: string }
    | { type: "teleport"; roomId: string }
    | { type: "mute"; targetPlayerId: string; durationMinutes: number }
    | { type: "grant"; targetPlayerId: string; grantKind: "item" | "coins" };
} {
  const text = String(rawText ?? "").trim();

  if (!text.startsWith("/admin ")) {
    return { handled: false };
  }

  if (!isAdminAuth(actor.auth)) {
    return {
      handled: true,
      result: {
        ok: false,
        message: "Bu komut sadece admin kullanicilar icin acik.",
      },
    };
  }

  const tokens = text.split(/\s+/);
  const command = String(tokens[1] ?? "").toLowerCase();

  if (command === "kick") {
    const targetName = tokens[2] ?? "";
    const targetPlayer = findPlayerByName(players, targetName);

    if (!targetPlayer) {
      return { handled: true, result: { ok: false, message: "Kick icin oyuncu bulunamadi." } };
    }

    logAdminAction("kick", actor.auth, {
      targetPlayerId: targetPlayer.id,
      targetName: targetPlayer.name,
    });
    return {
      handled: true,
      result: { ok: true, message: `${targetPlayer.name} oyundan atiliyor.` },
      action: {
        type: "kick",
        targetPlayerId: targetPlayer.id,
        reason: "Bir admin tarafindan oyundan cikarildin.",
      },
    };
  }

  if (command === "mute") {
    const targetName = tokens[2] ?? "";
    const targetPlayer = findPlayerByName(players, targetName);
    const durationMinutes = Math.max(1, Number(tokens[3] ?? 10));

    if (!targetPlayer) {
      return { handled: true, result: { ok: false, message: "Mute icin oyuncu bulunamadi." } };
    }

    const expiresAt = Date.now() + durationMinutes * 60_000;
    mutedPlayers.set(targetPlayer.auth.subjectId, expiresAt);
    logAdminAction("mute", actor.auth, {
      targetPlayerId: targetPlayer.id,
      targetName: targetPlayer.name,
      durationMinutes,
      expiresAt,
    });
    return {
      handled: true,
      result: {
        ok: true,
        message: `${targetPlayer.name} ${durationMinutes} dakika susturuldu.`,
      },
      action: {
        type: "mute",
        targetPlayerId: targetPlayer.id,
        durationMinutes,
      },
    };
  }

  if (command === "tp" || command === "teleport") {
    const roomToken = String(tokens[2] ?? "").trim();
    const roomId = roomToken === "home" ? createPersonalHomeRoomId(actor.auth.subjectId) : roomToken;
    const baseRoomId = getRoomBaseId(roomId);

    if (!roomId || !ROOMS[baseRoomId]) {
      return { handled: true, result: { ok: false, message: "Teleport icin bir oda gir." } };
    }

    logAdminAction("teleport", actor.auth, {
      roomId,
    });
    return {
      handled: true,
      result: { ok: true, message: `${roomId} odasina gecis yapiliyor.` },
      action: {
        type: "teleport",
        roomId,
      },
    };
  }

  if (command === "grantitem" || command === "giveitem") {
    const targetName = tokens[2] ?? "";
    const itemId = String(tokens[3] ?? "").trim();
    const amount = Math.max(1, Number(tokens[4] ?? 1));
    const targetPlayer = findPlayerByName(players, targetName);
    const itemDefinition = getItemDefinition(itemId);

    if (!targetPlayer || !itemDefinition) {
      return { handled: true, result: { ok: false, message: "Item verilemedi. Oyuncu veya item gecersiz." } };
    }

    addItem(targetPlayer.gameplayState, itemId, amount);
    logAdminAction("grant-item", actor.auth, {
      targetPlayerId: targetPlayer.id,
      targetName: targetPlayer.name,
      itemId,
      amount,
    });
    return {
      handled: true,
      result: { ok: true, message: `${targetPlayer.name} oyuncusuna ${amount} ${itemDefinition.label} verildi.` },
      action: {
        type: "grant",
        targetPlayerId: targetPlayer.id,
        grantKind: "item",
      },
    };
  }

  if (command === "grantcoins" || command === "givecoins") {
    const targetName = tokens[2] ?? "";
    const amount = Math.max(1, Number(tokens[3] ?? 0));
    const targetPlayer = findPlayerByName(players, targetName);

    if (!targetPlayer || !amount) {
      return { handled: true, result: { ok: false, message: "Coin verilemedi. Oyuncu veya miktar gecersiz." } };
    }

    addItem(targetPlayer.gameplayState, "coin", amount);
    logAdminAction("grant-coins", actor.auth, {
      targetPlayerId: targetPlayer.id,
      targetName: targetPlayer.name,
      amount,
    });
    return {
      handled: true,
      result: { ok: true, message: `${targetPlayer.name} oyuncusuna ${amount} coin verildi.` },
      action: {
        type: "grant",
        targetPlayerId: targetPlayer.id,
        grantKind: "coins",
      },
    };
  }

  return {
    handled: true,
    result: {
      ok: false,
      message: "Admin komutu gecersiz. Kullan: /admin kick|mute|tp|grantitem|grantcoins",
    },
  };
}
