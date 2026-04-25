export function getDefaultFriendsState() {
  return {
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
  };
}

export function normalizeFriendsState(rawState) {
  const normalizeEntry = (entry) => ({
    ...entry,
    homeAccess: entry?.homeAccess === "public" ? "public" : "friends",
  });

  return {
    friends: Array.isArray(rawState?.friends) ? rawState.friends.map(normalizeEntry) : [],
    incomingRequests: Array.isArray(rawState?.incomingRequests) ? rawState.incomingRequests.map(normalizeEntry) : [],
    outgoingRequests: Array.isArray(rawState?.outgoingRequests) ? rawState.outgoingRequests.map(normalizeEntry) : [],
  };
}

export function getFriendRelationship(friendsState, playerName) {
  if ((friendsState?.friends ?? []).some((entry) => entry.playerName === playerName)) {
    return "friend";
  }

  if ((friendsState?.incomingRequests ?? []).some((entry) => entry.playerName === playerName)) {
    return "incoming";
  }

  if ((friendsState?.outgoingRequests ?? []).some((entry) => entry.playerName === playerName)) {
    return "outgoing";
  }

  return "none";
}
