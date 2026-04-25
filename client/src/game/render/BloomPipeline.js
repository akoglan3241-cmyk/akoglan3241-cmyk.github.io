import Phaser from "phaser";

export const BLOOM_PIPELINE_KEY = "BloomPostFX";

const BLOOM_FRAG = [
    "precision mediump float;",
    "uniform sampler2D uMainSampler;",
    "varying vec2 outTexCoord;",
    "uniform vec2 resolution;",
    "uniform float intensity;",
    "uniform float threshold;",
    "uniform float radius;",
    "uniform float blurSteps;",

    "vec4 sampleColor(vec2 uv)",
    "{",
    "    return texture2D(uMainSampler, clamp(uv, vec2(0.0), vec2(1.0)));",
    "}",

    "void main()",
    "{",
    "    vec4 base = texture2D(uMainSampler, outTexCoord);",
    "    vec2 texel = vec2(1.0 / max(resolution.x, 1.0), 1.0 / max(resolution.y, 1.0));",
    "    ",
    "    // Extract bright parts",
    "    float luma = dot(base.rgb, vec3(0.299, 0.587, 0.114));",
    "    vec3 bright = max(base.rgb - threshold, 0.0) * intensity;",
    "    ",
    "    // Simple blur for bloom",
    "    vec3 blur = vec3(0.0);",
    "    float totalWeight = 0.0;",
    "    float r = radius;",
    "    ",
    "    for (float i = -2.0; i <= 2.0; i++)",
    "    {",
    "        for (float j = -2.0; j <= 2.0; j++)",
    "        {",
    "            float weight = 1.0 - (abs(i) + abs(j)) / 6.0;",
    "            vec2 offset = vec2(i, j) * texel * r;",
    "            vec3 col = texture2D(uMainSampler, outTexCoord + offset).rgb;",
    "            vec3 brightCol = max(col - threshold, 0.0) * intensity;",
    "            blur += brightCol * weight;",
    "            totalWeight += weight;",
    "        }",
    "    }",
    "    ",
    "    vec3 finalBloom = blur / max(totalWeight, 0.001);",
    "    gl_FragColor = vec4(base.rgb + finalBloom, base.a);",
    "}"
].join("\n");

export class BloomPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        super({
            game,
            fragShader: BLOOM_FRAG
        });

        this.intensity = 0.65;
        this.threshold = 0.45;
        this.radius = 1.8;
    }

    onPreRender(controller, shader, width, height) {
        this.set1f("intensity", this.intensity, shader);
        this.set1f("threshold", this.threshold, shader);
        this.set1f("radius", this.radius, shader);

        if (width && height) {
            this.set2f("resolution", width, height, shader);
        }
    }

    onDraw(target) {
        this.set2f("resolution", target.width, target.height);
        this.bindAndDraw(target);
    }
}
