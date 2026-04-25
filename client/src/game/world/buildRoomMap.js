import { TILE_SIZE } from "../constants.js";
import { GRAPHICS_PALETTE } from "./graphicsPalette.js";
import { createGroundShadow } from "../utils/createGroundShadow.js";
import { getPerspectiveScale } from "./perspective.js";
import { tileToWorld, logicalToScreen, configureRoomProjection } from "./roomUtils.js";

function getIsoDepth(logicalX, logicalY) {
  // Use logical coordinates for stable depth sorting in isometric view
  return (logicalX + logicalY) * 1.5;
}

const TILE_TEXTURE_VARIANTS = {
  grass: ["grass-1", "grass-2", "grass-3"],
  road: ["road-1", "road-2", "road-3"],
  asphalt: ["asphalt-1", "asphalt-2", "asphalt-3"],
  sidewalk: ["sidewalk-1", "sidewalk-2", "sidewalk-3"],
  sand: ["sand-1", "sand-2", "sand-3"],
};

function addObstacle(scene, group, x, y, width, height) {
  const zone = scene.add.zone(x, y, width, height);
  scene.physics.add.existing(zone, true);
  group.add(zone);
  return zone;
}

function addPortalVisual(scene, portalData, createdObjects) {
  const position = tileToWorld(portalData.x, portalData.y);
  const screenPos = logicalToScreen(position.x, position.y);
  const marker = scene.add.circle(screenPos.x, screenPos.y, 18, 0x82d6ff, 0.28).setStrokeStyle(3, 0xeefaff, 0.88);
  const label = scene.add
    .text(screenPos.x, screenPos.y - 32, portalData.label, {
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      color: "#173449",
      backgroundColor: "#e8f9ff",
      padding: { left: 5, right: 5, top: 3, bottom: 3 },
    })
    .setOrigin(0.5)
    .setDepth(getIsoDepth(position.x, position.y) + 50);

  createdObjects.push(marker, label);

  const setContextFocused = (isFocused) => {
    const active = Boolean(isFocused);
    marker.setFillStyle(active ? 0xa6e6ff : 0x82d6ff, active ? 0.42 : 0.28);
    marker.setStrokeStyle(active ? 4 : 3, active ? 0xfff2b8 : 0xeefaff, active ? 0.98 : 0.88);
    label.setBackgroundColor(active ? "#fff2bf" : "#e8f9ff");
  };

  return {
    ...portalData,
    x: position.x,
    y: position.y,
    marker,
    label,
    setContextFocused,
  };
}

function getTileSeed(x, y) {
  return Math.abs(x * 37 + y * 17 + x * y * 3);
}

function getClusteredTileSeed(x, y) {
  const macroX = Math.floor(x / 2);
  const macroY = Math.floor(y / 2);
  const macro = Math.abs(macroX * 23 + macroY * 31 + macroX * macroY * 5);
  const micro = getTileSeed(x, y) % 2;
  return macro + micro;
}

function pickTileTexture(baseType, seed) {
  const variants = TILE_TEXTURE_VARIANTS[baseType];
  if (!Array.isArray(variants) || variants.length === 0) {
    return baseType;
  }

  return variants[Math.abs(Number(seed ?? 0)) % variants.length];
}

function isPathTile(room, x, y) {
  return room.paths.some((pathRect) => x >= pathRect.x && x < pathRect.x + pathRect.width && y >= pathRect.y && y < pathRect.y + pathRect.height);
}

function isNearPath(room, x, y, radius = 1) {
  for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
    for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
      if (isPathTile(room, x + offsetX, y + offsetY)) {
        return true;
      }
    }
  }

  return false;
}

