import { TILE_SIZE } from "../constants.js";

function buildTexture(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) {
    return;
  }

  const graphics = scene.add.graphics();
  draw(graphics);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

function strokeRoundedRect(graphics, x, y, width, height, radius, color = 0x233443, alpha = 0.95, lineWidth = 2) {
  graphics.lineStyle(lineWidth, color, alpha);
  graphics.strokeRoundedRect(x, y, width, height, radius);
}

function strokeCircle(graphics, x, y, radius, color = 0x233443, alpha = 0.95, lineWidth = 2) {
  graphics.lineStyle(lineWidth, color, alpha);
  graphics.strokeCircle(x, y, radius);
}

function drawSoftNoise(graphics, width, height, samples) {
  samples.forEach((sample) => {
    const { color, alpha = 0.12, x, y, radiusX, radiusY } = sample;
    graphics.fillStyle(color, alpha);
    graphics.fillEllipse(x, y, radiusX, radiusY);
  });
}

function drawWindowGlow(graphics, x, y, width, height, tint = 0xbfe7ff) {
  graphics.fillStyle(0xffffff, 0.12);
  graphics.fillRoundedRect(x - 1, y - 1, width + 2, height + 2, 3);
  graphics.fillStyle(tint, 0.96);
  graphics.fillRoundedRect(x, y, width, height, 3);
  graphics.fillStyle(0xffffff, 0.28);
  graphics.fillRoundedRect(x + 1, y + 1, Math.max(3, width - 6), Math.max(2, height * 0.28), 2);
}

function drawGroundTileTexture(graphics, baseColor, overlays = [], speckles = []) {
  const width = 64;
  const height = 32;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  // Main diamond shape
  graphics.fillStyle(baseColor, 1);
  graphics.beginPath();
  graphics.moveTo(halfWidth, 0);
  graphics.lineTo(width, halfHeight);
  graphics.lineTo(halfWidth, height);
  graphics.lineTo(0, halfHeight);
  graphics.closePath();
  graphics.fillPath();

  // Subtle highlights/shading within the diamond
  graphics.fillStyle(0xffffff, 0.05);
  graphics.beginPath();
  graphics.moveTo(halfWidth, 0);
  graphics.lineTo(width, halfHeight);
  graphics.lineTo(halfWidth, halfHeight);
  graphics.closePath();
  graphics.fillPath();

  graphics.fillStyle(0x000000, 0.05);
  graphics.beginPath();
  graphics.moveTo(0, halfHeight);
  graphics.lineTo(halfWidth, height);
  graphics.lineTo(halfWidth, halfHeight);
  graphics.closePath();
  graphics.fillPath();

  overlays.forEach((overlay) => {
    const { color, alpha = 1, x, y, width: ow, height: oh } = overlay;
    graphics.fillStyle(color, alpha);
    
    // Scale logical overlay positions to diamond dimensions
    const centerX = (x / TILE_SIZE) * width;
    const centerY = (y / TILE_SIZE) * height;
    const radX = (ow / TILE_SIZE) * halfWidth;
    const radY = (oh / TILE_SIZE) * halfHeight;
    
    graphics.fillEllipse(centerX, centerY, radX, radY);
  });

  speckles.forEach((sample) => {
    const { color, alpha = 0.12, x, y, radiusX, radiusY } = sample;
    graphics.fillStyle(color, alpha);
    graphics.fillEllipse((x / TILE_SIZE) * width, (y / TILE_SIZE) * height, (radiusX / TILE_SIZE) * width, (radiusY / TILE_SIZE) * height);
  });
}

function drawAvatarBodyTexture(graphics) {
  graphics.fillStyle(0xf2c7a0, 1);
  graphics.fillCircle(16, 10, 9);
  strokeCircle(graphics, 16, 10, 9);
  graphics.fillStyle(0xf6d5b5, 1);
  graphics.fillCircle(14, 8, 2.6);
  graphics.fillStyle(0x284454, 1);
  graphics.fillRoundedRect(9, 17, 14, 14, 6);
  graphics.fillStyle(0x345566, 1);
  graphics.fillRoundedRect(10, 18, 12, 6, 5);
  graphics.fillStyle(0x223644, 1);
  graphics.fillRoundedRect(7, 19, 3, 9, 2);
  graphics.fillRoundedRect(22, 19, 3, 9, 2);
  graphics.fillRoundedRect(11, 28, 4, 9, 2);
  graphics.fillRoundedRect(17, 28, 4, 9, 2);
  strokeRoundedRect(graphics, 9, 17, 14, 14, 6);
}

