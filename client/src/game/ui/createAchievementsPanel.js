import { GAME_SIZE } from "../constants.js";
import { createPanel } from "./createPanel.js";

export function createAchievementsPanel(scene) {
  const container = scene.add.container(0, 0).setScrollFactor(0).setVisible(false).setDepth(2050);
  const overlay = scene.add.rectangle(0, 0, GAME_SIZE.width, GAME_SIZE.height, 0x031018, 0.54).setOrigin(0);
  const frame = createPanel(scene, {
    x: 972,
    y: 380,
    width: 470,
    height: 470,
    fillColor: 0x07131d,
    fillAlpha: 0.96,
    strokeColor: 0xffe0a1,
    strokeAlpha: 0.18,
    scrollFactor: 0,
  });

  const title = scene.add.text(760, 166, "Achievements", {
    fontFamily: "Georgia",
    fontSize: "28px",
    fontStyle: "bold",
    color: "#fff4db",
  });

  const hint = scene.add.text(760, 202, "J ile kapat", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#9bd3ff",
  });

  const summaryText = scene.add.text(760, 230, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#b7d8ec",
  });

  const rows = Array.from({ length: 4 }, (_, index) => {
    const rowY = 304 + index * 84;
    const background = scene.add.rectangle(972, rowY, 382, 66, 0x102331, 0.96).setStrokeStyle(1, 0xffffff, 0.08);
    const titleText = scene.add.text(800, rowY - 22, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#f4fbff",
    });
    const descriptionText = scene.add.text(800, rowY - 2, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      color: "#b7d8ec",
      wordWrap: { width: 280 },
    });
    const progressText = scene.add.text(1118, rowY - 12, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      color: "#9bd3ff",
    }).setOrigin(1, 0);
    const statusPill = scene.add.rectangle(1110, rowY + 18, 82, 24, 0x173449, 0.95).setOrigin(0.5);
    const statusText = scene.add.text(1110, rowY + 18, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      fontStyle: "bold",
      color: "#fff4db",
    }).setOrigin(0.5);
    return { background, titleText, descriptionText, progressText, statusPill, statusText };
  });

  container.add([overlay, frame, title, hint, summaryText, ...rows.flatMap(Object.values)]);

  return {
    setVisible(isVisible) {
      container.setVisible(isVisible);
    },
    isVisible() {
      return container.visible;
    },
    open() {
      container.setVisible(true);
    },
    close() {
      container.setVisible(false);
    },
    update(achievementsState) {
      const entries = [...(achievementsState?.entries ?? [])].sort((left, right) => {
        if (left.isUnlocked !== right.isUnlocked) {
          return Number(left.isUnlocked) - Number(right.isUnlocked);
        }
        return (right.progress / right.target) - (left.progress / left.target);
      });
      const unlockedCount = entries.filter((entry) => entry.isUnlocked).length;
      summaryText.setText(`Acilan: ${unlockedCount}/${entries.length}`);

      rows.forEach((row, index) => {
        const entry = entries[index];

        if (!entry) {
          Object.values(row).forEach((part) => part.setVisible(false));
          return;
        }

        Object.values(row).forEach((part) => part.setVisible(true));
        row.titleText.setText(entry.title);
        row.descriptionText.setText(entry.description);
        row.progressText.setText(`${Math.min(entry.progress, entry.target)}/${entry.target}`);
        row.statusPill.setFillStyle(entry.isUnlocked ? 0x3f8f6b : 0x173449, 0.95);
        row.statusText.setText(entry.isUnlocked ? "Acildi" : "Yolda");
      });
    },
  };
}
