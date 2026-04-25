import Phaser from "phaser";
import { getItemDefinition } from "../content/itemContent.js";
import { setOutlineHighlight } from "../render/OutlineHighlightPipeline.js";
import { createGroundShadow } from "../utils/createGroundShadow.js";
import { tileToWorld, logicalToScreen } from "../world/roomUtils.js";

function getIsoDepth(logicalX, logicalY) {
  return (logicalX + logicalY) * 1.5;
}

export class HomeFurniture {
  constructor(scene, placement, isEditMode = false) {
    this.scene = scene;
    this.placement = { ...placement };
    this.isHovered = false;
    this.isContextFocused = false;
    this.isSelected = false;
    this.isEditMode = Boolean(isEditMode);
    this.item = getItemDefinition(placement.itemId);
    
    const logicalPos = tileToWorld(this.placement.x, this.placement.y);
    this.logicalX = logicalPos.x;
    this.logicalY = logicalPos.y;
    
    const screenPos = logicalToScreen(this.logicalX, this.logicalY);
    this.x = screenPos.x;
    this.y = screenPos.y;

    const width = Math.max(1, Number(this.placement.width ?? this.item?.furniture?.width ?? 1));
    const height = Math.max(1, Number(this.placement.height ?? this.item?.furniture?.height ?? 1));
    const displayWidth = width * 48 - 8;
    const displayHeight = height * 48 - 8;
    const texture = this.item?.texture || "furnitureChair";
    this.behaviorType = this.resolveBehaviorType();
    
    const depth = getIsoDepth(this.logicalX, this.logicalY);

    this.shadow = createGroundShadow(scene, screenPos.x, screenPos.y + 6, {
      width: Math.max(24, displayWidth * 0.8),
      height: Math.max(12, displayHeight * 0.4),
      alpha: 0.2,
      depth: depth + 0.5,
    });

    this.sprite = scene.add.image(screenPos.x, screenPos.y, texture);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setAngle(Number(this.placement.rotation ?? 0));
    this.sprite.setDepth(depth + 8);
    this.sprite.setInteractive({ useHandCursor: true });

    this.selection = scene.add
      .rectangle(screenPos.x, screenPos.y, 48, 24) // Simplified isometric selection
      .setStrokeStyle(2, 0xffd99d, isEditMode ? 0.45 : 0)
      .setFillStyle(0xffffff, 0)
      .setDepth(depth + 9);

    this.glow = scene.add.circle(screenPos.x, screenPos.y, 32, 0xffe3a8, 0).setDepth(depth + 7);
    this.prompt = scene.add
      .text(screenPos.x, screenPos.y - 40, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#173449",
        backgroundColor: "#fff4cf",
        padding: { left: 6, right: 6, top: 3, bottom: 3 },
      })
      .setOrigin(0.5)
      .setDepth(depth + 12)
      .setVisible(false);

    this.selectHandler = null;
    this.sprite.on("pointerdown", () => {
      this.selectHandler?.(this);
    });
    this.sprite.on("pointerover", () => {
      this.setHovered(true);
    });
    this.sprite.on("pointerout", () => {
      this.setHovered(false);
    });
    this.applyInteractionState();
    this.refreshHighlight();
  }

  onSelect(handler) {
    this.selectHandler = handler;
  }

  setSelected(isSelected, isEditMode = false) {
    this.isSelected = Boolean(isSelected);
    this.isEditMode = Boolean(isEditMode);
    this.selection.setStrokeStyle(2, isSelected ? 0x72c8ff : 0xffd99d, isSelected ? 0.95 : isEditMode ? 0.45 : 0);
    this.refreshHighlight();
  }

  setEditMode(isEditMode) {
    this.isEditMode = Boolean(isEditMode);
    this.setSelected(this.isSelected, this.isEditMode);
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
    if (this.isSelected && this.isEditMode) {
      setOutlineHighlight(this.sprite, true, {
        color: 0x72c8ff,
        thickness: 2.8,
        softness: 0.22,
        alpha: 0.96,
      });
      return;
    }

    if (this.isHovered || this.isContextFocused) {
      setOutlineHighlight(this.sprite, true, {
        color: 0xffe0a1,
        thickness: 2.15,
        softness: 0.24,
        alpha: this.isHovered ? 0.86 : 0.76,
      });
      return;
    }

    setOutlineHighlight(this.sprite, false);
  }

  resolveBehaviorType() {
    if (this.item?.category === "chair") {
      return "chair";
    }

    if (this.item?.category === "lamp") {
      return "lamp";
    }

    if (["table", "plant", "decoration"].includes(this.item?.category)) {
      return "decor";
    }

    return null;
  }

  applyInteractionState() {
    const isLampOn = Boolean(this.placement?.interactionState?.isOn);
    this.glow.setAlpha(this.behaviorType === "lamp" && isLampOn ? 0.24 : 0);
    this.sprite.setTint(this.behaviorType === "lamp" && isLampOn ? 0xfff0c2 : 0xffffff);
  }

  getPromptLabel(localPlayerId = null) {
    if (this.behaviorType === "chair") {
      const occupiedByPlayerId = this.placement?.interactionState?.occupiedByPlayerId ?? null;
      if (occupiedByPlayerId && occupiedByPlayerId !== localPlayerId) {
        return "[E] Dolu";
      }
      if (occupiedByPlayerId === localPlayerId) {
        return "[E] Kalk";
      }
      return "[E] Otur";
    }

    if (this.behaviorType === "lamp") {
      return this.placement?.interactionState?.isOn ? "[E] Lambayi Kapat" : "[E] Lambayi Ac";
    }

    if (this.behaviorType === "decor") {
      return "[E] Incele";
    }

    return "";
  }

  setPromptVisible(isVisible, localPlayerId = null) {
    const text = isVisible ? this.getPromptLabel(localPlayerId) : "";
    this.prompt.setText(text);
    this.prompt.setVisible(Boolean(isVisible && text));
  }

  updatePlacement(placement) {
    this.placement = { ...placement };
    const logicalPos = tileToWorld(this.placement.x, this.placement.y);
    this.logicalX = logicalPos.x;
    this.logicalY = logicalPos.y;
    
    const screenPos = logicalToScreen(this.logicalX, this.logicalY);
    const depth = getIsoDepth(this.logicalX, this.logicalY);

    this.sprite.setPosition(screenPos.x, screenPos.y);
    this.x = screenPos.x;
    this.y = screenPos.y;
    this.sprite.setAngle(Number(this.placement.rotation ?? 0));
    this.sprite.setDepth(depth + 8);
    this.shadow.setPosition(screenPos.x, screenPos.y + 6);
    this.shadow.setDepth(depth + 0.5);
    this.selection.setPosition(screenPos.x, screenPos.y);
    this.selection.setDepth(depth + 9);
    this.glow.setPosition(screenPos.x, screenPos.y);
    this.glow.setDepth(depth + 7);
    this.prompt.setPosition(screenPos.x, screenPos.y - 40);
    this.prompt.setDepth(depth + 12);
    this.applyInteractionState();
  }

  destroy() {
    this.prompt.destroy();
    this.glow.destroy();
    this.shadow.destroy();
    this.sprite.destroy();
    this.selection.destroy();
  }
}