function addTerrainDetails(scene, createdObjects, room) {
  const isUrbanRoom = room.id === "town" || room.id === "arcade" || room.id === "cafe";

  room.paths.forEach((pathRect) => {
    for (let y = pathRect.y; y < pathRect.y + pathRect.height; y += 1) {
      for (let x = pathRect.x; x < pathRect.x + pathRect.width; x += 1) {
        const seed = getTileSeed(x, y);
        const position = tileToWorld(x, y);
        const screenPos = logicalToScreen(position.x, position.y);
        const depth = getIsoDepth(position.x, position.y) + 1;

        if (isUrbanRoom) {
          if (pathRect.width >= 4 && y === pathRect.y + Math.floor(pathRect.height / 2) && x % 3 === 1 && seed % 2 === 0) {
            createdObjects.push(
              scene
                .add.rectangle(screenPos.x, screenPos.y + 1, 12, 3, 0xf7e7b0, 0.55)
                .setDepth(depth),
            );
          }

          if (seed % 11 === 0) {
            createdObjects.push(
              scene
                .add.rectangle(screenPos.x - 10 + (seed % 8), screenPos.y + 8 - (seed % 4), 5, 2, 0x8e7a58, 0.3)
                .setDepth(depth),
            );
          }

          continue;
        }

        if (seed % 9 !== 0) {
          continue;
        }

        createdObjects.push(
          scene.add.circle(screenPos.x - 10 + (seed % 7), screenPos.y + 6 - (seed % 5), 2, 0xa68855, 0.45).setDepth(depth),
        );
      }
    }
  });

  for (let y = 0; y < room.height; y += 1) {
    for (let x = 0; x < room.width; x += 1) {
      const onPath = isPathTile(room, x, y);
      const nearPath = isNearPath(room, x, y, 1);
      const seed = getTileSeed(x, y);

      if (onPath || seed % (isUrbanRoom ? 29 : 13) !== 0) {
        continue;
      }

      const position = tileToWorld(x, y);
      const screenPos = logicalToScreen(position.x, position.y);
      const depth = getIsoDepth(position.x, position.y) + 1;

      if (isUrbanRoom) {
        if (!nearPath) {
          continue;
        }

        const texture = seed % 3 === 0 ? "roadsideWeed" : seed % 3 === 1 ? "roadsidePebble" : "dirtSpot";
        const sprite = scene.add
          .image(screenPos.x - 8 + (seed % 12), screenPos.y + 3 + (seed % 6), texture)
          .setDepth(depth)
          .setScale(texture === "dirtSpot" ? 0.82 : 0.86 + (seed % 3) * 0.05)
          .setAlpha(texture === "dirtSpot" ? 0.7 : 0.9);
        createdObjects.push(sprite);
        continue;
      }

      if (seed % 4 === 0) {
        const dirt = scene.add
          .image(screenPos.x - 7 + (seed % 14), screenPos.y + 4 + (seed % 6), "dirtSpot")
          .setDepth(depth)
          .setScale(0.75 + (seed % 3) * 0.06)
          .setAlpha(0.72);
        createdObjects.push(dirt);
      } else {
        const flower = scene.add.circle(screenPos.x - 7 + (seed % 14), screenPos.y - 2 + (seed % 8), 2 + (seed % 2), 0xffd99d, 0.62).setDepth(depth);
        createdObjects.push(flower);
      }
    }
  }
}

