import { GAME_SIZE } from "../constants.js";
import { createPanel } from "./createPanel.js";

function createAudioMarkup(settings) {
  return `
    <div style="width: 380px; color: #dbeefa; font-family: Trebuchet MS, sans-serif; display: grid; gap: 14px;">
      <div>
        <div style="color:#fff4db; font-weight:bold; margin-bottom:6px;">Music</div>
        <input data-audio-slider="musicVolume" type="range" min="0" max="100" value="${Math.round(settings.musicVolume * 100)}" />
      </div>
      <div>
        <div style="color:#fff4db; font-weight:bold; margin-bottom:6px;">Effects</div>
        <input data-audio-slider="effectsVolume" type="range" min="0" max="100" value="${Math.round(settings.effectsVolume * 100)}" />
      </div>
      <div>
        <div style="color:#fff4db; font-weight:bold; margin-bottom:6px;">Ambient</div>
        <input data-audio-slider="ambientVolume" type="range" min="0" max="100" value="${Math.round(settings.ambientVolume * 100)}" />
      </div>
      <div>
        <label style="display:flex; justify-content:space-between; align-items:center; color:#fff4db; font-weight:bold;">
          <span>Chat Visible</span>
          <input data-audio-toggle="chatVisible" type="checkbox" ${settings.chatVisible ? "checked" : ""} />
        </label>
      </div>
      <div>
        <label style="display:flex; justify-content:space-between; align-items:center; color:#fff4db; font-weight:bold;">
          <span>Speech Bubbles</span>
          <input data-audio-toggle="speechBubblesEnabled" type="checkbox" ${settings.speechBubblesEnabled ? "checked" : ""} />
        </label>
      </div>
      <div>
        <label style="display:flex; justify-content:space-between; align-items:center; color:#fff4db; font-weight:bold;">
          <span>Performance Mode</span>
          <input data-audio-toggle="performanceMode" type="checkbox" ${settings.performanceMode ? "checked" : ""} />
        </label>
      </div>
      <div data-audio-feedback style="min-height:18px; color:#b8f2c8; font-size:13px;"></div>
    </div>
  `;
}

export function createAudioPanel(scene, initialSettings) {
  const container = scene.add.container(0, 0).setScrollFactor(0).setVisible(false).setDepth(2060);
  const overlay = scene.add.rectangle(0, 0, GAME_SIZE.width, GAME_SIZE.height, 0x031018, 0.58).setOrigin(0);
  const frame = createPanel(scene, {
    x: 948,
    y: 360,
    width: 450,
    height: 430,
    fillColor: 0x07131d,
    fillAlpha: 0.96,
    strokeColor: 0x9bd3ff,
    strokeAlpha: 0.22,
    scrollFactor: 0,
  });

  const title = scene.add.text(748, 166, "Settings", {
    fontFamily: "Georgia",
    fontSize: "28px",
    fontStyle: "bold",
    color: "#fff4db",
  });

  const hint = scene.add.text(748, 200, "M ile kapat", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#9bd3ff",
  });

  const dom = scene.add.dom(760, 380).createFromHTML(createAudioMarkup(initialSettings));
  const feedback = dom.node.querySelector("[data-audio-feedback]");
  let changeHandler = null;

  dom.node.addEventListener("input", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const settingKey = target.dataset.audioSlider;

    if (!settingKey) {
      return;
    }

    changeHandler?.({
      [settingKey]: Number(target.value) / 100,
    });
  });

  dom.node.addEventListener("change", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const settingKey = target.dataset.audioToggle;

    if (!settingKey) {
      return;
    }

    changeHandler?.({
      [settingKey]: Boolean(target.checked),
    });
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
    onChange(handler) {
      changeHandler = handler;
    },
    setFeedback(message, isError = false) {
      feedback.textContent = message ?? "";
      feedback.style.color = isError ? "#ffcfb8" : "#b8f2c8";
    },
    update(settings) {
      ["musicVolume", "ambientVolume", "effectsVolume"].forEach((key) => {
        const input = dom.node.querySelector(`[data-audio-slider="${key}"]`);
        if (input instanceof HTMLInputElement) {
          input.value = String(Math.round(Number(settings[key] ?? 0) * 100));
        }
      });
      ["chatVisible", "speechBubblesEnabled", "performanceMode"].forEach((key) => {
        const input = dom.node.querySelector(`[data-audio-toggle="${key}"]`);
        if (input instanceof HTMLInputElement) {
          input.checked = Boolean(settings[key]);
        }
      });
    },
  };
}
