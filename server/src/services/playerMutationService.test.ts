import test from "node:test";
import assert from "node:assert/strict";
import { runPlayerMutation, runPlayerPairMutation } from "./playerMutationService.ts";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

test("runPlayerMutation serializes concurrent mutations for the same player", async () => {
  const order: string[] = [];
  let activeCount = 0;
  let peakActiveCount = 0;

  await Promise.all([
    runPlayerMutation("player-1", async () => {
      activeCount += 1;
      peakActiveCount = Math.max(peakActiveCount, activeCount);
      order.push("first:start");
      await wait(10);
      order.push("first:end");
      activeCount -= 1;
    }),
    runPlayerMutation("player-1", async () => {
      activeCount += 1;
      peakActiveCount = Math.max(peakActiveCount, activeCount);
      order.push("second:start");
      await wait(1);
      order.push("second:end");
      activeCount -= 1;
    }),
  ]);

  assert.equal(peakActiveCount, 1);
  assert.deepEqual(order, ["first:start", "first:end", "second:start", "second:end"]);
});

test("runPlayerPairMutation blocks overlapping mutations on shared players", async () => {
  const order: string[] = [];
  let activeSharedCount = 0;
  let hadOverlap = false;

  await Promise.all([
    runPlayerPairMutation(["player-a", "player-b"], async () => {
      hadOverlap ||= activeSharedCount > 0;
      activeSharedCount += 1;
      order.push("pair:start");
      await wait(10);
      order.push("pair:end");
      activeSharedCount -= 1;
    }),
    runPlayerMutation("player-b", async () => {
      hadOverlap ||= activeSharedCount > 0;
      activeSharedCount += 1;
      order.push("single:start");
      await wait(1);
      order.push("single:end");
      activeSharedCount -= 1;
    }),
  ]);

  assert.equal(hadOverlap, false);
  assert.equal(order.includes("pair:start"), true);
  assert.equal(order.includes("single:start"), true);
});
