# Pixel-Perfect Isometric Camera Setup (Phaser 3)

This project now includes a camera controller for stable pixel-perfect following:

- [createPixelPerfectCameraController.js](/C:/benimdünyam/client/src/game/camera/createPixelPerfectCameraController.js)

## What it solves

The controller is designed to reduce:

- texture shimmering while the camera follows the player
- sub-pixel crawl on world tiles and props
- unstable follow jitter caused by fractional camera scroll

It does this by enforcing:

- integer zoom
- `roundPixels = true`
- instant camera follow instead of fractional lerp
- snapped camera scroll values
- optional deadzone so the camera does not constantly move every frame

## Important limitation

True hardware-level screen tearing is controlled by the browser, GPU driver, and display sync behavior.

What this controller fixes is the **in-engine shimmer and pixel crawl** that often gets mistaken for tearing in pixel-art or isometric 2D games.

## Basic usage

```js
import { createPixelPerfectCameraController } from "../camera/createPixelPerfectCameraController.js";

create() {
  this.pixelPerfectCamera = createPixelPerfectCameraController(this, {
    zoom: 1,
    integerZoom: true,
    deadzoneWidth: 160,
    deadzoneHeight: 96,
    followEnabled: true,
  });

  this.pixelPerfectCamera.attach(this.cameras.main, this.player);
  this.pixelPerfectCamera.setBounds(0, 0, worldWidth, worldHeight);
}

update() {
  this.pixelPerfectCamera?.update();
}
```

## Why integer zoom matters

If you use a non-integer zoom like `1.15`, tiles and sprite edges will still shimmer even when `roundPixels` is enabled.

For clean pixel-perfect rendering, prefer:

- `1`
- `2`
- `3`

## Deadzone recommendation for isometric games

Avoid a camera that moves every single frame.

Good starting values:

- `deadzoneWidth: 160`
- `deadzoneHeight: 96`

This keeps the player inside a central safe area and only moves the camera when they leave it, which reduces visual noise.

## Recommended renderer settings

Already aligned in this project:

- `pixelArt: true`
- `antialias: false`
- `roundPixels: true`

These settings should stay enabled for the world camera path.

## Practical advice

For a cozy isometric 2D game:

- use integer zoom
- avoid camera lerp if you want perfect pixel stability
- use deadzone instead of smooth follow
- keep UI on its own screen-space layer

If you later want cinematic smooth follow, make it an optional mode, because smooth lerp and strict pixel-perfect rendering work against each other.

