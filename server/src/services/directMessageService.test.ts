import test from "node:test";
import assert from "node:assert/strict";
import { appendDirectMessage, createDirectMessagesState } from "./directMessageService.ts";

test("appendDirectMessage stores messages per counterpart conversation", () => {
  const state = createDirectMessagesState();
  const entry = appendDirectMessage(state, "user-b", {
    senderUserId: "user-a",
    senderName: "Ayla",
    targetUserId: "user-b",
    text: "Merhaba",
  });

  assert.equal(state.conversations["user-b"].length, 1);
  assert.equal(state.conversations["user-b"][0].id, entry.id);
  assert.equal(state.conversations["user-b"][0].text, "Merhaba");
});
