import { TILE_SIZE } from "../constants.js";
import { TOWN_LAYOUT } from "./townData.js";

function tileToWorld(tileX, tileY) {
  return {
    x: tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tileY * TILE_SIZE + TILE_SIZE / 2,
  };
}

function addPath(scene, rect) {
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const position = tileToWorld(x, y);
      scene.add.image(position.x, position.y, "road");
    }
  }
}

function addObstacle(scene, group, x, y, width, height) {
  const zone = scene.add.zone(x, y, width, height);
  scene.physics.add.existing(zone, true);
  group.add(zone);
}

export function buildTownMap(scene) {
  const worldWidth = TOWN_LAYOUT.width * TILE_SIZE;
  const worldHeight = TOWN_LAYOUT.height * TILE_SIZE;
  const obstacles = scene.physics.add.staticGroup();

  for (let y = 0; y < TOWN_LAYOUT.height; y += 1) {
    for (let x = 0; x < TOWN_LAYOUT.width; x += 1) {
      const position = tileToWorld(x, y);
      scene.add.image(position.x, position.y, "grass");
    }
  }

  TOWN_LAYOUT.paths.forEach((pathRect) => addPath(scene, pathRect));

  TOWN_LAYOUT.decorations.forEach((decoration) => {
    const position = tileToWorld(decoration.x, decoration.y);
    const sprite = scene.add.image(position.x, position.y, decoration.texture).setScale(decoration.scale ?? 1);

    sprite.setDepth(position.y + 10);

    if (decoration.collider) {
      addObstacle(
        scene,
        obstacles,
        position.x + (decoration.collider.offsetX ?? 0),
        position.y + (decoration.collider.offsetY ?? 0),
        decoration.collider.width,
        decoration.collider.height,
      );
    }
  });

  const fountainPosition = tileToWorld(TOWN_LAYOUT.fountain.x, TOWN_LAYOUT.fountain.y);
  scene.add.image(fountainPosition.x, fountainPosition.y, "fountain").setDepth(fountainPosition.y + 12);
  addObstacle(scene, obstacles, fountainPosition.x, fountainPosition.y, 46, 46);

  TOWN_LAYOUT.labels.forEach((label) => {
    const position = tileToWorld(label.x, label.y);
    scene.add
      .text(position.x, position.y, label.text, {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        color: "#173449",
        backgroundColor: "#f2f4f6",
        padding: { left: 6, right: 6, top: 3, bottom: 3 },
      })
      .setOrigin(0.5)
      .setDepth(position.y + 40);
  });

  const spawnPoint = tileToWorld(TOWN_LAYOUT.spawn.x, TOWN_LAYOUT.spawn.y);

  return {
    obstacles,
    spawnPoint,
    worldWidth,
    worldHeight,
  };
}
