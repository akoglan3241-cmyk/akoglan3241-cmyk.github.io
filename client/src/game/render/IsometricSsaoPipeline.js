import Phaser from "phaser";

export const ISOMETRIC_SSAO_PIPELINE_KEY = "IsometricSsao";

const ISOMETRIC_SSAO_FRAG = [
  "precision mediump float;",
  "uniform sampler2D uMainSampler;",
  "varying vec2 outTexCoord;",
  "uniform vec2 resolution;",
  "uniform float aoIntensity;",
  "uniform float aoRadius;",
  "uniform float aoBias;",
  "uniform float aoSoftness;",
  "uniform float contactStrength;",
  "uniform float isoDepthBias;",
  "uniform vec2 lightDir;",
  "float getLuma(vec3 color)",
  "{",
  "    return dot(color, vec3(0.299, 0.587, 0.114));",
  "}",
  "void main()",
  "{",
  "    vec4 base = texture2D(uMainSampler, outTexCoord);",
  "    vec2 texel = vec2(1.0 / max(resolution.x, 1.0), 1.0 / max(resolution.y, 1.0));",
  "    vec2 isoLight = normalize(vec2(lightDir.x, lightDir.y + isoDepthBias));",
  "    float centerLuma = getLuma(base.rgb);",
  "    float weightedOcclusion = 0.0;",
  "    float totalWeight = 0.0;",
  "    vec2 offsets[8];",
  "    offsets[0] = vec2(-1.0, -0.45);",
  "    offsets[1] = vec2(1.0, -0.45);",
  "    offsets[2] = vec2(-1.0, 0.45);",
  "    offsets[3] = vec2(1.0, 0.45);",
  "    offsets[4] = vec2(0.0, -1.2);",
  "    offsets[5] = vec2(0.0, 1.25);",
  "    offsets[6] = vec2(-1.3, 0.0);",
  "    offsets[7] = vec2(1.3, 0.0);",
  "    for (int i = 0; i < 8; i++)",
  "    {",
  "        vec2 dir = normalize(offsets[i]);",
  "        vec2 sampleUv = outTexCoord + (offsets[i] * texel * aoRadius);",
  "        vec3 sampleColor = texture2D(uMainSampler, sampleUv).rgb;",
  "        float sampleLuma = getLuma(sampleColor);",
  "        float cavity = max(centerLuma - sampleLuma - aoBias, 0.0);",
  "        float directional = mix(0.45, 1.15, max(dot(dir, isoLight), 0.0));",
  "        weightedOcclusion += cavity * directional;",
  "        totalWeight += directional;",
  "    }",
  "    float contact = 0.0;",
  "    for (int j = 1; j <= 3; j++)",
  "    {",
  "        vec2 contactUv = outTexCoord + vec2(0.0, texel.y * float(j) * aoRadius * 0.65);",
  "        float belowLuma = getLuma(texture2D(uMainSampler, contactUv).rgb);",
  "        contact += max(centerLuma - belowLuma, 0.0) / float(j);",
  "    }",
  "    float normalizedAo = weightedOcclusion / max(totalWeight, 0.001);",
  "    float softAo = smoothstep(0.0, max(0.001, aoSoftness), normalizedAo) * aoIntensity;",
  "    float softContact = smoothstep(0.0, max(0.001, aoSoftness * 0.85), contact * 0.7) * contactStrength;",
  "    float shade = clamp(softAo + softContact, 0.0, 0.42);",
  "    gl_FragColor = vec4(base.rgb * (1.0 - shade), base.a);",
  "}",
].join("\n");

export class IsometricSsaoPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game,
      fragShader: ISOMETRIC_SSAO_FRAG,
    });

    this.aoIntensity = 0.18;
    this.aoRadius = 2.4;
    this.aoBias = 0.03;
    this.aoSoftness = 0.18;
    this.contactStrength = 0.2;
    this.isoDepthBias = 0.38;
    this.lightDirX = -0.72;
    this.lightDirY = -0.48;
  }

  onPreRender(controller, shader, width, height) {
    controller = this.getController(controller);

    this.set1f("aoIntensity", controller.aoIntensity, shader);
    this.set1f("aoRadius", controller.aoRadius, shader);
    this.set1f("aoBias", controller.aoBias, shader);
    this.set1f("aoSoftness", controller.aoSoftness, shader);
    this.set1f("contactStrength", controller.contactStrength, shader);
    this.set1f("isoDepthBias", controller.isoDepthBias, shader);
    this.set2f("lightDir", controller.lightDirX, controller.lightDirY, shader);

    if (width && height) {
      this.set2f("resolution", width, height, shader);
    }
  }

  onDraw(target) {
    this.set2f("resolution", target.width, target.height);
    this.bindAndDraw(target);
  }
}

export function configureIsometricSsao(pipeline, config = {}) {
  if (!pipeline) {
    return null;
  }

  pipeline.aoIntensity = Phaser.Math.Clamp(Number(config.aoIntensity ?? pipeline.aoIntensity ?? 0.18), 0, 0.6);
  pipeline.aoRadius = Phaser.Math.Clamp(Number(config.aoRadius ?? pipeline.aoRadius ?? 2.4), 0.5, 8);
  pipeline.aoBias = Phaser.Math.Clamp(Number(config.aoBias ?? pipeline.aoBias ?? 0.03), 0, 0.2);
  pipeline.aoSoftness = Phaser.Math.Clamp(Number(config.aoSoftness ?? pipeline.aoSoftness ?? 0.18), 0.02, 0.8);
  pipeline.contactStrength = Phaser.Math.Clamp(Number(config.contactStrength ?? pipeline.contactStrength ?? 0.2), 0, 0.6);
  pipeline.isoDepthBias = Phaser.Math.Clamp(Number(config.isoDepthBias ?? pipeline.isoDepthBias ?? 0.38), 0, 1.5);
  pipeline.lightDirX = Number(config.lightDirX ?? pipeline.lightDirX ?? -0.72);
  pipeline.lightDirY = Number(config.lightDirY ?? pipeline.lightDirY ?? -0.48);

  return pipeline;
}

