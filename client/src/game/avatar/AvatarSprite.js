import Phaser from "phaser";
import { normalizeAppearance } from "./avatarOptions.js";
import { createGroundShadow } from "../utils/createGroundShadow.js";

export class AvatarSprite extends Phaser.GameObjects.Container {
  constructor(scene, x, y, appearance) {
    super(scene, x, y);

    this.outlineScale = 1.08;
    this.shadowLayer = createGroundShadow(scene, 0, 14, {
      width: 22,
      height: 9,
      alpha: 0.24,
    });
    this.bodyOutlineLayer = scene.add.image(0, 0, "avatar-body").setTint(0x13202a).setAlpha(0.9);
    this.bottomOutlineLayer = scene.add.image(0, 0, "avatar-bottom-navy").setTint(0x13202a).setAlpha(0.9);
    this.topOutlineLayer = scene.add.image(0, 0, "avatar-top-blue").setTint(0x13202a).setAlpha(0.9);
    this.hairOutlineLayer = scene.add.image(0, 0, "avatar-hair-short").setTint(0x13202a).setAlpha(0.9);
    this.accessoryOutlineLayer = scene.add.image(0, 0, "avatar-accessory-none").setTint(0x13202a).setAlpha(0.9);
    this.bodyLayer = scene.add.image(0, 0, "avatar-body");
    this.faceLayer = scene.add.image(0, 0, "avatar-face");
    this.bottomLayer = scene.add.image(0, 0, "avatar-bottom-navy");
    this.topLayer = scene.add.image(0, 0, "avatar-top-blue");
    this.hairLayer = scene.add.image(0, 0, "avatar-hair-short");
    this.accessoryLayer = scene.add.image(0, 0, "avatar-accessory-none");

    this.outlineLayers = [this.bodyOutlineLayer, this.bottomOutlineLayer, this.topOutlineLayer, this.hairOutlineLayer, this.accessoryOutlineLayer];
    this.layers = [this.bodyLayer, this.faceLayer, this.bottomLayer, this.topLayer, this.hairLayer, this.accessoryLayer];
    this.visualContainer = scene.add.container(0, 0, [...this.outlineLayers, ...this.layers]);
    this.add([this.shadowLayer, this.visualContainer]);
    this.motionPhase = 0;
    this.performanceMode = false;
    this.motionState = {
      isMoving: false,
      isSprinting: false,
      idleLift: 0,
      stepLift: 0,
      sway: 0,
    };

    this.setAppearance(appearance);
    this.setPose("neutral");
  }

  getHighlightTarget() {
    return this.visualContainer;
  }

  setAppearance(rawAppearance) {
    const appearance = normalizeAppearance(rawAppearance);

    this.appearance = appearance;
    this.bottomOutlineLayer.setTexture(`avatar-bottom-${appearance.bottom}`);
    this.topOutlineLayer.setTexture(`avatar-top-${appearance.top}`);
    this.hairOutlineLayer.setTexture(`avatar-hair-${appearance.hair}`);
    this.accessoryOutlineLayer.setTexture(`avatar-accessory-${appearance.accessory}`);
    this.bottomLayer.setTexture(`avatar-bottom-${appearance.bottom}`);
    this.topLayer.setTexture(`avatar-top-${appearance.top}`);
    this.hairLayer.setTexture(`avatar-hair-${appearance.hair}`);
    this.accessoryLayer.setTexture(`avatar-accessory-${appearance.accessory}`);
    this.accessoryOutlineLayer.setVisible(appearance.accessory !== "none");
    this.accessoryLayer.setVisible(appearance.accessory !== "none");
  }

  setFacing(isFlipped) {
    [...this.outlineLayers, ...this.layers].forEach((child) => {
      child.setFlipX?.(isFlipped);
    });
  }

  setPose(poseId = "neutral") {
    this.poseId = String(poseId ?? "neutral");

    this.resetTransforms();
    if (this.poseId !== "neutral") {
      this.animatePose(16);
    }
  }

  resetTransforms() {
    this.bodyLayer.setPosition(0, 0).setRotation(0).setScale(1, 1);
    this.faceLayer.setPosition(0, 0).setRotation(0).setScale(1, 1);
    this.bottomLayer.setPosition(0, 0).setRotation(0).setScale(1, 1);
    this.topLayer.setPosition(0, 0).setRotation(0).setScale(1, 1);
    this.hairLayer.setPosition(0, 0).setRotation(0).setScale(1, 1);
    this.accessoryLayer.setPosition(0, 0).setRotation(0).setScale(1, 1);
    this.setAngle(0);
    this.setScale(1, 1);
    this.syncOutlineTransforms();
  }

  syncOutlineLayer(outlineLayer, sourceLayer, scaleBoost = this.outlineScale) {
    outlineLayer
      .setPosition(sourceLayer.x, sourceLayer.y)
      .setRotation(sourceLayer.rotation)
      .setScale(sourceLayer.scaleX * scaleBoost, sourceLayer.scaleY * scaleBoost)
      .setVisible(sourceLayer.visible);
  }

