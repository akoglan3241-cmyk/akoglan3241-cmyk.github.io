import { GAME_SIZE } from "../constants.js";
import { AVATAR_CATEGORIES } from "../avatar/avatarOptions.js";
import { getCosmeticLabel } from "../state/cosmeticsState.js";
import { createPanel } from "./createPanel.js";

export function createWardrobePanel(scene) {
  const container = scene.add.container(0, 0).setScrollFactor(0).setVisible(false).setDepth(2000);
  const overlay = scene.add.rectangle(0, 0, GAME_SIZE.width, GAME_SIZE.height, 0x031018, 0.6).setOrigin(0);
  const frame = createPanel(scene, {
    x: GAME_SIZE.width / 2,
    y: GAME_SIZE.height / 2,
    width: 560,
    height: 410,
    fillColor: 0x07131d,
    fillAlpha: 0.97,
    strokeColor: 0x9bd3ff,
    strokeAlpha: 0.22,
    scrollFactor: 0,
  });

  const title = scene.add.text(390, 182, "Wardrobe", {
    fontFamily: "Georgia",
    fontSize: "28px",
    fontStyle: "bold",
    color: "#fff4db",
  });

  const hint = scene.add.text(390, 216, "O ile kapat | sahip oldugun kozmetikleri degistir", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#9bd3ff",
  });

  const rows = AVATAR_CATEGORIES.map((category, index) => {
    const y = 294 + index * 58;
    const background = scene.add.rectangle(640, y, 430, 42, 0x102331, 0.96).setStrokeStyle(1, 0xffffff, 0.08);
    const label = scene.add.text(438, y - 12, category.label, {
      fontFamily: "Trebuchet MS",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#f4fbff",
    });
    const value = scene.add.text(438, y + 8, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      color: "#b7d8ec",
    });
    const button = scene.add.rectangle(805, y, 86, 30, 0xffd99d, 0.95).setInteractive({ useHandCursor: true });
    const buttonText = scene.add
      .text(805, y, "Degistir", {
        fontFamily: "Trebuchet MS",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#173449",
      })
      .setOrigin(0.5);

    return { category, background, label, value, button, buttonText };
  });

  let cycleHandler = null;

  rows.forEach((row) => {
    row.button.on("pointerdown", () => cycleHandler?.(row.category.key));
  });

  container.add([overlay, frame, title, hint, ...rows.flatMap((row) => [row.background, row.label, row.value, row.button, row.buttonText])]);

  return {
    setVisible(isVisible) {
      container.setVisible(isVisible);
    },
    isVisible() {
      return container.visible;
    },
    onCycle(handler) {
      cycleHandler = handler;
    },
    update(cosmeticsState) {
      rows.forEach((row) => {
        const equippedId = cosmeticsState?.equipped?.[row.category.key];
        const ownedCount = cosmeticsState?.owned?.[row.category.key]?.length ?? 0;
        row.value.setText(`${getCosmeticLabel(row.category.key, equippedId)} | Sahip: ${ownedCount}`);
      });
    },
  };
}
