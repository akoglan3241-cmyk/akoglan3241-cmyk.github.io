import type { PlayerConnection, PlayerProfileSummary } from "../types.ts";

function buildBadges(player: PlayerConnection): string[] {
  const badges = (player.gameplayState.badges?.entries ?? []).filter((entry) => entry.isUnlocked).map((entry) => entry.title);

  if (!badges.length) {
    badges.push("Newcomer");
  }

  return badges.slice(0, 3);
}

function buildStatusText(player: PlayerConnection): string {
  if (player.statusText) {
    return player.statusText;
  }

  const activeQuest = player.gameplayState.quest.activeQuest;

  if (activeQuest) {
    return `${activeQuest.title} goreviyle mesgul.`;
  }

  return `${player.roomId} odasinda takiliyor.`;
}

export function buildPlayerProfileSummary(player: PlayerConnection): PlayerProfileSummary {
  const level = Number(player.gameplayState.progression?.level ?? 1);
  const equippedBadgeLabel = (player.gameplayState.badges?.entries ?? []).find((entry) => entry.isEquipped)?.shortLabel ?? "";

  return {
    playerId: player.id,
    accountId: player.auth.subjectId,
    displayName: player.name,
    appearance: player.appearance,
    level,
    coins: Number(player.gameplayState.inventory.items.coin ?? 0),
    badges: buildBadges(player),
    equippedBadgeLabel,
    statusText: buildStatusText(player),
    homeAccess: player.homeState?.access?.isPublic ? "public" : "friends",
  };
}
