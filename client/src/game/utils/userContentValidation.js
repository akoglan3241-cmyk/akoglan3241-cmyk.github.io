export const PLAYER_NAME_MAX_LENGTH = 18;
export const PROFILE_STATUS_MAX_LENGTH = 80;
export const CHAT_MESSAGE_MAX_LENGTH = 140;

const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/g;
const HTML_RISK_CHAR_REGEX = /[<>`]/g;
const PLAYER_NAME_ALLOWED_CHAR_REGEX = /[^\p{L}\p{N} _.-]/gu;

function normalizeText(rawValue) {
  return String(rawValue ?? "")
    .normalize("NFKC")
    .replace(CONTROL_CHAR_REGEX, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizePlayerName(rawValue, fallback = "Traveler") {
  const sanitized = normalizeText(rawValue)
    .replace(PLAYER_NAME_ALLOWED_CHAR_REGEX, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PLAYER_NAME_MAX_LENGTH);

  return sanitized || fallback;
}

export function sanitizeProfileStatus(rawValue) {
  return normalizeText(rawValue)
    .replace(HTML_RISK_CHAR_REGEX, "")
    .slice(0, PROFILE_STATUS_MAX_LENGTH);
}

export function sanitizeChatMessage(rawValue) {
  return normalizeText(rawValue)
    .replace(HTML_RISK_CHAR_REGEX, "")
    .slice(0, CHAT_MESSAGE_MAX_LENGTH);
}

export function sanitizePlainText(rawValue, maxLength = 240) {
  return normalizeText(rawValue)
    .replace(HTML_RISK_CHAR_REGEX, "")
    .slice(0, maxLength);
}
