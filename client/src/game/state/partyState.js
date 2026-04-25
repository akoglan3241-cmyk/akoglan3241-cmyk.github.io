export function getDefaultPartyState() {
  return {
    id: null,
    leaderId: null,
    members: [],
    pendingInvite: null,
  };
}

export function normalizePartyState(rawState) {
  if (!rawState?.id) {
    return getDefaultPartyState();
  }

  return {
    id: String(rawState.id),
    leaderId: String(rawState.leaderId ?? ""),
    members: Array.isArray(rawState.members)
      ? rawState.members.map((entry) => ({
          playerId: String(entry?.playerId ?? ""),
          playerName: String(entry?.playerName ?? ""),
          roomId: String(entry?.roomId ?? ""),
          isLeader: Boolean(entry?.isLeader),
        }))
      : [],
    pendingInvite: rawState.pendingInvite
      ? {
          inviterPlayerId: String(rawState.pendingInvite.inviterPlayerId ?? ""),
          inviterName: String(rawState.pendingInvite.inviterName ?? ""),
          targetPlayerId: String(rawState.pendingInvite.targetPlayerId ?? ""),
          createdAt: Number(rawState.pendingInvite.createdAt ?? 0),
        }
      : null,
  };
}
