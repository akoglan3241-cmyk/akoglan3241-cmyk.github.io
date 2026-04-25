import Phaser from "phaser";
import { AvatarSprite } from "../avatar/AvatarSprite.js";
import { setOutlineHighlight } from "../render/OutlineHighlightPipeline.js";
import { createNameTag } from "../ui/createNameTag.js";
import { createSpeechBubble } from "../ui/createSpeechBubble.js";
import { sanitizePlayerName, sanitizeProfileStatus } from "../utils/userContentValidation.js";
import { getPerspectiveScale } from "../world/perspective.js";
import { logicalToScreen } from "../world/roomUtils.js";

function getIsoDepth(logicalX, logicalY) {
  return (logicalX + logicalY) * 1.5;
}

const REMOTE_INTERPOLATION_BACK_TIME_MS = 90;
const REMOTE_SNAPSHOT_LIMIT = 8;
const REMOTE_SNAP_DISTANCE = 180;

export class RemotePlayer extends Phaser.GameObjects.Container {
  constructor(scene, { id, name, appearance, x, y, flipX = false, statusText = "", equippedBadgeLabel = "", level = null }) {
    const screenPos = logicalToScreen(x, y);
    super(scene, screenPos.x, screenPos.y);

    this.id = id;
    this.name = sanitizePlayerName(name);
    this.avatar = new AvatarSprite(scene, 0, 0, appearance);
    this.nameTag = createNameTag(scene, 0, -36, {
      isLocal: false,
      initialName: name,
      initialLevel: level,
      initialBadge: equippedBadgeLabel,
    });
    this.statusTooltip = scene.add
      .text(0, -66, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#173449",
        backgroundColor: "#fff4cf",
        padding: { left: 6, right: 6, top: 3, bottom: 3 },
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.emoteLabel = scene.add
      .text(0, -80, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "11px",
        color: "#173449",
        backgroundColor: "#fff4cf",
        padding: { left: 6, right: 6, top: 3, bottom: 3 },
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.speechBubble = createSpeechBubble(scene, screenPos.x, screenPos.y - 54);

    this.add([this.avatar, this.nameTag.container, this.statusTooltip, this.emoteLabel]);
    this.setSize(40, 68);
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-20, -42, 40, 68),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    this.setDepth(getIsoDepth(x, y) + 10);
    this.avatar.setFacing(flipX);
    this.statusText = sanitizeProfileStatus(statusText);
    this.equippedBadgeLabel = sanitizePlayerName(equippedBadgeLabel, "");
    this.level = Number(level ?? 0);
    this.statusTooltip.setText(this.statusText);
    this.isPartyMember = false;
    this.snapshotBuffer = [
      {
        x,
        y,
        flipX: Boolean(flipX),
        receivedAt: scene.time.now,
      },
    ];
    this.renderState = {
      x,
      y,
      previousX: x,
      previousY: y,
      facingLeft: Boolean(flipX),
      isMoving: false,
      isSprinting: false,
    };
    this.performanceMode = false;
    this.activeEmoteId = null;
    this.emoteEndsAt = 0;
    this.baseAvatarScale = 1;
    this.isHovered = false;
    this.isSelected = false;

    scene.add.existing(this);
    this.on("pointerover", () => {
      this.setHovered(true);
    });
    this.on("pointerout", () => {
      this.setHovered(false);
    });
  }

  onSelect(handler) {
    this.off("pointerdown");
    this.on("pointerdown", () => {
      handler?.(this);
    });
  }

  setHovered(isHovered) {
    this.isHovered = Boolean(isHovered);
    this.statusTooltip.setVisible(this.isHovered && Boolean(this.statusText));
    this.refreshHighlight();
  }

  setSelected(isSelected) {
    this.isSelected = Boolean(isSelected);
    this.refreshHighlight();
  }

  refreshHighlight() {
    const highlightTarget = this.avatar.getHighlightTarget?.() ?? this.avatar;

    if (this.isSelected) {
      setOutlineHighlight(highlightTarget, true, {
        color: 0xffefae,
        thickness: 3.2,
        softness: 0.24,
        alpha: 0.96,
      });
      return;
    }

    if (this.isHovered) {
      setOutlineHighlight(highlightTarget, true, {
        color: 0x9bd3ff,
        thickness: 2.45,
        softness: 0.26,
        alpha: 0.9,
      });
      return;
    }

    setOutlineHighlight(highlightTarget, false);
  }

  updateState({ x, y, flipX, name, appearance, statusText, equippedBadgeLabel, activeEmoteId, emoteEndsAt, level }) {
    this.pushSnapshot({
      x: Number(x ?? this.renderState.x),
      y: Number(y ?? this.renderState.y),
      flipX: Boolean(flipX),
      receivedAt: this.scene.time.now,
    });

    if (appearance) {
      this.avatar.setAppearance(appearance);
    }

    this.statusText = sanitizeProfileStatus(statusText);
    this.equippedBadgeLabel = sanitizePlayerName(equippedBadgeLabel ?? this.equippedBadgeLabel ?? "", "");
    this.level = Number(level ?? this.level ?? 0);
    this.statusTooltip.setText(this.statusText);
    this.statusTooltip.setVisible(this.isHovered && Boolean(this.statusText));

    if (name && name !== this.name) {
      this.name = sanitizePlayerName(name);
    }
    this.nameTag.update(this.name, this.level, this.equippedBadgeLabel);
    this.setEmoteState(activeEmoteId, emoteEndsAt);
  }

  pushSnapshot(snapshot) {
    const previousSnapshot = this.snapshotBuffer[this.snapshotBuffer.length - 1] ?? null;
    this.snapshotBuffer.push(snapshot);

    if (this.snapshotBuffer.length > REMOTE_SNAPSHOT_LIMIT) {
      this.snapshotBuffer = this.snapshotBuffer.slice(-REMOTE_SNAPSHOT_LIMIT);
    }

    if (
      previousSnapshot &&
      Phaser.Math.Distance.Between(previousSnapshot.x, previousSnapshot.y, snapshot.x, snapshot.y) > REMOTE_SNAP_DISTANCE
    ) {
      this.snapshotBuffer = [snapshot];
      this.renderState.x = snapshot.x;
      this.renderState.y = snapshot.y;
      this.renderState.previousX = snapshot.x;
      this.renderState.previousY = snapshot.y;
      this.x = snapshot.x;
      this.y = snapshot.y;
    }
  }

  consumeSnapshots(renderTimestamp) {
    while (this.snapshotBuffer.length >= 2 && this.snapshotBuffer[1].receivedAt <= renderTimestamp) {
      this.snapshotBuffer.shift();
    }

    return {
      from: this.snapshotBuffer[0] ?? null,
      to: this.snapshotBuffer[1] ?? null,
    };
  }

  updateRenderState(delta) {
    const now = this.scene.time.now;
    const renderTimestamp = now - REMOTE_INTERPOLATION_BACK_TIME_MS;
    const { from, to } = this.consumeSnapshots(renderTimestamp);

    this.renderState.previousX = this.renderState.x;
    this.renderState.previousY = this.renderState.y;

    if (from && to) {
      const span = Math.max(1, to.receivedAt - from.receivedAt);
      const t = Phaser.Math.Clamp((renderTimestamp - from.receivedAt) / span, 0, 1);
      this.renderState.x = Phaser.Math.Linear(from.x, to.x, t);
      this.renderState.y = Phaser.Math.Linear(from.y, to.y, t);
      this.renderState.facingLeft = to.flipX;
      return;
    }

    const targetSnapshot = from ?? to;
    if (!targetSnapshot) {
      return;
    }

    const smoothing = 1 - Math.exp(-Math.max(8, Number(delta ?? 16)) / 60);
    this.renderState.x = Phaser.Math.Linear(this.renderState.x, targetSnapshot.x, smoothing);
    this.renderState.y = Phaser.Math.Linear(this.renderState.y, targetSnapshot.y, smoothing);
    this.renderState.facingLeft = targetSnapshot.flipX;
  }

  applyPresentation(delta) {
    if (this.activeEmoteId && !this.hasActiveEmote()) {
      this.setEmoteState(null, 0);
    }

    const deltaX = this.renderState.x - this.renderState.previousX;
    const deltaY = this.renderState.y - this.renderState.previousY;
    const movementSpeed = Math.hypot(deltaX, deltaY);

    this.renderState.isMoving = movementSpeed > 0.08;
    this.renderState.isSprinting = movementSpeed > 2.3;

    if (Math.abs(deltaX) > 0.08) {
      this.renderState.facingLeft = deltaX < 0;
    }

    const screenPos = logicalToScreen(this.renderState.x, this.renderState.y);
    this.x = screenPos.x;
    this.y = screenPos.y;
    this.setDepth(getIsoDepth(this.renderState.x, this.renderState.y) + 10);
    this.avatar.setScale(getPerspectiveScale(this.renderState.y, this.scene.roomMap?.worldHeight ?? this.scene.scale.height, { min: 0.92, max: 1.1 }) * this.baseAvatarScale);
    this.avatar.setFacing(this.renderState.facingLeft);
    this.avatar.updateMotion?.({
      isMoving: this.renderState.isMoving,
      isSprinting: this.renderState.isSprinting,
      delta,
    });

    this.speechBubble.setPosition(this.x, this.y - 54);
    this.speechBubble.setDepth(this.depth + 50);
    this.emoteLabel.setVisible(this.hasActiveEmote());
    this.speechBubble.setPosition(this.x, this.y - 54);
  }

  tick(delta) {
    this.updateRenderState(delta);
    this.applyPresentation(delta);
  }

  showSpeechBubble(message) {
    this.speechBubble.setPosition(this.x, this.y - 54);
    this.speechBubble.show(message);
  }

  setSpeechBubblesEnabled(isEnabled) {
    this.speechBubble.setEnabled(isEnabled);
  }

  setPerformanceMode(isEnabled) {
    this.performanceMode = Boolean(isEnabled);
    this.avatar.setPerformanceMode?.(this.performanceMode);
    this.speechBubble.setPerformanceMode?.(this.performanceMode);
  }

  setPartyMember(isPartyMember) {
    this.isPartyMember = Boolean(isPartyMember);
    this.nameTag.setPartyMember(this.isPartyMember);
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

  destroy(fromScene) {
    this.speechBubble.destroy();
    this.avatar.destroy();
    this.emoteLabel.destroy();
    this.statusTooltip.destroy();
    this.nameTag.destroy();
    super.destroy(fromScene);
  }
}
