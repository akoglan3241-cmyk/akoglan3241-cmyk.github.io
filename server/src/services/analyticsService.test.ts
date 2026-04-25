import test from "node:test";
import assert from "node:assert/strict";
import { getAnalyticsSummary, trackAnalyticsEvent, trackRetentionCheckpoint } from "./analyticsService.ts";

test("analytics summary tracks first-session funnel and retention checkpoints", () => {
  const playerId = `player-${Date.now()}`;

  trackAnalyticsEvent("player_login", {
    playerId,
    playerName: "Tester",
    guest: false,
  });
  trackAnalyticsEvent("quest_accepted", {
    playerId,
    playerName: "Tester",
    roomId: "town",
    questId: "visit-fountain",
  });
  trackAnalyticsEvent("item_purchased", {
    playerId,
    playerName: "Tester",
    roomId: "cafe",
    shopId: "moon-cafe-counter",
  });
  trackAnalyticsEvent("tutorial_completed", {
    playerId,
    playerName: "Tester",
    roomId: "town",
  });
  trackRetentionCheckpoint({
    playerId,
    playerName: "Tester",
    roomId: "town",
    firstSessionAt: Date.now(),
    guest: false,
  });

  const summary = getAnalyticsSummary(3);

  assert.equal(summary.activePlayers, 3);
  assert.equal(summary.funnel.login >= 1, true);
  assert.equal(summary.funnel.first_quest_accepted >= 1, true);
  assert.equal(summary.funnel.first_purchase >= 1, true);
  assert.equal(summary.funnel.tutorial_complete >= 1, true);
  assert.equal(summary.totals.player_login >= 1, true);
  assert.equal(summary.totals.retention_checkpoint >= 1, true);
});
