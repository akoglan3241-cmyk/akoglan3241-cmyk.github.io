import Phaser from "phaser";

export const ISOMETRIC_TILT_SHIFT_PIPELINE_KEY = "IsometricTiltShift";

const ISOMETRIC_TILT_SHIFT_FRAG = [
  "precision mediump float;",
  "uniform sampler2D uMainSampler;",
  "varying vec2 outTexCoord;",
  "uniform vec2 resolution;",
  "uniform float focusCenter;",
  "uniform float focusWidth;",
  "uniform float focusFalloff;",
  "uniform float maxBlur;",
  "uniform float blurExponent;",
  "uniform float horizontalStretch;",
  "uniform float verticalStretch;",
  "vec4 sampleColor(vec2 uv)",
  "{",
  "    return texture2D(uMainSampler, clamp(uv, vec2(0.0), vec2(1.0)));",
  "}",
  "void main()",
  "{",
  "    vec2 texel = vec2(1.0 / max(resolution.x, 1.0), 1.0 / max(resolution.y, 1.0));",
  "    float focusHalf = max(0.001, focusWidth * 0.5);",
  "    float focusDistance = abs(outTexCoord.y - focusCenter);",
  "    float blurMask = smoothstep(focusHalf, focusHalf + max(0.001, focusFalloff), focusDistance);",
  "    blurMask = pow(blurMask, max(0.01, blurExponent));",
  "    float radius = maxBlur * blurMask;",
  "    vec2 blurStep = vec2(texel.x * radius * horizontalStretch, texel.y * radius * verticalStretch);",
  "    vec4 base = sampleColor(outTexCoord);",
  "    vec4 accum = base * 0.22;",
  "    accum += sampleColor(outTexCoord + blurStep * 1.0) * 0.16;",
  "    accum += sampleColor(outTexCoord - blurStep * 1.0) * 0.16;",
  "    accum += sampleColor(outTexCoord + blurStep * 2.0) * 0.12;",
  "    accum += sampleColor(outTexCoord - blurStep * 2.0) * 0.12;",
  "    accum += sampleColor(outTexCoord + blurStep * 3.0) * 0.085;",
  "    accum += sampleColor(outTexCoord - blurStep * 3.0) * 0.085;",
  "    accum += sampleColor(outTexCoord + blurStep * 4.0) * 0.03;",
  "    accum += sampleColor(outTexCoord - blurStep * 4.0) * 0.03;",
  "    vec4 blurred = accum / 1.0;",
  "    gl_FragColor = mix(base, blurred, blurMask);",
  "}",
].join("\n");

export class IsometricTiltShiftPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game,
      fragShader: ISOMETRIC_TILT_SHIFT_FRAG,
    });

    this.focusCenter = 0.5;
    this.focusWidth = 0.28;
    this.focusFalloff = 0.18;
    this.maxBlur = 3.8;
    this.blurExponent = 1.1;
    this.horizontalStretch = 1.2;
    this.verticalStretch = 0.55;
  }

  onPreRender(controller, shader, width, height) {
    controller = this.getController(controller);

    this.set1f("focusCenter", controller.focusCenter, shader);
    this.set1f("focusWidth", controller.focusWidth, shader);
    this.set1f("focusFalloff", controller.focusFalloff, shader);
    this.set1f("maxBlur", controller.maxBlur, shader);
    this.set1f("blurExponent", controller.blurExponent, shader);
    this.set1f("horizontalStretch", controller.horizontalStretch, shader);
    this.set1f("verticalStretch", controller.verticalStretch, shader);

    if (width && height) {
      this.set2f("resolution", width, height, shader);
    }
  }

  onDraw(target) {
    this.set2f("resolution", target.width, target.height);
    this.bindAndDraw(target);
  }
}

export function configureIsometricTiltShift(pipeline, config = {}) {
  if (!pipeline) {
    return null;
  }

  pipeline.focusCenter = Phaser.Math.Clamp(Number(config.focusCenter ?? pipeline.focusCenter ?? 0.5), 0, 1);
  pipeline.focusWidth = Phaser.Math.Clamp(Number(config.focusWidth ?? pipeline.focusWidth ?? 0.28), 0.05, 0.95);
  pipeline.focusFalloff = Phaser.Math.Clamp(Number(config.focusFalloff ?? pipeline.focusFalloff ?? 0.18), 0.02, 0.5);
  pipeline.maxBlur = Phaser.Math.Clamp(Number(config.maxBlur ?? pipeline.maxBlur ?? 3.8), 0, 12);
  pipeline.blurExponent = Phaser.Math.Clamp(Number(config.blurExponent ?? pipeline.blurExponent ?? 1.1), 0.2, 4);
  pipeline.horizontalStretch = Phaser.Math.Clamp(Number(config.horizontalStretch ?? pipeline.horizontalStretch ?? 1.2), 0.2, 3);
  pipeline.verticalStretch = Phaser.Math.Clamp(Number(config.verticalStretch ?? pipeline.verticalStretch ?? 0.55), 0.1, 3);

  return pipeline;
}

