export function getDefaultDirectMessagesState() {
  return {
    conversations: {},
  };
}

export function normalizeDirectMessagesState(rawState) {
  const conversations = Object.fromEntries(
    Object.entries(rawState?.conversations ?? {}).map(([userId, messages]) => [
      userId,
      Array.isArray(messages) ? messages.slice(-40) : [],
    ]),
  );

  return {
    conversations,
  };
}

export function getDirectMessageConversation(state, userId) {
  return Array.isArray(state?.conversations?.[userId]) ? state.conversations[userId] : [];
}
