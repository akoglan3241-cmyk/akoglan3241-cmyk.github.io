import { getItemRarityMeta } from "../content/itemContent.js";
import { createPanel } from "./createPanel.js";

export function createLootPopup(scene) {
  const container = scene.add.container(0, 0).setScrollFactor(0).setDepth(2200).setVisible(false);
  let performanceMode = false;
  const frame = createPanel(scene, {
    x: 1032,
    y: 472,
    width: 320,
    height: 200,
    fillColor: 0x07131d,
    fillAlpha: 0.96,
    strokeColor: 0xffd99d,
    strokeAlpha: 0.22,
    scrollFactor: 0,
  });
  const title = scene.add.text(892, 390, "Chest Loot", {
    fontFamily: "Georgia",
    fontSize: "22px",
    fontStyle: "bold",
    color: "#fff4db",
  }).setScrollFactor(0);

  const rows = Array.from({ length: 4 }, (_, index) => {
    const y = 432 + index * 34;
    const bullet = scene.add.circle(906, y + 8, 8, 0xc5d3df, 0.95).setScrollFactor(0);
    const text = scene.add.text(924, y, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      color: "#d8edf9",
    }).setScrollFactor(0);
    return { bullet, text };
  });

  container.add([frame, title, ...rows.flatMap((row) => [row.bullet, row.text])]);

  return {
    show(rewards = []) {
      rows.forEach((row, index) => {
        const reward = rewards[index] ?? null;
        row.bullet.setVisible(Boolean(reward));
        row.text.setVisible(Boolean(reward));

        if (!reward) {
          return;
        }

        const rarityMeta = getItemRarityMeta(reward.rarity);
        row.bullet.setFillStyle(rarityMeta.accent, 0.95);
        row.text.setColor(rarityMeta.color).setText(
          reward.kind === "cosmetic"
            ? `${reward.label} (${rarityMeta.label}) kozmetik`
            : `+${reward.amount} ${reward.label} (${rarityMeta.label})`,
        );
      });

      container.setVisible(true);
      container.setAlpha(1);
      scene.tweens.killTweensOf(container);
      if (performanceMode) {
        scene.time.delayedCall(1800, () => {
          container.setVisible(false);
        });
        return;
      }
      scene.tweens.add({
        targets: container,
        alpha: 0,
        duration: 2200,
        delay: 1800,
        onComplete: () => {
          container.setVisible(false);
        },
      });
    },
    setPerformanceMode(nextPerformanceMode) {
      performanceMode = Boolean(nextPerformanceMode);
    },
  };
}
