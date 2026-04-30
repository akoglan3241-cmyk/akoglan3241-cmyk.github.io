import type { PoolClient } from "pg";
import { isDatabaseConfigured, queryDb } from "../db/client.ts";
import { memoryInventory } from "../services/devMemoryStore.ts";

interface InventoryRow {
  item_id: string;
  quantity: number;
}

export async function findInventoryByUserId(userId: string, client?: PoolClient): Promise<Record<string, number>> {
  if (!isDatabaseConfigured()) {
    return { ...(memoryInventory.get(userId) ?? {}) };
  }

  const executor = client ?? { query: queryDb };
  const result = await executor.query<InventoryRow>(
    `
      SELECT item_id, quantity
      FROM inventory_items
      WHERE user_id = $1
    `,
    [userId],
  );

  return Object.fromEntries(result.rows.map((row) => [row.item_id, Number(row.quantity)]));
}

export async function replaceInventoryByUserId(
  userId: string,
  items: Record<string, number>,
  client?: PoolClient,
): Promise<void> {
  if (!isDatabaseConfigured()) {
    memoryInventory.set(userId, { ...items });
    return;
  }

  const executor = client ?? { query: queryDb };
  await executor.query("DELETE FROM inventory_items WHERE user_id = $1", [userId]);

  const entries = Object.entries(items);
  for (const [itemId, quantity] of entries) {
    await executor.query(
      `
        INSERT INTO inventory_items (user_id, item_id, quantity, updated_at)
        VALUES ($1, $2, $3, NOW())
      `,
      [userId, itemId, quantity],
    );
  }
}
