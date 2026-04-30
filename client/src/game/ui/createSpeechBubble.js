const BUBBLE_MAX_CHARACTERS = 44;
const BUBBLE_DEFAULT_DURATION_MS = 3200;

function truncateBubbleMessage(message) {
  const normalized = String(message ?? "").replace(/\s+/g, " ").trim();

  if (normalized.length <= BUBBLE_MAX_CHARACTERS) {
    return normalized;
  }

  return `${normalized.slice(0, BUBBLE_MAX_CHARACTERS - 1).trimEnd()}…`;
}

export function createSpeechBubble(scene, x, y) {
  const container = scene.add.container(x, y).setVisible(false);
  const background = scene.add.rectangle(0, 0, 80, 36, 0xfff4cf, 0.96).setStrokeStyle(2, 0x173449, 0.18);
  const text = scene.add
    .text(0, 0, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      color: "#173449",
      align: "center",
      wordWrap: { width: 140 },
    })
    .setOrigin(0.5);
  const pointer = scene.add.triangle(0, 0, 0, 0, 14, 0, 7, 10, 0xfff4cf, 0.96).setStrokeStyle(2, 0x173449, 0.18);

  container.add([background, text, pointer]);

  let hideTimer = null;
  let isEnabled = true;
  let performanceMode = false;

  function relayout() {
    const width = Math.max(72, text.width + 24);
    const height = Math.max(36, text.height + 16);
    background.setSize(width, height);
    background.setPosition(0, -height / 2);
    text.setPosition(0, -height / 2);
    pointer.setPosition(0, 10);
  }

  return {
    setPosition(nextX, nextY) {
      container.setPosition(nextX, nextY);
      container.setDepth(nextY + 80);
    },
    show(message, duration = BUBBLE_DEFAULT_DURATION_MS) {
      if (!isEnabled) {
        return;
      }
      text.setText(truncateBubbleMessage(message));
      relayout();
      container.setVisible(true);
      container.setAlpha(1);

      hideTimer?.remove(false);
      hideTimer = scene.time.delayedCall(duration, () => {
        if (performanceMode) {
          container.setVisible(false);
          container.setAlpha(1);
          return;
        }
        scene.tweens.add({
          targets: container,
          alpha: 0,
          duration: 220,
          onComplete: () => {
            container.setVisible(false);
            container.setAlpha(1);
          },
        });
      });
    },
    setEnabled(nextEnabled) {
      isEnabled = Boolean(nextEnabled);
      if (!isEnabled) {
        hideTimer?.remove(false);
        container.setVisible(false);
      }
    },
    setPerformanceMode(nextPerformanceMode) {
      performanceMode = Boolean(nextPerformanceMode);
    },
    destroy() {
      hideTimer?.remove(false);
      container.destroy();
    },
  };
}
