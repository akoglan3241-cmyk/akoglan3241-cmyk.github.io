import Phaser from "phaser";
import { ISOMETRIC_TILT_SHIFT_PIPELINE_KEY, configureIsometricTiltShift } from "./IsometricTiltShiftPipeline.js";

function resolvePipelineInstance(camera) {
  let pipeline = camera?.getPostPipeline?.(ISOMETRIC_TILT_SHIFT_PIPELINE_KEY) ?? null;

  if (Array.isArray(pipeline)) {
    pipeline = pipeline[0] ?? null;
  }

  return pipeline;
}

export function createTiltShiftDofController(scene, defaults = {}) {
  let activeCamera = null;

  function attachCamera(camera = scene.cameras.main, config = {}) {
    if (!camera?.setPostPipeline || scene.game.renderer?.type !== Phaser.WEBGL) {
      activeCamera = camera ?? null;
      return null;
    }

    activeCamera = camera;
    let pipeline = resolvePipelineInstance(camera);

    if (!pipeline) {
      camera.setPostPipeline(ISOMETRIC_TILT_SHIFT_PIPELINE_KEY);
      pipeline = resolvePipelineInstance(camera);
    }

    return configureIsometricTiltShift(pipeline, {
      focusCenter: 0.5,
      focusWidth: 0.28,
      focusFalloff: 0.18,
      maxBlur: 3.8,
      blurExponent: 1.1,
      horizontalStretch: 1.2,
      verticalStretch: 0.55,
      ...defaults,
      ...config,
    });
  }

  function detachCamera(camera = activeCamera) {
    camera?.removePostPipeline?.(ISOMETRIC_TILT_SHIFT_PIPELINE_KEY);

    if (camera === activeCamera) {
      activeCamera = null;
    }
  }

  function update(config = {}) {
    const pipeline = resolvePipelineInstance(activeCamera);
    return configureIsometricTiltShift(pipeline, config);
  }

  function setFocusFromScreenY(screenY, viewportHeight = scene.scale.height) {
    const normalizedY = viewportHeight > 0 ? screenY / viewportHeight : 0.5;
    return update({ focusCenter: normalizedY });
  }

  function setFocusFromWorldY(worldY, camera = activeCamera ?? scene.cameras.main) {
    if (!camera) {
      return null;
    }

    const screenY = worldY - camera.scrollY;
    return setFocusFromScreenY(screenY, camera.height);
  }

  function destroy() {
    detachCamera();
  }

  return {
    attachCamera,
    detachCamera,
    update,
    setFocusFromScreenY,
    setFocusFromWorldY,
    destroy,
    getCamera() {
      return activeCamera;
    },
  };
}
