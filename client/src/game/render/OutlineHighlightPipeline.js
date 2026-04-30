import Phaser from "phaser";

export const OUTLINE_HIGHLIGHT_PIPELINE_KEY = "OutlineHighlight";

const OUTLINE_HIGHLIGHT_FRAG = [
  "precision mediump float;",
  "uniform sampler2D uMainSampler;",
  "varying vec2 outTexCoord;",
  "uniform vec2 resolution;",
  "uniform float thickness;",
  "uniform float softness;",
  "uniform vec4 outlineColor;",
  "const float PI = 3.14159265358979323846264;",
  "const float SAMPLE_COUNT = 16.0;",
  "void main()",
  "{",
  "    vec4 base = texture2D(uMainSampler, outTexCoord);",
  "    vec2 texel = vec2(1.0 / max(resolution.x, 1.0), 1.0 / max(resolution.y, 1.0));",
  "    float innerRadius = max(0.5, thickness * 0.55);",
  "    float outerRadius = max(1.0, thickness);",
  "    float nearAlpha = 0.0;",
  "    float farAlpha = 0.0;",
  "    for (float i = 0.0; i < SAMPLE_COUNT; i += 1.0)",
  "    {",
  "        float angle = (i / SAMPLE_COUNT) * PI * 2.0;",
  "        vec2 dir = vec2(cos(angle), sin(angle));",
  "        nearAlpha = max(nearAlpha, texture2D(uMainSampler, outTexCoord + dir * texel * innerRadius).a);",
  "        farAlpha = max(farAlpha, texture2D(uMainSampler, outTexCoord + dir * texel * outerRadius).a);",
  "    }",
  "    float edgeMask = max(max(nearAlpha, farAlpha) - base.a, 0.0);",
  "    float antialias = smoothstep(0.02, 0.02 + max(0.001, softness), edgeMask);",
  "    vec4 outline = vec4(outlineColor.rgb, antialias * outlineColor.a * (1.0 - base.a));",
  "    gl_FragColor = base + outline * (1.0 - base.a);",
  "}",
].join("\n");

function resolveOutlinePipelineTarget(target) {
  if (!target?.scene?.sys?.renderer || target.scene.sys.renderer.type !== Phaser.WEBGL || !target.setPostPipeline) {
    return null;
  }

  let pipeline = target.getPostPipeline?.(OUTLINE_HIGHLIGHT_PIPELINE_KEY) ?? null;

  if (Array.isArray(pipeline)) {
    pipeline = pipeline[0] ?? null;
  }

  return pipeline;
}

function normalizeOutlineColor(color, alpha) {
  const numericColor = Number(color ?? 0xffe0a1) >>> 0;

  return [
    ((numericColor >> 16) & 0xff) / 255,
    ((numericColor >> 8) & 0xff) / 255,
    (numericColor & 0xff) / 255,
    Phaser.Math.Clamp(Number(alpha ?? 0.9), 0, 1),
  ];
}

export class OutlineHighlightPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game,
      fragShader: OUTLINE_HIGHLIGHT_FRAG,
    });

    this.thickness = 2.25;
    this.softness = 0.2;
    this.glcolor = [1, 1, 1, 0.9];
  }

  onPreRender(controller, shader, width, height) {
    controller = this.getController(controller);

    this.set1f("thickness", controller.thickness, shader);
    this.set1f("softness", controller.softness, shader);
    this.set4fv("outlineColor", controller.glcolor, shader);

    if (width && height) {
      this.set2f("resolution", width, height, shader);
    }
  }

  onDraw(target) {
    this.set2f("resolution", target.width, target.height);
    this.bindAndDraw(target);
  }
}

export function setOutlineHighlight(target, isEnabled, options = {}) {
  if (!target?.scene?.sys?.renderer || target.scene.sys.renderer.type !== Phaser.WEBGL || !target.setPostPipeline) {
    return null;
  }

  if (!isEnabled) {
    target.removePostPipeline?.(OUTLINE_HIGHLIGHT_PIPELINE_KEY);
    return null;
  }

  let pipeline = resolveOutlinePipelineTarget(target);

  if (!pipeline) {
    target.setPostPipeline(OUTLINE_HIGHLIGHT_PIPELINE_KEY);
    pipeline = resolveOutlinePipelineTarget(target);
  }

  if (!pipeline) {
    return null;
  }

  pipeline.thickness = Phaser.Math.Clamp(Number(options.thickness ?? 2.25), 0.5, 8);
  pipeline.softness = Phaser.Math.Clamp(Number(options.softness ?? 0.2), 0.02, 0.8);
  pipeline.glcolor = normalizeOutlineColor(options.color, options.alpha);

  return pipeline;
}
