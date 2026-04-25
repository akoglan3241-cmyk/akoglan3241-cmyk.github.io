import type { PoolClient } from "pg";
import { isDatabaseConfigured, queryDb } from "../db/client.ts";
import { memoryWorldState } from "../services/devMemoryStore.ts";

interface IdRow {
  pickup_id?: string;
  chest_id?: string;
}

export async function findWorldStateByUserId(
  userId: string,
  client?: PoolClient,
): Promise<{ collectedPickupIds: string[]; openedChestIds: string[] }> {
  if (!isDatabaseConfigured()) {
    const state = memoryWorldState.get(userId);
    return {
      collectedPickupIds: [...(state?.collectedPickupIds ?? [])],
      openedChestIds: [...(state?.openedChestIds ?? [])],
    };
  }

  const executor = client ?? { query: queryDb };

  const [pickupResult, chestResult] = await Promise.all([
    executor.query<IdRow>(
      `
        SELECT pickup_id
        FROM collected_pickups
        WHERE user_id = $1
      `,
      [userId],
    ),
    executor.query<IdRow>(
      `
        SELECT chest_id
        FROM opened_chests
        WHERE user_id = $1
      `,
      [userId],
    ),
  ]);

  return {
    collectedPickupIds: pickupResult.rows.map((row) => String(row.pickup_id)),
    openedChestIds: chestResult.rows.map((row) => String(row.chest_id)),
  };
}

export async function replaceWorldStateByUserId(
  userId: string,
  collectedPickupIds: string[],
  openedChestIds: string[],
  client?: PoolClient,
): Promise<void> {
  if (!isDatabaseConfigured()) {
    memoryWorldState.set(userId, {
      collectedPickupIds: [...collectedPickupIds],
      openedChestIds: [...openedChestIds],
    });
    return;
  }

  const executor = client ?? { query: queryDb };
  await executor.query(
    `
      INSERT INTO world_state (user_id, updated_at)
      VALUES ($1, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET updated_at = NOW()
    `,
    [userId],
  );
  await executor.query("DELETE FROM collected_pickups WHERE user_id = $1", [userId]);
  await executor.query("DELETE FROM opened_chests WHERE user_id = $1", [userId]);

  for (const pickupId of collectedPickupIds) {
    await executor.query(
      `
        INSERT INTO collected_pickups (user_id, pickup_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, pickup_id) DO NOTHING
      `,
      [userId, pickupId],
    );
  }

  for (const chestId of openedChestIds) {
    await executor.query(
      `
        INSERT INTO opened_chests (user_id, chest_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, chest_id) DO NOTHING
      `,
      [userId, chestId],
    );
  }
}
