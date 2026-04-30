import { GAME_SIZE } from "../constants.js";
import { getCosmeticDisplayState, getCosmeticLabel } from "../state/cosmeticsState.js";
import { createPanel } from "./createPanel.js";

const STATUS_TEXT = {
  owned: "Sahip",
  unowned: "Satin Al",
  equipped: "Giyili",
};

export function createCosmeticsShopPanel(scene) {
  const container = scene.add.container(0, 0).setScrollFactor(0).setVisible(false).setDepth(2000);
  const overlay = scene.add.rectangle(0, 0, GAME_SIZE.width, GAME_SIZE.height, 0x031018, 0.68).setOrigin(0);
  const frame = createPanel(scene, {
    x: GAME_SIZE.width / 2,
    y: GAME_SIZE.height / 2,
    width: 620,
    height: 500,
    fillColor: 0x07131d,
    fillAlpha: 0.97,
    strokeColor: 0xffd99d,
    strokeAlpha: 0.22,
    scrollFactor: 0,
  });

  const title = scene.add.text(344, 142, "Cosmetics Shop", {
    fontFamily: "Georgia",
    fontSize: "28px",
    fontStyle: "bold",
    color: "#fff4db",
  });
  const subtitle = scene.add.text(344, 180, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "15px",
    color: "#b7d8ec",
    wordWrap: { width: 580 },
  });
  const coinText = scene.add.text(344, 218, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "16px",
    fontStyle: "bold",
    color: "#ffd99d",
  });
  const feedbackText = scene.add.text(344, 246, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#ffb4a2",
  });

  const rows = Array.from({ length: 8 }, (_, index) => {
    const y = 308 + index * 40;
    const background = scene.add.rectangle(640, y, 544, 32, 0x102331, 0.96).setStrokeStyle(1, 0xffffff, 0.08);
    const nameText = scene.add.text(388, y, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      fontStyle: "bold",
      color: "#f4fbff",
    }).setOrigin(0, 0.5);
    const metaText = scene.add.text(580, y, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      color: "#b7d8ec",
    }).setOrigin(0, 0.5);
    const button = scene.add.rectangle(840, y, 84, 26, 0xffd99d, 0.95).setInteractive({ useHandCursor: true });
    const buttonText = scene.add.text(840, y, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      fontStyle: "bold",
      color: "#173449",
    }).setOrigin(0.5);
    return { background, nameText, metaText, button, buttonText, shopItem: null };
  });

  let buyHandler = null;

  rows.forEach((row) => {
    row.button.on("pointerdown", () => row.shopItem && buyHandler?.(row.shopItem));
  });

  container.add([overlay, frame, title, subtitle, coinText, feedbackText, ...rows.flatMap((row) => [row.background, row.nameText, row.metaText, row.button, row.buttonText])]);

  return {
    setVisible(isVisible) {
      container.setVisible(isVisible);
    },
    isVisible() {
      return container.visible;
    },
    onBuy(handler) {
      buyHandler = handler;
    },
    setFeedback(message, isError = false) {
      feedbackText.setColor(isError ? "#ffb4a2" : "#b8f2c8");
      feedbackText.setText(message ?? "");
    },
    update(shop, inventoryState, cosmeticsState) {
      title.setText(shop?.title ?? "Cosmetics Shop");
      subtitle.setText(shop?.greeting ?? "");
      coinText.setText(`Coin: ${Number(inventoryState?.items?.coin ?? 0)}`);

      rows.forEach((row, index) => {
        const shopItem = shop?.items?.[index] ?? null;
        row.shopItem = shopItem;
        const visible = Boolean(shopItem);
        row.background.setVisible(visible);
        row.nameText.setVisible(visible);
        row.metaText.setVisible(visible);
        row.button.setVisible(visible);
        row.buttonText.setVisible(visible);
        row.button.disableInteractive();

        if (!shopItem) {
          return;
        }

        const state = getCosmeticDisplayState(cosmeticsState, shopItem.cosmeticSlot, shopItem.itemId);
        row.nameText.setText(`${getCosmeticLabel(shopItem.cosmeticSlot, shopItem.itemId)} (${shopItem.cosmeticSlot})`);
        row.metaText.setText(`Fiyat: ${shopItem.price} coin | Durum: ${STATUS_TEXT[state]}`);
        row.buttonText.setText(STATUS_TEXT[state]);

        if (state === "unowned") {
          row.button.setInteractive({ useHandCursor: true });
        }
      });
    },
  };
}
