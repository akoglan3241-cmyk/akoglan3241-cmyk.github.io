import Phaser from "phaser";
import { GAME_SIZE } from "./constants.js";
import { BootScene } from "./scenes/BootScene.js";
import { CustomizeScene } from "./scenes/CustomizeScene.js";
import { DialogScene } from "./scenes/DialogScene.js";
import { IsometricCoordinateDemoScene } from "./scenes/IsometricCoordinateDemoScene.js";
import { LoginScene } from "./scenes/LoginScene.js";
import { CollectionMiniGameScene } from "./scenes/CollectionMiniGameScene.js";
import { ReactionMiniGameScene } from "./scenes/ReactionMiniGameScene.js";
import { MemoryMiniGameScene } from "./scenes/MemoryMiniGameScene.js";
import { ReflexClickMiniGameScene } from "./scenes/ReflexClickMiniGameScene.js";
import { BenimDunyamIsometricSocialScene } from "./scenes/BenimDunyamIsometricSocialScene.js";
import { TownScene } from "./scenes/TownScene.js";


export const gameConfig = {
  type: Phaser.CANVAS,
  parent: "game-root",
  backgroundColor: "#08131d",
  width: GAME_SIZE.width,
  height: GAME_SIZE.height,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_SIZE.width,
    height: GAME_SIZE.height,
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  dom: {
    createContainer: true,
  },
  scene: [
    BootScene,
    LoginScene,
    CustomizeScene,
    TownScene,
    DialogScene,
    ReactionMiniGameScene,
    CollectionMiniGameScene,
    MemoryMiniGameScene,
    ReflexClickMiniGameScene,
    IsometricCoordinateDemoScene,
    BenimDunyamIsometricSocialScene,
  ],
};
