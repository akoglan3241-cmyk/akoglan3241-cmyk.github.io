import { GAME_SIZE } from "../constants.js";
import { createPanel } from "./createPanel.js";
import { escapeHtml } from "../utils/safeHtml.js";
import { sanitizePlayerName, sanitizePlainText } from "../utils/userContentValidation.js";

function createFriendsMarkup() {
  return `
    <div style="width: 428px; color: #dbeefa; font-family: Trebuchet MS, sans-serif;">
      <form data-friends-form style="display: flex; gap: 8px; margin-bottom: 14px;">
        <input name="friendName" type="text" maxlength="18" placeholder="Oyuncu adiyla istek gonder" style="flex: 1;" />
        <button type="submit">Gonder</button>
      </form>
      <form data-status-form style="display: flex; gap: 8px; margin-bottom: 14px;">
        <input name="statusText" type="text" maxlength="80" placeholder="Kisa profil durumu yaz" style="flex: 1;" />
        <button type="submit">Kaydet</button>
      </form>
      <form data-home-form style="display: flex; gap: 8px; align-items: center; margin-bottom: 14px;">
        <label style="display:flex; align-items:center; gap:8px; color:#dbeefa; font-size:13px;">
          <input name="homePublic" type="checkbox" />
          Evim herkese acik
        </label>
        <button type="submit">Guncelle</button>
      </form>
      <div data-friends-feedback style="min-height: 18px; color: #ffcfb8; font-size: 13px; margin-bottom: 8px;"></div>
      <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
        <div>
          <div style="color: #fff4db; font-weight: bold; margin-bottom: 6px;">Arkadaslar</div>
          <div data-friends-list style="max-height: 132px; overflow-y: auto; padding-right: 6px;"></div>
        </div>
        <div>
          <div style="color: #fff4db; font-weight: bold; margin-bottom: 6px;">Gelen Istekler</div>
          <div data-friends-incoming style="max-height: 92px; overflow-y: auto; padding-right: 6px;"></div>
        </div>
        <div>
          <div style="color: #fff4db; font-weight: bold; margin-bottom: 6px;">Giden Istekler</div>
          <div data-friends-outgoing style="max-height: 72px; overflow-y: auto; padding-right: 6px;"></div>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,0.08); padding-top:10px;">
          <div style="display:flex; justify-content:space-between; gap:8px; align-items:center; margin-bottom:6px;">
            <div style="color:#fff4db; font-weight:bold;">Ozel Mesajlar</div>
            <div data-dm-selected style="color:#9bd3ff; font-size:12px;">Arkadas sec</div>
          </div>
          <div data-dm-log style="max-height: 120px; overflow-y: auto; padding:8px; background:#0c1d28; border:1px solid rgba(255,255,255,0.08); border-radius:8px; margin-bottom:8px;"></div>
          <form data-dm-form style="display:flex; gap:8px;">
            <input name="dmMessage" type="text" maxlength="140" placeholder="Arkadasina mesaj yaz" style="flex:1;" />
            <button type="submit">Yolla</button>
          </form>
        </div>
      </div>
    </div>
  `;
}

function renderFriendRow(friend, includeActions = false, includeVisit = false) {
  const statusColor = friend.isOnline ? "#b8f2c8" : "#9aa9b4";
  const roomText = friend.isOnline ? ` | ${escapeHtml(sanitizePlainText(friend.roomName ?? friend.roomId ?? "-", 48))}` : "";
  const playerName = escapeHtml(sanitizePlayerName(friend.playerName));
  const actions = includeActions
    ? `<div style="display:flex; gap:6px; margin-top:6px;">
         <button type="button" data-friend-action="accept" data-friend-id="${friend.playerId}">Kabul</button>
         <button type="button" data-friend-action="reject" data-friend-id="${friend.playerId}">Reddet</button>
       </div>`
    : "";
  const visitButton = includeVisit
    ? `<div style="display:flex; gap:6px; margin-top:6px;">
         <button type="button" data-home-visit-id="${friend.playerId}">Evine Git</button>
         ${friend.isOnline ? `<button type="button" data-trade-player-id="${friend.playerId}">Trade</button>` : ""}
         ${friend.isOnline ? `<button type="button" data-party-player-id="${friend.playerId}">Party</button>` : ""}
       </div>`
    : "";

  return `<div style="background:#102331; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:8px 10px; margin-bottom:8px;">
    <div style="color:#f4fbff; font-weight:bold;">${playerName}</div>
    <div style="font-size:13px; color:${statusColor};">${friend.isOnline ? "Cevrimici" : "Cevrimdisi"}${roomText}</div>
    ${actions}
    ${visitButton}
  </div>`;
}

