import test from "node:test";
import assert from "node:assert/strict";
import { createGuestLogin, authenticateToken } from "./authService.ts";

test("createGuestLogin returns an authenticated guest identity with sanitized display name", () => {
  const result = createGuestLogin("  <Deniz!!>   ");
  const auth = authenticateToken(result.token);

  assert.ok(auth);
  assert.equal(auth?.isGuest, true);
  assert.equal(auth?.subjectId, result.auth.subjectId);
  assert.equal(auth?.displayName, "Deniz");
  assert.match(result.auth.username, /^guest_/);
});

test("authenticateToken rejects tampered guest tokens", () => {
  const result = createGuestLogin("Player");
  const tamperedToken = `${result.token}broken`;

  assert.equal(authenticateToken(tamperedToken), null);
});
