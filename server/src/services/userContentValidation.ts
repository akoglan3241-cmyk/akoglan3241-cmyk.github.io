const PLAYER_NAME_MAX_LENGTH = 18;
const PROFILE_STATUS_MAX_LENGTH = 80;
const CHAT_MESSAGE_MAX_LENGTH = 140;
const USERNAME_MAX_LENGTH = 32;
const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/g;
const HTML_RISK_CHAR_REGEX = /[<>`]/g;
const PLAYER_NAME_ALLOWED_CHAR_REGEX = /[^\p{L}\p{N} _.-]/gu;
const USERNAME_ALLOWED_CHAR_REGEX = /[^a-z0-9._-]/g;

function normalizeText(rawValue: unknown): string {
  return String(rawValue ?? "")
    .normalize("NFKC")
    .replace(CONTROL_CHAR_REGEX, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizePlayerName(rawValue: unknown, fallback = "Traveler"): string {
  const sanitized = normalizeText(rawValue)
    .replace(PLAYER_NAME_ALLOWED_CHAR_REGEX, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PLAYER_NAME_MAX_LENGTH);

  return sanitized || fallback;
}

export function sanitizeProfileStatus(rawValue: unknown): string {
  return normalizeText(rawValue)
    .replace(HTML_RISK_CHAR_REGEX, "")
    .slice(0, PROFILE_STATUS_MAX_LENGTH);
}

export function sanitizeChatMessage(rawValue: unknown): string {
  return normalizeText(rawValue)
    .replace(HTML_RISK_CHAR_REGEX, "")
    .slice(0, CHAT_MESSAGE_MAX_LENGTH);
}

export function sanitizeUsername(rawValue: unknown): string {
  return normalizeText(rawValue)
    .toLowerCase()
    .replace(USERNAME_ALLOWED_CHAR_REGEX, "")
    .slice(0, USERNAME_MAX_LENGTH);
}

export function getChatMessageMaxLength(): number {
  return CHAT_MESSAGE_MAX_LENGTH;
}

export function getPlayerNameMaxLength(): number {
  return PLAYER_NAME_MAX_LENGTH;
}

export function getProfileStatusMaxLength(): number {
  return PROFILE_STATUS_MAX_LENGTH;
}
