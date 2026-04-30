export const SCENE_KEYS = {
  BOOT: "boot",
  LOGIN: "login",
  CUSTOMIZE: "customize",
  TOWN: "town",
  DIALOG: "dialog",
  MINIGAME_REACTION: "minigame-reaction",
  MINIGAME_COLLECTION: "minigame-collection",
};

export const GAME_SIZE = {
  width: 1280,
  height: 720,
};

export const TILE_SIZE = 48;
export const PLAYER_SPEED = 220;
export const PLAYER_SPRINT_MULTIPLIER = 1.5;
export const NPC_INTERACTION_RANGE = 84;
export const QUEST_TARGET_RANGE = 44;
export const PICKUP_RANGE = 34;
export const CHEST_INTERACTION_RANGE = 52;
export const PORTAL_INTERACTION_RANGE = 58;
export const MAX_PLAYER_NAME_LENGTH = 18;
export const DEFAULT_PLAYER_NAME = "Traveler";
export const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";
export const PLAYER_SYNC_INTERVAL = 80;
