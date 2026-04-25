import { SERVER_URL } from "../constants.js";
import { logWorldFlow } from "../ui/gameRootOverlay.js";

const PROFILE_REQUEST_TIMEOUT_MS = 8000;

async function readJsonResponse(response) {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Islem basarisiz.");
  }

  return body;
}

function createAuthHeaders(authToken) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${String(authToken ?? "")}`,
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = PROFILE_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutHandle = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Sunucu yaniti gecikti. Lutfen tekrar dene.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutHandle);
  }
}

export async function fetchPlayerBootstrap(authToken) {
  logWorldFlow("HTTP player bootstrap request", {
    hasAuthToken: Boolean(authToken),
  });
  const response = await fetchWithTimeout(`${SERVER_URL}/player/bootstrap`, {
    method: "GET",
    headers: createAuthHeaders(authToken),
  });
  const payload = await readJsonResponse(response);
  logWorldFlow("HTTP player bootstrap success", {
    playerName: payload?.playerName ?? null,
    roomId: payload?.roomId ?? null,
  });
  return payload;
}

export async function savePlayerAppearance(authToken, appearance) {
  logWorldFlow("HTTP save appearance request", {
    hasAuthToken: Boolean(authToken),
  });
  const response = await fetchWithTimeout(`${SERVER_URL}/player/appearance`, {
    method: "POST",
    headers: createAuthHeaders(authToken),
    body: JSON.stringify({ appearance }),
  });
  const payload = await readJsonResponse(response);
  logWorldFlow("HTTP save appearance success");
  return payload;
}
