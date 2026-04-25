export function getDefaultMailboxState() {
  return {
    entries: [],
  };
}

export function normalizeMailboxState(rawState) {
  return {
    entries: Array.isArray(rawState?.entries)
      ? rawState.entries
          .map((entry) => ({
            id: String(entry?.id ?? ""),
            kind: entry?.kind === "gift" ? "gift" : "system",
            subject: String(entry?.subject ?? "Mail"),
            message: String(entry?.message ?? ""),
            senderUserId: entry?.senderUserId ? String(entry.senderUserId) : null,
            senderName: entry?.senderName ? String(entry.senderName) : null,
            rewards: {
              coins: Math.max(0, Number(entry?.rewards?.coins ?? 0)),
              xp: Math.max(0, Number(entry?.rewards?.xp ?? 0)),
              items: Array.isArray(entry?.rewards?.items)
                ? entry.rewards.items
                    .map((item) => ({
                      itemId: String(item?.itemId ?? ""),
                      amount: Math.max(1, Number(item?.amount ?? 1)),
                    }))
                    .filter((item) => item.itemId)
                : [],
            },
            isClaimed: Boolean(entry?.isClaimed),
            claimedAt: entry?.claimedAt ? Number(entry.claimedAt) : null,
            createdAt: Math.max(0, Number(entry?.createdAt ?? 0)),
          }))
          .filter((entry) => entry.id)
          .sort((left, right) => right.createdAt - left.createdAt)
      : [],
  };
}
