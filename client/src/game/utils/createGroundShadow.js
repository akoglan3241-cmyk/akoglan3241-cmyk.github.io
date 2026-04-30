export function createGroundShadow(scene, x = 0, y = 0, options = {}) {
  const {
    width = 24,
    height = 10,
    alpha = 0.24,
    color = 0x000000,
    depth = 0,
    layers = [
      { widthScale: 1.35, heightScale: 1.45, alphaScale: 0.18 },
      { widthScale: 1.12, heightScale: 1.18, alphaScale: 0.34 },
      { widthScale: 1, heightScale: 1, alphaScale: 0.48 },
    ],
  } = options;

  const shadowLayers = layers.map((layer) =>
    scene.add.ellipse(
      0,
      0,
      width * (layer.widthScale ?? 1),
      height * (layer.heightScale ?? 1),
      color,
      alpha * (layer.alphaScale ?? 1),
    ),
  );

  return scene.add.container(x, y, shadowLayers).setDepth(depth);
}

export function updateGroundShadow(shadow, options = {}) {
  if (!shadow) {
    return;
  }

  if (options.x !== undefined || options.y !== undefined) {
    shadow.setPosition(options.x ?? shadow.x, options.y ?? shadow.y);
  }

  if (options.scaleX !== undefined || options.scaleY !== undefined) {
    shadow.setScale(options.scaleX ?? shadow.scaleX, options.scaleY ?? shadow.scaleY);
  }

  if (options.alpha !== undefined) {
    shadow.setAlpha(options.alpha);
  }

  if (options.depth !== undefined) {
    shadow.setDepth(options.depth);
  }
}
