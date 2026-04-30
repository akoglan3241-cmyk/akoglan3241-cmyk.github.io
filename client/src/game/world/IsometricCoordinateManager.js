/**
 * Standard isometric orthographic projection.
 *
 * Grid space (tile coordinates) is transformed into screen space with:
 *
 * [ screenX ]   [  tileWidth / 2   -tileWidth / 2 ] [ gridX ]
 * [ screenY ] = [ tileHeight / 2    tileHeight / 2 ] [ gridY ]
 *
 * This is the classic "rotate 45 degrees, squash by half height" matrix.
 *
 * The returned screen position also includes:
 * - a configurable screen offset (to center the map on screen)
 * - a configurable sprite origin offset (to compensate for center-origin sprites)
 */

function invert2x2(matrix) {
  const [[a, b], [c, d]] = matrix;
  const determinant = a * d - b * c;

  if (Math.abs(determinant) < 0.000001) {
    throw new Error("IsometricCoordinateManager: transform matrix is not invertible.");
  }

  const inverseScale = 1 / determinant;

  return [
    [d * inverseScale, -b * inverseScale],
    [-c * inverseScale, a * inverseScale],
  ];
}

function multiplyMatrix2x2Vector2(matrix, vectorX, vectorY) {
  return {
    x: matrix[0][0] * vectorX + matrix[0][1] * vectorY,
    y: matrix[1][0] * vectorX + matrix[1][1] * vectorY,
  };
}

export class IsometricCoordinateManager {
  constructor({
    tileWidth = 64,
    tileHeight = tileWidth / 2,
    offsetX = 0,
    offsetY = 0,
    spriteOriginOffsetX = 0,
    spriteOriginOffsetY = 0,
  } = {}) {
    this.tileWidth = Number(tileWidth);
    this.tileHeight = Number(tileHeight);
    this.offsetX = Number(offsetX);
    this.offsetY = Number(offsetY);
    this.spriteOriginOffsetX = Number(spriteOriginOffsetX);
    this.spriteOriginOffsetY = Number(spriteOriginOffsetY);

    this.updateMatrices();
  }

  updateMatrices() {
    const halfTileWidth = this.tileWidth * 0.5;
    const halfTileHeight = this.tileHeight * 0.5;

    // Forward transform: grid -> screen
    this.gridToScreenMatrix = [
      [halfTileWidth, -halfTileWidth],
      [halfTileHeight, halfTileHeight],
    ];

    // Inverse transform: screen -> grid
    this.screenToGridMatrix = invert2x2(this.gridToScreenMatrix);
  }

  setTileSize(tileWidth, tileHeight = tileWidth / 2) {
    this.tileWidth = Number(tileWidth);
    this.tileHeight = Number(tileHeight);
    this.updateMatrices();
    return this;
  }

  setOffset(offsetX, offsetY) {
    this.offsetX = Number(offsetX);
    this.offsetY = Number(offsetY);
    return this;
  }

  setSpriteOriginOffset(spriteOriginOffsetX, spriteOriginOffsetY) {
    this.spriteOriginOffsetX = Number(spriteOriginOffsetX);
    this.spriteOriginOffsetY = Number(spriteOriginOffsetY);
    return this;
  }

  /**
   * Converts an isometric grid coordinate into screen space.
   *
   * The matrix multiplication produces the base isometric position.
   * Then we apply:
   * - offsetX / offsetY to place or center the grid on screen
   * - spriteOriginOffsetX / spriteOriginOffsetY to account for sprite origin
   */
  GridToScreen(gridX, gridY) {
    const projected = multiplyMatrix2x2Vector2(this.gridToScreenMatrix, Number(gridX), Number(gridY));

    return {
      x: projected.x + this.offsetX + this.spriteOriginOffsetX,
      y: projected.y + this.offsetY + this.spriteOriginOffsetY,
    };
  }

  /**
   * Converts a screen-space point back into exact isometric grid space.
   *
   * This is mouse picking:
   * 1. Remove the same offsets we added in GridToScreen
   * 2. Multiply by the inverse transform matrix
   *
   * The result is exact grid-space coordinates and may be fractional.
   * If you want a tile cell, round / floor afterward depending on your game rules.
   */
  ScreenToGrid(mouseX, mouseY) {
    const localX = Number(mouseX) - this.offsetX - this.spriteOriginOffsetX;
    const localY = Number(mouseY) - this.offsetY - this.spriteOriginOffsetY;

    return multiplyMatrix2x2Vector2(this.screenToGridMatrix, localX, localY);
  }

  /**
   * Convenience helper when you want the nearest tile cell after ScreenToGrid.
   */
  ScreenToGridCell(mouseX, mouseY) {
    const grid = this.ScreenToGrid(mouseX, mouseY);

    return {
      x: Math.round(grid.x),
      y: Math.round(grid.y),
    };
  }

  /**
   * Optional helper for centering a rectangular grid area on screen.
   * This computes offsets so the visual middle of the grid sits on the given screen point.
   */
  centerGridOnScreen(gridWidth, gridHeight, screenCenterX, screenCenterY) {
    const top = this.GridToScreen(0, 0);
    const right = this.GridToScreen(Number(gridWidth), 0);
    const bottom = this.GridToScreen(0, Number(gridHeight));
    const corner = this.GridToScreen(Number(gridWidth), Number(gridHeight));

    const minX = Math.min(top.x, right.x, bottom.x, corner.x);
    const maxX = Math.max(top.x, right.x, bottom.x, corner.x);
    const minY = Math.min(top.y, right.y, bottom.y, corner.y);
    const maxY = Math.max(top.y, right.y, bottom.y, corner.y);

    const currentCenterX = (minX + maxX) * 0.5;
    const currentCenterY = (minY + maxY) * 0.5;

    this.offsetX += Number(screenCenterX) - currentCenterX;
    this.offsetY += Number(screenCenterY) - currentCenterY;

    return this;
  }
}

export function createIsometricCoordinateManager(config) {
  return new IsometricCoordinateManager(config);
}

