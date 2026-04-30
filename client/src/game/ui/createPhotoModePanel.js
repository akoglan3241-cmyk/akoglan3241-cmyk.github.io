import { GAME_SIZE } from "../constants.js";
import { createPanel } from "./createPanel.js";

function createPhotoModeMarkup(state) {
  const cameraModeLabel = state.cameraMode === "follow" ? "Oyuncuya Ortala" : "Mevcut Gorunum";
  return `
    <div style="width: 360px; color: #dbeefa; font-family: Trebuchet MS, sans-serif; display: grid; gap: 12px;">
      <div style="color:#fff4db; font-size:14px; line-height:1.5;">
        HUD'i gizleyebilir, kamerayi sabitleyebilir ve ekran goruntusu icin basit bir poz secebilirsin.
      </div>
      <button type="button" data-photo-action="toggle-hud">${state.hudHidden ? "HUD Goster" : "HUD Gizle"}</button>
      <button type="button" data-photo-action="camera-mode">${cameraModeLabel}</button>
      <div style="display:grid; gap:8px;">
        <div style="color:#fff4db; font-weight:bold;">Poz</div>
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px;">
          <button type="button" data-photo-pose="neutral">Normal</button>
          <button type="button" data-photo-pose="wave">Wave</button>
          <button type="button" data-photo-pose="sit">Sit</button>
          <button type="button" data-photo-pose="laugh">Laugh</button>
        </div>
      </div>
      <div data-photo-feedback style="min-height:18px; color:#9bd3ff; font-size:13px;"></div>
    </div>
  `;
}

export function createPhotoModePanel(scene, initialState = {}) {
  const container = scene.add.container(0, 0).setScrollFactor(0).setVisible(false).setDepth(2065);
  const overlay = scene.add.rectangle(0, 0, GAME_SIZE.width, GAME_SIZE.height, 0x031018, 0.4).setOrigin(0);
  const frame = createPanel(scene, {
    x: 820,
    y: 318,
    width: 420,
    height: 300,
    fillColor: 0x07131d,
    fillAlpha: 0.96,
    strokeColor: 0xffd99d,
    strokeAlpha: 0.22,
    scrollFactor: 0,
  });
  const title = scene.add.text(640, 182, "Photo Mode", {
    fontFamily: "Georgia",
    fontSize: "28px",
    fontStyle: "bold",
    color: "#fff4db",
  });
  const hint = scene.add.text(640, 216, "V veya Esc ile kapat", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#9bd3ff",
  });
  const dom = scene.add.dom(660, 340).createFromHTML(createPhotoModeMarkup(initialState));
  let feedback = dom.node.querySelector("[data-photo-feedback]");

  let hudHandler = null;
  let cameraModeHandler = null;
  let poseHandler = null;

  dom.node.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const action = target.dataset.photoAction;
    const poseId = target.dataset.photoPose;

    if (action === "toggle-hud") {
      hudHandler?.();
      return;
    }

    if (action === "camera-mode") {
      cameraModeHandler?.();
      return;
    }

    if (poseId) {
      poseHandler?.(poseId);
    }
  });

  container.add([overlay, frame, title, hint, dom]);
  dom.node.style.display = 'none';

  return {
    open() {
      dom.node.style.display = '';
      container.setVisible(true);
    },
    close() {
      container.setVisible(false);
      dom.node.style.display = 'none';
    },
    isVisible() {
      return container.visible;
    },
    onToggleHud(handler) {
      hudHandler = handler;
    },
    onToggleCameraMode(handler) {
      cameraModeHandler = handler;
    },
    onSelectPose(handler) {
      poseHandler = handler;
    },
    setFeedback(message) {
      feedback.textContent = message ?? "";
    },
    update(state) {
      dom.node.innerHTML = createPhotoModeMarkup(state);
      feedback = dom.node.querySelector("[data-photo-feedback]");
    },
  };
}
