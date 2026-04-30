# Isometric Coordinate Manager

Core script:

- [IsometricCoordinateManager.js](/C:/benimdünyam/client/src/game/world/IsometricCoordinateManager.js)

## What it does

This manager implements the standard 2D isometric orthographic projection using matrix math:

- `GridToScreen(gridX, gridY)`
- `ScreenToGrid(mouseX, mouseY)`

Projection matrix:

```text
[ screenX ]   [  tileWidth / 2   -tileWidth / 2 ] [ gridX ]
[ screenY ] = [ tileHeight / 2    tileHeight / 2 ] [ gridY ]
```

This is the classic:

- rotate by 45 degrees
- squash vertical height by half

## Basic usage

```js
import { createIsometricCoordinateManager } from "../world/IsometricCoordinateManager.js";

const iso = createIsometricCoordinateManager({
  tileWidth: 64,
  tileHeight: 32,
  offsetX: 640,
  offsetY: 120,
  spriteOriginOffsetX: 0,
  spriteOriginOffsetY: 16,
});

const screen = iso.GridToScreen(4, 7);
const grid = iso.ScreenToGrid(pointer.x, pointer.y);
const cell = iso.ScreenToGridCell(pointer.x, pointer.y);
```

## Notes

- `tileWidth` and `tileHeight` are fully configurable.
- `tileHeight` is usually `tileWidth / 2`.
- `offsetX` and `offsetY` are used to place or center the isometric map on screen.
- `spriteOriginOffsetX` and `spriteOriginOffsetY` help compensate for center-origin or tall sprites.
- `ScreenToGrid` returns exact fractional grid coordinates.
- `ScreenToGridCell` is a helper when you want the nearest tile index.

## Why this is separate from current room helpers

The current project still uses axis-aligned room/world helpers in [roomUtils.js](/C:/benimdünyam/client/src/game/world/roomUtils.js).

This new manager is the core building block for a future true isometric world transition, without breaking the current playable map. 

