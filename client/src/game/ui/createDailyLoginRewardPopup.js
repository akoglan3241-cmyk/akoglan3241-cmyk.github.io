import { getItemDefinition } from "../content/itemContent.js";
import { createPanel } from "./createPanel.js";

export function createDailyLoginRewardPopup(scene) {
  const container = scene.add.container(0, 0).setScrollFactor(0).setDepth(2300).setVisible(false);
  let performanceMode = false;
  const frame = createPanel(scene, {
    x: 640,
    y: 220,
    width: 420,
    height: 220,
    fillColor: 0x07131d,
    fillAlpha: 0.97,
    strokeColor: 0xffd99d,
    strokeAlpha: 0.24,
    scrollFactor: 0,
  });
  const title = scene.add.text(640, 146, "Daily Login Reward", {
    fontFamily: "Georgia",
    fontSize: "26px",
    fontStyle: "bold",
    color: "#fff4db",
  }).setOrigin(0.5).setScrollFactor(0);
  const streakText = scene.add.text(640, 182, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "16px",
    color: "#ffd99d",
  }).setOrigin(0.5).setScrollFactor(0);
  const rewardText = scene.add.text(640, 228, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "15px",
    color: "#d8edf9",
    align: "center",
    wordWrap: { width: 320 },
    lineSpacing: 6,
  }).setOrigin(0.5).setScrollFactor(0);
  const hintText = scene.add.text(640, 292, "Devam etmek icin tikla veya Esc", {
    fontFamily: "Trebuchet MS",
    fontSize: "13px",
    color: "#9bd3ff",
  }).setOrigin(0.5).setScrollFactor(0);

  container.add([frame, title, streakText, rewardText, hintText]);

  let dismissHandler = null;

  function close() {
    if (!container.visible) {
      return;
    }

    dismissHandler?.();
    dismissHandler = null;
    container.setVisible(false);
  }

  return {
    show(payload) {
      if (!payload) {
        return;
      }

      const itemLines = (payload.rewards?.items ?? []).map((entry) => {
        const item = getItemDefinition(entry.itemId);
        return `${entry.amount}x ${item?.label ?? entry.itemId}`;
      });
      const lines = [
        payload.rewards?.coins ? `+${payload.rewards.coins} coin` : null,
        payload.rewards?.xp ? `+${payload.rewards.xp} XP` : null,
        ...itemLines,
      ].filter(Boolean);

      streakText.setText(`Gun ${payload.rewardDay} odulu | Seri: ${payload.streakCount}`);
      rewardText.setText(`${lines.join("\n") || "Bugun icin odul hazir."}\nMailbox panelinden claim et.`);
      container.setAlpha(1);
      container.setVisible(true);
      scene.tweens.killTweensOf(container);

      dismissHandler?.();
      const pointerHandler = () => close();
      const keyHandler = (event) => {
        if (event?.keyCode === 27) {
          close();
        }
      };

      scene.input.once("pointerdown", pointerHandler);
      scene.input.keyboard.once("keydown", keyHandler);
      dismissHandler = () => {
        scene.input.off("pointerdown", pointerHandler);
        scene.input.keyboard.off("keydown", keyHandler);
      };
    },
    close,
    setPerformanceMode(nextPerformanceMode) {
      performanceMode = Boolean(nextPerformanceMode);
      if (performanceMode) {
        scene.tweens.killTweensOf(container);
      }
    },
  };
}