function addScatterDecor(scene, createdObjects, room) {
  const isUrbanRoom = room.id === "town" || room.id === "arcade" || room.id === "cafe";
  const hasWaterfront = Boolean(room.waterfront?.enabled);

  for (let y = 0; y < room.height; y += 1) {
    for (let x = 0; x < room.width; x += 1) {
      const onPath = isPathTile(room, x, y);
      const nearPath = isNearPath(room, x, y, isUrbanRoom ? 1 : 0);
      const nearWater = hasWaterfront && y >= Number(room.waterfront.boardwalkStartY ?? room.height - 5);
      const seed = getTileSeed(x + 17, y + 29);

      if (onPath || seed % (isUrbanRoom ? 23 : 11) !== 0) {
        continue;
      }

      if (isUrbanRoom && !nearWater && !nearPath) {
        continue;
      }

      const position = tileToWorld(x, y);
      const screenPos = logicalToScreen(position.x, position.y);
      const variant = nearWater
        ? seed % 4 === 0
          ? "dirtSpot"
          : seed % 3 === 0
            ? "rockSmall"
            : seed % 3 === 1
              ? "grassPatch"
              : "flowerPatch"
        : seed % 4 === 0
          ? "dirtSpot"
          : seed % 3 === 0
            ? "flowerPatch"
            : seed % 3 === 1
              ? "grassPatch"
              : "rockSmall";
      const offsetX = -8 + (seed % 16);
      const offsetY = 4 + (seed % 6);
      const sprite = scene.add.image(screenPos.x + offsetX, screenPos.y + offsetY, variant).setDepth(getIsoDepth(position.x, position.y) + offsetY + 1);
      const scale = variant === "rockSmall" ? 0.9 + (seed % 3) * 0.08 : variant === "dirtSpot" ? 0.78 + (seed % 3) * 0.05 : 0.88 + (seed % 4) * 0.06;
      sprite.setScale(scale);
      if (variant === "dirtSpot") {
        sprite.setAlpha(0.7);
      }
      createdObjects.push(sprite);
    }
  }
}

function addCrosswalks(scene, createdObjects, room) {
  (room.crosswalks ?? []).forEach((crosswalk) => {
    const x = Number(crosswalk.x ?? 0);
    const y = Number(crosswalk.y ?? 0);
    const width = Math.max(1, Number(crosswalk.width ?? 1));
    const height = Math.max(1, Number(crosswalk.height ?? 1));
    const orientation = String(crosswalk.orientation ?? "horizontal");

    for (let row = 0; row < height; row += 1) {
      for (let column = 0; column < width; column += 1) {
        const isStripe = orientation === "vertical" ? column % 2 === 0 : row % 2 === 0;
        if (!isStripe) {
          continue;
        }

        const position = tileToWorld(x + column, y + row);
        const screenPos = logicalToScreen(position.x, position.y);
        createdObjects.push(scene.add.rectangle(screenPos.x, screenPos.y, 18, 10, 0xf8f5ed, 0.82).setDepth(getIsoDepth(position.x, position.y) + 1));
      }
    }
  });
}

function addPathEdgeDetails(scene, createdObjects, room) {
  room.paths.forEach((pathRect) => {
    const left = pathRect.x * TILE_SIZE;
    const top = pathRect.y * TILE_SIZE;
    const width = pathRect.width * TILE_SIZE;
    const height = pathRect.height * TILE_SIZE;
    
    // For simplicity in isometric, we don't draw the complex rounded rectangles for roads yet
    // as they would need to be projected as complex polygons.
    // Instead, we can add some subtle lines along the edges.
    
    const topLeft = logicalToScreen(left, top);
    const topRight = logicalToScreen(left + width, top);
    const bottomLeft = logicalToScreen(left, top + height);
    const bottomRight = logicalToScreen(left + width, top + height);

    const graphics = scene.add.graphics().setDepth(getIsoDepth(left + width/2, top + height/2) + 0.5);
    graphics.lineStyle(2, 0xffffff, 0.1);
    graphics.beginPath();
    graphics.moveTo(topLeft.x, topLeft.y);
    graphics.lineTo(topRight.x, topRight.y);
    graphics.lineTo(bottomRight.x, bottomRight.y);
    graphics.lineTo(bottomLeft.x, bottomLeft.y);
    graphics.closePath();
    graphics.strokePath();
    createdObjects.push(graphics);
  });
}

function addUrbanElevationDetails(scene, createdObjects, room) {
  // Elevation effects are harder in 2D isometric without custom assets.
  // We'll skip the complex curb rectangles for now or simplify them.
}

