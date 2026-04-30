import Phaser from "phaser";
import { setOutlineHighlight } from "../render/OutlineHighlightPipeline.js";
import { createNameTag } from "../ui/createNameTag.js";
import { createGroundShadow } from "../utils/createGroundShadow.js";
import { getPerspectiveScale } from "../world/perspective.js";
import { logicalToScreen } from "../world/roomUtils.js";

function getIsoDepth(logicalX, logicalY) {
  return (logicalX + logicalY) * 1.5;
}

export class NPC extends Phaser.GameObjects.Container {
  constructor(scene, { id = "", x, y, name, dialog = "", tint = 0xffffff, shopId = null }) {
    const screenPos = logicalToScreen(x, y);
    super(scene, screenPos.x, screenPos.y);

    this.logicalX = x;
    this.logicalY = y;

    this.npcId = id || String(name ?? "").toLowerCase();
    this.name = name;
    this.dialog = dialog;
    this.shopId = shopId;

    this.shadow = createGroundShadow(scene, 0, 15, {
      width: 24,
      height: 10,
      alpha: 0.22,
    });
    this.outlineSprite = scene.add.image(0, 0, "npc").setTint(0x13202a).setAlpha(0.9).setScale(1.08);
    this.sprite = scene.add.image(0, 0, "npc").setTint(tint);
    this.visualContainer = scene.add.container(0, 0, [this.outlineSprite, this.sprite]);
    this.nameTag = createNameTag(scene, 0, -36, {
      type: "npc",
      initialName: name,
    });

    this.promptLabel = scene.add
      .text(0, -62, "[E] Konus", {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#173449",
        backgroundColor: "#fff4cf",
        padding: { left: 6, right: 6, top: 3, bottom: 3 },
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.add([this.shadow, this.visualContainer, this.nameTag.container, this.promptLabel]);
    this.setSize(this.sprite.width, this.sprite.height);
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-18, -34, 36, 58),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    this.setScale(getPerspectiveScale(y, scene.roomMap?.worldHeight ?? scene.scale.height, { min: 0.93, max: 1.08 }));
    this.setDepth(getIsoDepth(x, y) + 10);
    this.isHovered = false;
    this.isContextFocused = false;

    scene.add.existing(this);
    this.on("pointerover", () => {
      this.setHovered(true);
    });
    this.on("pointerout", () => {
      this.setHovered(false);
    });
  }

  isPlayerNear(player, range) {
    return Phaser.Math.Distance.Between(this.logicalX, this.logicalY, player.x, player.y) <= range;
  }

  setHovered(isHovered) {
    this.isHovered = Boolean(isHovered);
    this.refreshHighlight();
  }

  setContextFocused(isFocused) {
    this.isContextFocused = Boolean(isFocused);
    this.refreshHighlight();
  }

  refreshHighlight() {
    if (this.isHovered || this.isContextFocused) {
      setOutlineHighlight(this.visualContainer, true, {
        color: 0xffe0a1,
        thickness: 2.35,
        softness: 0.24,
        alpha: this.isHovered ? 0.92 : 0.82,
      });
      return;
    }

    setOutlineHighlight(this.visualContainer, false);
  }

  setPromptVisible(isVisible) {
    this.promptLabel.setVisible(isVisible);
  }

  getDialogPayload() {
    return {
      speaker: this.name,
      text: this.dialog,
    };
  }
}
