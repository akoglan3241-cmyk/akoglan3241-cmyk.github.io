import { GAME_SIZE } from "../constants.js";
import { getItemDefinition } from "../content/itemContent.js";
import { createPanel } from "./createPanel.js";
import { escapeHtml } from "../utils/safeHtml.js";
import { sanitizePlayerName, sanitizePlainText } from "../utils/userContentValidation.js";

function renderRewardSummary(entry) {
  const itemText = (entry?.rewards?.items ?? [])
    .map((item) => {
      const itemDef = getItemDefinition(item.itemId);
      return `${item.amount}x ${itemDef?.label ?? item.itemId}`;
    })
    .join(", ");

  return [
    entry?.rewards?.coins ? `${entry.rewards.coins} coin` : null,
    entry?.rewards?.xp ? `${entry.rewards.xp} XP` : null,
    itemText || null,
  ].filter(Boolean).join(" | ");
}

function createMarkup() {
  return `
    <div style="width:520px; color:#dbeefa; font-family:Trebuchet MS, sans-serif;">
      <div data-mail-feedback style="min-height:18px; color:#ffcfb8; font-size:13px; margin-bottom:10px;"></div>
      <div style="display:grid; grid-template-columns:1.25fr 0.95fr; gap:14px;">
        <div>
          <div style="color:#fff4db; font-weight:bold; margin-bottom:8px;">Inbox</div>
          <div data-mail-list style="max-height:320px; overflow-y:auto; padding-right:6px;"></div>
        </div>
        <div>
          <div style="color:#fff4db; font-weight:bold; margin-bottom:8px;">Gift Gonder</div>
          <form data-gift-form style="display:flex; flex-direction:column; gap:8px;">
            <select name="friendId"></select>
            <select name="itemId"></select>
            <input name="quantity" type="number" min="1" max="99" value="1" />
            <input name="message" type="text" maxlength="80" placeholder="Kisa not (opsiyonel)" />
            <button type="submit">Gonder</button>
          </form>
        </div>
      </div>
    </div>
  `;
}

function renderMailRow(entry) {
  const badge = entry.isClaimed ? "Claimed" : "Claim";
  const summary = renderRewardSummary(entry) || "Odul yok";
  const sender = entry.kind === "gift" ? `Kimden: ${escapeHtml(sanitizePlayerName(entry.senderName ?? "Arkadas"))}` : "Sistem odulu";
  const subject = escapeHtml(sanitizePlainText(entry.subject, 80));
  const message = escapeHtml(sanitizePlainText(entry.message || "Yeni posta.", 240));

  return `<div style="background:#102331; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px 12px; margin-bottom:8px;">
    <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
      <div style="color:#f4fbff; font-weight:bold;">${subject}</div>
      ${entry.isClaimed ? `<span style="font-size:12px; color:#9aa9b4;">${badge}</span>` : `<button type="button" data-mail-claim-id="${entry.id}">${badge}</button>`}
    </div>
    <div style="font-size:12px; color:#9bd3ff; margin-top:4px;">${sender}</div>
    <div style="font-size:13px; color:#d8edf9; margin-top:6px;">${message}</div>
    <div style="font-size:12px; color:#ffd99d; margin-top:6px;">${summary}</div>
  </div>`;
}

export function createMailboxPanel(scene) {
  const container = scene.add.container(0, 0).setScrollFactor(0).setVisible(false).setDepth(2100);
  const overlay = scene.add.rectangle(0, 0, GAME_SIZE.width, GAME_SIZE.height, 0x031018, 0.56).setOrigin(0);
  const frame = createPanel(scene, {
    x: GAME_SIZE.width / 2,
    y: GAME_SIZE.height / 2,
    width: 620,
    height: 470,
    fillColor: 0x07131d,
    fillAlpha: 0.97,
    strokeColor: 0xffd99d,
    strokeAlpha: 0.22,
    scrollFactor: 0,
  });
  const title = scene.add.text(362, 138, "Mailbox", {
    fontFamily: "Georgia",
    fontSize: "28px",
    fontStyle: "bold",
    color: "#fff4db",
  });
  const hint = scene.add.text(362, 172, "N ile kapat", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#9bd3ff",
  });

  const dom = scene.add.dom(640, 398).createFromHTML(createMarkup());
  const feedback = dom.node.querySelector("[data-mail-feedback]");
  const mailList = dom.node.querySelector("[data-mail-list]");
  const giftForm = dom.node.querySelector("[data-gift-form]");
  const friendSelect = giftForm.querySelector('select[name="friendId"]');
  const itemSelect = giftForm.querySelector('select[name="itemId"]');
  const quantityInput = giftForm.querySelector('input[name="quantity"]');
  const messageInput = giftForm.querySelector('input[name="message"]');

  let claimHandler = null;
  let sendGiftHandler = null;

  dom.node.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const claimId = target.dataset.mailClaimId;
    if (claimId) {
      claimHandler?.(claimId);
    }
  });

  giftForm.addEventListener("submit", (event) => {
    event.preventDefault();
    sendGiftHandler?.({
      targetUserId: friendSelect.value,
      itemId: itemSelect.value,
      quantity: Number(quantityInput.value ?? 1),
      message: messageInput.value,
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
    setFeedback(message, isError = false) {
      feedback.textContent = message ?? "";
      feedback.style.color = isError ? "#ffcfb8" : "#b8f2c8";
    },
    onClaim(handler) {
      claimHandler = handler;
    },
    onSendGift(handler) {
      sendGiftHandler = handler;
    },
    update(mailboxState, friendsState, inventoryEntries) {
      mailList.innerHTML = mailboxState.entries.length
        ? mailboxState.entries.map((entry) => renderMailRow(entry)).join("")
        : `<div style="color:#9aa9b4; font-size:13px;">Inbox bos.</div>`;

      const friendOptions = (friendsState?.friends ?? [])
        .map((entry) => `<option value="${entry.playerId}">${escapeHtml(sanitizePlayerName(entry.playerName))}</option>`)
        .join("");
      friendSelect.innerHTML = friendOptions || `<option value="">Arkadas yok</option>`;
      friendSelect.disabled = !friendOptions;

      const giftableItems = (inventoryEntries ?? []).filter((entry) => entry.id !== "coin" && entry.amount > 0);
      itemSelect.innerHTML = giftableItems.length
        ? giftableItems.map((entry) => `<option value="${entry.id}">${entry.label} (${entry.amount})</option>`).join("")
        : `<option value="">Esya yok</option>`;
      itemSelect.disabled = giftableItems.length === 0;
    },
  };
}
