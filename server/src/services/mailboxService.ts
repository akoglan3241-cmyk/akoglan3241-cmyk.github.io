import type { MailEntry, MailReward, MailboxState, PlayerConnection } from "../types.ts";
import { addItem } from "./inventoryService.ts";
import { grantXp } from "./progressionService.ts";

function createMailId(): string {
  return `mail-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeReward(rawReward?: Partial<MailReward> | null): MailReward {
  return {
    coins: Math.max(0, Number(rawReward?.coins ?? 0)),
    xp: Math.max(0, Number(rawReward?.xp ?? 0)),
    items: Array.isArray(rawReward?.items)
      ? rawReward.items
          .map((entry) => ({
            itemId: String(entry?.itemId ?? ""),
            amount: Math.max(1, Number(entry?.amount ?? 1)),
          }))
          .filter((entry) => entry.itemId)
      : [],
  };
}

function normalizeMailEntry(rawEntry?: Partial<MailEntry> | null): MailEntry | null {
  if (!rawEntry?.id) {
    return null;
  }

  return {
    id: String(rawEntry.id),
    kind: rawEntry.kind === "gift" ? "gift" : "system",
    subject: String(rawEntry.subject ?? "Mail"),
    message: String(rawEntry.message ?? ""),
    senderUserId: rawEntry.senderUserId ? String(rawEntry.senderUserId) : null,
    senderName: rawEntry.senderName ? String(rawEntry.senderName) : null,
    rewards: normalizeReward(rawEntry.rewards),
    isClaimed: Boolean(rawEntry.isClaimed),
    claimedAt: rawEntry.claimedAt ? Number(rawEntry.claimedAt) : null,
    createdAt: Math.max(0, Number(rawEntry.createdAt ?? Date.now())),
  };
}

export function createMailboxState(rawState?: Partial<MailboxState> | null): MailboxState {
  return {
    entries: Array.isArray(rawState?.entries)
      ? rawState.entries.map(normalizeMailEntry).filter(Boolean).sort((left, right) => right.createdAt - left.createdAt)
      : [],
  };
}

export function enqueueMail(
  mailboxState: MailboxState,
  entry: Omit<MailEntry, "id" | "isClaimed" | "claimedAt" | "createdAt">,
): MailEntry {
  const nextEntry: MailEntry = {
    id: createMailId(),
    kind: entry.kind,
    subject: entry.subject,
    message: entry.message,
    senderUserId: entry.senderUserId,
    senderName: entry.senderName,
    rewards: normalizeReward(entry.rewards),
    isClaimed: false,
    claimedAt: null,
    createdAt: Date.now(),
  };

  mailboxState.entries = [nextEntry, ...mailboxState.entries].slice(0, 40);
  return nextEntry;
}

export function enqueueSystemRewardMail(
  mailboxState: MailboxState,
  subject: string,
  message: string,
  rewards: Partial<MailReward>,
): MailEntry {
  return enqueueMail(mailboxState, {
    kind: "system",
    subject,
    message,
    senderUserId: null,
    senderName: null,
    rewards: normalizeReward(rewards),
  });
}

export function enqueueGiftMail(
  mailboxState: MailboxState,
  senderUserId: string,
  senderName: string,
  subject: string,
  message: string,
  rewards: Partial<MailReward>,
): MailEntry {
  return enqueueMail(mailboxState, {
    kind: "gift",
    subject,
    message,
    senderUserId,
    senderName,
    rewards: normalizeReward(rewards),
  });
}

export function claimMailForPlayer(player: PlayerConnection, mailId: string): MailEntry | null {
  const entry = player.mailboxState.entries.find((mail) => mail.id === mailId) ?? null;

  if (!entry || entry.isClaimed) {
    return null;
  }

  entry.isClaimed = true;
  entry.claimedAt = Date.now();
  if (entry.rewards.coins > 0) {
    addItem(player.gameplayState, "coin", entry.rewards.coins);
  }
  if (entry.rewards.xp > 0) {
    grantXp(player.gameplayState, entry.rewards.xp);
  }
  entry.rewards.items.forEach((item) => {
    addItem(player.gameplayState, item.itemId, item.amount);
  });

  return entry;
}
