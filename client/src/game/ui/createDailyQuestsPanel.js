import { GAME_SIZE } from "../constants.js";
import { createPanel } from "./createPanel.js";

function formatResetTime(timestamp) {
  if (!timestamp) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function createDailyQuestsPanel(scene) {
  const container = scene.add.container(0, 0).setScrollFactor(0).setVisible(false).setDepth(2052);
  const overlay = scene.add.rectangle(0, 0, GAME_SIZE.width, GAME_SIZE.height, 0x031018, 0.54).setOrigin(0);
  const frame = createPanel(scene, {
    x: 980,
    y: 378,
    width: 500,
    height: 484,
    fillColor: 0x07131d,
    fillAlpha: 0.96,
    strokeColor: 0xffe0a1,
    strokeAlpha: 0.18,
    scrollFactor: 0,
  });

  const title = scene.add.text(748, 156, "Daily Quests", {
    fontFamily: "Georgia",
    fontSize: "28px",
    fontStyle: "bold",
    color: "#fff4db",
  });

  const hint = scene.add.text(748, 190, "L ile kapat", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#9bd3ff",
  });

  const resetText = scene.add.text(748, 220, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#b7d8ec",
  });

  const rows = Array.from({ length: 3 }, (_, index) => {
    const rowY = 308 + index * 98;
    const background = scene.add.rectangle(980, rowY, 404, 80, 0x102331, 0.96).setStrokeStyle(1, 0xffffff, 0.08);
    const titleText = scene.add.text(786, rowY - 28, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#f4fbff",
    });
    const descriptionText = scene.add.text(786, rowY - 4, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      color: "#b7d8ec",
      wordWrap: { width: 250 },
    });
    const rewardText = scene.add.text(786, rowY + 28, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      color: "#ffd99d",
    });
    const progressText = scene.add.text(1142, rowY - 18, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      color: "#9bd3ff",
    }).setOrigin(1, 0);
    const statusPill = scene.add.rectangle(1128, rowY + 24, 90, 24, 0x173449, 0.96).setOrigin(0.5);
    const statusText = scene.add.text(1128, rowY + 24, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      fontStyle: "bold",
      color: "#fff4db",
    }).setOrigin(0.5);
    return { background, titleText, descriptionText, rewardText, progressText, statusPill, statusText };
  });

  container.add([overlay, frame, title, hint, resetText, ...rows.flatMap(Object.values)]);

  return {
    open() {
      container.setVisible(true);
    },
    close() {
      container.setVisible(false);
    },
    isVisible() {
      return container.visible;
    },
    update(dailyQuestsState) {
      resetText.setText(`Sonraki sifirlama: ${formatResetTime(dailyQuestsState?.nextResetAt)}`);
      const entries = dailyQuestsState?.entries ?? [];

      rows.forEach((row, index) => {
        const entry = entries[index];
        if (!entry) {
          Object.values(row).forEach((part) => part.setVisible(false));
          return;
        }

        Object.values(row).forEach((part) => part.setVisible(true));
        row.titleText.setText(entry.title);
        row.descriptionText.setText(entry.description);
        row.rewardText.setText(`Odul: ${entry.rewards.coins} coin | ${entry.rewards.xp} XP`);
        row.progressText.setText(`${Math.min(entry.progress, entry.targetCount)}/${entry.targetCount}`);
        row.statusPill.setFillStyle(entry.isCompleted ? 0x3f8f6b : 0x173449, 0.96);
        row.statusText.setText(entry.isCompleted ? "Tamam" : "Aktif");
      });
    },
  };
}
