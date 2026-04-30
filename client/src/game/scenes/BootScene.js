import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";
import { IsometricSsaoPipeline, ISOMETRIC_SSAO_PIPELINE_KEY } from "../render/IsometricSsaoPipeline.js";
import { IsometricTiltShiftPipeline, ISOMETRIC_TILT_SHIFT_PIPELINE_KEY } from "../render/IsometricTiltShiftPipeline.js";
import { OutlineHighlightPipeline, OUTLINE_HIGHLIGHT_PIPELINE_KEY } from "../render/OutlineHighlightPipeline.js";
import { BloomPipeline, BLOOM_PIPELINE_KEY } from "../render/BloomPipeline.js";
import { ColorCorrectionPipeline, COLOR_CORRECTION_PIPELINE_KEY } from "../render/ColorCorrectionPipeline.js";
import { createPlaceholderTextures } from "../utils/createPlaceholderTextures.js";
import { logWorldFlow } from "../ui/gameRootOverlay.js";

const COZY_ASSET_MANIFEST_URL = import.meta.env.VITE_COZY_ASSET_MANIFEST ?? "";
const DEBUG_SCENES = new Set(["isometric-coordinate-demo", "benimdunyam-isometric-social"]);

function getRequestedStartScene() {
  if (typeof window === "undefined") {
    return { sceneKey: null, data: null };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const sceneKey = searchParams.get("scene");
  const startKey = searchParams.get("start");

  if (startKey === SCENE_KEYS.TOWN) {
    try {
      const rawSession = sessionStorage.getItem("kasaba:pending-town-session");
      sessionStorage.removeItem("kasaba:pending-town-session");
      const parsedSession = rawSession ? JSON.parse(rawSession) : null;
      if (parsedSession?.authToken) {
        return {
          sceneKey: SCENE_KEYS.TOWN,
          data: { session: parsedSession },
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("[BootScene] failed to restore pending town session", error);
    }
  }

  return {
    sceneKey: DEBUG_SCENES.has(sceneKey) ? sceneKey : null,
    data: null,
  };
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  preload() {
    logWorldFlow("BootScene preload start", {
      cozyManifest: COZY_ASSET_MANIFEST_URL || null,
    });
    this.load.on("start", () => {
      logWorldFlow("BootScene loader started");
    });
    this.load.on("complete", () => {
      logWorldFlow("BootScene loader complete");
    });
    this.load.on("loaderror", (file) => {
      logWorldFlow("BootScene loader error", {
        key: file?.key ?? null,
        src: file?.src ?? null,
      });
    });
    if (COZY_ASSET_MANIFEST_URL) {
      this.load.json("cozy-asset-manifest", COZY_ASSET_MANIFEST_URL);
    }
  }

  create() {
    logWorldFlow("BootScene create start");
    if (this.game.renderer?.type === Phaser.WEBGL && this.game.renderer.pipelines?.addPostPipeline) {
      this.game.renderer.pipelines.addPostPipeline(ISOMETRIC_SSAO_PIPELINE_KEY, IsometricSsaoPipeline);
      this.game.renderer.pipelines.addPostPipeline(ISOMETRIC_TILT_SHIFT_PIPELINE_KEY, IsometricTiltShiftPipeline);
      this.game.renderer.pipelines.addPostPipeline(OUTLINE_HIGHLIGHT_PIPELINE_KEY, OutlineHighlightPipeline);
      this.game.renderer.pipelines.addPostPipeline(BLOOM_PIPELINE_KEY, BloomPipeline);
      this.game.renderer.pipelines.addPostPipeline(COLOR_CORRECTION_PIPELINE_KEY, ColorCorrectionPipeline);
    }

    const requestedStart = getRequestedStartScene();
    logWorldFlow("BootScene resolved start scene", requestedStart);

    const manifest = COZY_ASSET_MANIFEST_URL ? this.cache.json.get("cozy-asset-manifest") : null;

    if (manifest?.images && Array.isArray(manifest.images) && manifest.images.length > 0) {
      manifest.images.forEach((entry) => {
        if (!entry?.key || !entry?.url || this.textures.exists(String(entry.key))) {
          return;
        }

        this.load.image(String(entry.key), String(entry.url));
      });

      this.load.once("complete", () => {
        createPlaceholderTextures(this);
        logWorldFlow("BootScene starting scene after manifest load", {
          sceneKey: requestedStart.sceneKey ?? SCENE_KEYS.LOGIN,
        });
        this.scene.start(requestedStart.sceneKey ?? SCENE_KEYS.LOGIN, requestedStart.data ?? undefined);
      });
      this.load.start();
      return;
    }

    createPlaceholderTextures(this);
    logWorldFlow("BootScene starting scene", {
      sceneKey: requestedStart.sceneKey ?? SCENE_KEYS.LOGIN,
    });
    this.scene.start(requestedStart.sceneKey ?? SCENE_KEYS.LOGIN, requestedStart.data ?? undefined);
  }
}
