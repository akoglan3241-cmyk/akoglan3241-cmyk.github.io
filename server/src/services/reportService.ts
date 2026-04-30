import { randomUUID } from "node:crypto";
import { insertPlayerReport } from "../repositories/reportsRepository.ts";
import type { AdminActionResult, PlayerConnection, PlayerReportEntry } from "../types.ts";

const REPORT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REPORTS_PER_WINDOW = 3;
const reportTimestampsByReporter = new Map<string, number[]>();

function sanitizeReportReason(rawReason: unknown): string {
  return String(rawReason ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function canSubmitReport(reporterSubjectId: string): boolean {
  const now = Date.now();
  const recentTimestamps = (reportTimestampsByReporter.get(reporterSubjectId) ?? []).filter((value) => now - value < REPORT_WINDOW_MS);
  reportTimestampsByReporter.set(reporterSubjectId, recentTimestamps);
  return recentTimestamps.length < MAX_REPORTS_PER_WINDOW;
}

function markReportSubmitted(reporterSubjectId: string): void {
  const now = Date.now();
  const recentTimestamps = (reportTimestampsByReporter.get(reporterSubjectId) ?? []).filter((value) => now - value < REPORT_WINDOW_MS);
  recentTimestamps.push(now);
  reportTimestampsByReporter.set(reporterSubjectId, recentTimestamps);
}

export async function submitPlayerReport(
  reporter: PlayerConnection,
  target: PlayerConnection,
  rawReason: unknown,
): Promise<AdminActionResult> {
  const reason = sanitizeReportReason(rawReason);

  if (!reason || reason.length < 4) {
    return {
      ok: false,
      message: "Rapor nedeni en az 4 karakter olmali.",
    };
  }

  if (reporter.id === target.id) {
    return {
      ok: false,
      message: "Kendini raporlayamazsin.",
    };
  }

  if (!canSubmitReport(reporter.auth.subjectId)) {
    return {
      ok: false,
      message: "Cok sik rapor gonderiyorsun. Lutfen biraz bekle.",
    };
  }

  const report: PlayerReportEntry = {
    id: randomUUID(),
    reporterSubjectId: reporter.auth.subjectId,
    reporterName: reporter.name,
    targetPlayerId: target.id,
    targetAccountId: target.auth.subjectId,
    targetDisplayName: target.name,
    reason,
    createdAt: Date.now(),
  };

  await insertPlayerReport(report);
  markReportSubmitted(reporter.auth.subjectId);
  console.log(
    JSON.stringify({
      kind: "player-report",
      reportId: report.id,
      reporterSubjectId: report.reporterSubjectId,
      reporterName: report.reporterName,
      targetPlayerId: report.targetPlayerId,
      targetAccountId: report.targetAccountId,
      targetDisplayName: report.targetDisplayName,
      createdAt: new Date(report.createdAt).toISOString(),
    }),
  );

  return {
    ok: true,
    message: `${target.name} icin rapor kaydedildi.`,
  };
}
