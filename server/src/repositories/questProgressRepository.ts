import type { PoolClient } from "pg";
import { isDatabaseConfigured, queryDb } from "../db/client.ts";
import { memoryQuestProgress } from "../services/devMemoryStore.ts";
import type { ActiveQuestState } from "../types.ts";

interface QuestProgressRow {
  active_quest: ActiveQuestState | null;
  completed_quest_ids: string[];
}

export async function findQuestProgressByUserId(
  userId: string,
  client?: PoolClient,
): Promise<{ activeQuest: ActiveQuestState | null; completedQuestIds: string[] } | null> {
  if (!isDatabaseConfigured()) {
    return memoryQuestProgress.get(userId) ?? null;
  }

  const executor = client ?? { query: queryDb };
  const result = await executor.query<QuestProgressRow>(
    `
      SELECT active_quest, completed_quest_ids
      FROM quest_progress
      WHERE user_id = $1
    `,
    [userId],
  );

  if (!result.rows[0]) {
    return null;
  }

  return {
    activeQuest: result.rows[0].active_quest ?? null,
    completedQuestIds: Array.isArray(result.rows[0].completed_quest_ids) ? result.rows[0].completed_quest_ids : [],
  };
}

export async function saveQuestProgressByUserId(
  userId: string,
  activeQuest: ActiveQuestState | null,
  completedQuestIds: string[],
  client?: PoolClient,
): Promise<void> {
  if (!isDatabaseConfigured()) {
    memoryQuestProgress.set(userId, {
      activeQuest,
      completedQuestIds: [...completedQuestIds],
    });
    return;
  }

  const executor = client ?? { query: queryDb };
  await executor.query(
    `
      INSERT INTO quest_progress (user_id, active_quest, completed_quest_ids, updated_at)
      VALUES ($1, $2::jsonb, $3::jsonb, NOW())
      ON CONFLICT (user_id)
      DO UPDATE
      SET active_quest = EXCLUDED.active_quest,
          completed_quest_ids = EXCLUDED.completed_quest_ids,
          updated_at = NOW()
    `,
    [userId, JSON.stringify(activeQuest), JSON.stringify(completedQuestIds)],
  );
}