export function createFriendsPanel(scene) {
  const container = scene.add.container(0, 0).setScrollFactor(0).setVisible(false).setDepth(2000);
  const overlay = scene.add.rectangle(0, 0, GAME_SIZE.width, GAME_SIZE.height, 0x031018, 0.6).setOrigin(0);
  const frame = createPanel(scene, {
    x: GAME_SIZE.width / 2,
    y: GAME_SIZE.height / 2,
    width: 500,
    height: 540,
    fillColor: 0x07131d,
    fillAlpha: 0.97,
    strokeColor: 0x9bd3ff,
    strokeAlpha: 0.22,
    scrollFactor: 0,
  });

  const title = scene.add.text(394, 116, "Friends", {
    fontFamily: "Georgia",
    fontSize: "28px",
    fontStyle: "bold",
    color: "#fff4db",
  });

  const hint = scene.add.text(394, 150, "F ile kapat", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#9bd3ff",
  });

  const dom = scene.add.dom(426, 378).createFromHTML(createFriendsMarkup());
  const form = dom.node.querySelector("[data-friends-form]");
  const statusForm = dom.node.querySelector("[data-status-form]");
  const homeForm = dom.node.querySelector("[data-home-form]");
  const input = dom.node.querySelector('input[name="friendName"]');
  const statusInput = dom.node.querySelector('input[name="statusText"]');
  const homePublicInput = dom.node.querySelector('input[name="homePublic"]');
  const feedback = dom.node.querySelector("[data-friends-feedback]");
  const friendsList = dom.node.querySelector("[data-friends-list]");
  const incomingList = dom.node.querySelector("[data-friends-incoming]");
  const outgoingList = dom.node.querySelector("[data-friends-outgoing]");
  const dmSelected = dom.node.querySelector("[data-dm-selected]");
  const dmLog = dom.node.querySelector("[data-dm-log]");
  const dmForm = dom.node.querySelector("[data-dm-form]");
  const dmInput = dom.node.querySelector('input[name="dmMessage"]');

  let submitHandler = null;
  let respondHandler = null;
  let statusHandler = null;
  let homeHandler = null;
  let visitHandler = null;
  let tradeHandler = null;
  let partyHandler = null;
  let directMessageHandler = null;
  let selectedDmUserId = null;
  let selectedDmUserName = "";
  let directMessagesState = { conversations: {} };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitHandler?.(input.value);
  });

  statusForm.addEventListener("submit", (event) => {
    event.preventDefault();
    statusHandler?.(statusInput.value);
  });

  homeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    homeHandler?.(Boolean(homePublicInput.checked));
  });

  dmForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!selectedDmUserId) {
      feedback.style.color = "#ffcfb8";
      feedback.textContent = "DM icin once bir arkadas sec.";
      return;
    }
    directMessageHandler?.({
      targetUserId: selectedDmUserId,
      text: dmInput.value,
    });
  });

  dom.node.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.friendAction;
    const friendId = target.dataset.friendId;
    const homeVisitId = target.dataset.homeVisitId;
    const tradePlayerId = target.dataset.tradePlayerId;
    const dmUserId = target.dataset.dmUserId;
    const dmUserName = target.dataset.dmUserName;

    if (action && friendId) {
      respondHandler?.(friendId, action);
    }

    if (homeVisitId) {
      visitHandler?.(homeVisitId);
    }

    if (tradePlayerId) {
      tradeHandler?.(tradePlayerId);
    }

    if (dmUserId) {
      selectedDmUserId = dmUserId;
      selectedDmUserName = dmUserName ?? "Arkadas";
      dmSelected.textContent = `Konusma: ${selectedDmUserName}`;
      renderConversation();
      window.setTimeout(() => dmInput?.focus(), 20);
    }

    const partyPlayerId = target.dataset.partyPlayerId;
    if (partyPlayerId) {
      partyHandler?.(partyPlayerId);
    }
  });

  container.add([overlay, frame, title, hint, dom]);
  dom.node.style.display = 'none';

  function renderConversation() {
    const messages = selectedDmUserId ? directMessagesState.conversations?.[selectedDmUserId] ?? [] : [];
    dmLog.innerHTML = selectedDmUserId
      ? messages.length
        ? messages
            .map((message) => {
              const isSelf = message.senderUserId !== selectedDmUserId;
              const color = isSelf ? "#dff4ff" : "#ffd9b2";
              const name = escapeHtml(sanitizePlayerName(message.senderName ?? (isSelf ? "Sen" : selectedDmUserName), "Oyuncu"));
              const text = escapeHtml(sanitizePlainText(message.text ?? "", 140));
              return `<div style="margin-bottom:6px; color:${color};"><strong>${name}</strong>: ${text}</div>`;
            })
            .join("")
        : `<div style="color:#9aa9b4; font-size:13px;">Henuz mesaj yok.</div>`
      : `<div style="color:#9aa9b4; font-size:13px;">Arkadas listesinden birini sec.</div>`;
    dmLog.scrollTop = dmLog.scrollHeight;
  }

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
      window.setTimeout(() => input?.focus(), 20);
    },
    close() {
      container.setVisible(false);
      dom.node.style.display = 'none';
      input.value = "";
      input.blur();
    },
    setFeedback(message, isError = false) {
      feedback.style.color = isError ? "#ffcfb8" : "#b8f2c8";
      feedback.textContent = message ?? "";
    },
    onSubmit(handler) {
      submitHandler = handler;
    },
    onRespond(handler) {
      respondHandler = handler;
    },
    onStatusSubmit(handler) {
      statusHandler = handler;
    },
    onHomeSubmit(handler) {
      homeHandler = handler;
    },
    onVisitHome(handler) {
      visitHandler = handler;
    },
    onTrade(handler) {
      tradeHandler = handler;
    },
    onPartyInvite(handler) {
      partyHandler = handler;
    },
    onDirectMessage(handler) {
      directMessageHandler = handler;
    },
    setStatusValue(value) {
      statusInput.value = value ?? "";
    },
    setHomeAccess(isPublic) {
      homePublicInput.checked = Boolean(isPublic);
    },
    update(friendsState, homeState = null) {
      homePublicInput.checked = Boolean(homeState?.access?.isPublic);
      friendsList.innerHTML = friendsState.friends.length
        ? friendsState.friends
            .map(
              (entry) =>
                `${renderFriendRow(entry, false, true)}<div style="margin-top:-6px; margin-bottom:8px;"><button type="button" data-dm-user-id="${entry.playerId}" data-dm-user-name="${escapeHtml(sanitizePlayerName(entry.playerName))}">Mesaj</button></div>`,
            )
            .join("")
        : `<div style="color:#9aa9b4; font-size:13px;">Henuz arkadas yok.</div>`;
      incomingList.innerHTML = friendsState.incomingRequests.length
        ? friendsState.incomingRequests.map((entry) => renderFriendRow(entry, true)).join("")
        : `<div style="color:#9aa9b4; font-size:13px;">Bekleyen gelen istek yok.</div>`;
      outgoingList.innerHTML = friendsState.outgoingRequests.length
        ? friendsState.outgoingRequests.map((entry) => renderFriendRow(entry)).join("")
        : `<div style="color:#9aa9b4; font-size:13px;">Bekleyen giden istek yok.</div>`;
      if (selectedDmUserId && !friendsState.friends.some((entry) => entry.playerId === selectedDmUserId)) {
        selectedDmUserId = null;
        selectedDmUserName = "";
        dmSelected.textContent = "Arkadas sec";
      }
      renderConversation();
    },
    updateDirectMessages(nextState) {
      directMessagesState = nextState ?? { conversations: {} };
      renderConversation();
    },
  };
}
