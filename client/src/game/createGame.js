import Phaser from "phaser";
import { gameConfig } from "./config.js";
import { logWorldFlow } from "./ui/gameRootOverlay.js";

let gameInstance;
const GLOBAL_GAME_KEY = "__KASABA_GAME_INSTANCE__";

export function createGame() {
  logWorldFlow("createGame called", {
    rendererType: gameConfig.type,
    parent: gameConfig.parent,
  });
  if (typeof window !== "undefined") {
    const staleInstance = window[GLOBAL_GAME_KEY];
    if (staleInstance && staleInstance !== gameInstance) {
      try {
        staleInstance.destroy(true);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("[createGame] stale instance destroy failed", error);
      }
      window[GLOBAL_GAME_KEY] = null;
    }
  }

  if (!gameInstance) {
    gameInstance = new Phaser.Game(gameConfig);
    if (typeof window !== "undefined") {
      window[GLOBAL_GAME_KEY] = gameInstance;
    }
  }

  return gameInstance;
}
