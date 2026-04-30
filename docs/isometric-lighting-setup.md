# Isometric SSAO and Contact Shadow Setup (Phaser 3)

This project uses Phaser 3, so there is an important rendering constraint:

- Phaser 3 does not expose a true deferred renderer with scene depth + normal buffers.
- That means "real" SSAO is not available in the same way it is in Unity, Godot 4 deferred, Unreal, or a custom WebGL 3D renderer.
- The practical solution here is an **SSAO-style screen-space ambient occlusion approximation** plus **soft contact shadows** under important world objects.

The scripts added for this are:

- [IsometricSsaoPipeline.js](/C:/benimdünyam/client/src/game/render/IsometricSsaoPipeline.js)
- [createIsometricLightingController.js](/C:/benimdünyam/client/src/game/render/createIsometricLightingController.js)

## What the system does

- Adds subtle screen-space ambient darkening around overlaps and iso-facing creases.
- Biases the shading for an isometric camera angle instead of a flat top-down camera.
- Adds soft, scalable contact shadows under registered entities to make them feel grounded.
- Keeps the effect subtle enough for a cozy/isometric social game instead of pushing toward a muddy look.

## Recommended render setup

Do **not** apply the SSAO camera pipeline to UI and HUD.

Recommended split:

1. `worldCamera`
   - renders world tiles, buildings, NPCs, player, props
   - gets the `IsometricSsao` post pipeline
2. `uiCamera`
   - renders HUD, chat, menus, profile panels
   - no SSAO pipeline

If you apply the pipeline to a single camera that also renders HUD, it will darken text and panels, which is usually wrong.

## Boot registration

Register the pipeline once in your boot scene:

```js
import Phaser from "phaser";
import { IsometricSsaoPipeline, ISOMETRIC_SSAO_PIPELINE_KEY } from "../render/IsometricSsaoPipeline.js";

if (this.game.renderer?.type === Phaser.WEBGL) {
  this.game.renderer.pipelines.addPostPipeline(ISOMETRIC_SSAO_PIPELINE_KEY, IsometricSsaoPipeline);
}
```

## Scene setup example

```js
import { createIsometricLightingController } from "../render/createIsometricLightingController.js";

create() {
  const worldCamera = this.cameras.main;
  const uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height, false, "ui");

  this.isoLighting = createIsometricLightingController(this, {
    camera: {
      aoIntensity: 0.16,
      aoRadius: 2.6,
      aoBias: 0.025,
      aoSoftness: 0.18,
      contactStrength: 0.22,
      isoDepthBias: 0.42,
      lightDirX: -0.75,
      lightDirY: -0.45,
    },
    caster: {
      alpha: 0.2,
      width: 30,
      height: 10,
      offsetY: 16,
    },
  });

  this.isoLighting.attachCamera(worldCamera);

  uiCamera.ignore([
    this.roomLayer,
    this.player,
    ...this.npcs,
    ...this.remotePlayers.values(),
  ]);
}
```

## Register contact shadow casters

Register dynamic actors and tall props that should feel attached to the ground:

```js
this.isoLighting.registerCaster("player", this.player, {
  width: 26,
  height: 10,
  offsetY: 16,
  alpha: 0.22,
});

this.npcs.forEach((npc) => {
  this.isoLighting.registerCaster(`npc:${npc.npcId}`, npc, {
    width: 24,
    height: 9,
    offsetY: 15,
    alpha: 0.18,
  });
});

this.remotePlayers.forEach((remotePlayer, id) => {
  this.isoLighting.registerCaster(`remote:${id}`, remotePlayer, {
    width: 24,
    height: 9,
    offsetY: 15,
    alpha: 0.18,
  });
});
```

For buildings or trees:

```js
this.isoLighting.registerCaster("cafe-front", cafeSprite, {
  width: 84,
  height: 18,
  offsetY: 40,
  alpha: 0.16,
  scaleWithMotion: false,
});
```

## Update loop

Call refresh once per frame:

```js
update() {
  this.isoLighting?.refresh();
}
```

## Practical tuning for isometric scenes

Start here:

- `aoIntensity: 0.14 - 0.2`
- `aoRadius: 2.2 - 3.0`
- `aoBias: 0.02 - 0.04`
- `aoSoftness: 0.16 - 0.24`
- `contactStrength: 0.18 - 0.26`
- `lightDirX: -0.75`
- `lightDirY: -0.45`

For a cozy isometric game:

- keep AO subtle
- avoid heavy black edge darkening
- let contact shadows carry most of the grounding
- use brighter edges and softer floor values to prevent muddy roads

## When to use stronger contact shadows

Increase contact shadow width/alpha for:

- furniture
- trees
- market stalls
- door frames
- tall facade props

Keep smaller shadows for:

- player
- NPCs
- pickups
- small interactables

## Why this works well for isometric cameras

An isometric camera already implies depth through overlap and screen-space height. This setup strengthens that illusion by:

- darkening overlap transitions slightly
- emphasizing foot-to-ground contact
- biasing the AO toward the iso light direction
- keeping the horizon and upper facade areas cleaner than a generic vignette pass

## Limits

This is still an approximation:

- no real depth buffer
- no real normal map reconstruction
- no physically correct occlusion between arbitrary layers

If you eventually want fully correct SSAO + normal/specular lighting, the project needs:

- a true 3D renderer
- or a custom multi-pass render pipeline with explicit depth/height data per layer

For the current Phaser 3 stack, this is the correct production-friendly middle ground.

