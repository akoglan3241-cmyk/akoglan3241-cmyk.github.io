import Phaser from "phaser";
import { createGroundShadow } from "../utils/createGroundShadow.js";
import { logicalToScreen } from "../world/roomUtils.js";

function getIsoDepth(logicalX, logicalY) {
  return (logicalX + logicalY) * 1.5;
}

export class TreasureChest extends Phaser.GameObjects.Container {
  constructor(scene, { id, x, y }) {
    const screenPos = logicalToScreen(x, y);
    super(scene, screenPos.x, screenPos.y);

    this.id = id;
    this.logicalX = x;
    this.logicalY = y;
    this.isOpened = false;

    this.shadow = createGroundShadow(scene, 0, 10, {
      width: 32,
      height: 16,
      alpha: 0.22,
    });
    this.sprite = scene.add.image(0, 0, "chestClosed");
    this.promptLabel = scene.add
      .text(0, -34, "[E] Sandik", {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#173449",
        backgroundColor: "#fff4cf",
        padding: { left: 5, right: 5, top: 3, bottom: 3 },
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.add([this.shadow, this.sprite, this.promptLabel]);
    this.setDepth(getIsoDepth(x, y) + 8);

    scene.add.existing(this);
  }

  setPromptVisible(isVisible) {
    this.promptLabel.setVisible(isVisible);
  }

  open() {
    this.isOpened = true;
    this.sprite.setTexture("chestOpen");
    this.promptLabel.setVisible(false);
  }
}
