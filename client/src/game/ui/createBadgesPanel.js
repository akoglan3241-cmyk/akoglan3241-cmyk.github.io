import { GAME_SIZE } from "../constants.js";
import { createPanel } from "./createPanel.js";

export function createBadgesPanel(scene) {
  const container = scene.add.container(0, 0).setScrollFactor(0).setVisible(false).setDepth(2055);
  const overlay = scene.add.rectangle(0, 0, GAME_SIZE.width, GAME_SIZE.height, 0x031018, 0.54).setOrigin(0);
  const frame = createPanel(scene, {
    x: 966,
    y: 380,
    width: 492,
    height: 492,
    fillColor: 0x07131d,
    fillAlpha: 0.96,
    strokeColor: 0xffe0a1,
    strokeAlpha: 0.18,
    scrollFactor: 0,
  });

  const title = scene.add.text(748, 158, "Badges", {
    fontFamily: "Georgia",
    fontSize: "28px",
    fontStyle: "bold",
    color: "#fff4db",
  });

  const hint = scene.add.text(748, 194, "B ile kapat", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#9bd3ff",
  });

  const activeText = scene.add.text(748, 224, "Aktif badge: Yok", {
    fontFamily: "Trebuchet MS",
    fontSize: "15px",
    color: "#b7d8ec",
  });

  const clearButton = scene.add.rectangle(1122, 226, 92, 28, 0x173449, 0.96).setInteractive({ useHandCursor: true });
  const clearButtonText = scene.add.text(1122, 226, "Temizle", {
    fontFamily: "Trebuchet MS",
    fontSize: "12px",
    fontStyle: "bold",
    color: "#fff4db",
  }).setOrigin(0.5);

  const feedbackText = scene.add.text(748, 252, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "13px",
    color: "#9bd3ff",
  });

  const rows = Array.from({ length: 5 }, (_, index) => {
    const rowY = 316 + index * 66;
    const background = scene.add.rectangle(966, rowY, 398, 54, 0x102331, 0.96).setStrokeStyle(1, 0xffffff, 0.08);
    const nameText = scene.add.text(778, rowY - 18, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "15px",
      fontStyle: "bold",
      color: "#f4fbff",
    });
    const metaText = scene.add.text(778, rowY + 2, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      color: "#b7d8ec",
      wordWrap: { width: 210 },
    });
    const stateText = scene.add.text(1040, rowY - 10, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      color: "#9bd3ff",
    }).setOrigin(0.5);
    const button = scene.add.rectangle(1120, rowY, 84, 28, 0xffd99d, 0.96).setInteractive({ useHandCursor: true });
    const buttonText = scene.add.text(1120, rowY, "Tak", {
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      fontStyle: "bold",
      color: "#173449",
    }).setOrigin(0.5);
    return { background, nameText, metaText, stateText, button, buttonText };
  });

  container.add([overlay, frame, title, hint, activeText, clearButton, clearButtonText, feedbackText, ...rows.flatMap(Object.values)]);

  let equipHandler = null;

  clearButton.on("pointerdown", () => {
    equipHandler?.(null);
  });

  rows.forEach((row, index) => {
    row.button.on("pointerdown", () => {
      const badgeId = row.button.getData("badgeId");
      if (badgeId) {
        equipHandler?.(badgeId);
      }
    });
  });

  return {
    open() {
      container.setVisible(true);
    },
    close() {
      container.setVisible(false);
      feedbackText.setText("");
    },
    isVisible() {
      return container.visible;
    },
    setFeedback(message, isError = false) {
      feedbackText.setColor(isError ? "#ffcfb8" : "#9bd3ff");
      feedbackText.setText(message ?? "");
    },
    onEquip(handler) {
      equipHandler = handler;
    },
    update(badgesState) {
      const entries = [...(badgesState?.entries ?? [])].sort((left, right) => {
        if (left.isUnlocked !== right.isUnlocked) {
          return Number(right.isUnlocked) - Number(left.isUnlocked);
        }
        return Number(right.isEquipped) - Number(left.isEquipped);
      });
      const activeBadge = entries.find((entry) => entry.isEquipped);
      activeText.setText(`Aktif badge: ${activeBadge ? `${activeBadge.title} (${activeBadge.shortLabel})` : "Yok"}`);

      rows.forEach((row, index) => {
        const entry = entries[index];
        if (!entry) {
          Object.values(row).forEach((part) => part.setVisible(false));
          return;
        }

        Object.values(row).forEach((part) => part.setVisible(true));
        row.nameText.setText(`${entry.title} ${entry.shortLabel ? `(${entry.shortLabel})` : ""}`);
        row.metaText.setText(entry.description);
        row.stateText.setText(entry.isEquipped ? "Aktif" : entry.isUnlocked ? "Acik" : "Kilitli");
        row.button.setData("badgeId", entry.id);

        const disabled = !entry.isUnlocked || entry.isEquipped;
        row.button.setFillStyle(disabled ? 0x8ba4b5 : 0xffd99d, 0.96);
        row.buttonText.setText(entry.isEquipped ? "Takili" : entry.isUnlocked ? "Tak" : "Kilitli");
        row.button[disabled ? "disableInteractive" : "setInteractive"]({ useHandCursor: !disabled });
      });
    },
  };
}
