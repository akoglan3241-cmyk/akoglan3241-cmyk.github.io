import type { PoolClient } from "pg";
import { isDatabaseConfigured, queryDb } from "../db/client.ts";
import { getMemoryFriendshipKey, memoryFriendships } from "../services/devMemoryStore.ts";

interface FriendshipRow {
  user_a_id: string;
  user_b_id: string;
  requested_by_user_id: string;
  status: "pending" | "accepted" | "rejected";
}

function normalizePair(userIdA: string, userIdB: string) {
  return Number(userIdA) <= Number(userIdB)
    ? { userAId: userIdA, userBId: userIdB }
    : { userAId: userIdB, userBId: userIdA };
}

export async function findFriendship(userIdA: string, userIdB: string, client?: PoolClient): Promise<FriendshipRow | null> {
  if (!isDatabaseConfigured()) {
    return memoryFriendships.get(getMemoryFriendshipKey(userIdA, userIdB)) ?? null;
  }

  const executor = client ?? { query: queryDb };
  const pair = normalizePair(userIdA, userIdB);
  const result = await executor.query<FriendshipRow>(
    `
      SELECT user_a_id, user_b_id, requested_by_user_id, status
      FROM friendships
      WHERE user_a_id = $1 AND user_b_id = $2
    `,
    [pair.userAId, pair.userBId],
  );

  return result.rows[0] ?? null;
}

export async function listFriendshipsForUser(userId: string, client?: PoolClient): Promise<FriendshipRow[]> {
  if (!isDatabaseConfigured()) {
    return Array.from(memoryFriendships.values()).filter((entry) => entry.user_a_id === userId || entry.user_b_id === userId);
  }

  const executor = client ?? { query: queryDb };
  const result = await executor.query<FriendshipRow>(
    `
      SELECT user_a_id, user_b_id, requested_by_user_id, status
      FROM friendships
      WHERE user_a_id = $1 OR user_b_id = $1
      ORDER BY updated_at DESC
    `,
    [userId],
  );

  return result.rows;
}

export async function saveFriendshipRequest(requesterId: string, targetUserId: string, status: FriendshipRow["status"], client?: PoolClient): Promise<void> {
  if (!isDatabaseConfigured()) {
    const pair = normalizePair(requesterId, targetUserId);
    memoryFriendships.set(getMemoryFriendshipKey(requesterId, targetUserId), {
      user_a_id: pair.userAId,
      user_b_id: pair.userBId,
      requested_by_user_id: requesterId,
      status,
    });
    return;
  }

  const executor = client ?? { query: queryDb };
  const pair = normalizePair(requesterId, targetUserId);
  await executor.query(
    `
      INSERT INTO friendships (user_a_id, user_b_id, requested_by_user_id, status, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_a_id, user_b_id)
      DO UPDATE SET requested_by_user_id = EXCLUDED.requested_by_user_id, status = EXCLUDED.status, updated_at = NOW()
    `,
    [pair.userAId, pair.userBId, requesterId, status],
  );
}

export async function updateFriendshipStatus(userIdA: string, userIdB: string, status: FriendshipRow["status"], client?: PoolClient): Promise<void> {
  if (!isDatabaseConfigured()) {
    const key = getMemoryFriendshipKey(userIdA, userIdB);
    const existing = memoryFriendships.get(key);

    if (existing) {
      memoryFriendships.set(key, {
        ...existing,
        status,
      });
    }
    return;
  }

  const executor = client ?? { query: queryDb };
  const pair = normalizePair(userIdA, userIdB);
  await executor.query(
    `
      UPDATE friendships
      SET status = $3, updated_at = NOW()
      WHERE user_a_id = $1 AND user_b_id = $2
    `,
    [pair.userAId, pair.userBId, status],
  );
}
