import { listCraftingRecipes } from "../content/craftingContent.js";
import { GAME_SIZE } from "../constants.js";
import { getItemCount } from "../state/inventoryState.js";
import { createPanel } from "./createPanel.js";

const RECIPES = listCraftingRecipes();

function formatRequirements(recipe, inventoryState) {
  return recipe.requirements
    .map((entry) => `${entry.label} ${Math.min(getItemCount(inventoryState, entry.itemId), entry.amount)}/${entry.amount}`)
    .join(" | ");
}

function formatOutputs(recipe) {
  return recipe.outputs.map((entry) => `${entry.amount}x ${entry.label}`).join(", ");
}

export function createCraftingPanel(scene) {
  const container = scene.add.container(0, 0).setScrollFactor(0).setVisible(false).setDepth(2055);
  const overlay = scene.add.rectangle(0, 0, GAME_SIZE.width, GAME_SIZE.height, 0x031018, 0.58).setOrigin(0);
  const frame = createPanel(scene, {
    x: 962,
    y: 380,
    width: 520,
    height: 470,
    fillColor: 0x07131d,
    fillAlpha: 0.96,
    strokeColor: 0xffe0a1,
    strokeAlpha: 0.18,
    scrollFactor: 0,
  });

  const title = scene.add.text(724, 156, "Crafting", {
    fontFamily: "Georgia",
    fontSize: "28px",
    fontStyle: "bold",
    color: "#fff4db",
  });

  const hint = scene.add.text(724, 192, "K ile kapat", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#9bd3ff",
  });

  const coinText = scene.add.text(724, 220, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    fontStyle: "bold",
    color: "#ffd99d",
  });

  const feedbackText = scene.add.text(724, 246, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#b8f2c8",
  });

  const rows = Array.from({ length: 4 }, (_, index) => {
    const rowY = 330 + index * 82;
    const background = scene.add.rectangle(962, rowY, 426, 68, 0x102331, 0.96).setStrokeStyle(1, 0xffffff, 0.08);
    const titleText = scene.add.text(766, rowY - 24, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#f4fbff",
    });
    const descriptionText = scene.add.text(766, rowY - 2, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      color: "#b7d8ec",
      wordWrap: { width: 250 },
    });
    const requirementText = scene.add.text(766, rowY + 18, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "11px",
      color: "#9bd3ff",
      wordWrap: { width: 250 },
    });
    const outputText = scene.add.text(1036, rowY - 18, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "11px",
      color: "#ffd99d",
      wordWrap: { width: 136 },
      align: "right",
    }).setOrigin(1, 0);
    const costText = scene.add.text(1036, rowY + 6, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "11px",
      color: "#b7d8ec",
    }).setOrigin(1, 0);
    const button = scene.add.rectangle(1126, rowY, 82, 28, 0xffd99d, 0.95).setStrokeStyle(1, 0xffffff, 0.14).setInteractive({ useHandCursor: true });
    const buttonText = scene.add.text(1126, rowY, "Uret", {
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      fontStyle: "bold",
      color: "#173449",
    }).setOrigin(0.5);

    return {
      background,
      titleText,
      descriptionText,
      requirementText,
      outputText,
      costText,
      button,
      buttonText,
      recipe: null,
    };
  });

  let craftHandler = null;
  let latestInventoryState = null;

  rows.forEach((row) => {
    row.button.on("pointerdown", () => {
      if (row.recipe) {
        craftHandler?.(row.recipe);
      }
    });
  });

  container.add([overlay, frame, title, hint, coinText, feedbackText, ...rows.flatMap(Object.values).filter((value) => typeof value?.setVisible === "function")]);

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
    onCraft(handler) {
      craftHandler = handler;
    },
    setFeedback(message, isError = false) {
      feedbackText.setColor(isError ? "#ffb4a2" : "#b8f2c8");
      feedbackText.setText(message ?? "");
    },
    update(inventoryState) {
      latestInventoryState = inventoryState;
      coinText.setText(`Coin: ${getItemCount(inventoryState, "coin")}`);

      rows.forEach((row, index) => {
        const recipe = RECIPES[index] ?? null;
        row.recipe = recipe;

        if (!recipe) {
          [row.background, row.titleText, row.descriptionText, row.requirementText, row.outputText, row.costText, row.button, row.buttonText].forEach((part) => part.setVisible(false));
          return;
        }

        const canCraft =
          getItemCount(latestInventoryState, "coin") >= recipe.coinCost &&
          recipe.requirements.every((entry) => getItemCount(latestInventoryState, entry.itemId) >= entry.amount);

        [row.background, row.titleText, row.descriptionText, row.requirementText, row.outputText, row.costText, row.button, row.buttonText].forEach((part) => part.setVisible(true));
        row.titleText.setText(recipe.title);
        row.descriptionText.setText(recipe.description);
        row.requirementText.setText(`Gerekli: ${formatRequirements(recipe, latestInventoryState)}`);
        row.outputText.setText(`Sonuc: ${formatOutputs(recipe)}`);
        row.costText.setText(`Uretim: ${recipe.coinCost} coin`);
        row.button.setFillStyle(canCraft ? 0xffd99d : 0x587086, 0.95);
        row.buttonText.setText(canCraft ? "Uret" : "Eksik");
      });
    },
  };
}
