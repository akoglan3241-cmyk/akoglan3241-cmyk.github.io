import type { PoolClient } from "pg";
import { isDatabaseConfigured, queryDb } from "../db/client.ts";
import { memoryReports } from "../services/devMemoryStore.ts";
import type { PlayerReportEntry } from "../types.ts";

interface PlayerReportRow {
  id: string;
  reporter_subject_id: string;
  reporter_name: string;
  target_player_id: string;
  target_account_id: string;
  target_display_name: string;
  reason: string;
  created_at: Date | string;
}

export async function insertPlayerReport(report: PlayerReportEntry, client?: PoolClient): Promise<void> {
  if (!isDatabaseConfigured()) {
    memoryReports.push(report);
    return;
  }

  const executor = client ?? { query: queryDb };
  await executor.query(
    `
      INSERT INTO player_reports (
        id,
        reporter_subject_id,
        reporter_name,
        target_player_id,
        target_account_id,
        target_display_name,
        reason,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, TO_TIMESTAMP($8 / 1000.0))
    `,
    [
      report.id,
      report.reporterSubjectId,
      report.reporterName,
      report.targetPlayerId,
      report.targetAccountId,
      report.targetDisplayName,
      report.reason,
      report.createdAt,
    ],
  );
}

export async function listPlayerReportsByTargetAccountId(targetAccountId: string, client?: PoolClient): Promise<PlayerReportEntry[]> {
  if (!isDatabaseConfigured()) {
    return memoryReports.filter((entry) => entry.targetAccountId === targetAccountId);
  }

  const executor = client ?? { query: queryDb };
  const result = await executor.query<PlayerReportRow>(
    `
      SELECT id, reporter_subject_id, reporter_name, target_player_id, target_account_id, target_display_name, reason, created_at
      FROM player_reports
      WHERE target_account_id = $1
      ORDER BY created_at DESC
    `,
    [targetAccountId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    reporterSubjectId: row.reporter_subject_id,
    reporterName: row.reporter_name,
    targetPlayerId: row.target_player_id,
    targetAccountId: row.target_account_id,
    targetDisplayName: row.target_display_name,
    reason: row.reason,
    createdAt: new Date(row.created_at).getTime(),
  }));
}
