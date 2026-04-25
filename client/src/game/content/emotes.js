export const EMOTES = [
  { id: "wave", label: "El Salla", slash: "/wave", locksMovement: false, durationMs: 2400 },
  { id: "dance", label: "Dans", slash: "/dance", locksMovement: true, durationMs: 4200 },
  { id: "sit", label: "Otur", slash: "/sit", locksMovement: true, durationMs: 60000 }, // Sit longer
  { id: "laugh", label: "Gül", slash: "/laugh", locksMovement: false, durationMs: 2400 },
  { id: "cry", label: "Ağla", slash: "/cry", locksMovement: false, durationMs: 2400 },
  { id: "surprised", label: "Şaşır", slash: "/surprised", locksMovement: false, durationMs: 1800 },
];

export function getEmoteDefinition(emoteId) {
  return EMOTES.find((entry) => entry.id === emoteId) ?? null;
}

export function parseEmoteCommand(messageText) {
  const normalized = String(messageText ?? "").trim().toLowerCase();
  const emote = EMOTES.find((entry) => normalized === entry.slash);
  return emote ?? null;
}
