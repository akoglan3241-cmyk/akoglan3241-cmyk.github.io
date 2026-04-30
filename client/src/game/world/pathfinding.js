import { TILE_SIZE } from "../constants.js";
import { tileToWorld, worldToTile } from "./roomUtils.js";

const CARDINAL_DIRECTIONS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

function createTileKey(x, y) {
  return `${x},${y}`;
}

function isInsideRoom(room, tileX, tileY) {
  return tileX >= 0 && tileX < Number(room?.width ?? 0) && tileY >= 0 && tileY < Number(room?.height ?? 0);
}

function markBlockedRect(blockedTiles, left, top, right, bottom, room) {
  const minTileX = Math.max(0, Math.floor(left / TILE_SIZE));
  const maxTileX = Math.min(Number(room?.width ?? 0) - 1, Math.floor((right - 1) / TILE_SIZE));
  const minTileY = Math.max(0, Math.floor(top / TILE_SIZE));
  const maxTileY = Math.min(Number(room?.height ?? 0) - 1, Math.floor((bottom - 1) / TILE_SIZE));

  for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
    for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
      blockedTiles.add(createTileKey(tileX, tileY));
    }
  }
}

export function buildBlockedTileSet(room) {
  const blockedTiles = new Set();

  if (!room) {
    return blockedTiles;
  }

  if (room.fountain) {
    const world = tileToWorld(room.fountain.x, room.fountain.y);
    markBlockedRect(blockedTiles, world.x - 24, world.y - 24, world.x + 24, world.y + 24, room);
  }

  (Array.isArray(room.decorations) ? room.decorations : []).forEach((decoration) => {
    if (!decoration?.collider) {
      return;
    }

    const world = tileToWorld(decoration.x, decoration.y);
    const left = world.x + Number(decoration.collider.offsetX ?? 0) - Number(decoration.collider.width ?? 0) * 0.5;
    const top = world.y + Number(decoration.collider.offsetY ?? 0) - Number(decoration.collider.height ?? 0) * 0.5;
    const right = left + Number(decoration.collider.width ?? 0);
    const bottom = top + Number(decoration.collider.height ?? 0);
    markBlockedRect(blockedTiles, left, top, right, bottom, room);
  });

  return blockedTiles;
}

function findNearestWalkableTile(room, targetTile, blockedTiles, startTile) {
  if (isInsideRoom(room, targetTile.x, targetTile.y) && !blockedTiles.has(createTileKey(targetTile.x, targetTile.y))) {
    return targetTile;
  }

  const queue = [targetTile];
  const visited = new Set([createTileKey(targetTile.x, targetTile.y)]);

  while (queue.length > 0) {
    const current = queue.shift();

    for (const direction of CARDINAL_DIRECTIONS) {
      const next = {
        x: current.x + direction.x,
        y: current.y + direction.y,
      };
      const key = createTileKey(next.x, next.y);

      if (visited.has(key) || !isInsideRoom(room, next.x, next.y)) {
        continue;
      }

      if (!blockedTiles.has(key)) {
        return next;
      }

      visited.add(key);
      queue.push(next);
    }
  }

  return startTile;
}

export function findTilePath(room, startTile, targetTile, options = {}) {
  if (!room || !startTile || !targetTile) {
    return [];
  }

  const blockedTiles = options.blockedTiles ?? buildBlockedTileSet(room);
  const safeStartTile = {
    x: Math.max(0, Math.min(Number(room.width ?? 0) - 1, Number(startTile.x ?? 0))),
    y: Math.max(0, Math.min(Number(room.height ?? 0) - 1, Number(startTile.y ?? 0))),
  };
  const safeTargetTile = findNearestWalkableTile(room, targetTile, blockedTiles, safeStartTile);

  if (safeStartTile.x === safeTargetTile.x && safeStartTile.y === safeTargetTile.y) {
    return [safeStartTile];
  }

  const open = [safeStartTile];
  const cameFrom = new Map();
  const gScore = new Map([[createTileKey(safeStartTile.x, safeStartTile.y), 0]]);
  const fScore = new Map([
    [
      createTileKey(safeStartTile.x, safeStartTile.y),
      Math.abs(safeTargetTile.x - safeStartTile.x) + Math.abs(safeTargetTile.y - safeStartTile.y),
    ],
  ]);

  while (open.length > 0) {
    open.sort((left, right) => (fScore.get(createTileKey(left.x, left.y)) ?? Number.POSITIVE_INFINITY) - (fScore.get(createTileKey(right.x, right.y)) ?? Number.POSITIVE_INFINITY));
    const current = open.shift();
    const currentKey = createTileKey(current.x, current.y);

    if (current.x === safeTargetTile.x && current.y === safeTargetTile.y) {
      const path = [current];
      let walkKey = currentKey;

      while (cameFrom.has(walkKey)) {
        const previous = cameFrom.get(walkKey);
        path.unshift(previous);
        walkKey = createTileKey(previous.x, previous.y);
      }

      return path;
    }

    for (const direction of CARDINAL_DIRECTIONS) {
      const next = {
        x: current.x + direction.x,
        y: current.y + direction.y,
      };
      const nextKey = createTileKey(next.x, next.y);

      if (!isInsideRoom(room, next.x, next.y) || blockedTiles.has(nextKey)) {
        continue;
      }

      const tentativeScore = (gScore.get(currentKey) ?? Number.POSITIVE_INFINITY) + 1;

      if (tentativeScore >= (gScore.get(nextKey) ?? Number.POSITIVE_INFINITY)) {
        continue;
      }

      cameFrom.set(nextKey, current);
      gScore.set(nextKey, tentativeScore);
      fScore.set(nextKey, tentativeScore + Math.abs(safeTargetTile.x - next.x) + Math.abs(safeTargetTile.y - next.y));

      if (!open.some((entry) => entry.x === next.x && entry.y === next.y)) {
        open.push(next);
      }
    }
  }

  return [safeStartTile];
}

export function findWorldPath(room, startWorldX, startWorldY, targetWorldX, targetWorldY, options = {}) {
  const startTile = worldToTile(startWorldX, startWorldY);
  const targetTile = worldToTile(targetWorldX, targetWorldY);
  const tilePath = findTilePath(room, startTile, targetTile, options);
  return tilePath.map((entry) => tileToWorld(entry.x, entry.y));
}
