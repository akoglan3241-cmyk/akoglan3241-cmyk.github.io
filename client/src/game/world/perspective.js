import Phaser from "phaser";

export function getPerspectiveScale(y, worldHeight, { min = 0.9, max = 1.08 } = {}) {
  const normalized = Phaser.Math.Clamp(Number(y ?? 0) / Math.max(1, Number(worldHeight ?? 1)), 0, 1);
  return Phaser.Math.Linear(min, max, normalized);
}
