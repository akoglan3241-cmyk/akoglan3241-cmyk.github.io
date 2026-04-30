import { GAME_SIZE } from "../constants.js";
import { createPanel } from "./createPanel.js";

function renderFurnitureEntry(entry, selectedItemId) {
  const isSelected = entry.id === selectedItemId;
  return `<button type="button" data-place-item="${entry.id}" style="display:flex; justify-content:space-between; align-items:center; width:100%; background:${isSelected ? "#173449" : "#102331"}; color:#f4fbff; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:8px 10px; margin-bottom:8px;">
    <span>${entry.label}</span>
    <span>x${entry.amount}</span>
  </button>`;
}

export function createHomeEditorPanel(scene) {
  const container = scene.add.container(0, 0).setScrollFactor(0).setVisible(false).setDepth(2050);
  const frame = createPanel(scene, {
    x: 1080,
    y: 510,
    width: 340,
    height: 330,
    fillColor: 0x07131d,
    fillAlpha: 0.97,
    strokeColor: 0x9bd3ff,
    strokeAlpha: 0.22,
    scrollFactor: 0,
  });

  const title = scene.add.text(930, 360, "Home Edit", {
    fontFamily: "Georgia",
    fontSize: "24px",
    fontStyle: "bold",
    color: "#fff4db",
  }).setScrollFactor(0);

  const hint = scene.add.text(930, 390, "H ile kapat | Tika ve yerlestir", {
    fontFamily: "Trebuchet MS",
    fontSize: "13px",
    color: "#9bd3ff",
  }).setScrollFactor(0);

  const dom = scene.add.dom(1080, 525).createFromHTML(`
    <div style="width:300px; color:#dbeefa; font-family:Trebuchet MS, sans-serif;">
      <div data-home-feedback style="min-height:18px; color:#ffcfb8; font-size:13px; margin-bottom:10px;"></div>
      <div data-home-selection style="font-size:13px; color:#fff4db; margin-bottom:10px;">Bir mobilya sec.</div>
      <div style="display:flex; gap:8px; margin-bottom:12px;">
        <button type="button" data-home-action="move" style="flex:1;">Tasi</button>
        <button type="button" data-home-action="rotate" style="flex:1;">Dondur</button>
        <button type="button" data-home-action="remove" style="flex:1;">Kaldir</button>
      </div>
      <div data-home-list style="max-height:180px; overflow-y:auto; padding-right:4px;"></div>
    </div>
  `);

  const feedback = dom.node.querySelector("[data-home-feedback]");
  const selection = dom.node.querySelector("[data-home-selection]");
  const list = dom.node.querySelector("[data-home-list]");

  let placeHandler = null;
  let actionHandler = null;

  dom.node.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const itemId = target.dataset.placeItem;
    const action = target.dataset.homeAction;

    if (itemId) {
      placeHandler?.(itemId);
    }

    if (action) {
      actionHandler?.(action);
    }
  });

  container.add([frame, title, hint, dom]);
  dom.node.style.display = 'none';

  return {
    setVisible(isVisible) {
      container.setVisible(isVisible);
      dom.node.style.display = isVisible ? '' : 'none';
    },
    isVisible() {
      return container.visible;
    },
    open() {
      dom.node.style.display = '';
      container.setVisible(true);
    },
    close() {
      container.setVisible(false);
      dom.node.style.display = 'none';
    },
    onSelectItem(handler) {
      placeHandler = handler;
    },
    onAction(handler) {
      actionHandler = handler;
    },
    setFeedback(message, isError = false) {
      feedback.style.color = isError ? "#ffcfb8" : "#b8f2c8";
      feedback.textContent = message ?? "";
    },
    setSelectionText(message) {
      selection.textContent = message ?? "";
    },
    update(entries, selectedItemId, selectedPlacement) {
      list.innerHTML = entries.length
        ? entries.map((entry) => renderFurnitureEntry(entry, selectedItemId)).join("")
        : `<div style="color:#9aa9b4; font-size:13px;">Envanterde mobilya yok.</div>`;
      if (selectedPlacement) {
        selection.textContent = `Secili: ${selectedPlacement.itemId} (${selectedPlacement.x}, ${selectedPlacement.y})`;
      } else if (selectedItemId) {
        selection.textContent = `Yerlestirilecek: ${selectedItemId}`;
      } else {
        selection.textContent = "Bir mobilya sec.";
      }
    },
  };
}
