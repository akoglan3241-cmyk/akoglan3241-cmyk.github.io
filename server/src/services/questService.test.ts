import test from "node:test";
import assert from "node:assert/strict";
import { createGameplayState } from "./playerStateService.ts";
import { getItemCount } from "./inventoryService.ts";
import { processQuestMovement, startQuest } from "./questService.ts";

test("startQuest begins the first town quest when the player is near the giver", () => {
  const gameplayState = createGameplayState();

  const started = startQuest(gameplayState, "visit-fountain", "town", { x: 408, y: 600 });

  assert.equal(started, true);
  assert.equal(gameplayState.quest.activeQuest?.id, "visit-fountain");
});

test("startQuest rejects invalid quest start conditions", () => {
  const gameplayState = createGameplayState();

  const startedFromWrongRoom = startQuest(gameplayState, "visit-fountain", "cafe", { x: 408, y: 600 });
  const startedTooFarAway = startQuest(gameplayState, "visit-fountain", "town", { x: 40, y: 40 });

  assert.equal(startedFromWrongRoom, false);
  assert.equal(startedTooFarAway, false);
  assert.equal(gameplayState.quest.activeQuest, null);
});

test("processQuestMovement completes the go-to-location quest and grants rewards", () => {
  const gameplayState = createGameplayState();
  const started = startQuest(gameplayState, "visit-fountain", "town", { x: 408, y: 600 });

  assert.equal(started, true);

  const unlocks = processQuestMovement(gameplayState, "town", { x: 600, y: 600 });

  assert.equal(gameplayState.quest.activeQuest, null);
  assert.deepEqual(gameplayState.quest.completedQuestIds, ["visit-fountain"]);
  assert.equal(getItemCount(gameplayState, "coin"), 30);
  assert.equal(gameplayState.progression.xp, 50);
  assert.ok(unlocks.length >= 1);
});
