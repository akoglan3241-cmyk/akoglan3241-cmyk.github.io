import { DEFAULT_PLAYER_NAME, MAX_PLAYER_NAME_LENGTH } from "../constants.js";
import { DEFAULT_APPEARANCE, normalizeAppearance } from "../avatar/avatarOptions.js";
import { getDefaultCosmeticsState, normalizeCosmeticsState } from "./cosmeticsState.js";
import { sanitizePlayerName } from "../utils/userContentValidation.js";

const AUTH_TOKEN_STORAGE_KEY = "social-rpg-auth-token";

export function saveAuthToken(token) {
  window.sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function loadAuthToken() {
  return window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? "";
}

export function clearAuthToken() {
  window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function createSession(rawPlayerName = DEFAULT_PLAYER_NAME, rawAppearance = DEFAULT_APPEARANCE, auth = {}) {
  const playerName = sanitizePlayerName(rawPlayerName, DEFAULT_PLAYER_NAME).slice(0, MAX_PLAYER_NAME_LENGTH);
  const cosmetics = normalizeCosmeticsState(auth?.cosmetics ?? getDefaultCosmeticsState());
  const appearance = normalizeAppearance(rawAppearance ?? cosmetics.equipped ?? DEFAULT_APPEARANCE);

  return {
    playerName: playerName || DEFAULT_PLAYER_NAME,
    appearance,
    cosmetics: normalizeCosmeticsState({
      ...cosmetics,
      equipped: appearance,
    }),
    authToken: String(auth?.authToken ?? loadAuthToken() ?? ""),
    isGuest: Boolean(auth?.isGuest),
    username: String(auth?.username ?? ""),
  };
}