  syncOutlineTransforms() {
    this.syncOutlineLayer(this.bodyOutlineLayer, this.bodyLayer, this.outlineScale);
    this.syncOutlineLayer(this.bottomOutlineLayer, this.bottomLayer, this.outlineScale);
    this.syncOutlineLayer(this.topOutlineLayer, this.topLayer, this.outlineScale);
    this.syncOutlineLayer(this.hairOutlineLayer, this.hairLayer, this.outlineScale + 0.02);
    this.syncOutlineLayer(this.accessoryOutlineLayer, this.accessoryLayer, this.outlineScale);
  }

  setPerformanceMode(isEnabled) {
    this.performanceMode = Boolean(isEnabled);
    if (this.performanceMode) {
      this.motionPhase = 0;
      this.updateMotion({ isMoving: false, isSprinting: false, delta: 16 });
    }
  }

  updateMotion({ isMoving = false, isSprinting = false, delta = 16 } = {}) {
    const safeDelta = Math.max(8, Number(delta ?? 16));
    const phaseSpeed = isMoving ? (isSprinting ? 0.027 : 0.018) : 0.008;
    this.motionPhase += safeDelta * phaseSpeed;

    if (this.poseId !== "neutral") {
      this.animatePose(safeDelta);
      this.shadowLayer.setScale(1, 1).setAlpha(0.24);
      return;
    }

    const idleLift = this.performanceMode ? 0 : Math.sin(this.motionPhase) * 0.65;
    const stepLift = this.performanceMode ? 0 : isMoving ? Math.sin(this.motionPhase * 2) * (isSprinting ? 1.5 : 0.95) : 0;
    const sway = this.performanceMode ? 0 : Math.sin(this.motionPhase * (isMoving ? 2 : 1.2)) * (isMoving ? 0.03 : 0.014);
    const lift = idleLift + stepLift;

    this.motionState = { isMoving, isSprinting, idleLift, stepLift, sway };

    this.resetTransforms();
    this.bodyLayer.setY(lift * 0.35).setRotation(-sway * 0.55);
    this.faceLayer.setY(lift * 0.44).setRotation(-sway * 0.38);
    this.topLayer.setY(lift * 0.9).setRotation(-sway);
    this.bottomLayer.setY(lift * 0.2).setScale(1 + Math.abs(sway) * 0.4, 1 - Math.abs(sway) * 0.18);
    this.hairLayer.setY(lift * 1.05).setRotation(-sway * 1.15);
    this.accessoryLayer.setY(lift * 1.02).setRotation(-sway * 0.9);
    this.setAngle(sway * 18);
    this.shadowLayer.setScale(1 - Math.abs(lift) * 0.016, 1 - Math.abs(lift) * 0.04).setAlpha(0.22 + (isMoving ? 0.06 : 0.02));
    this.syncOutlineTransforms();
  }

  animatePose(delta) {
    this.resetTransforms();
    const phase = this.motionPhase * 1.5;

    if (this.poseId === "wave") {
      const waveSide = Math.sin(phase * 4) * 0.35;
      this.topLayer.setPosition(4 + waveSide * 2, -2).setRotation(-0.3 + waveSide);
      this.accessoryLayer.setPosition(3 + waveSide * 2, -1).setRotation(waveSide * 0.5);
    } else if (this.poseId === "sit") {
      this.bodyLayer.setScale(1, 0.92);
      this.faceLayer.setPosition(0, -1);
      this.bottomLayer.setPosition(0, 5).setScale(1.08, 0.82);
      this.topLayer.setPosition(0, 2);
      this.hairLayer.setPosition(0, 1);
      const breath = Math.sin(phase) * 0.4;
      this.topLayer.setY(2 + breath);
      this.hairLayer.setY(1 + breath * 1.1);
    } else if (this.poseId === "dance") {
      const danceSway = Math.sin(phase * 3);
      const danceBounce = Math.abs(Math.cos(phase * 3)) * 2;
      this.setAngle(danceSway * 12);
      this.setY(this.y - danceBounce);
      this.topLayer.setPosition(danceSway * 3, -2 - danceBounce).setRotation(danceSway * 0.2);
      this.bottomLayer.setPosition(-danceSway, 2).setRotation(-danceSway * 0.1);
    } else if (this.poseId === "laugh") {
      const shake = Math.sin(phase * 8) * 0.8;
      this.setAngle(shake * 4);
      this.faceLayer.setPosition(0, -1 + shake);
      this.topLayer.setPosition(0, -1 + shake * 0.5);
      this.hairLayer.setPosition(0, -2 + shake * 1.2);
    } else if (this.poseId === "cry") {
      const shiver = Math.sin(phase * 12) * 0.35;
      this.setAngle(-6 + shiver);
      this.faceLayer.setPosition(0, 1);
      this.topLayer.setPosition(-1, 0.5 + shiver);
      this.hairLayer.setPosition(-1, 0.5);
    } else if (this.poseId === "surprised") {
      const pop = Math.abs(Math.sin(phase * 2)) * 1.5;
      this.setScale(1 + pop * 0.05, 1 - pop * 0.05);
      this.faceLayer.setY(-2 - pop);
      this.hairLayer.setY(-3 - pop * 1.2);
    }

    this.syncOutlineTransforms();
  }

  destroy(fromScene) {
    this.shadowLayer.destroy();
    this.visualContainer.destroy(true);
    super.destroy(fromScene);
  }
}
