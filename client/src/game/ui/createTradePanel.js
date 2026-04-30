import { GAME_SIZE } from "../constants.js";
import { getItemDefinition } from "../content/itemContent.js";
import { createPanel } from "./createPanel.js";
import { escapeHtml } from "../utils/safeHtml.js";
import { sanitizePlayerName } from "../utils/userContentValidation.js";

function renderOffer(offer) {
  const itemText = (offer?.items ?? []).map((entry) => {
    const item = getItemDefinition(entry.itemId);
    return `${entry.amount}x ${item?.label ?? entry.itemId}`;
  }).join(", ");

  return [
    offer?.coins ? `${offer.coins} coin` : null,
    itemText || null,
  ].filter(Boolean).join(" | ") || "Teklif yok";
}

function createMarkup() {
  return `
    <div style="width:540px; color:#dbeefa; font-family:Trebuchet MS, sans-serif;">
      <div data-trade-status style="min-height:18px; color:#ffcfb8; font-size:13px; margin-bottom:10px;"></div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
        <div style="background:#102331; border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:10px;">
          <div style="color:#fff4db; font-weight:bold; margin-bottom:6px;">Sen</div>
          <div data-trade-self-offer style="font-size:13px; color:#d8edf9;"></div>
          <div data-trade-self-confirmed style="font-size:12px; color:#9bd3ff; margin-top:6px;"></div>
        </div>
        <div style="background:#102331; border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:10px;">
          <div data-trade-other-name style="color:#fff4db; font-weight:bold; margin-bottom:6px;"></div>
          <div data-trade-other-offer style="font-size:13px; color:#d8edf9;"></div>
          <div data-trade-other-confirmed style="font-size:12px; color:#9bd3ff; margin-top:6px;"></div>
        </div>
      </div>
      <div data-trade-pending style="display:none; gap:8px; margin-bottom:12px;">
        <button type="button" data-trade-action="accept">Kabul</button>
        <button type="button" data-trade-action="reject">Reddet</button>
      </div>
      <form data-trade-offer-form style="display:flex; gap:8px; align-items:end; margin-bottom:10px;">
        <select name="itemId" style="flex:1;"></select>
        <input name="itemAmount" type="number" min="1" max="99" value="1" style="width:72px;" />
        <input name="coinAmount" type="number" min="0" max="9999" value="0" style="width:90px;" />
        <button type="submit">Teklifi Guncelle</button>
        <button type="button" data-trade-action="clear-offer">Temizle</button>
      </form>
      <div style="display:flex; gap:8px;">
        <button type="button" data-trade-action="confirm">Onayla</button>
        <button type="button" data-trade-action="cancel">Iptal</button>
      </div>
    </div>
  `;
}

export function createTradePanel(scene) {
  const container = scene.add.container(0, 0).setScrollFactor(0).setVisible(false).setDepth(2200);
  const overlay = scene.add.rectangle(0, 0, GAME_SIZE.width, GAME_SIZE.height, 0x031018, 0.58).setOrigin(0);
  const frame = createPanel(scene, {
    x: GAME_SIZE.width / 2,
    y: GAME_SIZE.height / 2,
    width: 620,
    height: 360,
    fillColor: 0x07131d,
    fillAlpha: 0.97,
    strokeColor: 0xffd99d,
    strokeAlpha: 0.22,
    scrollFactor: 0,
  });
  const title = scene.add.text(344, 192, "Trade", {
    fontFamily: "Georgia",
    fontSize: "28px",
    fontStyle: "bold",
    color: "#fff4db",
  });
  const hint = scene.add.text(864, 196, "Esc ile kapat", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#9bd3ff",
  }).setOrigin(1, 0);

  const dom = scene.add.dom(640, 404).createFromHTML(createMarkup());
  const root = dom.node;
  const status = root.querySelector("[data-trade-status]");
  const selfOffer = root.querySelector("[data-trade-self-offer]");
  const selfConfirmed = root.querySelector("[data-trade-self-confirmed]");
  const otherName = root.querySelector("[data-trade-other-name]");
  const otherOffer = root.querySelector("[data-trade-other-offer]");
  const otherConfirmed = root.querySelector("[data-trade-other-confirmed]");
  const pending = root.querySelector("[data-trade-pending]");
  const form = root.querySelector("[data-trade-offer-form]");
  const itemSelect = form.querySelector('select[name="itemId"]');
  const itemAmount = form.querySelector('input[name="itemAmount"]');
  const coinAmount = form.querySelector('input[name="coinAmount"]');

  let offerHandler = null;
  let actionHandler = null;
  let draftOffer = { coins: 0, items: [] };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    draftOffer = {
      coins: Math.max(0, Number(coinAmount.value ?? 0)),
      items: [...(draftOffer.items ?? [])],
    };

    if (itemSelect.value) {
      const existingIndex = draftOffer.items.findIndex((entry) => entry.itemId === itemSelect.value);
      const nextEntry = {
        itemId: itemSelect.value,
        amount: Math.max(1, Number(itemAmount.value ?? 1)),
      };
      if (existingIndex >= 0) {
        draftOffer.items[existingIndex] = nextEntry;
      } else {
        draftOffer.items.push(nextEntry);
      }
    }

    offerHandler?.(draftOffer);
  });

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const action = target.dataset.tradeAction;
    if (action) {
      if (action === "clear-offer") {
        draftOffer = { coins: 0, items: [] };
        coinAmount.value = "0";
        offerHandler?.(draftOffer);
        return;
      }
      actionHandler?.(action);
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
      status.textContent = "";
    },
    isVisible() {
      return container.visible;
    },
    onOfferUpdate(handler) {
      offerHandler = handler;
    },
    onAction(handler) {
      actionHandler = handler;
    },
    setStatus(message, isError = false) {
      status.textContent = message ?? "";
      status.style.color = isError ? "#ffcfb8" : "#b8f2c8";
    },
    update(tradeState, inventoryEntries, selfPlayerId) {
      if (!tradeState) {
        return;
      }

      const participants = Object.values(tradeState.participants ?? {});
      const selfParticipant = participants.find((entry) => entry.playerId === selfPlayerId) ?? participants[0];
      const otherParticipant = participants.find((entry) => entry.playerId !== selfPlayerId) ?? null;

      selfOffer.textContent = renderOffer(selfParticipant?.offer);
      draftOffer = {
        coins: selfParticipant?.offer?.coins ?? 0,
        items: [...(selfParticipant?.offer?.items ?? [])],
      };
      selfConfirmed.textContent = selfParticipant?.confirmed ? "Onaylandi" : "Onay bekliyor";
      otherName.textContent = sanitizePlayerName(otherParticipant?.playerName ?? "Diger Oyuncu");
      otherOffer.textContent = renderOffer(otherParticipant?.offer);
      otherConfirmed.textContent = otherParticipant?.confirmed ? "Onaylandi" : "Onay bekliyor";
      pending.style.display = tradeState.status === "pending" && tradeState.responderId === selfPlayerId ? "flex" : "none";

      const giftable = (inventoryEntries ?? []).filter((entry) => entry.id !== "coin" && entry.amount > 0);
      itemSelect.innerHTML = `<option value="">Sadece coin</option>${giftable
        .map((entry) => `<option value="${entry.id}">${escapeHtml(entry.label)} (${entry.amount})</option>`)
        .join("")}`;
      coinAmount.value = String(selfParticipant?.offer?.coins ?? 0);
    },
  };
}
