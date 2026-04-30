import Phaser from "phaser";
import { createGroundShadow, updateGroundShadow } from "../utils/createGroundShadow.js";
import { ISOMETRIC_SSAO_PIPELINE_KEY, configureIsometricSsao } from "./IsometricSsaoPipeline.js";

const DEFAULT_CAMERA_CONFIG = {
  aoIntensity: 0.18,
  aoRadius: 2.4,
  aoBias: 0.03,
  aoSoftness: 0.18,
  contactStrength: 0.2,
  isoDepthBias: 0.38,
  lightDirX: -0.72,
  lightDirY: -0.48,
};

const DEFAULT_CASTER_CONFIG = {
  width: 28,
  height: 10,
  offsetY: 16,
  alpha: 0.2,
  scaleWithMotion: true,
  scaleX: 1,
  scaleY: 1,
};

function resolvePipelineInstance(camera) {
  let pipeline = camera?.getPostPipeline?.(ISOMETRIC_SSAO_PIPELINE_KEY) ?? null;

  if (Array.isArray(pipeline)) {
    pipeline = pipeline[0] ?? null;
  }

  return pipeline;
}

export function createIsometricLightingController(scene, options = {}) {
  const casters = new Map();
  let activeCamera = null;

  function attachCamera(camera = scene.cameras.main, config = {}) {
    if (!camera?.setPostPipeline || scene.game.renderer?.type !== Phaser.WEBGL) {
      activeCamera = camera ?? null;
      return null;
    }

    activeCamera = camera;
    let pipeline = resolvePipelineInstance(camera);

    if (!pipeline) {
      camera.setPostPipeline(ISOMETRIC_SSAO_PIPELINE_KEY);
      pipeline = resolvePipelineInstance(camera);
    }

    return configureIsometricSsao(pipeline, {
      ...DEFAULT_CAMERA_CONFIG,
      ...options.camera,
      ...config,
    });
  }

  function detachCamera(camera = activeCamera) {
    camera?.removePostPipeline?.(ISOMETRIC_SSAO_PIPELINE_KEY);

    if (camera === activeCamera) {
      activeCamera = null;
    }
  }

  function registerCaster(key, target, config = {}) {
    if (!key || !target) {
      return null;
    }

    const mergedConfig = {
      ...DEFAULT_CASTER_CONFIG,
      ...options.caster,
      ...config,
    };

    const shadow = createGroundShadow(scene, target.x ?? 0, (target.y ?? 0) + mergedConfig.offsetY, {
      width: mergedConfig.width,
      height: mergedConfig.height,
      alpha: mergedConfig.alpha,
      depth: (target.y ?? 0) + 1,
    });

    shadow.setBlendMode?.(Phaser.BlendModes.MULTIPLY);

    const entry = {
      target,
      shadow,
      config: mergedConfig,
      previousX: Number(target.x ?? 0),
      previousY: Number(target.y ?? 0),
    };

    casters.set(key, entry);
    refreshCaster(entry);

    return entry;
  }

  function unregisterCaster(key) {
    const entry = casters.get(key);

    if (!entry) {
      return;
    }

    entry.shadow?.destroy();
    casters.delete(key);
  }

  function refreshCaster(entry) {
    if (!entry?.target || !entry.shadow?.active) {
      return;
    }

    const x = Number(entry.target.x ?? entry.previousX ?? 0);
    const y = Number(entry.target.y ?? entry.previousY ?? 0);
    const deltaX = x - Number(entry.previousX ?? x);
    const deltaY = y - Number(entry.previousY ?? y);
    const movement = Math.hypot(deltaX, deltaY);
    const motionFactor = entry.config.scaleWithMotion ? Phaser.Math.Clamp(movement / 8, 0, 0.16) : 0;

    updateGroundShadow(entry.shadow, {
      x,
      y: y + entry.config.offsetY,
      depth: y + 1,
      scaleX: entry.config.scaleX * (1 - motionFactor * 0.35),
      scaleY: entry.config.scaleY * (1 - motionFactor),
      alpha: Phaser.Math.Clamp(entry.config.alpha + motionFactor * 0.08, 0.08, 0.34),
    });

    entry.previousX = x;
    entry.previousY = y;
  }

  function refresh() {
    casters.forEach((entry, key) => {
      if (!entry?.target?.active) {
        unregisterCaster(key);
        return;
      }

      refreshCaster(entry);
    });
  }

  function destroy() {
    detachCamera();
    casters.forEach((entry) => entry.shadow?.destroy());
    casters.clear();
  }

  return {
    attachCamera,
    detachCamera,
    registerCaster,
    unregisterCaster,
    refresh,
    destroy,
    getCamera() {
      return activeCamera;
    },
    getCasterKeys() {
      return [...casters.keys()];
    },
  };
}

