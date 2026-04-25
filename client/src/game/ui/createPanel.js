export function createPanel(
  scene,
  {
    x,
    y,
    width,
    height,
    radius = 26,
    fillColor = 0x0b1f2d,
    fillAlpha = 0.88,
    strokeColor = 0xffffff,
    strokeAlpha = 0.1,
    scrollFactor = 1,
  },
) {
  const panel = scene.add.graphics().setScrollFactor(scrollFactor);
  const left = x - width / 2;
  const top = y - height / 2;

  panel.fillStyle(0x000000, 0.14);
  panel.fillRoundedRect(left + 10, top + 14, width, height, radius + 2);
  panel.fillStyle(0x000000, 0.08);
  panel.fillRoundedRect(left + 4, top + 7, width, height, radius + 1);
  panel.fillStyle(fillColor, fillAlpha);
  panel.fillRoundedRect(left, top, width, height, radius);
  panel.fillStyle(0xffffff, 0.045);
  panel.fillRoundedRect(left + 1, top + 1, width - 2, height - 2, Math.max(12, radius - 2));
  panel.lineStyle(2, strokeColor, strokeAlpha);
  panel.strokeRoundedRect(left, top, width, height, radius);
  panel.fillStyle(0xffffff, 0.06);
  panel.fillRoundedRect(left + 2, top + 2, width - 4, Math.max(20, height * 0.2), Math.max(12, radius - 8));
  panel.fillStyle(0x031018, 0.1);
  panel.fillRoundedRect(left + 2, top + height - Math.max(22, height * 0.16) - 2, width - 4, Math.max(22, height * 0.16), Math.max(12, radius - 10));
  panel.lineStyle(1, 0xffffff, 0.05);
  panel.strokeRoundedRect(left + 4, top + 4, width - 8, height - 8, Math.max(10, radius - 6));
  panel.lineStyle(1, 0x000000, 0.12);
  panel.strokeRoundedRect(left + 1, top + 1, width - 2, height - 2, Math.max(12, radius - 2));

  return panel;
}
