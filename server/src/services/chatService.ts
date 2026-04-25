import type { ChatMessage } from "../types.ts";

const CHAT_HISTORY_LIMIT = 40;

const roomChatMessages = new Map<string, ChatMessage[]>();

export function createChatMessage({
  name,
  text,
  kind = "player",
  playerId = null,
  roomId = null,
  channel = "room",
}: Omit<ChatMessage, "id" | "timestamp">): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    text,
    kind,
    playerId,
    roomId,
    channel,
    timestamp: Date.now(),
  };
}

export function getRoomHistory(roomId: string): ChatMessage[] {
  if (!roomChatMessages.has(roomId)) {
    roomChatMessages.set(roomId, []);
  }

  return roomChatMessages.get(roomId)!;
}

export function storeChatMessage(roomId: string, message: ChatMessage): void {
  const history = getRoomHistory(roomId);
  history.push(message);

  if (history.length > CHAT_HISTORY_LIMIT) {
    history.shift();
  }
}
