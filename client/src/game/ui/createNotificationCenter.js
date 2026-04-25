import { createPanel } from "./createPanel.js";

const NOTIFICATION_STYLES = {
  success: { accent: 0xb8f2c8, fill: 0x0f2a1f, text: "#eafff1" },
  error: { accent: 0xff9a8b, fill: 0x341717, text: "#fff1ee" },
  warning: { accent: 0xffd99d, fill: 0x3a2a12, text: "#fff7ea" },
  info: { accent: 0x9bd3ff, fill: 0x143247, text: "#eff8ff" },
};

export function createNotificationCenter(scene) {
  const queue = [];
  let isShowing = false;
  let performanceMode = false;

  const panel = createPanel(scene, {
    x: 640,
    y: 48,
    width: 446,
    height: 60,
    radius: 18,
    fillColor: NOTIFICATION_STYLES.info.fill,
    fillAlpha: 0.95,
    strokeColor: NOTIFICATION_STYLES.info.accent,
    strokeAlpha: 0.3,
    scrollFactor: 0,
  }).setVisible(false).setDepth(3000);

  const accentBar = scene.add.rectangle(426, 48, 9, 42, NOTIFICATION_STYLES.info.accent, 1).setScrollFactor(0).setVisible(false).setDepth(3001);
  const text = scene.add
    .text(446, 48, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "15px",
      fontStyle: "bold",
      color: NOTIFICATION_STYLES.info.text,
      wordWrap: { width: 380 },
    })
    .setOrigin(0, 0.5)
    .setScrollFactor(0)
    .setVisible(false)
    .setDepth(3001);

  function redraw(type) {
    const style = NOTIFICATION_STYLES[type] ?? NOTIFICATION_STYLES.info;
    panel.clear();
    panel.fillStyle(style.fill, 0.95);
    panel.fillRoundedRect(417, 18, 446, 60, 18);
    panel.fillStyle(0xffffff, 0.04);
    panel.fillRoundedRect(421, 22, 438, 18, 14);
    panel.lineStyle(2, style.accent, 0.3);
    panel.strokeRoundedRect(417, 18, 446, 60, 18);
    accentBar.setFillStyle(style.accent, 1);
    text.setColor(style.text);
  }

  function showNext() {
    if (isShowing || !queue.length) {
      return;
    }

    isShowing = true;
    const entry = queue.shift();
    redraw(entry.type);
    panel.setVisible(true).setAlpha(0);
    accentBar.setVisible(true).setAlpha(0);
    text.setText(entry.message).setVisible(true).setAlpha(0);

    if (performanceMode) {
      panel.setAlpha(1);
      accentBar.setAlpha(1);
      text.setAlpha(1);
      scene.time.delayedCall(entry.duration ?? 2200, () => {
        panel.setVisible(false);
        accentBar.setVisible(false);
        text.setVisible(false);
        isShowing = false;
        showNext();
      });
      return;
    }

    scene.tweens.add({
      targets: [panel, accentBar, text],
      alpha: 1,
      duration: 140,
      onComplete: () => {
        scene.time.delayedCall(entry.duration ?? 2200, () => {
          scene.tweens.add({
            targets: [panel, accentBar, text],
            alpha: 0,
            duration: 220,
            onComplete: () => {
              panel.setVisible(false);
              accentBar.setVisible(false);
              text.setVisible(false);
              isShowing = false;
              showNext();
            },
          });
        });
      },
    });
  }

  return {
    push({ type = "info", message, duration = 2200 } = {}) {
      if (!message) {
        return;
      }
      queue.push({ type, message, duration });
      showNext();
    },
    clear() {
      queue.splice(0, queue.length);
      isShowing = false;
      panel.setVisible(false);
      accentBar.setVisible(false);
      text.setVisible(false);
    },
    setPerformanceMode(nextPerformanceMode) {
      performanceMode = Boolean(nextPerformanceMode);
    },
  };
}
