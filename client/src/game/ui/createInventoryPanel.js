import { getItemRarityMeta } from "../content/itemContent.js";
import { createPanel } from "./createPanel.js";

export function createInventoryPanel(scene) {
  const container = scene.add.container(0, 0).setScrollFactor(0).setVisible(false);

  const overlay = scene.add.rectangle(0, 0, 1280, 720, 0x031018, 0.52).setOrigin(0);
  const frame = createPanel(scene, {
    x: 1015,
    y: 404,
    width: 430,
    height: 500,
    fillColor: 0x081722,
    fillAlpha: 0.96,
    strokeColor: 0xffdfad,
    strokeAlpha: 0.2,
    scrollFactor: 0,
  });

  const title = scene.add.text(836, 188, "Inventory", {
    fontFamily: "Georgia",
    fontSize: "29px",
    fontStyle: "bold",
    color: "#fff4db",
  });

  const hint = scene.add.text(836, 224, "Tasidigim Esyalar", {
    fontFamily: "Trebuchet MS",
    fontSize: "13px",
    color: "#8fb7cf",
  });

  const helper = scene.add.text(836, 246, "I ile kapat | Kartin uzerine gelerek detay bak", {
    fontFamily: "Trebuchet MS",
    fontSize: "12px",
    color: "#d7ebf7",
  });

  const tooltipBg = scene.add.rectangle(856, 560, 298, 102, 0x0d2130, 0.98).setStrokeStyle(2, 0xffdfad, 0.18).setOrigin(0, 0).setVisible(false);
  const tooltipTitle = scene.add.text(892, 590, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "16px",
    fontStyle: "bold",
    color: "#f4fbff",
  }).setVisible(false);
  const tooltipBody = scene.add.text(892, 616, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "13px",
    color: "#b7d8ec",
    lineSpacing: 3,
    wordWrap: { width: 258 },
  }).setVisible(false);

  const rows = Array.from({ length: 4 }, (_, index) => {
    const rowY = 306 + index * 78;
    const rowBackground = scene.add.rectangle(1015, rowY, 354, 58, 0x102331, 0.98).setStrokeStyle(1, 0xffffff, 0.08);
    const iconBadge = scene.add.circle(878, rowY, 21, 0xffd99d, 0.95);
    const iconText = scene.add
      .text(878, rowY, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#173449",
      })
      .setOrigin(0.5);
    const nameText = scene.add.text(916, rowY - 16, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#f4fbff",
    });
    const amountText = scene.add.text(916, rowY + 10, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      color: "#b7d8ec",
    });
    const rarityText = scene.add.text(1124, rowY - 16, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#173449",
      backgroundColor: "#c5d3df",
      padding: { left: 6, right: 6, top: 2, bottom: 2 },
    }).setOrigin(1, 0);

    rowBackground.setInteractive({ useHandCursor: true });

    return { rowBackground, iconBadge, iconText, nameText, amountText, rarityText, entry: null };
  });

  function hideTooltip() {
    tooltipBg.setVisible(false);
    tooltipTitle.setVisible(false);
    tooltipBody.setVisible(false);
  }

  function showTooltip(entry) {
    if (!entry) {
      hideTooltip();
      return;
    }

    const rarityMeta = getItemRarityMeta(entry.rarity);
    tooltipBg.setStrokeStyle(2, rarityMeta.accent, 0.3).setVisible(true);
    tooltipTitle.setText(`${entry.label} • ${rarityMeta.label}`).setColor(rarityMeta.color).setVisible(true);
    tooltipBody
      .setText(
        `Kategori: ${entry.category}\nMiktar: ${entry.amount}\n${
          entry.sellable ? `Satis Degeri: ${entry.sellPrice} coin` : "Satisa uygun degil"
        }`,
      )
      .setVisible(true);
  }

  rows.forEach((row) => {
    row.rowBackground
      .on("pointerover", () => showTooltip(row.entry))
      .on("pointerout", () => hideTooltip());
  });

  container.add([
    overlay,
    frame,
    title,
    hint,
    ...rows.flatMap((row) => [row.rowBackground, row.iconBadge, row.iconText, row.nameText, row.amountText, row.rarityText]),
    helper,
    tooltipBg,
    tooltipTitle,
    tooltipBody,
  ]);

  return {
    container,
    setVisible(isVisible) {
      container.setVisible(isVisible);
      if (!isVisible) {
        hideTooltip();
      }
    },
    update(entries) {
      rows.forEach((row, index) => {
        const entry = entries[index] ?? null;
        row.entry = entry;

        if (!entry) {
          row.rowBackground.setVisible(false);
          row.iconBadge.setVisible(false);
          row.iconText.setVisible(false);
          row.nameText.setVisible(false);
          row.amountText.setVisible(false);
          row.rarityText.setVisible(false);
          return;
        }

        const rarityMeta = getItemRarityMeta(entry.rarity);
        row.rowBackground.setVisible(true).setStrokeStyle(1, rarityMeta.accent, 0.2);
        row.iconBadge.setVisible(true).setFillStyle(rarityMeta.accent, 0.95);
        row.iconText.setVisible(true).setText(entry.icon);
        row.nameText.setVisible(true).setText(entry.label);
        row.amountText.setVisible(true).setText(`Adet: ${entry.amount} | Kategori: ${entry.category}`);
        row.rarityText.setVisible(true).setText(rarityMeta.label).setColor("#173449").setBackgroundColor(rarityMeta.color);
      });
    },
  };
}
