import Phaser from "phaser";

const DEFAULT_CONFIG = {
  zoom: 1,
  integerZoom: true,
  followEnabled: true,
  deadzoneWidth: 160,
  deadzoneHeight: 96,
  offsetX: 0,
  offsetY: 0,
};

function resolveZoom(value, integerZoom) {
  const safeZoom = Math.max(1, Number(value ?? 1));
  return integerZoom ? Math.max(1, Math.round(safeZoom)) : safeZoom;
}

function clampScrollToBounds(camera) {
  if (!camera?.useBounds) {
    return;
  }

  camera.scrollX = camera.clampX(camera.scrollX);
  camera.scrollY = camera.clampY(camera.scrollY);
}

function restartFollow(camera, target, config) {
  if (!camera || !target) {
    return;
  }

  camera.startFollow(target, true, 1, 1, config.offsetX, config.offsetY);
}

export function createPixelPerfectCameraController(scene, defaults = {}) {
  let camera = null;
  let target = null;
  let config = {
    ...DEFAULT_CONFIG,
    ...defaults,
  };

  function applyCoreState() {
    if (!camera) {
      return;
    }

    const zoom = resolveZoom(config.zoom, config.integerZoom);

    camera.setZoom(zoom);
    camera.roundPixels = true;

    if (config.deadzoneWidth > 0 && config.deadzoneHeight > 0) {
      camera.setDeadzone(Math.floor(config.deadzoneWidth), Math.floor(config.deadzoneHeight));
    } else {
      camera.deadzone = null;
    }

    if (config.followEnabled && target) {
      restartFollow(camera, target, config);
    } else {
      camera.stopFollow();
    }
  }

  function snapNow() {
    if (!camera) {
      return;
    }

    camera.scrollX = Math.floor(camera.scrollX);
    camera.scrollY = Math.floor(camera.scrollY);
    clampScrollToBounds(camera);
  }

  function attach(nextCamera = scene.cameras.main, nextTarget = null, overrides = {}) {
    camera = nextCamera;
    target = nextTarget ?? target;
    config = {
      ...config,
      ...overrides,
    };

    applyCoreState();

    if (target && config.followEnabled) {
      camera.centerOn(Math.floor(target.x), Math.floor(target.y));
    }

    snapNow();

    return camera;
  }

  function setBounds(x, y, width, height) {
    if (!camera) {
      return;
    }

    camera.setBounds(x, y, width, height);
    snapNow();
  }

  function setTarget(nextTarget) {
    target = nextTarget ?? null;

    if (camera && target && config.followEnabled) {
      restartFollow(camera, target, config);
      snapNow();
    }
  }

  function setFollowEnabled(isEnabled) {
    config.followEnabled = Boolean(isEnabled);
    applyCoreState();
    snapNow();
  }

  function setZoom(nextZoom) {
    config.zoom = nextZoom;
    applyCoreState();
    snapNow();
  }

  function update() {
    if (!camera) {
      return;
    }

    const zoom = resolveZoom(config.zoom, config.integerZoom);

    if (camera.zoom !== zoom) {
      camera.setZoom(zoom);
    }

    camera.roundPixels = true;

    if (!config.followEnabled) {
      snapNow();
      return;
    }

    if (target && camera._follow !== target) {
      restartFollow(camera, target, config);
    }
  }

  function destroy() {
    if (camera) {
      camera.stopFollow();
    }

    camera = null;
    target = null;
  }

  return {
    attach,
    setBounds,
    setTarget,
    setFollowEnabled,
    setZoom,
    update,
    snapNow,
    destroy,
    getCamera() {
      return camera;
    },
    getTarget() {
      return target;
    },
    getConfig() {
      return { ...config };
    },
  };
}

