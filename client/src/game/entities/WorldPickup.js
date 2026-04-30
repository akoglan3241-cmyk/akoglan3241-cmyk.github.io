import Phaser from "phaser";
import { createNameTag } from "../ui/createNameTag.js";
import { createGroundShadow, updateGroundShadow } from "../utils/createGroundShadow.js";
import { logicalToScreen } from "../world/roomUtils.js";

function getIsoDepth(logicalX, logicalY) {
  return (logicalX + logicalY) * 1.5;
}

export class WorldPickup extends Phaser.GameObjects.Container {
  constructor(scene, { id, itemId, amount, x, y, label, texture }) {
    const screenPos = logicalToScreen(x, y);
    super(scene, screenPos.x, screenPos.y);

    this.id = id;
    this.itemId = itemId;
    this.amount = amount;
    this.label = label;
    this.logicalX = x;
    this.logicalY = y;
    this.baseY = screenPos.y;
    this.floatOffset = 0;

    this.shadow = createGroundShadow(scene, 0, 10, {
      width: 24,
      height: 12,
      alpha: 0.22,
    });
    this.sprite = scene.add.image(0, 0, texture);
    this.nameTag = createNameTag(scene, 0, -26, {
      type: "pickup",
      initialName: label,
    });

    this.add([this.shadow, this.sprite, this.nameTag.container]);
    this.setDepth(getIsoDepth(x, y) + 8);

    scene.add.existing(this);

    this.floatTween = scene.tweens.add({
      targets: this,
      floatOffset: -6,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        this.sprite.setY(this.floatOffset);
        this.nameTag.setPosition(0, -26 + this.floatOffset);
        updateGroundShadow(this.shadow, {
          scaleX: 1 - Math.abs(this.floatOffset) * 0.03,
          scaleY: 1 - Math.abs(this.floatOffset) * 0.06,
          alpha: Math.max(0.2, 0.24 - Math.abs(this.floatOffset) * 0.008),
        });
      },
    });
  }

  setPerformanceMode(isEnabled) {
    if (isEnabled) {
      this.floatTween?.pause();
      this.floatOffset = 0;
      this.sprite.setY(0);
      this.nameTag.setPosition(0, -26);
      updateGroundShadow(this.shadow, {
        scaleX: 1,
        scaleY: 1,
        alpha: 0.22,
      });
      return;
    }

    if (this.floatTween?.isPaused()) {
      this.floatTween.resume();
    }
  }
}
