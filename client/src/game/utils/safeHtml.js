const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(rawValue) {
  return String(rawValue ?? "").replace(/[&<>"']/g, (character) => HTML_ESCAPE_MAP[character] ?? character);
}
