import type { DirectMessageEntry, DirectMessagesState } from "../types.ts";
import { sanitizeChatMessage } from "./userContentValidation.ts";

const MAX_MESSAGES_PER_CONVERSATION = 40;
const MAX_CONVERSATIONS = 24;

function createMessageId(): string {
  return `dm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeMessage(rawEntry?: Partial<DirectMessageEntry> | null): DirectMessageEntry | null {
  if (!rawEntry?.id || !rawEntry?.senderUserId || !rawEntry?.targetUserId) {
    return null;
  }

  return {
    id: String(rawEntry.id),
    senderUserId: String(rawEntry.senderUserId),
    senderName: String(rawEntry.senderName ?? ""),
    targetUserId: String(rawEntry.targetUserId),
    text: sanitizeChatMessage(rawEntry.text ?? ""),
    createdAt: Math.max(0, Number(rawEntry.createdAt ?? Date.now())),
  };
}

export function createDirectMessagesState(rawState?: Partial<DirectMessagesState> | null): DirectMessagesState {
  const rawConversations = rawState?.conversations ?? {};
  const conversations = Object.fromEntries(
    Object.entries(rawConversations)
      .map(([userId, messages]) => [
        userId,
        Array.isArray(messages)
          ? messages.map((entry) => normalizeMessage(entry)).filter(Boolean).slice(-MAX_MESSAGES_PER_CONVERSATION)
          : [],
      ])
      .filter(([, messages]) => messages.length > 0),
  );

  return {
    conversations,
  };
}

export function appendDirectMessage(
  state: DirectMessagesState,
  counterpartUserId: string,
  message: Omit<DirectMessageEntry, "id" | "createdAt">,
): DirectMessageEntry {
  const entry: DirectMessageEntry = {
    id: createMessageId(),
    senderUserId: message.senderUserId,
    senderName: message.senderName,
    targetUserId: message.targetUserId,
    text: sanitizeChatMessage(message.text),
    createdAt: Date.now(),
  };

  const existingMessages = state.conversations[counterpartUserId] ?? [];
  state.conversations[counterpartUserId] = [...existingMessages, entry].slice(-MAX_MESSAGES_PER_CONVERSATION);

  const orderedKeys = Object.keys(state.conversations)
    .sort((left, right) => {
      const leftLatest = state.conversations[left]?.at(-1)?.createdAt ?? 0;
      const rightLatest = state.conversations[right]?.at(-1)?.createdAt ?? 0;
      return rightLatest - leftLatest;
    })
    .slice(0, MAX_CONVERSATIONS);

  state.conversations = Object.fromEntries(orderedKeys.map((key) => [key, state.conversations[key]]));
  return entry;
}
