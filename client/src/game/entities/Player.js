import Phaser from "phaser";
import { AvatarSprite } from "../avatar/AvatarSprite.js";
import { PLAYER_SPEED, PLAYER_SPRINT_MULTIPLIER } from "../constants.js";
import { createSpeechBubble } from "../ui/createSpeechBubble.js";
import { getPerspectiveScale } from "../world/perspective.js";
import { logicalToScreen } from "../world/roomUtils.js";

function getIsoDepth(logicalX, logicalY) {
  return (logicalX + logicalY) * 1.5;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, appearance) {
    super(scene, x, y, "player");

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.body.setSize(20, 24);
    this.body.setOffset(6, 14);
    this.setVisible(false);

    const screenPos = logicalToScreen(x, y);
    this.focusHalo = scene.add.ellipse(screenPos.x, screenPos.y + 2, 42, 20, 0xfff2b8, 0.12);
    this.avatar = new AvatarSprite(scene, screenPos.x, screenPos.y, appearance);
    scene.add.existing(this.avatar);
    this.emoteLabel = scene.add
      .text(screenPos.x, screenPos.y - 78, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#173449",
        backgroundColor: "#fff4cf",
        padding: { left: 6, right: 6, top: 3, bottom: 3 },
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.speechBubble = createSpeechBubble(scene, screenPos.x, screenPos.y - 54);
    this.activeEmoteId = null;
    this.emoteEndsAt = 0;
    this.baseAvatarScale = 1;
    this.setDepth(getIsoDepth(this.x, this.y) + 10);
  }

  setAppearance(appearance) {
    this.avatar.setAppearance(appearance);
  }

  setPhotoPose(poseId) {
    this.avatar.setPose?.(poseId);
  }

  update(movementInput = {}) {
    if (this.activeEmoteId && !this.hasActiveEmote()) {
      this.setEmoteState(null, 0);
    }

    const velocityX = Number(movementInput.x ?? 0);
    const velocityY = Number(movementInput.y ?? 0);

    const direction = new Phaser.Math.Vector2(velocityX, velocityY).normalize();
    const speedMultiplier = movementInput.isSprinting ? PLAYER_SPRINT_MULTIPLIER : 1;
    this.body.setVelocity(direction.x * PLAYER_SPEED * speedMultiplier, direction.y * PLAYER_SPEED * speedMultiplier);

    if (direction.x !== 0) {
      this.setFlipX(direction.x < 0);
      this.avatar.setFacing(direction.x < 0);
    }

    const isMoving = direction.lengthSq() > 0;
    const isSprinting = speedMultiplier > 1;
    this.avatar.updateMotion?.({
      isMoving,
      isSprinting,
      delta: this.scene.game.loop.delta,
    });

    const screenPos = logicalToScreen(this.x, this.y);
    const depth = getIsoDepth(this.x, this.y);

    this.avatar.setPosition(screenPos.x, screenPos.y);
    this.avatar.setScale(getPerspectiveScale(this.y, this.scene.roomMap?.worldHeight ?? this.scene.scale.height, { min: 0.92, max: 1.1 }) * this.baseAvatarScale);
    this.avatar.setDepth(depth + 10);
    this.focusHalo
      .setPosition(screenPos.x, screenPos.y + 3)
      .setDepth(depth + 8)
      .setScale(isMoving ? 1.06 : 1, isMoving ? 1.02 : 1)
      .setAlpha(isMoving ? 0.14 : 0.11);
    this.emoteLabel.setPosition(screenPos.x, screenPos.y - 78).setDepth(depth + 32).setVisible(this.hasActiveEmote());
    this.speechBubble.setPosition(screenPos.x, screenPos.y - 54);
    this.setDepth(depth + 10);

    return {
      isMoving,
      isSprinting,
    };
  }

  showSpeechBubble(message) {
    this.speechBubble.setPosition(this.x, this.y - 54);
    this.speechBubble.show(message);
  }

  setSpeechBubblesEnabled(isEnabled) {
    this.speechBubble.setEnabled(isEnabled);
  }

  setPerformanceMode(isEnabled) {
    this.avatar.setPerformanceMode?.(isEnabled);
    this.speechBubble.setPerformanceMode?.(isEnabled);
  }

  setEmoteState(emoteId, emoteEndsAt = 0) {
    this.activeEmoteId = emoteId || null;
    this.emoteEndsAt = Number(emoteEndsAt ?? 0);
    this.avatar.setPose(this.activeEmoteId ?? "neutral");
    this.emoteLabel.setText(this.activeEmoteId ? this.activeEmoteId.toUpperCase() : "");
    this.emoteLabel.setVisible(Boolean(this.activeEmoteId));
  }

  hasActiveEmote() {
    return Boolean(this.activeEmoteId && this.emoteEndsAt > this.scene.time.now);
  }

  hasMovementLockedEmote() {
    return this.hasActiveEmote() && (this.activeEmoteId === "sit" || this.activeEmoteId === "dance");
  }

  destroy(fromScene) {
    this.focusHalo.destroy();
    this.emoteLabel.destroy();
    this.speechBubble.destroy();
    this.avatar.destroy();
    super.destroy(fromScene);
  }
}
