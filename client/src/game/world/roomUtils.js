import { TILE_SIZE } from "../constants.js";
import { createIsometricCoordinateManager } from "./IsometricCoordinateManager.js";

const isoManager = createIsometricCoordinateManager({
  tileWidth: 64,
  tileHeight: 32,
});

function getProjectedLogicalBounds(logicalWidth, logicalHeight) {
  const corners = [
    logicalToScreen(0, 0),
    logicalToScreen(logicalWidth, 0),
    logicalToScreen(0, logicalHeight),
    logicalToScreen(logicalWidth, logicalHeight),
  ];

  const minX = Math.min(...corners.map((point) => point.x));
  const maxX = Math.max(...corners.map((point) => point.x));
  const minY = Math.min(...corners.map((point) => point.y));
  const maxY = Math.max(...corners.map((point) => point.y));

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function configureRoomProjection(roomWidthTiles, roomHeightTiles, viewportWidth, viewportHeight, options = {}) {
  const centerX = Number(options.centerX ?? viewportWidth * 0.52);
  const centerY = Number(options.centerY ?? Math.max(260, viewportHeight * 0.34));

  isoManager.setOffset(0, 0);
  isoManager.centerGridOnScreen(roomWidthTiles, roomHeightTiles, centerX, centerY);

  return getProjectedLogicalBounds(roomWidthTiles * TILE_SIZE, roomHeightTiles * TILE_SIZE);
}

export function getRoomProjectionBounds(roomWidthTiles, roomHeightTiles) {
  return getProjectedLogicalBounds(roomWidthTiles * TILE_SIZE, roomHeightTiles * TILE_SIZE);
}

export function logicalToScreen(logicalX, logicalY) {
  // Convert logical pixels to "tile units" for the iso manager
  return isoManager.GridToScreen(logicalX / TILE_SIZE, logicalY / TILE_SIZE);
}

export function screenToLogical(screenX, screenY) {
  const grid = isoManager.ScreenToGrid(screenX, screenY);
  // Convert "tile units" back to logical pixels
  return {
    x: grid.x * TILE_SIZE,
    y: grid.y * TILE_SIZE,
  };
}

export function tileToWorld(tileX, tileY) {
  return {
    x: tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tileY * TILE_SIZE + TILE_SIZE / 2,
  };
}

export function worldToTile(worldX, worldY) {
  return {
    x: Math.floor(worldX / TILE_SIZE),
    y: Math.floor(worldY / TILE_SIZE),
  };
}
