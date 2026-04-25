import { ISOMETRIC_SSAO_PIPELINE_KEY, configureIsometricSsao } from "./IsometricSsaoPipeline.js";
import { ISOMETRIC_TILT_SHIFT_PIPELINE_KEY, configureIsometricTiltShift } from "./IsometricTiltShiftPipeline.js";
import { BLOOM_PIPELINE_KEY } from "./BloomPipeline.js";
import { COLOR_CORRECTION_PIPELINE_KEY } from "./ColorCorrectionPipeline.js";

export function createPostProcessingController(scene, options = {}) {
  const {
    camera = scene.cameras.main,
    ssao = true,
    tiltShift = true,
    bloom = true,
    colorCorrection = true
  } = options;

  const pipelines = [];

  if (ssao) pipelines.push(ISOMETRIC_SSAO_PIPELINE_KEY);
  if (bloom) pipelines.push(BLOOM_PIPELINE_KEY);
  if (colorCorrection) pipelines.push(COLOR_CORRECTION_PIPELINE_KEY);
  if (tiltShift) pipelines.push(ISOMETRIC_TILT_SHIFT_PIPELINE_KEY);

  camera.setPostPipeline(pipelines);

  const ssaoPipeline = camera.getPostPipeline(ISOMETRIC_SSAO_PIPELINE_KEY);
  const tiltShiftPipeline = camera.getPostPipeline(ISOMETRIC_TILT_SHIFT_PIPELINE_KEY);
  const bloomPipeline = camera.getPostPipeline(BLOOM_PIPELINE_KEY);
  const colorCorrectionPipeline = camera.getPostPipeline(COLOR_CORRECTION_PIPELINE_KEY);

  if (ssaoPipeline) {
    configureIsometricSsao(ssaoPipeline, options.ssaoConfig || {});
  }

  if (tiltShiftPipeline) {
    configureIsometricTiltShift(tiltShiftPipeline, options.tiltShiftConfig || {});
  }

  if (bloomPipeline) {
    bloomPipeline.intensity = options.bloomConfig?.intensity ?? 0.65;
    bloomPipeline.threshold = options.bloomConfig?.threshold ?? 0.45;
    bloomPipeline.radius = options.bloomConfig?.radius ?? 1.8;
  }

  if (colorCorrectionPipeline) {
    colorCorrectionPipeline.brightness = options.colorConfig?.brightness ?? 0.0;
    colorCorrectionPipeline.contrast = options.colorConfig?.contrast ?? 1.05;
    colorCorrectionPipeline.saturation = options.colorConfig?.saturation ?? 1.12;
    colorCorrectionPipeline.exposure = options.colorConfig?.exposure ?? 1.0;
  }

  return {
    camera,
    pipelines: {
      ssao: ssaoPipeline,
      tiltShift: tiltShiftPipeline,
      bloom: bloomPipeline,
      colorCorrection: colorCorrectionPipeline
    },
    update(config = {}) {
        if (ssaoPipeline) configureIsometricSsao(ssaoPipeline, config.ssao || {});
        if (tiltShiftPipeline) configureIsometricTiltShift(tiltShiftPipeline, config.tiltShift || {});
        if (bloomPipeline) {
            if (config.bloom?.intensity !== undefined) bloomPipeline.intensity = config.bloom.intensity;
            if (config.bloom?.threshold !== undefined) bloomPipeline.threshold = config.bloom.threshold;
            if (config.bloom?.radius !== undefined) bloomPipeline.radius = config.bloom.radius;
        }
        if (colorCorrectionPipeline) {
            if (config.color?.brightness !== undefined) colorCorrectionPipeline.brightness = config.color.brightness;
            if (config.color?.contrast !== undefined) colorCorrectionPipeline.contrast = config.color.contrast;
            if (config.color?.saturation !== undefined) colorCorrectionPipeline.saturation = config.color.saturation;
            if (config.color?.exposure !== undefined) colorCorrectionPipeline.exposure = config.color.exposure;
        }
    },
    setFocusFromWorldY(worldY) {
      if (!tiltShiftPipeline) return;
      const cam = camera;
      const screenPoint = cam.getWorldPoint(0, worldY);
      const focusCenter = (screenPoint.y - cam.worldView.y) / cam.worldView.height;
      tiltShiftPipeline.focusCenter = focusCenter;
    }
  };
}