function drawAvatarFaceTexture(graphics) {
  graphics.fillStyle(0x233443, 0.98);
  graphics.fillCircle(13, 10, 1.1);
  graphics.fillCircle(19, 10, 1.1);
  graphics.lineStyle(1.6, 0x874d42, 0.95);
  graphics.beginPath();
  graphics.arc(16, 13, 2.4, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
  graphics.strokePath();
  graphics.fillStyle(0xeaa39a, 0.45);
  graphics.fillCircle(10.5, 13, 1.8);
  graphics.fillCircle(21.5, 13, 1.8);
}

function drawAvatarTopTexture(graphics, fillColor, accentColor, variant = "shirt") {
  graphics.fillStyle(fillColor, 1);
  graphics.fillRoundedRect(7, 17, 18, 13, 6);
  graphics.fillStyle(0xffffff, 0.18);
  graphics.fillRoundedRect(10, 18, 12, 3, 3);
  graphics.fillStyle(accentColor, 0.95);

  if (variant === "striped-sweater") {
    graphics.fillRect(9, 22, 14, 2);
    graphics.fillRect(9, 26, 14, 2);
  } else if (variant === "cafe-apron") {
    graphics.fillRect(13, 18, 6, 12);
    graphics.fillRect(11, 18, 2, 4);
    graphics.fillRect(19, 18, 2, 4);
    graphics.fillStyle(0xeedfc1, 1);
    graphics.fillRoundedRect(11, 21, 10, 8, 3);
  } else {
    graphics.fillRect(11, 22, 10, 2);
  }

  strokeRoundedRect(graphics, 7, 17, 18, 13, 6);
}

function drawAvatarBottomTexture(graphics, fillColor, accentColor, variant = "pants") {
  graphics.fillStyle(fillColor, 1);

  if (variant === "soft-skirt") {
    graphics.fillRoundedRect(9, 27, 14, 6, 4);
    graphics.fillTriangle(9, 31, 23, 31, 16, 38);
    graphics.fillStyle(accentColor, 0.65);
    graphics.fillRect(11, 30, 10, 2);
  } else if (variant === "denim-shorts") {
    graphics.fillRoundedRect(9, 27, 14, 7, 3);
    graphics.fillRoundedRect(9, 31, 5, 7, 2);
    graphics.fillRoundedRect(18, 31, 5, 7, 2);
    graphics.fillStyle(accentColor, 0.7);
    graphics.fillRect(10, 29, 12, 2);
  } else {
    graphics.fillRoundedRect(10, 27, 5, 11, 2);
    graphics.fillRoundedRect(17, 27, 5, 11, 2);
    graphics.fillStyle(accentColor, 0.65);
    graphics.fillRect(10, 28, 12, 2);
  }

  graphics.lineStyle(2, 0x223644, 0.95);
  if (variant === "soft-skirt") {
    graphics.strokeTriangle(9, 31, 23, 31, 16, 38);
    graphics.strokeRoundedRect(9, 27, 14, 6, 4);
  } else if (variant === "denim-shorts") {
    graphics.strokeRoundedRect(9, 27, 14, 7, 3);
    graphics.strokeRoundedRect(9, 31, 5, 7, 2);
    graphics.strokeRoundedRect(18, 31, 5, 7, 2);
  } else {
    graphics.strokeRoundedRect(10, 27, 5, 11, 2);
    graphics.strokeRoundedRect(17, 27, 5, 11, 2);
  }
}

function drawAvatarHairTexture(graphics, fillColor, variant = "short") {
  graphics.fillStyle(fillColor, 1);

  if (variant === "spiky") {
    graphics.fillTriangle(6, 12, 11, 2, 15, 11);
    graphics.fillTriangle(10, 11, 16, 1, 21, 11);
    graphics.fillTriangle(17, 11, 22, 2, 26, 12);
    graphics.fillRoundedRect(8, 7, 16, 5, 3);
  } else if (variant === "bob") {
    graphics.fillRoundedRect(6, 3, 20, 10, 6);
    graphics.fillRoundedRect(6, 9, 4, 8, 3);
    graphics.fillRoundedRect(22, 9, 4, 8, 3);
  } else if (variant === "soft-wave") {
    graphics.fillRoundedRect(6, 3, 20, 9, 6);
    graphics.fillCircle(8, 12, 3);
    graphics.fillCircle(23, 12, 3);
    graphics.fillCircle(12, 6, 2);
    graphics.fillCircle(20, 6, 2);
  } else if (variant === "short-bob") {
    graphics.fillRoundedRect(7, 4, 18, 8, 5);
    graphics.fillRoundedRect(7, 10, 3, 5, 2);
    graphics.fillRoundedRect(22, 10, 3, 5, 2);
    graphics.fillRect(10, 9, 12, 3);
  } else {
    graphics.fillRoundedRect(7, 4, 18, 7, 4);
    graphics.fillRect(10, 9, 12, 3);
  }

  graphics.lineStyle(2, 0x223644, 0.95);
  if (variant === "spiky") {
    graphics.strokeTriangle(6, 12, 11, 2, 15, 11);
    graphics.strokeTriangle(10, 11, 16, 1, 21, 11);
    graphics.strokeTriangle(17, 11, 22, 2, 26, 12);
    graphics.strokeRoundedRect(8, 7, 16, 5, 3);
  } else if (variant === "soft-wave") {
    graphics.strokeRoundedRect(6, 3, 20, 9, 6);
  } else {
    graphics.strokeRoundedRect(variant === "bob" ? 6 : 7, variant === "bob" ? 3 : 4, variant === "bob" ? 20 : 18, variant === "bob" ? 10 : 8, variant === "bob" ? 6 : 5);
  }
}

function drawAvatarAccessoryTexture(graphics, variant = "none") {
  if (variant === "none") {
    return;
  }

  if (variant === "glasses") {
    graphics.lineStyle(2, 0x16212b, 1);
    graphics.strokeRoundedRect(8, 8, 6, 4, 2);
    graphics.strokeRoundedRect(18, 8, 6, 4, 2);
    graphics.lineBetween(14, 10, 18, 10);
    return;
  }

  if (variant === "flower") {
    graphics.fillStyle(0xff7aa2, 1);
    graphics.fillCircle(23, 10, 2);
    graphics.fillCircle(19, 10, 2);
    graphics.fillCircle(21, 7, 2);
    graphics.fillCircle(21, 13, 2);
    graphics.fillStyle(0xf7d45c, 1);
    graphics.fillCircle(21, 10, 1.4);
    return;
  }

  if (variant === "straw-hat") {
    graphics.fillStyle(0xe7c47a, 1);
    graphics.fillRoundedRect(8, 3, 16, 6, 4);
    graphics.fillRoundedRect(4, 8, 24, 3, 3);
    graphics.fillStyle(0xc77251, 1);
    graphics.fillRect(10, 7, 12, 2);
    strokeRoundedRect(graphics, 8, 3, 16, 6, 4);
    graphics.lineStyle(2, 0x223644, 0.95);
    graphics.strokeRoundedRect(4, 8, 24, 3, 3);
    return;
  }

  if (variant === "mini-backpack") {
    graphics.fillStyle(0x7e8fe5, 1);
    graphics.fillRoundedRect(18, 18, 7, 9, 3);
    graphics.fillStyle(0x5c6fc6, 1);
    graphics.fillRect(19, 20, 5, 3);
    strokeRoundedRect(graphics, 18, 18, 7, 9, 3);
  }
}

export function createPlaceholderTextures(scene) {
  const groundTileDefinitions = {
    grass: [
      {
        key: "grass-1",
        baseColor: 0x75b977,
        overlays: [
          { color: 0x8ccf90, alpha: 0.24, x: 32, y: 16, width: 20, height: 16, ellipse: true },
        ],
        speckles: [
          { color: 0x98d59b, alpha: 0.12, x: 20, y: 24, radiusX: 5, radiusY: 3 },
        ],
      },
      {
        key: "grass-2",
        baseColor: 0x6fb271,
        overlays: [
          { color: 0x89c88c, alpha: 0.22, x: 40, y: 14, width: 18, height: 15, ellipse: true },
        ],
        speckles: [
          { color: 0x527f54, alpha: 0.08, x: 12, y: 20, radiusX: 6, radiusY: 4 },
        ],
      },
      {
        key: "grass-3",
        baseColor: 0x79bd7a,
        overlays: [
          { color: 0x95d297, alpha: 0.2, x: 24, y: 20, width: 24, height: 12, ellipse: true },
        ],
        speckles: [
          { color: 0xa8dcaa, alpha: 0.09, x: 44, y: 10, radiusX: 5, radiusY: 4 },
        ],
      },
    ],
    road: [
      {
        key: "road-1",
        baseColor: 0xc7ab74,
        overlays: [
          { color: 0xe3c994, alpha: 0.18, x: 32, y: 16, width: 21, height: 10, ellipse: true },
        ],
        speckles: [
          { color: 0x9c7b49, alpha: 0.08, x: 16, y: 26, radiusX: 6, radiusY: 4 },
        ],
      },
      {
        key: "road-2",
        baseColor: 0xbea06d,
        overlays: [
          { color: 0xd7bb87, alpha: 0.16, x: 40, y: 12, width: 18, height: 9, ellipse: true },
        ],
        speckles: [
          { color: 0x957445, alpha: 0.08, x: 20, y: 8, radiusX: 5, radiusY: 3 },
        ],
      },
      {
        key: "road-3",
        baseColor: 0xcfb783,
        overlays: [
          { color: 0xe4cd9f, alpha: 0.17, x: 24, y: 18, width: 20, height: 8, ellipse: true },
        ],
        speckles: [
          { color: 0xa17d49, alpha: 0.07, x: 42, y: 23, radiusX: 6, radiusY: 4 },
        ],
      },
    ],
    asphalt: [
      {
        key: "asphalt-1",
        baseColor: 0x6f7982,
        overlays: [
          { color: 0x8d969e, alpha: 0.12, x: 32, y: 16, width: 18, height: 8, ellipse: true },
        ],
        speckles: [
          { color: 0xc2c9ce, alpha: 0.05, x: 16, y: 29, radiusX: 4, radiusY: 3 },
        ],
      },
      {
        key: "asphalt-2",
        baseColor: 0x747f88,
        overlays: [
          { color: 0x9098a0, alpha: 0.12, x: 40, y: 18, width: 17, height: 8, ellipse: true },
        ],
        speckles: [
          { color: 0x555d66, alpha: 0.08, x: 20, y: 12, radiusX: 6, radiusY: 4 },
        ],
      },
      {
        key: "asphalt-3",
        baseColor: 0x69737c,
        overlays: [
          { color: 0x949aa2, alpha: 0.11, x: 24, y: 14, width: 14, height: 7, ellipse: true },
        ],
        speckles: [
          { color: 0xc3cbd0, alpha: 0.04, x: 44, y: 24, radiusX: 4, radiusY: 3 },
        ],
      },
    ],
    sidewalk: [
      {
        key: "sidewalk-1",
        baseColor: 0xded8cc,
        overlays: [
          { color: 0xcac3b7, alpha: 0.14, x: 32, y: 16, width: 22, height: 18, ellipse: true },
        ],
        speckles: [
          { color: 0xffffff, alpha: 0.08, x: 16, y: 28, radiusX: 7, radiusY: 4 },
        ],
      },
      {
        key: "sidewalk-2",
        baseColor: 0xd4cec1,
        overlays: [
          { color: 0xe8e1d6, alpha: 0.14, x: 40, y: 13, width: 24, height: 14, ellipse: true },
        ],
        speckles: [
          { color: 0xb8b0a3, alpha: 0.06, x: 20, y: 30, radiusX: 6, radiusY: 4 },
        ],
      },
      {
        key: "sidewalk-3",
        baseColor: 0xe1dbd0,
        overlays: [
          { color: 0xc9c2b6, alpha: 0.12, x: 24, y: 18, width: 20, height: 17, ellipse: true },
        ],
        speckles: [
          { color: 0xffffff, alpha: 0.07, x: 42, y: 24, radiusX: 6, radiusY: 4 },
        ],
      },
    ],
    sand: [
      {
        key: "sand-1",
        baseColor: 0xe2cc96,
        overlays: [
          { color: 0xf2deb4, alpha: 0.17, x: 32, y: 16, width: 21, height: 10, ellipse: true },
        ],
        speckles: [
          { color: 0xfff0cc, alpha: 0.08, x: 16, y: 24, radiusX: 5, radiusY: 3 },
        ],
      },
      {
        key: "sand-2",
        baseColor: 0xd8c087,
        overlays: [
          { color: 0xf1daad, alpha: 0.16, x: 40, y: 14, width: 18, height: 9, ellipse: true },
        ],
        speckles: [
          { color: 0xc4a86a, alpha: 0.06, x: 20, y: 8, radiusX: 6, radiusY: 4 },
        ],
      },
      {
        key: "sand-3",
        baseColor: 0xe9d5a4,
        overlays: [
          { color: 0xf6e5c1, alpha: 0.17, x: 24, y: 20, width: 18, height: 8, ellipse: true },
        ],
        speckles: [
          { color: 0xfff2d2, alpha: 0.07, x: 44, y: 20, radiusX: 5, radiusY: 3 },
        ],
      },
    ],
  };

  const ISO_WIDTH = 64;
  const ISO_HEIGHT = 32;

  Object.values(groundTileDefinitions).forEach((variants) => {
    variants.forEach(({ key, baseColor, overlays, speckles = [] }) => {
      buildTexture(scene, key, ISO_WIDTH, ISO_HEIGHT, (graphics) => {
        drawGroundTileTexture(graphics, baseColor, overlays, speckles);
      });
    });
  });

  buildTexture(scene, "grass", ISO_WIDTH, ISO_HEIGHT, (graphics) => {
    drawGroundTileTexture(graphics, 0x75b977, groundTileDefinitions.grass[0].overlays);
  });

  buildTexture(scene, "road", ISO_WIDTH, ISO_HEIGHT, (graphics) => {
    drawGroundTileTexture(graphics, 0xc7ab74, groundTileDefinitions.road[0].overlays);
  });

  buildTexture(scene, "asphalt", ISO_WIDTH, ISO_HEIGHT, (graphics) => {
    drawGroundTileTexture(graphics, 0x6f7982, groundTileDefinitions.asphalt[0].overlays);
  });

  buildTexture(scene, "sidewalk", ISO_WIDTH, ISO_HEIGHT, (graphics) => {
    drawGroundTileTexture(graphics, 0xded8cc, groundTileDefinitions.sidewalk[0].overlays);
  });

  buildTexture(scene, "sand", ISO_WIDTH, ISO_HEIGHT, (graphics) => {
    drawGroundTileTexture(graphics, 0xe2cc96, groundTileDefinitions.sand[0].overlays);
  });

  buildTexture(scene, "iso-shadow", 32, 16, (graphics) => {
    graphics.fillStyle(0x000000, 0.25);
    graphics.fillEllipse(16, 8, 16, 8);
  });

  buildTexture(scene, "player", 32, 40, (graphics) => {
    drawAvatarBodyTexture(graphics);
    drawAvatarBottomTexture(graphics, 0x244764, 0x9ac2e6, "pants");
    drawAvatarTopTexture(graphics, 0x63b8f1, 0xdff6ff, "shirt");
    drawAvatarHairTexture(graphics, 0x385163, "short");
  });

  buildTexture(scene, "avatar-body", 32, 40, (graphics) => {
    drawAvatarBodyTexture(graphics);
  });

  buildTexture(scene, "avatar-face", 32, 40, (graphics) => {
    drawAvatarFaceTexture(graphics);
  });

  buildTexture(scene, "avatar-hair-short", 32, 40, (graphics) => {
    drawAvatarHairTexture(graphics, 0x3a5364, "short");
  });

  buildTexture(scene, "avatar-hair-spiky", 32, 40, (graphics) => {
    drawAvatarHairTexture(graphics, 0x7a5435, "spiky");
  });

  buildTexture(scene, "avatar-hair-bob", 32, 40, (graphics) => {
    drawAvatarHairTexture(graphics, 0x64429a, "bob");
  });

  buildTexture(scene, "avatar-hair-soft-wave", 32, 40, (graphics) => {
    drawAvatarHairTexture(graphics, 0x8c5c44, "soft-wave");
  });

  buildTexture(scene, "avatar-hair-short-bob", 32, 40, (graphics) => {
    drawAvatarHairTexture(graphics, 0x2f2a4f, "short-bob");
  });

  buildTexture(scene, "avatar-top-blue", 32, 40, (graphics) => {
    drawAvatarTopTexture(graphics, 0x63b8f1, 0xdff6ff, "shirt");
  });

  buildTexture(scene, "avatar-top-green", 32, 40, (graphics) => {
    drawAvatarTopTexture(graphics, 0x71c68d, 0xe7fff0, "shirt");
  });

  buildTexture(scene, "avatar-top-red", 32, 40, (graphics) => {
    drawAvatarTopTexture(graphics, 0xd97c72, 0xffe8de, "shirt");
  });

  buildTexture(scene, "avatar-top-striped-sweater", 32, 40, (graphics) => {
    drawAvatarTopTexture(graphics, 0x8e97dc, 0xfff2d1, "striped-sweater");
  });

  buildTexture(scene, "avatar-top-cafe-apron", 32, 40, (graphics) => {
    drawAvatarTopTexture(graphics, 0x7cc4ad, 0xeedfc1, "cafe-apron");
  });

  buildTexture(scene, "avatar-bottom-navy", 32, 40, (graphics) => {
    drawAvatarBottomTexture(graphics, 0x244764, 0xa3c5e6, "pants");
  });

  buildTexture(scene, "avatar-bottom-brown", 32, 40, (graphics) => {
    drawAvatarBottomTexture(graphics, 0x8f633d, 0xf1d3a0, "pants");
  });

  buildTexture(scene, "avatar-bottom-black", 32, 40, (graphics) => {
    drawAvatarBottomTexture(graphics, 0x28303a, 0x8691a0, "pants");
  });

  buildTexture(scene, "avatar-bottom-denim-shorts", 32, 40, (graphics) => {
    drawAvatarBottomTexture(graphics, 0x4f84c5, 0xbfe0ff, "denim-shorts");
  });

  buildTexture(scene, "avatar-bottom-soft-skirt", 32, 40, (graphics) => {
    drawAvatarBottomTexture(graphics, 0xd790b1, 0xffd9e7, "soft-skirt");
  });

  buildTexture(scene, "avatar-accessory-none", 32, 40, () => {});

  buildTexture(scene, "avatar-accessory-glasses", 32, 40, (graphics) => {
    drawAvatarAccessoryTexture(graphics, "glasses");
  });

  buildTexture(scene, "avatar-accessory-flower", 32, 40, (graphics) => {
    drawAvatarAccessoryTexture(graphics, "flower");
  });

  buildTexture(scene, "avatar-accessory-straw-hat", 32, 40, (graphics) => {
    drawAvatarAccessoryTexture(graphics, "straw-hat");
  });

  buildTexture(scene, "avatar-accessory-mini-backpack", 32, 40, (graphics) => {
    drawAvatarAccessoryTexture(graphics, "mini-backpack");
  });

  buildTexture(scene, "npc", 32, 40, (graphics) => {
    graphics.fillStyle(0x1b2630, 0.95);
    graphics.fillCircle(16, 9, 9);
    graphics.fillRoundedRect(7, 13, 18, 20, 6);
    graphics.fillStyle(0xf2c196, 1);
    graphics.fillCircle(16, 9, 8);
    graphics.fillStyle(0x2a3742, 0.96);
    graphics.fillCircle(13.2, 9, 1.1);
    graphics.fillCircle(18.8, 9, 1.1);
    graphics.lineStyle(1.5, 0x8f5547, 0.92);
    graphics.beginPath();
    graphics.arc(16, 12.2, 2.2, Phaser.Math.DegToRad(18), Phaser.Math.DegToRad(160), false);
    graphics.strokePath();
    graphics.fillStyle(0x41295d, 1);
    graphics.fillRoundedRect(8, 3, 16, 6, 4);
    graphics.fillStyle(0x7d63c7, 1);
    graphics.fillRoundedRect(7, 14, 18, 15, 5);
    graphics.fillStyle(0xffffff, 0.18);
    graphics.fillRoundedRect(10, 16, 12, 3, 2);
    graphics.fillStyle(0x4f2f86, 1);
    graphics.fillRoundedRect(8, 29, 6, 9, 2);
    graphics.fillRoundedRect(18, 29, 6, 9, 2);
    strokeCircle(graphics, 16, 9, 8, 0x223644, 0.95, 2);
    strokeRoundedRect(graphics, 7, 14, 18, 15, 5, 0x223644, 0.95, 2);
  });

  buildTexture(scene, "house", 96, 96, (graphics) => {
    graphics.fillStyle(0x5d3a23, 1);
    graphics.fillRoundedRect(11, 33, 74, 50, 10);
    graphics.fillStyle(0x8f5a38, 1);
    graphics.fillRoundedRect(15, 37, 66, 39, 8);
    graphics.fillStyle(0xe3b988, 0.16);
    graphics.fillRoundedRect(18, 40, 60, 8, 4);
    graphics.fillStyle(0xc76843, 1);
    graphics.fillTriangle(8, 40, 48, 10, 88, 40);
    graphics.fillStyle(0x9b3e30, 1);
    graphics.fillTriangle(15, 37, 48, 16, 81, 37);
    graphics.fillStyle(0x7e3027, 0.24);
    graphics.fillRect(16, 37, 64, 3);
    drawWindowGlow(graphics, 22, 48, 16, 16);
    drawWindowGlow(graphics, 58, 48, 16, 16);
    graphics.fillStyle(0x4a2f1d, 1);
    graphics.fillRoundedRect(41, 53, 14, 30, 4);
    graphics.fillStyle(0xf1bc56, 0.55);
    graphics.fillRoundedRect(45, 60, 6, 10, 2);
    graphics.lineStyle(2, 0x2d1b12, 0.9);
    graphics.strokeRoundedRect(11, 33, 74, 50, 10);
  });

  buildTexture(scene, "storefrontRed", 96, 96, (graphics) => {
    graphics.fillStyle(0xbc4f4b, 1);
    graphics.fillRoundedRect(10, 28, 76, 54, 10);
    graphics.fillStyle(0xe8918b, 1);
    graphics.fillRoundedRect(16, 34, 64, 18, 5);
    graphics.fillStyle(0x6a2330, 1);
    graphics.fillRoundedRect(0, 18, 96, 10, 4);
    graphics.fillStyle(0xffffff, 0.18);
    graphics.fillRoundedRect(10, 18, 76, 3, 2);
    drawWindowGlow(graphics, 20, 54, 16, 18, 0xd8efff);
    drawWindowGlow(graphics, 40, 54, 16, 18, 0xd8efff);
    graphics.fillStyle(0x4a2f1d, 1);
    graphics.fillRoundedRect(63, 49, 12, 33, 3);
    graphics.fillStyle(0xf4d8ae, 0.85);
    graphics.fillCircle(69, 65, 1.8);
    strokeRoundedRect(graphics, 10, 28, 76, 54, 10, 0x3f1f23, 0.7, 2);
  });

  buildTexture(scene, "storefrontBlue", 96, 96, (graphics) => {
    graphics.fillStyle(0x257b9d, 1);
    graphics.fillRoundedRect(10, 28, 76, 54, 10);
    graphics.fillStyle(0x74c3e4, 1);
    graphics.fillRoundedRect(14, 36, 68, 16, 4);
    graphics.fillStyle(0x173449, 1);
    graphics.fillRoundedRect(8, 18, 80, 12, 4);
    graphics.fillStyle(0xffffff, 0.18);
    graphics.fillRoundedRect(12, 20, 64, 3, 2);
    drawWindowGlow(graphics, 20, 55, 20, 16, 0xcfeeff);
    drawWindowGlow(graphics, 44, 55, 20, 16, 0xcfeeff);
    graphics.fillStyle(0x244764, 1);
    graphics.fillRoundedRect(68, 48, 12, 34, 3);
    graphics.fillStyle(0xf4d8ae, 0.85);
    graphics.fillCircle(74, 65, 1.8);
    strokeRoundedRect(graphics, 10, 28, 76, 54, 10, 0x173449, 0.72, 2);
  });

  buildTexture(scene, "storefrontCafe", 96, 96, (graphics) => {
    graphics.fillStyle(0x73442f, 1);
    graphics.fillRoundedRect(10, 28, 76, 54, 10);
    graphics.fillStyle(0xb56f48, 1);
    graphics.fillRoundedRect(14, 34, 68, 18, 4);
    graphics.fillStyle(0x2b211a, 1);
    graphics.fillRoundedRect(8, 18, 80, 11, 4);
    graphics.fillStyle(0xf3f0d8, 1);
    for (let index = 0; index < 6; index += 1) {
      graphics.fillRoundedRect(14 + index * 11, 54, 6, 16, 2);
    }
    graphics.fillStyle(0x9d2735, 1);
    graphics.fillRoundedRect(12, 52, 72, 4, 2);
    graphics.fillRoundedRect(12, 60, 72, 4, 2);
    graphics.fillStyle(0x4a2f1d, 1);
    graphics.fillRoundedRect(42, 48, 12, 34, 3);
    graphics.fillStyle(0xf2c27a, 0.22);
    graphics.fillRoundedRect(16, 55, 36, 10, 3);
    strokeRoundedRect(graphics, 10, 28, 76, 54, 10, 0x2b211a, 0.76, 2);
  });

  buildTexture(scene, "storefrontBrown", 96, 96, (graphics) => {
    graphics.fillStyle(0x845d3f, 1);
    graphics.fillRoundedRect(10, 28, 76, 54, 10);
    graphics.fillStyle(0xbf9a70, 1);
    graphics.fillRoundedRect(16, 35, 64, 16, 4);
    graphics.fillStyle(0x5f3b22, 1);
    graphics.fillRoundedRect(8, 18, 80, 12, 4);
    drawWindowGlow(graphics, 18, 56, 18, 14, 0xe7efe5);
    drawWindowGlow(graphics, 40, 56, 18, 14, 0xe7efe5);
    graphics.fillStyle(0x4a2f1d, 1);
    graphics.fillRoundedRect(64, 50, 12, 32, 3);
    graphics.fillStyle(0xf4d8ae, 0.85);
    graphics.fillCircle(70, 66, 1.8);
    strokeRoundedRect(graphics, 10, 28, 76, 54, 10, 0x3b2719, 0.72, 2);
  });

  buildTexture(scene, "tree", 64, 80, (graphics) => {
    graphics.fillStyle(0x5f3b22, 1);
    graphics.fillRect(28, 50, 8, 22);
    graphics.fillStyle(0x214f31, 1);
    graphics.fillCircle(31, 44, 18);
    graphics.fillStyle(0x2f7245, 1);
    graphics.fillCircle(21, 30, 16);
    graphics.fillCircle(43, 30, 16);
    graphics.fillCircle(31, 20, 18);
    graphics.fillStyle(0x4da266, 1);
    graphics.fillCircle(25, 24, 8);
    graphics.fillCircle(40, 26, 7);
    graphics.fillCircle(31, 38, 9);
    graphics.fillStyle(0xb4e4ba, 0.15);
    graphics.fillCircle(24, 22, 6);
    graphics.fillCircle(37, 26, 5);
    graphics.fillCircle(31, 36, 6);
  });

  buildTexture(scene, "fountain", 80, 80, (graphics) => {
    graphics.fillStyle(0x6e7f8f, 1);
    graphics.fillCircle(40, 40, 24);
    graphics.fillStyle(0x556673, 1);
    graphics.fillCircle(40, 40, 18);
    graphics.fillStyle(0x82d6ff, 1);
    graphics.fillCircle(40, 40, 16);
    graphics.fillStyle(0xeaf7ff, 1);
    graphics.fillRect(37, 18, 6, 22);
    graphics.fillRect(31, 24, 18, 4);
    graphics.fillStyle(0xffffff, 0.4);
    graphics.fillCircle(34, 39, 3);
    graphics.fillCircle(46, 43, 2);
  });

  buildTexture(scene, "pickupCoin", 24, 24, (graphics) => {
    graphics.fillStyle(0xf7cf5d, 1);
    graphics.fillCircle(12, 12, 10);
    graphics.lineStyle(2, 0xfff3b0, 0.9);
    graphics.strokeCircle(12, 12, 9);
    graphics.lineStyle(1, 0xb1820b, 0.9);
    graphics.strokeCircle(12, 12, 5);
  });

  buildTexture(scene, "pickupKey", 28, 24, (graphics) => {
    graphics.fillStyle(0xf2dca1, 1);
    graphics.fillCircle(9, 12, 6);
    graphics.fillRect(12, 10, 11, 4);
    graphics.fillRect(20, 8, 3, 3);
    graphics.fillRect(20, 13, 3, 3);
  });

  buildTexture(scene, "pickupGiftBox", 26, 26, (graphics) => {
    graphics.fillStyle(0xd85f73, 1);
    graphics.fillRect(4, 6, 18, 16);
    graphics.fillStyle(0xffd99d, 1);
    graphics.fillRect(11, 6, 4, 16);
    graphics.fillRect(4, 12, 18, 4);
    graphics.fillCircle(10, 6, 4);
    graphics.fillCircle(16, 6, 4);
  });

  buildTexture(scene, "rockSmall", 22, 16, (graphics) => {
    graphics.fillStyle(0x869099, 1);
    graphics.fillEllipse(11, 9, 18, 11);
    graphics.fillStyle(0xb0b8bf, 0.55);
    graphics.fillEllipse(8, 7, 7, 4);
    graphics.lineStyle(2, 0x5d6871, 0.9);
    graphics.strokeEllipse(11, 9, 18, 11);
  });

  buildTexture(scene, "flowerPatch", 24, 20, (graphics) => {
    graphics.fillStyle(0x3b8d58, 1);
    graphics.fillRect(6, 10, 2, 7);
    graphics.fillRect(11, 9, 2, 8);
    graphics.fillRect(16, 10, 2, 7);
    graphics.fillStyle(0xffd99d, 1);
    graphics.fillCircle(7, 9, 3);
    graphics.fillCircle(12, 8, 3);
    graphics.fillStyle(0xff93ba, 1);
    graphics.fillCircle(17, 9, 3);
  });

  buildTexture(scene, "grassPatch", 26, 16, (graphics) => {
    graphics.fillStyle(0x4b9a56, 1);
    graphics.fillTriangle(3, 14, 7, 4, 10, 14);
    graphics.fillTriangle(8, 14, 13, 2, 17, 14);
    graphics.fillTriangle(14, 14, 19, 5, 23, 14);
    graphics.fillStyle(0x7fc97d, 0.7);
    graphics.fillTriangle(6, 14, 9, 7, 12, 14);
    graphics.fillTriangle(15, 14, 18, 7, 21, 14);
  });

  buildTexture(scene, "dirtSpot", 24, 18, (graphics) => {
    graphics.fillStyle(0xb28f62, 0.5);
    graphics.fillEllipse(12, 10, 18, 10);
    graphics.fillStyle(0x8f7048, 0.24);
    graphics.fillEllipse(10, 10, 10, 6);
    graphics.fillEllipse(17, 9, 7, 5);
  });

  buildTexture(scene, "roadsidePebble", 18, 12, (graphics) => {
    graphics.fillStyle(0x8f989f, 0.95);
    graphics.fillEllipse(6, 7, 6, 4);
    graphics.fillEllipse(12, 5, 5, 3);
    graphics.fillStyle(0xbac1c6, 0.45);
    graphics.fillEllipse(5, 6, 3, 2);
  });

  buildTexture(scene, "roadsideWeed", 18, 16, (graphics) => {
    graphics.fillStyle(0x4d9d58, 0.95);
    graphics.fillTriangle(4, 14, 7, 5, 9, 14);
    graphics.fillTriangle(7, 14, 10, 2, 13, 14);
    graphics.fillTriangle(10, 14, 13, 6, 15, 14);
    graphics.fillStyle(0x89c98a, 0.55);
    graphics.fillTriangle(8, 14, 10, 7, 12, 14);
  });

  buildTexture(scene, "chestClosed", 36, 28, (graphics) => {
    graphics.fillStyle(0x7f4e2d, 1);
    graphics.fillRoundedRect(4, 8, 28, 16, 4);
    graphics.fillStyle(0xc88a43, 1);
    graphics.fillRoundedRect(4, 6, 28, 8, 4);
    graphics.fillStyle(0x3b2414, 1);
    graphics.fillRect(16, 11, 4, 9);
  });

  buildTexture(scene, "chestOpen", 36, 28, (graphics) => {
    graphics.fillStyle(0x7f4e2d, 1);
    graphics.fillRoundedRect(4, 12, 28, 12, 4);
    graphics.fillStyle(0xd8a64f, 1);
    graphics.fillTriangle(4, 13, 18, 2, 32, 13);
    graphics.fillStyle(0xffe7a3, 1);
    graphics.fillRect(13, 10, 10, 6);
  });

  buildTexture(scene, "cloud", 128, 64, (graphics) => {
    graphics.fillStyle(0xf8fbff, 0.92);
    graphics.fillCircle(34, 34, 18);
    graphics.fillCircle(56, 24, 22);
    graphics.fillCircle(82, 28, 20);
    graphics.fillCircle(98, 38, 15);
    graphics.fillRoundedRect(22, 28, 82, 24, 12);
  });

  buildTexture(scene, "furnitureChair", 48, 48, (graphics) => {
    graphics.fillStyle(0x7a5130, 1);
    graphics.fillRect(16, 10, 16, 10);
    graphics.fillRect(14, 20, 20, 6);
    graphics.fillRect(14, 26, 4, 14);
    graphics.fillRect(30, 26, 4, 14);
    graphics.fillRect(18, 6, 4, 14);
    graphics.fillRect(26, 6, 4, 14);
  });

  buildTexture(scene, "furnitureTable", 96, 48, (graphics) => {
    graphics.fillStyle(0x8b5e34, 1);
    graphics.fillRoundedRect(8, 14, 80, 14, 5);
    graphics.fillRect(16, 28, 6, 14);
    graphics.fillRect(74, 28, 6, 14);
    graphics.fillStyle(0xb07a45, 1);
    graphics.fillRect(12, 18, 72, 4);
  });

  buildTexture(scene, "furnitureLamp", 48, 48, (graphics) => {
    graphics.fillStyle(0x556673, 1);
    graphics.fillRect(21, 16, 6, 18);
    graphics.fillStyle(0xffd99d, 1);
    graphics.fillTriangle(12, 18, 24, 6, 36, 18);
    graphics.fillStyle(0x6f4a2c, 1);
    graphics.fillRect(16, 34, 16, 6);
  });

  buildTexture(scene, "furniturePlant", 48, 48, (graphics) => {
    graphics.fillStyle(0x925736, 1);
    graphics.fillRoundedRect(15, 26, 18, 10, 3);
    graphics.fillStyle(0x2f7245, 1);
    graphics.fillCircle(18, 20, 7);
    graphics.fillCircle(30, 18, 8);
    graphics.fillCircle(24, 12, 8);
  });

  buildTexture(scene, "furniturePoster", 48, 48, (graphics) => {
    graphics.fillStyle(0xf2e6c9, 1);
    graphics.fillRect(10, 8, 28, 32);
    graphics.lineStyle(2, 0x173449, 0.9);
    graphics.strokeRect(10, 8, 28, 32);
    graphics.fillStyle(0x72c8ff, 1);
    graphics.fillRect(14, 14, 20, 10);
    graphics.fillStyle(0x8fe3a8, 1);
    graphics.fillRect(14, 26, 20, 8);
  });

  buildTexture(scene, "cafeCounter", 120, 56, (graphics) => {
    graphics.fillStyle(0x754831, 1);
    graphics.fillRoundedRect(8, 20, 104, 28, 8);
    graphics.fillStyle(0xc18b55, 1);
    graphics.fillRoundedRect(12, 14, 96, 12, 7);
    graphics.fillStyle(0xf2e6c9, 1);
    graphics.fillCircle(28, 18, 6);
    graphics.fillCircle(46, 18, 6);
    graphics.fillCircle(64, 18, 6);
    graphics.fillStyle(0x7cc4ad, 1);
    graphics.fillRect(78, 10, 20, 10);
  });

  buildTexture(scene, "clothingRack", 72, 64, (graphics) => {
    graphics.fillStyle(0x455967, 1);
    graphics.fillRect(18, 10, 4, 40);
    graphics.fillRect(50, 10, 4, 40);
    graphics.fillRect(16, 10, 40, 4);
    graphics.fillStyle(0xd97c72, 1);
    graphics.fillRoundedRect(20, 18, 10, 18, 4);
    graphics.fillStyle(0x71c68d, 1);
    graphics.fillRoundedRect(31, 18, 10, 18, 4);
    graphics.fillStyle(0x8e97dc, 1);
    graphics.fillRoundedRect(42, 18, 10, 18, 4);
    graphics.fillStyle(0x455967, 1);
    graphics.fillRect(14, 48, 12, 4);
    graphics.fillRect(46, 48, 12, 4);
  });

  buildTexture(scene, "displayShelf", 84, 64, (graphics) => {
    graphics.fillStyle(0x6f4a2c, 1);
    graphics.fillRoundedRect(8, 8, 68, 48, 6);
    graphics.fillStyle(0xb07a45, 1);
    graphics.fillRect(12, 20, 60, 4);
    graphics.fillRect(12, 34, 60, 4);
    graphics.fillStyle(0xf3f0d8, 1);
    graphics.fillRect(16, 12, 10, 6);
    graphics.fillRect(34, 12, 10, 6);
    graphics.fillRect(52, 12, 10, 6);
    graphics.fillStyle(0x72c8ff, 1);
    graphics.fillRect(18, 26, 8, 6);
    graphics.fillRect(38, 26, 8, 6);
    graphics.fillStyle(0x8fe3a8, 1);
    graphics.fillRect(24, 40, 10, 7);
    graphics.fillRect(48, 40, 10, 7);
  });

  buildTexture(scene, "welcomeMat", 64, 28, (graphics) => {
    graphics.fillStyle(0x8f3f3d, 1);
    graphics.fillRoundedRect(6, 6, 52, 16, 8);
    graphics.lineStyle(2, 0xf4d8ae, 0.85);
    graphics.strokeRoundedRect(8, 8, 48, 12, 6);
  });

  buildTexture(scene, "streetLamp", 48, 72, (graphics) => {
    graphics.fillStyle(0x31424f, 1);
    graphics.fillRect(21, 12, 6, 46);
    graphics.fillRect(16, 56, 16, 6);
    graphics.fillRect(24, 10, 10, 4);
    graphics.fillStyle(0xffd99d, 0.9);
    graphics.fillRoundedRect(26, 12, 10, 12, 3);
    graphics.lineStyle(2, 0x1a252e, 0.95);
    graphics.strokeRoundedRect(26, 12, 10, 12, 3);
  });

  buildTexture(scene, "bench", 56, 40, (graphics) => {
    graphics.fillStyle(0x915b32, 1);
    graphics.fillRect(10, 14, 36, 6);
    graphics.fillRect(10, 22, 36, 5);
    graphics.fillStyle(0x5c3b22, 1);
    graphics.fillRect(14, 26, 4, 10);
    graphics.fillRect(38, 26, 4, 10);
  });

  buildTexture(scene, "signpost", 52, 64, (graphics) => {
    graphics.fillStyle(0x4a5f72, 1);
    graphics.fillRect(23, 16, 6, 38);
    graphics.fillStyle(0x2c79b7, 1);
    graphics.fillRoundedRect(6, 12, 22, 8, 3);
    graphics.fillRoundedRect(24, 22, 22, 8, 3);
    graphics.fillRoundedRect(12, 32, 22, 8, 3);
    graphics.lineStyle(2, 0xf1f6fb, 0.95);
    graphics.strokeRoundedRect(6, 12, 22, 8, 3);
    graphics.strokeRoundedRect(24, 22, 22, 8, 3);
    graphics.strokeRoundedRect(12, 32, 22, 8, 3);
  });

  buildTexture(scene, "palmTree", 72, 88, (graphics) => {
    graphics.fillStyle(0x7f5735, 1);
    graphics.fillRect(33, 46, 8, 28);
    graphics.fillStyle(0x2f8a57, 1);
    graphics.fillTriangle(36, 18, 8, 34, 30, 32);
    graphics.fillTriangle(36, 18, 64, 30, 41, 33);
    graphics.fillTriangle(36, 20, 16, 18, 32, 36);
    graphics.fillTriangle(36, 20, 56, 16, 40, 36);
    graphics.fillTriangle(36, 22, 12, 44, 36, 36);
    graphics.fillTriangle(36, 22, 60, 42, 36, 36);
  });

  buildTexture(scene, "beachUmbrella", 56, 56, (graphics) => {
    graphics.fillStyle(0xd94f5c, 1);
    graphics.fillTriangle(10, 22, 28, 8, 28, 22);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillTriangle(28, 8, 46, 22, 28, 22);
    graphics.fillStyle(0x6a5332, 1);
    graphics.fillRect(26, 22, 4, 20);
    graphics.fillRect(18, 40, 20, 4);
  });

  buildTexture(scene, "smallBoat", 88, 40, (graphics) => {
    graphics.fillStyle(0x8d402c, 1);
    graphics.fillTriangle(8, 26, 80, 26, 68, 34);
    graphics.fillTriangle(8, 26, 20, 34, 80, 26);
    graphics.fillStyle(0xf7f1dd, 1);
    graphics.fillTriangle(42, 6, 42, 24, 62, 24);
    graphics.fillStyle(0x4a2f1d, 1);
    graphics.fillRect(40, 10, 3, 18);
  });
}
