import { createPanel } from "./createPanel.js";

export function createRewardPopup(scene) {
  const queue = [];
  let active = false;
  let performanceMode = false;

  const container = scene.add.container(1032, 384).setScrollFactor(0).setDepth(2800).setVisible(false);
  const background = createPanel(scene, {
    x: 0,
    y: 0,
    width: 278,
    height: 74,
    radius: 18,
    fillColor: 0x0d2418,
    fillAlpha: 0.95,
    strokeColor: 0xb8f2c8,
    strokeAlpha: 0.24,
    scrollFactor: 0,
  });
  const title = scene.add
    .text(-120, -18, "Odul", {
      fontFamily: "Georgia",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#f7ffe8",
    })
    .setScrollFactor(0);
  const body = scene.add
    .text(-120, 8, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      color: "#dcffe5",
      wordWrap: { width: 222 },
    })
    .setScrollFactor(0);

  container.add([background, title, body]);

  function showNext() {
    if (active || queue.length === 0) {
      return;
    }

    active = true;
    const nextEntry = queue.shift();
    body.setText(nextEntry.message);
    container.setVisible(true).setAlpha(0).setY(384);

    if (performanceMode) {
      container.setAlpha(1);
      scene.time.delayedCall(1900, () => {
        container.setVisible(false);
        active = false;
        showNext();
      });
      return;
    }

    scene.tweens.add({
      targets: container,
      alpha: 1,
      y: 368,
      duration: 180,
      onComplete: () => {
        scene.time.delayedCall(1900, () => {
          scene.tweens.add({
            targets: container,
            alpha: 0,
            y: 350,
            duration: 220,
            onComplete: () => {
              container.setVisible(false);
              active = false;
              showNext();
            },
          });
        });
      },
    });
  }

  return {
    show(message) {
      if (!message) {
        return;
      }
      queue.push({ message });
      showNext();
    },
    setPerformanceMode(isPerformanceMode) {
      performanceMode = Boolean(isPerformanceMode);
    },
  };
}
