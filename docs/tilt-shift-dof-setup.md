# Tilt-Shift DoF Setup (Phaser 3)

This project uses Phaser 3, so the most practical way to get a miniature diorama look is a **camera post-processing pipeline** that:

- keeps a horizontal focus band sharp
- smoothly increases blur toward the top and bottom of the screen
- stretches blur slightly horizontally for a photographic tilt-shift feel

Added files:

- [IsometricTiltShiftPipeline.js](/C:/benimdünyam/client/src/game/render/IsometricTiltShiftPipeline.js)
- [createTiltShiftDofController.js](/C:/benimdünyam/client/src/game/render/createTiltShiftDofController.js)

## What this effect is for

Use this when you want:

- a cozy isometric diorama look
- a miniature / toy-town feeling
- stronger visual separation between the central playable band and the distant top / bottom edges

Use it carefully. Too much blur makes UI readability and world clarity worse.

## Recommended camera setup

Do not blur HUD and menus.

Recommended split:

1. `worldCamera`
   - renders tiles, buildings, player, NPCs, interactables
   - gets tilt-shift pipeline
2. `uiCamera`
   - renders HUD, chat, menus, profile panels
   - no tilt-shift pipeline

If you keep a single camera for both world and UI, the blur will also affect text and panels.

## Boot registration

Register the pipeline once:

```js
import { IsometricTiltShiftPipeline, ISOMETRIC_TILT_SHIFT_PIPELINE_KEY } from "../render/IsometricTiltShiftPipeline.js";

if (this.game.renderer?.type === Phaser.WEBGL) {
  this.game.renderer.pipelines.addPostPipeline(ISOMETRIC_TILT_SHIFT_PIPELINE_KEY, IsometricTiltShiftPipeline);
}
```

## Basic scene usage

```js
import { createTiltShiftDofController } from "../render/createTiltShiftDofController.js";

create() {
  const worldCamera = this.cameras.main;
  const uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height, false, "ui");

  this.tiltShift = createTiltShiftDofController(this, {
    focusCenter: 0.5,
    focusWidth: 0.3,
    focusFalloff: 0.18,
    maxBlur: 3.6,
    blurExponent: 1.1,
    horizontalStretch: 1.2,
    verticalStretch: 0.55,
  });

  this.tiltShift.attachCamera(worldCamera);

  uiCamera.ignore([
    this.roomLayer,
    this.player,
    ...this.npcs,
    ...this.remotePlayers.values(),
  ]);
}
```

## Dynamic focus options

### Fixed center focus

This is the default miniature look:

```js
this.tiltShift.update({
  focusCenter: 0.5,
  focusWidth: 0.28,
});
```

### Follow the player vertically

If you want the focus strip to drift with the player:

```js
update() {
  this.tiltShift?.setFocusFromWorldY(this.player.y);
}
```

This is useful when the camera has a lot of vertical scrolling, but it reduces the classic “model village” feeling a little.

## Tuning guide

Good starting values for an isometric social game:

- `focusCenter: 0.5`
- `focusWidth: 0.24 - 0.34`
- `focusFalloff: 0.14 - 0.22`
- `maxBlur: 2.8 - 4.2`
- `blurExponent: 1.0 - 1.4`
- `horizontalStretch: 1.1 - 1.4`
- `verticalStretch: 0.45 - 0.65`

Interpretation:

- `focusCenter`
  - where the sharp band sits vertically, normalized `0..1`
- `focusWidth`
  - width of the sharp band
- `focusFalloff`
  - how gradually blur ramps in
- `maxBlur`
  - strongest blur near top and bottom edges
- `blurExponent`
  - makes blur ramp feel softer or stronger
- `horizontalStretch`
  - gives the lens-like tilt-shift smear feel
- `verticalStretch`
  - keeps the blur from becoming too muddy

## Suggested presets

### Soft diorama

```js
this.tiltShift.update({
  focusCenter: 0.5,
  focusWidth: 0.32,
  focusFalloff: 0.2,
  maxBlur: 2.8,
  blurExponent: 1.0,
});
```

### Strong miniature look

```js
this.tiltShift.update({
  focusCenter: 0.5,
  focusWidth: 0.22,
  focusFalloff: 0.16,
  maxBlur: 4.4,
  blurExponent: 1.25,
});
```

## Performance notes

This is a full-screen camera post effect, so:

- use it only on the world camera
- keep `maxBlur` moderate
- disable or soften it in performance mode if needed

If you already run multiple camera post effects such as screen-space AO, stack order matters. A good default order is:

1. world color / lighting adjustments
2. SSAO-style pass
3. tilt-shift DoF

## Practical recommendation for this project

For this game’s cozy isometric direction:

- keep the player interaction band sharp
- blur top and bottom softly, not aggressively
- avoid extreme blur during chat, trading, or inventory-heavy moments

That gives the miniature feel without making the world look muddy.

