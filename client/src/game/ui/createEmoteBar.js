import { GAME_SIZE } from "../constants.js";
import { EMOTES } from "../content/emotes.js";
import { createPanel } from "./createPanel.js";

export function createEmoteBar(scene) {
  const container = scene.add.container(0, 0).setScrollFactor(0).setDepth(2050);
  const frame = createPanel(scene, {
    x: GAME_SIZE.width - 166,
    y: GAME_SIZE.height - 68,
    width: 260,
    height: 62,
    fillColor: 0x07131d,
    fillAlpha: 0.88,
    strokeColor: 0xffe0a1,
    strokeAlpha: 0.16,
    scrollFactor: 0,
  });

  const title = scene.add
    .text(GAME_SIZE.width - 278, GAME_SIZE.height - 92, "Emotes", {
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      fontStyle: "bold",
      color: "#fff4db",
    })
    .setScrollFactor(0);

  let selectHandler = null;

  const buttons = EMOTES.map((emote, index) => {
    const x = GAME_SIZE.width - 274 + index * 62;
    const button = scene.add.rectangle(x, GAME_SIZE.height - 64, 54, 32, 0x173449, 1).setScrollFactor(0).setInteractive({ useHandCursor: true });
    const text = scene.add
      .text(x, GAME_SIZE.height - 64, emote.label, {
        fontFamily: "Trebuchet MS",
        fontSize: "11px",
        color: "#dcedfa",
        align: "center",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    button.on("pointerdown", () => selectHandler?.(emote.id));
    button.on("pointerover", () => button.setFillStyle(0x234a62, 1));
    button.on("pointerout", () => button.setFillStyle(0x173449, 1));

    return { button, text };
  });

  container.add([frame, title, ...buttons.flatMap((entry) => [entry.button, entry.text])]);

  return {
    onSelect(handler) {
      selectHandler = handler;
    },
    setVisible(isVisible) {
      container.setVisible(isVisible);
    },
    destroy() {
      container.destroy(true);
    },
  };
}
