import Phaser from "phaser";

export const COLOR_CORRECTION_PIPELINE_KEY = "ColorCorrectionPostFX";

const COLOR_CORRECTION_FRAG = [
    "precision mediump float;",
    "uniform sampler2D uMainSampler;",
    "varying vec2 outTexCoord;",
    "uniform float brightness;",
    "uniform float contrast;",
    "uniform float saturation;",
    "uniform float exposure;",

    "void main()",
    "{",
    "    vec4 color = texture2D(uMainSampler, outTexCoord);",
    "    ",
    "    // Exposure",
    "    color.rgb *= exposure;",
    "    ",
    "    // Brightness",
    "    color.rgb += brightness;",
    "    ",
    "    // Contrast",
    "    color.rgb = (color.rgb - 0.5) * max(contrast, 0.0) + 0.5;",
    "    ",
    "    // Saturation",
    "    float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));",
    "    color.rgb = mix(vec3(luma), color.rgb, saturation);",
    "    ",
    "    gl_FragColor = vec4(color.rgb, color.a);",
    "}"
].join("\n");

export class ColorCorrectionPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        super({
            game,
            fragShader: COLOR_CORRECTION_FRAG
        });

        this.brightness = 0.0;
        this.contrast = 1.05;
        this.saturation = 1.12;
        this.exposure = 1.0;
    }

    onPreRender(controller, shader) {
        this.set1f("brightness", this.brightness, shader);
        this.set1f("contrast", this.contrast, shader);
        this.set1f("saturation", this.saturation, shader);
        this.set1f("exposure", this.exposure, shader);
    }

    onDraw(target) {
        this.bindAndDraw(target);
    }
}
