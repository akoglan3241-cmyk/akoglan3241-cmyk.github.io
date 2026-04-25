import Phaser from "phaser";
import { DAY_NIGHT_CONFIG, getRoomDayNightConfig } from "./dayNightConfig.js";

function lerpColor(leftColor, rightColor, t) {
  const left = Phaser.Display.Color.IntegerToRGB(leftColor);
  const right = Phaser.Display.Color.IntegerToRGB(rightColor);
  return Phaser.Display.Color.GetColor(
    Phaser.Math.Linear(left.r, right.r, t),
    Phaser.Math.Linear(left.g, right.g, t),
    Phaser.Math.Linear(left.b, right.b, t),
  );
}

function resolvePhase(progress) {
  const phases = DAY_NIGHT_CONFIG.phases;

  for (let index = 0; index < phases.length - 1; index += 1) {
    const start = phases[index];
    const end = phases[index + 1];

    if (progress >= start.progress && progress <= end.progress) {
      const localProgress = Phaser.Math.Clamp((progress - start.progress) / Math.max(0.0001, end.progress - start.progress), 0, 1);
      return {
        label: localProgress < 0.5 ? start.label : end.label,
        skyColor: lerpColor(start.skyColor, end.skyColor, localProgress),
        glowAlpha: Phaser.Math.Linear(start.glowAlpha, end.glowAlpha, localProgress),
        cloudAlpha: Phaser.Math.Linear(start.cloudAlpha, end.cloudAlpha, localProgress),
        darknessAlpha: Phaser.Math.Linear(start.darknessAlpha, end.darknessAlpha, localProgress),
      };
    }
  }

  const fallback = phases[0];
  return {
    label: fallback.label,
    skyColor: fallback.skyColor,
    glowAlpha: fallback.glowAlpha,
    cloudAlpha: fallback.cloudAlpha,
    darknessAlpha: fallback.darknessAlpha,
  };
}

export function createDayNightController(scene) {
  let room = null;
  let roomMap = null;
  let roomConfig = getRoomDayNightConfig(null);
  let cycleStartedAt = scene.time.now;
  let performanceMode = false;

  function applyVisualState() {
    if (!roomMap?.skyVisuals) {
      return null;
    }

    const isEnabled = roomConfig.enabled;
    const cycleProgress = isEnabled ? ((scene.time.now - cycleStartedAt) % roomConfig.cycleDurationMs) / roomConfig.cycleDurationMs : 0.25;
    const phase = resolvePhase(cycleProgress);
    const glowAlpha = isEnabled ? phase.glowAlpha : 0.16;
    const cloudAlpha = isEnabled ? phase.cloudAlpha : 0.72;
    const darknessAlpha = isEnabled ? phase.darknessAlpha : 0;

    roomMap.skyVisuals.sky.setFillStyle(isEnabled ? phase.skyColor : room.ambiance.skyColor, 1);
    roomMap.skyVisuals.skyGradientTop?.setAlpha(performanceMode ? 0.05 : 0.08 + glowAlpha * 0.25);
    roomMap.skyVisuals.skyGradientWarm?.setFillStyle(room.ambiance.glowColor, performanceMode ? Math.min(glowAlpha, 0.08) : glowAlpha * 0.55);
    roomMap.skyVisuals.glow.setAlpha(performanceMode ? Math.min(glowAlpha, 0.08) : glowAlpha);
    roomMap.skyVisuals.farClouds?.setAlpha(performanceMode ? 0.12 : cloudAlpha * 0.5);
    roomMap.skyVisuals.clouds.setAlpha(performanceMode ? Math.min(cloudAlpha, 0.3) : cloudAlpha);
    roomMap.skyVisuals.ambientTint?.setAlpha(performanceMode ? 0.03 : 0.04 + darknessAlpha * 0.35);
    roomMap.skyVisuals.vignette?.setAlpha(performanceMode ? 0.04 : 0.05 + darknessAlpha * 0.22);
    roomMap.skyVisuals.darkness.setAlpha(performanceMode ? Math.min(darknessAlpha, 0.1) : darknessAlpha);
    roomMap.skyVisuals.skyline.setAlpha(performanceMode ? 0.1 : 0.24);
    roomMap.skyVisuals.treeline?.setAlpha(performanceMode ? 0.08 : 0.18 + darknessAlpha * 0.2);
    if (!performanceMode) {
      roomMap.skyVisuals.farClouds.tilePositionX += 0.014;
      roomMap.skyVisuals.clouds.tilePositionX += 0.03;
      roomMap.skyVisuals.birds?.forEach((bird, index) => {
        bird.x += 0.08 + index * 0.015;
        bird.y += Math.sin((scene.time.now + index * 240) * 0.0022) * 0.08;
        if (bird.x > roomMap.worldWidth + 60) {
          bird.x = -60;
        }
      });
    }

    return {
      label: isEnabled ? phase.label : "Sabit",
      isEnabled,
    };
  }

  return {
    setRoom(nextRoom, nextRoomMap) {
      room = nextRoom;
      roomMap = nextRoomMap;
      roomConfig = getRoomDayNightConfig(nextRoom);
      cycleStartedAt = scene.time.now;
      return applyVisualState();
    },
    update() {
      return applyVisualState();
    },
    setPerformanceMode(nextPerformanceMode) {
      performanceMode = Boolean(nextPerformanceMode);
      return applyVisualState();
    },
    isEnabled() {
      return roomConfig.enabled;
    },
  };
}
