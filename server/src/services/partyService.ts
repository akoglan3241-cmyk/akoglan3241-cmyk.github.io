import type { PartyInviteState, PartyMemberState, PartyState, PlayerConnection } from "../types.ts";

const PARTY_MAX_MEMBERS = 4;
const parties = new Map<string, PartyState>();
const playerPartyIds = new Map<string, string>();
const pendingInvitesByTargetId = new Map<string, PartyInviteState>();

function createPartyId(): string {
  return `party-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isNearby(left: PlayerConnection, right: PlayerConnection): boolean {
  return left.roomId === right.roomId && Math.hypot(left.x - right.x, left.y - right.y) <= 140;
}

function toMember(player: PlayerConnection, leaderId: string): PartyMemberState {
  return {
    playerId: player.id,
    playerName: player.name,
    roomId: player.roomId,
    isLeader: player.id === leaderId,
  };
}

function cloneParty(party: PartyState | null): PartyState | null {
  return party ? JSON.parse(JSON.stringify(party)) : null;
}

export function getPartyForPlayer(playerId: string): PartyState | null {
  const partyId = playerPartyIds.get(playerId);
  return cloneParty(partyId ? parties.get(partyId) ?? null : null);
}

export function getPartyMemberIds(playerId: string): string[] {
  const partyId = playerPartyIds.get(playerId);
  const party = partyId ? parties.get(partyId) : null;
  return party ? party.members.map((entry) => entry.playerId) : [];
}

export function requestPartyInvite(inviter: PlayerConnection, target: PlayerConnection, areFriends: boolean): { ok: true; invite: PartyInviteState } | { ok: false; message: string } {
  if (inviter.id === target.id) {
    return { ok: false, message: "Kendine davet gonderemezsin." };
  }

  const inviterParty = getPartyForPlayer(inviter.id);
  if (inviterParty && inviterParty.leaderId !== inviter.id) {
    return { ok: false, message: "Sadece lider davet gonderebilir." };
  }

  const inviterPartySize = inviterParty?.members.length ?? 1;
  if (inviterPartySize >= PARTY_MAX_MEMBERS) {
    return { ok: false, message: "Party dolu." };
  }

  if (getPartyForPlayer(target.id)) {
    return { ok: false, message: "Bu oyuncu zaten bir party icinde." };
  }

  if (!areFriends && !isNearby(inviter, target)) {
    return { ok: false, message: "Party daveti icin hedef oyuncuya yakinlas." };
  }

  const invite: PartyInviteState = {
    inviterPlayerId: inviter.id,
    inviterName: inviter.name,
    targetPlayerId: target.id,
    createdAt: Date.now(),
  };
  pendingInvitesByTargetId.set(target.id, invite);
  return { ok: true, invite };
}

export function respondToPartyInvite(target: PlayerConnection, accept: boolean, playersById: Map<string, PlayerConnection>): { ok: true; partiesToEmit: PartyState[]; reason?: string } | { ok: false; message: string } {
  const invite = pendingInvitesByTargetId.get(target.id);
  if (!invite) {
    return { ok: false, message: "Bekleyen party daveti yok." };
  }

  pendingInvitesByTargetId.delete(target.id);
  const inviter = playersById.get(invite.inviterPlayerId);
  if (!inviter) {
    return { ok: false, message: "Davet gonderen oyuncu artik bagli degil." };
  }

  if (!accept) {
    return { ok: true, partiesToEmit: [], reason: "Party daveti reddedildi." };
  }

  if (getPartyForPlayer(target.id)) {
    return { ok: false, message: "Zaten bir party icindesin." };
  }

  const inviterPartyId = playerPartyIds.get(inviter.id);
  let party = inviterPartyId ? parties.get(inviterPartyId) ?? null : null;

  if (!party) {
    const nextPartyId = createPartyId();
    party = {
      id: nextPartyId,
      leaderId: inviter.id,
      members: [toMember(inviter, inviter.id)],
      pendingInvite: null,
    };
    parties.set(nextPartyId, party);
    playerPartyIds.set(inviter.id, nextPartyId);
  }

  if (party.members.length >= PARTY_MAX_MEMBERS) {
    return { ok: false, message: "Party dolu." };
  }

  party.pendingInvite = null;
  party.members = [...party.members.filter((entry) => entry.playerId !== target.id), toMember(target, party.leaderId)];
  playerPartyIds.set(target.id, party.id);
  return { ok: true, partiesToEmit: [cloneParty(party)].filter(Boolean) };
}

export function leaveParty(playerId: string): { partiesToEmit: PartyState[]; closedMemberIds: string[] } {
  const partyId = playerPartyIds.get(playerId);
  const party = partyId ? parties.get(partyId) ?? null : null;
  if (!party) {
    return { partiesToEmit: [], closedMemberIds: [] };
  }

  playerPartyIds.delete(playerId);
  party.members = party.members.filter((entry) => entry.playerId !== playerId);

  if (party.members.length <= 1) {
    const closedMemberIds = party.members.map((entry) => entry.playerId);
    closedMemberIds.forEach((id) => playerPartyIds.delete(id));
    parties.delete(party.id);
    return { partiesToEmit: [], closedMemberIds };
  }

  if (party.leaderId === playerId) {
    party.leaderId = party.members[0].playerId;
  }
  party.members = party.members.map((entry) => ({ ...entry, isLeader: entry.playerId === party.leaderId }));
  return { partiesToEmit: [cloneParty(party)].filter(Boolean), closedMemberIds: [] };
}

export function syncPartyMemberRoom(player: PlayerConnection): PartyState | null {
  const partyId = playerPartyIds.get(player.id);
  const party = partyId ? parties.get(partyId) ?? null : null;
  if (!party) {
    return null;
  }

  party.members = party.members.map((entry) => (entry.playerId === player.id ? { ...entry, roomId: player.roomId } : entry));
  return cloneParty(party);
}
