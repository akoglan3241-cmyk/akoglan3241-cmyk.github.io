import { SERVER_URL } from "../constants.js";
import { logWorldFlow } from "../ui/gameRootOverlay.js";

async function postJson(path, payload) {
  logWorldFlow("HTTP auth request", {
    path,
    payload,
  });
  const response = await fetch(`${SERVER_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    logWorldFlow("HTTP auth failed", {
      path,
      error: body.error || "Islem basarisiz.",
    });
    throw new Error(body.error || "Islem basarisiz.");
  }

  logWorldFlow("HTTP auth success", {
    path,
    playerName: body?.playerName ?? null,
    guest: Boolean(body?.guest),
  });
  return body;
}

export function registerAccount(payload) {
  return postJson("/auth/register", payload);
}

export function loginAccount(payload) {
  return postJson("/auth/login", payload);
}

export function guestLogin(payload) {
  return postJson("/auth/guest", payload);
}