export function buildRoomMap(scene, room) {
  const worldWidth = room.width * TILE_SIZE;
  const worldHeight = room.height * TILE_SIZE;
  const projectedBounds = configureRoomProjection(room.width, room.height, scene.scale.width, scene.scale.height, {
    centerX: scene.scale.width * 0.52,
    centerY: Math.max(240, scene.scale.height * 0.32),
  });
  const createdObjects = [];
  const obstacles = scene.physics.add.staticGroup();
  
  // Sky visuals
  const centerX = scene.scale.width / 2;
  const skyHeight = 280;
  const sky = scene.add.rectangle(centerX, skyHeight / 2, scene.scale.width * 2, skyHeight, room.ambiance.skyColor, 1).setDepth(-30).setScrollFactor(0);
  
  const skyGradientTop = scene.add.rectangle(centerX, 40, scene.scale.width * 2, 80, 0xffffff, 0.08).setDepth(-29).setScrollFactor(0);
  const skyGradientWarm = scene.add.rectangle(centerX, skyHeight - 40, scene.scale.width * 2, 80, room.ambiance.glowColor, 0.3).setDepth(-28).setScrollFactor(0);
  
  const glow = scene.add.circle(centerX, skyHeight * 0.4, 120, room.ambiance.glowColor, 0.16).setDepth(-27).setScrollFactor(0.02);
  
  const farClouds = scene.add.tileSprite(centerX, 80, scene.scale.width * 2, 64, "cloud").setDepth(-26).setScrollFactor(0.05).setAlpha(0.4).setScale(0.8);
  const clouds = scene.add.tileSprite(centerX, 120, scene.scale.width * 2, 64, "cloud").setDepth(-25).setScrollFactor(0.08).setAlpha(0.72);
  
  const skyline = scene.add.rectangle(centerX, skyHeight - 20, scene.scale.width * 2, 40, 0x173449, 0.24).setDepth(-24).setScrollFactor(0.1);
  const treeline = scene.add.rectangle(centerX, skyHeight - 10, scene.scale.width * 2, 20, 0x214f2e, 0.18).setDepth(-23).setScrollFactor(0.12);
  
  const weatherTint = scene.add.rectangle(centerX, skyHeight / 2, scene.scale.width * 2, skyHeight, 0xffffff, 0).setDepth(-22).setScrollFactor(0);
  const ambientTint = scene.add.rectangle(centerX, skyHeight / 2, scene.scale.width * 2, skyHeight, 0x10233f, 0).setDepth(-21).setScrollFactor(0);
  const vignette = scene.add.rectangle(centerX, skyHeight / 2, scene.scale.width * 2, skyHeight, 0x000000, 0).setDepth(-20).setScrollFactor(0);
  const darkness = scene.add.rectangle(centerX, skyHeight / 2, scene.scale.width * 2, skyHeight, 0x000000, 0).setDepth(-19).setScrollFactor(0);

  const birds = []; // No bird textures available yet, keep as empty array

  for (let y = 0; y < room.height; y += 1) {
    for (let x = 0; x < room.width; x += 1) {
      const position = tileToWorld(x, y);
      const screenPos = logicalToScreen(position.x, position.y);
      const tileSeed = getClusteredTileSeed(x, y);
      const baseTile = scene.add.image(screenPos.x, screenPos.y, pickTileTexture(room.baseTexture, tileSeed));
      baseTile.setDepth(getIsoDepth(position.x, position.y));
      createdObjects.push(baseTile);
    }
  }

  // Waterfront simplified
  if (room.waterfront?.enabled) {
    // ... waterfront logic would need to be projected as well ...
  }

  room.paths.forEach((pathRect) => {
    for (let y = pathRect.y; y < pathRect.y + pathRect.height; y += 1) {
      for (let x = pathRect.x; x < pathRect.x + pathRect.width; x += 1) {
        const position = tileToWorld(x, y);
        const screenPos = logicalToScreen(position.x, position.y);
        const roadTexture = room.id === "town" ? "asphalt" : "road";
        const tileSeed = getClusteredTileSeed(x + 9, y + 3);
        const roadTile = scene.add.image(screenPos.x, screenPos.y, pickTileTexture(roadTexture, tileSeed));
        roadTile.setDepth(getIsoDepth(position.x, position.y) + 0.1);
        createdObjects.push(roadTile);
      }
    }
  });

  addCrosswalks(scene, createdObjects, room);
  addPathEdgeDetails(scene, createdObjects, room);
  addUrbanElevationDetails(scene, createdObjects, room);
  addTerrainDetails(scene, createdObjects, room);
  addScatterDecor(scene, createdObjects, room);

  if (room.fountain) {
    const logicalPos = tileToWorld(room.fountain.x, room.fountain.y);
    const screenPos = logicalToScreen(logicalPos.x, logicalPos.y);
    createdObjects.push(createGroundShadow(scene, screenPos.x, screenPos.y + 8, { width: 48, height: 24, alpha: 0.2, depth: getIsoDepth(logicalPos.x, logicalPos.y) + 2, isIso: true }));
    createdObjects.push(scene.add.image(screenPos.x, screenPos.y, "fountain").setDepth(getIsoDepth(logicalPos.x, logicalPos.y) + 12));
    createdObjects.push(addObstacle(scene, obstacles, logicalPos.x, logicalPos.y, 46, 46));
  }

  room.decorations.forEach((decoration) => {
    const logicalPos = tileToWorld(decoration.x, decoration.y);
    const screenPos = logicalToScreen(logicalPos.x, logicalPos.y);
    const scale = (decoration.scale ?? 1);
    
    createdObjects.push(
      createGroundShadow(scene, screenPos.x, screenPos.y + 6, {
        width: (decoration.shadowWidth ?? 32) * 1.5,
        height: (decoration.shadowHeight ?? 16) * 1.5,
        alpha: decoration.shadowAlpha ?? 0.2,
        depth: getIsoDepth(logicalPos.x, logicalPos.y) + 0.5,
        isIso: true
      }),
    );
    const sprite = scene.add.image(screenPos.x, screenPos.y, decoration.texture).setScale(scale);
    if (decoration.tint !== undefined) {
      sprite.setTint(Number(decoration.tint));
    }
    sprite.setDepth(getIsoDepth(logicalPos.x, logicalPos.y) + 10);
    createdObjects.push(sprite);

    if (decoration.collider) {
      createdObjects.push(
        addObstacle(
          scene,
          obstacles,
          logicalPos.x + (decoration.collider.offsetX ?? 0),
          logicalPos.y + (decoration.collider.offsetY ?? 0),
          decoration.collider.width,
          decoration.collider.height,
        ),
      );
    }
  });

  room.labels.forEach((label) => {
    const logicalPos = tileToWorld(label.x, label.y);
    const screenPos = logicalToScreen(logicalPos.x, logicalPos.y);
    createdObjects.push(
      scene.add
        .text(screenPos.x, screenPos.y, label.text, {
          fontFamily: "Trebuchet MS",
          fontSize: "14px",
          color: "#173449",
          backgroundColor: "#f2f4f6",
          padding: { left: 6, right: 6, top: 3, bottom: 3 },
        })
        .setOrigin(0.5)
        .setDepth(getIsoDepth(logicalPos.x, logicalPos.y) + 40),
    );
  });

  const portals = room.portals.map((portalData) => addPortalVisual(scene, portalData, createdObjects));
  const spawnPoint = tileToWorld(room.spawn.x, room.spawn.y);

  return {
    worldWidth,
    worldHeight,
    projectedBounds,
    spawnPoint,
    portals,
    obstacles,
    createdObjects,
    skyVisuals: {
      sky,
      skyGradientTop,
      skyGradientWarm,
      glow,
      farClouds,
      clouds,
      skyline,
      treeline,
      weatherTint,
      ambientTint,
      vignette,
      darkness,
      birds,
    },
  };
}
