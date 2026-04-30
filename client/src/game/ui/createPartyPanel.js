import { GAME_SIZE } from "../constants.js";
import { createPanel } from "./createPanel.js";
import { escapeHtml } from "../utils/safeHtml.js";
import { sanitizePlayerName, sanitizePlainText } from "../utils/userContentValidation.js";

function createMarkup() {
  return `
    <div style="width:360px; color:#dbeefa; font-family:Trebuchet MS, sans-serif;">
      <div data-party-feedback style="min-height:18px; color:#ffcfb8; font-size:13px; margin-bottom:10px;"></div>
      <div data-party-invite style="display:none; gap:8px; margin-bottom:12px;">
        <button type="button" data-party-action="accept">Davet Kabul</button>
        <button type="button" data-party-action="reject">Reddet</button>
      </div>
      <div style="color:#fff4db; font-weight:bold; margin-bottom:8px;">Party Uyeleri</div>
      <div data-party-members style="max-height:210px; overflow-y:auto;"></div>
      <div style="display:flex; gap:8px; margin-top:12px;">
        <button type="button" data-party-action="leave">Partyden Ayril</button>
      </div>
    </div>
  `;
}

export function createPartyPanel(scene) {
  const container = scene.add.container(0, 0).setScrollFactor(0).setVisible(false).setDepth(2050);
  const frame = createPanel(scene, {
    x: 1086,
    y: 454,
    width: 360,
    height: 330,
    fillColor: 0x07131d,
    fillAlpha: 0.96,
    strokeColor: 0xb8f2c8,
    strokeAlpha: 0.22,
    scrollFactor: 0,
  });
  const title = scene.add.text(930, 304, "Party", {
    fontFamily: "Georgia",
    fontSize: "24px",
    fontStyle: "bold",
    color: "#fff4db",
  }).setScrollFactor(0);
  const hint = scene.add.text(930, 334, "P ile ac/kapat | /p mesaj", {
    fontFamily: "Trebuchet MS",
    fontSize: "13px",
    color: "#9bd3ff",
  }).setScrollFactor(0);
  const dom = scene.add.dom(1086, 470).createFromHTML(createMarkup());
  const root = dom.node;
  const feedback = root.querySelector("[data-party-feedback]");
  const invite = root.querySelector("[data-party-invite]");
  const members = root.querySelector("[data-party-members]");
  let actionHandler = null;

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const action = target.dataset.partyAction;
    if (action) {
      actionHandler?.(action);
    }
  });

  container.add([frame, title, hint, dom]);
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
    onAction(handler) {
      actionHandler = handler;
    },
    setFeedback(message, isError = false) {
      feedback.textContent = message ?? "";
      feedback.style.color = isError ? "#ffcfb8" : "#b8f2c8";
    },
    update(partyState, selfPlayerId) {
      const hasInvite = Boolean(partyState?.pendingInvite?.targetPlayerId === selfPlayerId);
      invite.style.display = hasInvite ? "flex" : "none";
      members.innerHTML = (partyState?.members ?? []).length
        ? partyState.members.map((entry) => `<div style="background:#102331; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:8px 10px; margin-bottom:8px;">
            <div style="color:#f4fbff; font-weight:bold;">${escapeHtml(sanitizePlayerName(entry.playerName))}${entry.isLeader ? " (Lider)" : ""}</div>
            <div style="font-size:12px; color:#9bd3ff;">Oda: ${escapeHtml(sanitizePlainText(entry.roomId, 48))}</div>
          </div>`).join("")
        : `<div style="color:#9aa9b4; font-size:13px;">Aktif party yok.</div>`;
    },
  };
}
