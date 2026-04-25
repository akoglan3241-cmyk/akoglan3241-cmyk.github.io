import { getItemRarityMeta } from "../content/itemContent.js";
import { GAME_SIZE } from "../constants.js";
import { getCosmeticDisplayState, getCosmeticLabel } from "../state/cosmeticsState.js";
import { INVENTORY_ITEMS, getItemCount } from "../state/inventoryState.js";
import { createPanel } from "./createPanel.js";

const CATEGORY_LABELS = {
  consumables: "Consumable",
  "quest-items": "Quest Item",
  cosmetics: "Cosmetic",
  chair: "Chair",
  table: "Table",
  lamp: "Lamp",
  plant: "Plant",
  decoration: "Decoration",
};

const COSMETIC_STATUS_TEXT = {
  owned: "Sahip",
  unowned: "Satin Al",
  equipped: "Giyili",
};

const MODES = {
  BUY: "buy",
  SELL: "sell",
  BUYBACK: "buyback",
};

const RARITY_FILTERS = ["all", "common", "uncommon", "rare", "epic"];

function buildBuyEntries(shop) {
  return (shop?.items ?? []).map((shopItem) => ({
    mode: MODES.BUY,
    id: shopItem.id,
    label: shopItem.label,
    category: shopItem.category,
    rarity: shopItem.rarity ?? INVENTORY_ITEMS[shopItem.itemId]?.rarity ?? "common",
    shopItem,
  }));
}

function buildSellEntries(inventoryState) {
  return Object.values(INVENTORY_ITEMS)
    .filter((item) => item.sellable && getItemCount(inventoryState, item.id) > 0)
    .map((item) => ({
      mode: MODES.SELL,
      id: item.id,
      itemId: item.id,
      label: item.label,
      category: item.category,
      icon: item.icon,
      quantity: getItemCount(inventoryState, item.id),
      unitPrice: Number(item.sellPrice ?? 0),
      rarity: item.rarity ?? "common",
    }));
}

function buildBuybackEntries(buybackItems) {
  return (buybackItems ?? []).map((entry) => ({
    mode: MODES.BUYBACK,
    id: entry.id,
      itemId: entry.itemId,
      label: entry.label,
      quantity: entry.quantity,
      unitPrice: entry.unitPrice,
      rarity: INVENTORY_ITEMS[entry.itemId]?.rarity ?? "common",
    }));
}

