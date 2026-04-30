import { createPanel } from "./createPanel.js";

export function createTutorialOverlay(scene, { onSkip } = {}) {
  const container = scene.add.container(244, 574).setScrollFactor(0).setDepth(2600).setVisible(false);
  const background = createPanel(scene, {
    x: 0,
    y: 0,
    width: 392,
    height: 136,
    radius: 20,
    fillColor: 0x081722,
    fillAlpha: 0.95,
    strokeColor: 0xffd99d,
    strokeAlpha: 0.24,
    scrollFactor: 0,
  });
  const eyebrow = scene.add
    .text(-170, -44, "Yeni Oyuncu Rehberi", {
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      fontStyle: "bold",
      color: "#ffd99d",
    })
    .setScrollFactor(0);
  const title = scene.add
    .text(-170, -20, "", {
      fontFamily: "Georgia",
      fontSize: "20px",
      fontStyle: "bold",
      color: "#fff4db",
      wordWrap: { width: 300 },
    })
    .setScrollFactor(0);
  const body = scene.add
    .text(-170, 12, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      color: "#d7ebf7",
      lineSpacing: 4,
      wordWrap: { width: 300 },
    })
    .setScrollFactor(0);
  const progress = scene.add
    .text(-170, 78, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      color: "#9bd3ff",
    })
    .setScrollFactor(0);
  const skipButtonBg = scene.add
    .rectangle(138, 80, 90, 28, 0x173449, 0.96)
    .setStrokeStyle(2, 0xffd99d, 0.18)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true });
  const skipButtonText = scene.add
    .text(138, 80, "Atla", {
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      fontStyle: "bold",
      color: "#fff4db",
    })
    .setOrigin(0.5)
    .setScrollFactor(0);

  skipButtonBg.on("pointerdown", () => {
    onSkip?.();
  });

  container.add([background, eyebrow, title, body, progress, skipButtonBg, skipButtonText]);

  return {
    show(step, progressText) {
      if (!step) {
        container.setVisible(false);
        return;
      }

      title.setText(step.title);
      body.setText(step.body);
      progress.setText(progressText);
      container.setVisible(true);
    },
    hide() {
      container.setVisible(false);
    },
    setHudVisible(isVisible) {
      container.setVisible(Boolean(isVisible));
    },
    setPerformanceMode(isPerformanceMode) {
      container.setAlpha(isPerformanceMode ? 0.98 : 1);
    },
  };
}
