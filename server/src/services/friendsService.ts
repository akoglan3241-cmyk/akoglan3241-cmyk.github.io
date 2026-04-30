import { findFriendship, listFriendshipsForUser, saveFriendshipRequest, updateFriendshipStatus } from "../repositories/friendshipsRepository.ts";
import { loadPlayerProfile } from "./persistenceService.ts";
import { findUserByDisplayName, findUserById } from "../repositories/usersRepository.ts";
import type { FriendRecord, FriendsStatePayload, UserRecord } from "../types.ts";
import { sanitizePlayerName } from "./userContentValidation.ts";

type PresenceSnapshot = {
  isOnline: boolean;
  roomId: string | null;
  roomName: string | null;
};

type ResolvePresence = (userId: string) => PresenceSnapshot;
type ResolveUserById = (userId: string) => Promise<UserRecord | null>;

async function toFriendRecord(
  currentUserId: string,
  friendship: {
    user_a_id: string;
    user_b_id: string;
    requested_by_user_id: string;
    status: "pending" | "accepted" | "rejected";
  },
  resolveUserById: ResolveUserById,
  resolvePresence: ResolvePresence,
): Promise<FriendRecord | null> {
  const otherUserId = friendship.user_a_id === currentUserId ? friendship.user_b_id : friendship.user_a_id;
  const user = await resolveUserById(otherUserId);

  if (!user || friendship.status === "rejected") {
    return null;
  }

  const presence = resolvePresence(otherUserId);
  const profile = await loadPlayerProfile(user.username);
  let status: FriendRecord["status"] = "accepted";

  if (friendship.status === "pending") {
    status = friendship.requested_by_user_id === currentUserId ? "pending-outgoing" : "pending-incoming";
  }

  return {
    playerId: user.id,
    playerName: user.displayName,
    status,
    isOnline: presence.isOnline,
    roomId: presence.roomId,
    roomName: presence.roomName,
    homeAccess: profile?.homeState?.access?.isPublic ? "public" : "friends",
  };
}

export async function buildFriendsState(
  currentUserId: string,
  resolveUserById: ResolveUserById,
  resolvePresence: ResolvePresence,
): Promise<FriendsStatePayload> {
  const friendships = await listFriendshipsForUser(currentUserId);
  const records = (await Promise.all(friendships.map((entry) => toFriendRecord(currentUserId, entry, resolveUserById, resolvePresence)))).filter(Boolean) as FriendRecord[];

  return {
    friends: records.filter((entry) => entry.status === "accepted"),
    incomingRequests: records.filter((entry) => entry.status === "pending-incoming"),
    outgoingRequests: records.filter((entry) => entry.status === "pending-outgoing"),
  };
}

export async function canVisitPlayerHome(viewerUserId: string, ownerUserId: string): Promise<boolean> {
  if (!viewerUserId || !ownerUserId) {
    return false;
  }

  if (viewerUserId === ownerUserId) {
    return true;
  }

  const ownerUser = await findUserById(ownerUserId);
  const ownerProfile = ownerUser ? await loadPlayerProfile(ownerUser.username) : null;

  if (ownerProfile?.homeState?.access?.isPublic) {
    return true;
  }

  const friendship = await findFriendship(viewerUserId, ownerUserId);
  return friendship?.status === "accepted";
}

export async function areUsersFriends(userIdA: string, userIdB: string): Promise<boolean> {
  if (!userIdA || !userIdB || userIdA === userIdB) {
    return false;
  }

  const friendship = await findFriendship(userIdA, userIdB);
  return friendship?.status === "accepted";
}

export async function sendFriendRequest(currentUser: UserRecord, targetPlayerName: string): Promise<{ ok: true; targetUserId: string } | { ok: false; message: string }> {
  const normalizedName = sanitizePlayerName(targetPlayerName, "");

  if (!normalizedName) {
    return { ok: false, message: "Arkadas istegi icin bir oyuncu adi gir." };
  }

  const targetUser = await findUserByDisplayName(normalizedName);

  if (!targetUser) {
    return { ok: false, message: "Bu isimle kayitli bir oyuncu bulunamadi." };
  }

  if (targetUser.id === currentUser.id) {
    return { ok: false, message: "Kendine arkadas istegi gonderemezsin." };
  }

  const existing = await findFriendship(currentUser.id, targetUser.id);

  if (existing?.status === "accepted") {
    return { ok: false, message: "Bu oyuncu zaten arkadas listende." };
  }

  if (existing?.status === "pending" && existing.requested_by_user_id === currentUser.id) {
    return { ok: false, message: "Bu oyuncuya zaten bir istek gonderdin." };
  }

  if (existing?.status === "pending" && existing.requested_by_user_id === targetUser.id) {
    await updateFriendshipStatus(currentUser.id, targetUser.id, "accepted");
    return { ok: true, targetUserId: targetUser.id };
  }

  await saveFriendshipRequest(currentUser.id, targetUser.id, "pending");
  return { ok: true, targetUserId: targetUser.id };
}

export async function respondToFriendRequest(
  currentUserId: string,
  otherUserId: string,
  decision: "accept" | "reject",
): Promise<{ ok: true } | { ok: false; message: string }> {
  const existing = await findFriendship(currentUserId, otherUserId);

  if (!existing || existing.status !== "pending") {
    return { ok: false, message: "Bekleyen bir arkadas istegi bulunamadi." };
  }

  const isIncomingRequest = existing.requested_by_user_id !== currentUserId;

  if (!isIncomingRequest) {
    return { ok: false, message: "Yalnizca gelen istekleri yanitlayabilirsin." };
  }

  await updateFriendshipStatus(currentUserId, otherUserId, decision === "accept" ? "accepted" : "rejected");
  return { ok: true };
}