export function createShopPanel(scene) {
  const container = scene.add.container(0, 0).setScrollFactor(0).setVisible(false).setDepth(2000);
  const overlay = scene.add.rectangle(0, 0, GAME_SIZE.width, GAME_SIZE.height, 0x031018, 0.68).setOrigin(0);
  const frame = createPanel(scene, {
    x: GAME_SIZE.width / 2,
    y: GAME_SIZE.height / 2,
    width: 640,
    height: 590,
    fillColor: 0x07131d,
    fillAlpha: 0.97,
    strokeColor: 0xffd99d,
    strokeAlpha: 0.22,
    scrollFactor: 0,
  });

  const title = scene.add.text(326, 136, "Shop", {
    fontFamily: "Georgia",
    fontSize: "28px",
    fontStyle: "bold",
    color: "#fff4db",
  });

  const subtitle = scene.add.text(326, 172, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "15px",
    color: "#b7d8ec",
    wordWrap: { width: 540 },
  });

  const coinText = scene.add.text(326, 208, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "16px",
    fontStyle: "bold",
    color: "#ffd99d",
  });

  const feedbackText = scene.add.text(326, 236, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#ffb4a2",
  });

  const hintText = scene.add.text(944, 136, "Esc ile kapat", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#9bd3ff",
  }).setOrigin(1, 0);

  const modeButtons = [
    { key: MODES.BUY, label: "Buy", x: 356 },
    { key: MODES.SELL, label: "Sell", x: 468 },
    { key: MODES.BUYBACK, label: "Buyback", x: 598 },
  ].map((entry) => {
    const button = scene.add.rectangle(entry.x, 272, entry.key === MODES.BUY ? 110 : 122, 30, 0x173449, 0.98)
      .setStrokeStyle(1, 0xffffff, 0.12)
      .setInteractive({ useHandCursor: true });
    const label = scene.add.text(entry.x, 272, entry.label, {
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      fontStyle: "bold",
      color: "#d8edf9",
    }).setOrigin(0.5);
    return { ...entry, button, label };
  });

  const rarityFilterButtons = RARITY_FILTERS.map((rarity, index) => {
    const x = 380 + index * 92;
    const button = scene.add.rectangle(x, 302, 82, 24, 0x173449, 0.98)
      .setStrokeStyle(1, 0xffffff, 0.12)
      .setInteractive({ useHandCursor: true });
    const label = scene.add.text(x, 302, rarity === "all" ? "All" : getItemRarityMeta(rarity).label, {
      fontFamily: "Trebuchet MS",
      fontSize: "10px",
      fontStyle: "bold",
      color: "#d8edf9",
    }).setOrigin(0.5);
    return { rarity, button, label };
  });

  const emptyText = scene.add.text(640, 448, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "15px",
    color: "#9fb9ca",
  }).setOrigin(0.5).setVisible(false);

  const rows = Array.from({ length: 8 }, (_, index) => {
    const rowY = 336 + index * 28;
    const background = scene.add.rectangle(640, rowY, 560, 26, 0x102331, 0.96).setStrokeStyle(1, 0xffffff, 0.08);
    const iconBadge = scene.add.circle(380, rowY, 11, 0xffd99d, 0.95);
    const iconText = scene.add.text(380, rowY, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#173449",
    }).setOrigin(0.5);
    const nameText = scene.add.text(404, rowY - 7, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      fontStyle: "bold",
      color: "#f4fbff",
    });
    const metaText = scene.add.text(404, rowY + 5, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "11px",
      color: "#b7d8ec",
    });
    const categoryText = scene.add.text(742, rowY, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "10px",
      fontStyle: "bold",
      color: "#173449",
      backgroundColor: "#b8f2c8",
      padding: { left: 6, right: 6, top: 2, bottom: 2 },
    }).setOrigin(0.5);
    const rarityText = scene.add.text(794, rowY, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "10px",
      fontStyle: "bold",
      color: "#173449",
      backgroundColor: "#c5d3df",
      padding: { left: 6, right: 6, top: 2, bottom: 2 },
    }).setOrigin(0.5);
    const button = scene.add.rectangle(860, rowY, 96, 22, 0xffd99d, 0.95).setStrokeStyle(1, 0xffffff, 0.16).setInteractive({ useHandCursor: true });
    const buttonText = scene.add.text(860, rowY, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#173449",
    }).setOrigin(0.5);

    return {
      background,
      iconBadge,
      iconText,
      nameText,
      metaText,
      categoryText,
      rarityText,
      button,
      buttonText,
      entry: null,
    };
  });

  let activeMode = MODES.BUY;
  let buyHandler = null;
  let sellHandler = null;
  let buybackHandler = null;
  let latestShop = null;
  let latestInventoryState = null;
  let latestCosmeticsState = null;
  let latestBuybackItems = [];
  let activeRarityFilter = "all";

  function refreshModeButtons() {
    modeButtons.forEach((entry) => {
      const isActive = entry.key === activeMode;
      entry.button.setFillStyle(isActive ? 0xffd99d : 0x173449, 0.98);
      entry.label.setColor(isActive ? "#173449" : "#d8edf9");
    });
  }

  function refreshRarityFilters() {
    rarityFilterButtons.forEach((entry) => {
      const isActive = entry.rarity === activeRarityFilter;
      const rarityMeta = entry.rarity === "all" ? { accent: 0xffd99d, color: "#173449" } : getItemRarityMeta(entry.rarity);
      entry.button.setFillStyle(isActive ? rarityMeta.accent : 0x173449, 0.98);
      entry.label.setColor(isActive ? "#173449" : "#d8edf9");
    });
  }

  function renderRows(entries = []) {
    emptyText.setVisible(entries.length === 0);
    emptyText.setText(
      activeMode === MODES.SELL
        ? "Satilabilir esya yok."
        : activeMode === MODES.BUYBACK
          ? "Buyback listesi bos."
          : "Bu magazada satilik esya yok.",
    );

    rows.forEach((row, index) => {
      const entry = entries[index] ?? null;
      row.entry = entry;

      const visible = Boolean(entry);
      row.background.setVisible(visible);
      row.iconBadge.setVisible(visible);
      row.iconText.setVisible(visible);
      row.nameText.setVisible(visible);
        row.metaText.setVisible(visible);
        row.categoryText.setVisible(visible);
        row.rarityText.setVisible(visible);
        row.button.setVisible(visible);
        row.buttonText.setVisible(visible);
      row.button.disableInteractive();

      if (!entry) {
        return;
      }

      if (entry.mode === MODES.BUY) {
        const shopItem = entry.shopItem;
        const isCosmetic = shopItem.kind === "cosmetic";
        const itemMeta = INVENTORY_ITEMS[shopItem.itemId];
        const rarityMeta = getItemRarityMeta(shopItem.rarity ?? itemMeta?.rarity);
        const cosmeticState = isCosmetic ? getCosmeticDisplayState(latestCosmeticsState, shopItem.cosmeticSlot, shopItem.itemId) : null;
        row.iconText.setText(itemMeta?.icon ?? (isCosmetic ? "C" : "?"));
        row.nameText.setText(isCosmetic ? getCosmeticLabel(shopItem.cosmeticSlot, shopItem.itemId) : shopItem.label);
        row.categoryText.setText(CATEGORY_LABELS[shopItem.category] ?? "Item");
        row.rarityText.setText(rarityMeta.label).setBackgroundColor(rarityMeta.color);
        row.metaText.setText(
          isCosmetic
            ? `Fiyat: ${shopItem.price} coin | Durum: ${COSMETIC_STATUS_TEXT[cosmeticState]}`
            : `Fiyat: ${shopItem.price} coin | +${shopItem.amount} ${INVENTORY_ITEMS[shopItem.itemId]?.label ?? shopItem.itemId}`,
        );
        row.buttonText.setText(isCosmetic ? COSMETIC_STATUS_TEXT[cosmeticState] : "Satin Al");
        if (!isCosmetic || cosmeticState === "unowned") {
          row.button.setInteractive({ useHandCursor: true });
        }
        return;
      }

      if (entry.mode === MODES.SELL) {
        const rarityMeta = getItemRarityMeta(entry.rarity);
        row.iconText.setText(entry.icon ?? "?");
        row.nameText.setText(entry.label);
        row.categoryText.setText(CATEGORY_LABELS[entry.category] ?? "Item");
        row.rarityText.setText(rarityMeta.label).setBackgroundColor(rarityMeta.color);
        row.metaText.setText(`Sahip: ${entry.quantity} | Satis: ${entry.unitPrice} coin`);
        row.buttonText.setText("Sat x1");
        row.button.setInteractive({ useHandCursor: true });
        return;
      }

      const rarityMeta = getItemRarityMeta(entry.rarity);
      row.iconText.setText(INVENTORY_ITEMS[entry.itemId]?.icon ?? "?");
      row.nameText.setText(entry.label);
      row.categoryText.setText("Buyback");
      row.rarityText.setText(rarityMeta.label).setBackgroundColor(rarityMeta.color);
      row.metaText.setText(`Miktar: ${entry.quantity} | Geri Al: ${entry.unitPrice * entry.quantity} coin`);
      row.buttonText.setText("Geri Al");
      row.button.setInteractive({ useHandCursor: true });
    });
  }

  function refresh() {
    const entries =
      activeMode === MODES.BUY
        ? buildBuyEntries(latestShop)
        : activeMode === MODES.SELL
          ? buildSellEntries(latestInventoryState)
          : buildBuybackEntries(latestBuybackItems);

    const filteredEntries =
      activeRarityFilter === "all"
        ? entries
        : entries.filter((entry) => {
            if (entry.mode === MODES.BUY) {
              return (entry.shopItem.rarity ?? INVENTORY_ITEMS[entry.shopItem.itemId]?.rarity ?? "common") === activeRarityFilter;
            }

            return (entry.rarity ?? INVENTORY_ITEMS[entry.itemId]?.rarity ?? "common") === activeRarityFilter;
          });

    refreshModeButtons();
    refreshRarityFilters();
    renderRows(filteredEntries);
  }

  modeButtons.forEach((entry) => {
    entry.button.on("pointerdown", () => {
      activeMode = entry.key;
      refresh();
    });
  });

  rarityFilterButtons.forEach((entry) => {
    entry.button.on("pointerdown", () => {
      activeRarityFilter = entry.rarity;
      refresh();
    });
  });

  rows.forEach((row) => {
    row.button.on("pointerdown", () => {
      if (!row.entry) {
        return;
      }

      if (row.entry.mode === MODES.BUY) {
        buyHandler?.(row.entry.shopItem);
        return;
      }

      if (row.entry.mode === MODES.SELL) {
        sellHandler?.(row.entry, 1);
        return;
      }

      buybackHandler?.(row.entry);
    });
  });

  container.add([
    overlay,
    frame,
    title,
    subtitle,
    coinText,
    feedbackText,
    hintText,
    ...modeButtons.flatMap((entry) => [entry.button, entry.label]),
    ...rarityFilterButtons.flatMap((entry) => [entry.button, entry.label]),
    emptyText,
    ...rows.flatMap((row) => [
      row.background,
      row.iconBadge,
      row.iconText,
      row.nameText,
      row.metaText,
      row.categoryText,
      row.rarityText,
      row.button,
      row.buttonText,
    ]),
  ]);

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
    onSell(handler) {
      sellHandler = handler;
    },
    onBuyback(handler) {
      buybackHandler = handler;
    },
    setFeedback(message, isError = false) {
      feedbackText.setColor(isError ? "#ffb4a2" : "#b8f2c8");
      feedbackText.setText(message ?? "");
    },
    update(shop, inventoryState, cosmeticsState, buybackItems = []) {
      latestShop = shop;
      latestInventoryState = inventoryState;
      latestCosmeticsState = cosmeticsState;
      latestBuybackItems = buybackItems;
      title.setText(shop?.title ?? "Shop");
      subtitle.setText(shop?.greeting ?? "");
      coinText.setText(`Coin: ${Number(inventoryState?.items?.coin ?? 0)}`);
      refresh();
    },
  };
}
