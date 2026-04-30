import test from "node:test";
import assert from "node:assert/strict";
import { createPlayerConnection, toPlayerProfile } from "./playerStateService.ts";
import { claimDailyLoginReward } from "./dailyLoginRewardService.ts";
import { enqueueSystemRewardMail, claimMailForPlayer } from "./mailboxService.ts";
import { getItemCount } from "./inventoryService.ts";

test("claimDailyLoginReward only grants once per calendar day", () => {
  const player = createPlayerConnection("socket-daily", "Tester", "user-daily", null);
  const profile = toPlayerProfile(player);
  const firstClaim = claimDailyLoginReward(profile, Date.parse("2026-03-24T09:00:00+03:00"));
  const secondClaim = claimDailyLoginReward(profile, Date.parse("2026-03-24T18:00:00+03:00"));

  assert.ok(firstClaim);
  assert.equal(secondClaim, null);
  assert.equal(profile.dailyLoginState.streakCount, 1);
  assert.equal(profile.dailyLoginState.lastClaimDateKey, firstClaim?.dateKey);
});

test("claimMailForPlayer is idempotent for already-claimed mail", () => {
  const player = createPlayerConnection("socket-mail", "Tester", "user-mail", null);
  const entry = enqueueSystemRewardMail(player.mailboxState, "Test", "Body", {
    coins: 12,
    xp: 5,
    items: [{ itemId: "giftBox", amount: 2 }],
  });

  const firstClaim = claimMailForPlayer(player, entry.id);
  const secondClaim = claimMailForPlayer(player, entry.id);

  assert.ok(firstClaim);
  assert.equal(secondClaim, null);
  assert.equal(getItemCount(player.gameplayState, "coin"), 12);
  assert.equal(getItemCount(player.gameplayState, "giftBox"), 2);
  assert.equal(player.mailboxState.entries[0].isClaimed, true);
});
