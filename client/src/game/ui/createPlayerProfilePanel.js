import { GAME_SIZE } from "../constants.js";
import { AvatarSprite } from "../avatar/AvatarSprite.js";
import { createPanel } from "./createPanel.js";
import { sanitizePlayerName, sanitizePlainText, sanitizeProfileStatus } from "../utils/userContentValidation.js";

export function createPlayerProfilePanel(scene) {
  const container = scene.add.container(0, 0).setScrollFactor(0).setVisible(false).setDepth(2100);
  const overlay = scene.add.rectangle(0, 0, GAME_SIZE.width, GAME_SIZE.height, 0x031018, 0.58).setOrigin(0);
  const frame = createPanel(scene, {
    x: GAME_SIZE.width / 2,
    y: GAME_SIZE.height / 2,
    width: 500,
    height: 430,
    fillColor: 0x07131d,
    fillAlpha: 0.97,
    strokeColor: 0xffe0a1,
    strokeAlpha: 0.18,
    scrollFactor: 0,
  });

  const title = scene.add.text(430, 172, "Player Profile", {
    fontFamily: "Georgia",
    fontSize: "28px",
    fontStyle: "bold",
    color: "#fff4db",
  });

  const closeHint = scene.add.text(820, 176, "Esc ile kapat", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#9bd3ff",
  }).setOrigin(1, 0);

  const avatarPreview = new AvatarSprite(scene, 396, 342, null);
  avatarPreview.setScale(3.8);

  const displayNameText = scene.add.text(510, 226, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "24px",
    fontStyle: "bold",
    color: "#f4fbff",
  });

  const levelText = scene.add.text(510, 266, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "16px",
    color: "#ffd99d",
  });

  const coinText = scene.add.text(510, 298, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "16px",
    color: "#b7d8ec",
  });

  const badgesTitle = scene.add.text(510, 334, "Badges", {
    fontFamily: "Trebuchet MS",
    fontSize: "15px",
    fontStyle: "bold",
    color: "#fff4db",
  });

  const badgesText = scene.add.text(510, 362, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#9bd3ff",
    wordWrap: { width: 250 },
    lineSpacing: 4,
  });

  const statusTitle = scene.add.text(348, 436, "Status", {
    fontFamily: "Trebuchet MS",
    fontSize: "15px",
    fontStyle: "bold",
    color: "#fff4db",
  });

  const statusText = scene.add.text(348, 464, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#b7d8ec",
    wordWrap: { width: 470 },
    lineSpacing: 4,
  });

  const feedbackText = scene.add.text(348, 542, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "13px",
    color: "#ffcfb8",
  });

  const reportDom = scene.add
    .dom(626, 610)
    .createFromHTML(`
      <div style="width: 312px; display:flex; gap:8px; align-items:center; font-family:Trebuchet MS, sans-serif;">
        <input data-report-reason type="text" maxlength="240" placeholder="Rapor nedeni yaz" style="flex:1; padding:8px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.16); background:#102331; color:#f4fbff;" />
        <button data-report-button type="button" style="padding:8px 10px; border:none; border-radius:8px; background:#ff9a8b; color:#173449; font-weight:bold; cursor:pointer;">Raporla</button>
      </div>
    `);
  const reportInput = reportDom.node.querySelector("[data-report-reason]");
  const reportButton = reportDom.node.querySelector("[data-report-button]");

  const friendButton = scene.add.rectangle(716, 540, 158, 38, 0xffd99d, 0.95).setInteractive({ useHandCursor: true });
  const friendButtonText = scene.add.text(716, 540, "Arkadas Ekle", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    fontStyle: "bold",
    color: "#173449",
  }).setOrigin(0.5);

  const visitButton = scene.add.rectangle(534, 540, 158, 38, 0x9bd3ff, 0.95).setInteractive({ useHandCursor: true });
  const visitButtonText = scene.add.text(534, 540, "Evini Ziyaret Et", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    fontStyle: "bold",
    color: "#173449",
  }).setOrigin(0.5);

  const homeAccessText = scene.add.text(510, 390, "", {
    fontFamily: "Trebuchet MS",
    fontSize: "13px",
    color: "#dbeefa",
  });

  const tradeButton = scene.add.rectangle(350, 540, 158, 38, 0xb8f2c8, 0.95).setInteractive({ useHandCursor: true });
  const tradeButtonText = scene.add.text(350, 540, "Trade Istegi", {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    fontStyle: "bold",
    color: "#173449",
  }).setOrigin(0.5);

  container.add([
    overlay,
    frame,
    title,
    closeHint,
    avatarPreview,
    displayNameText,
    levelText,
    coinText,
    badgesTitle,
    badgesText,
    homeAccessText,
    statusTitle,
    statusText,
    feedbackText,
    reportDom,
    tradeButton,
    tradeButtonText,
    visitButton,
    visitButtonText,
    friendButton,
    friendButtonText,
  ]);

  let currentProfile = null;
  let friendHandler = null;
  let visitHandler = null;
  let tradeHandler = null;
  let partyHandler = null;
  let reportHandler = null;
  let closeHandler = null;

  friendButton.on("pointerdown", () => {
    if (currentProfile) {
      friendHandler?.(currentProfile);
    }
  });

  visitButton.on("pointerdown", () => {
    if (currentProfile) {
      visitHandler?.(currentProfile);
    }
  });

  tradeButton.on("pointerdown", () => {
    if (currentProfile) {
      tradeHandler?.(currentProfile);
    }
  });

  const partyButton = scene.add.rectangle(350, 586, 158, 34, 0x9bd3ff, 0.95).setInteractive({ useHandCursor: true });
  const partyButtonText = scene.add.text(350, 586, "Party Daveti", {
    fontFamily: "Trebuchet MS",
    fontSize: "13px",
    fontStyle: "bold",
    color: "#173449",
  }).setOrigin(0.5);
  partyButton.on("pointerdown", () => {
    if (currentProfile) {
      partyHandler?.(currentProfile);
    }
  });
  reportButton?.addEventListener("click", () => {
    if (currentProfile) {
      reportHandler?.({
        profile: currentProfile,
        reason: reportInput?.value ?? "",
      });
    }
  });
  container.add([partyButton, partyButtonText]);
  reportDom.node.style.display = 'none';

  return {
    setVisible(isVisible) {
      container.setVisible(isVisible);
      reportDom.node.style.display = isVisible ? '' : 'none';
    },
    isVisible() {
      return container.visible;
    },
    setFeedback(message, isError = false) {
      feedbackText.setColor(isError ? "#ffcfb8" : "#b8f2c8");
      feedbackText.setText(message ?? "");
    },
    onSendFriendRequest(handler) {
      friendHandler = handler;
    },
    onVisitHome(handler) {
      visitHandler = handler;
    },
    onTradeRequest(handler) {
      tradeHandler = handler;
    },
    onPartyInvite(handler) {
      partyHandler = handler;
    },
    onReport(handler) {
      reportHandler = handler;
    },
    onClose(handler) {
      closeHandler = handler;
    },
    show(profile, friendState = "none") {
      currentProfile = profile;
      avatarPreview.setAppearance(profile?.appearance);
      displayNameText.setText(sanitizePlayerName(profile?.displayName ?? "-", "-"));
      levelText.setText(`Level: ${profile?.level ?? 1}`);
      coinText.setText(`Coin: ${profile?.coins ?? 0}`);
      const equippedBadge = profile?.equippedBadgeLabel ? [`Aktif: ${sanitizePlayerName(profile.equippedBadgeLabel, "")}`] : [];
      badgesText.setText([...equippedBadge, ...((profile?.badges ?? []).map((entry) => sanitizePlainText(entry, 48)))].join(", ") || "Rozet yok");
      homeAccessText.setText(`Ev erisimi: ${profile?.homeAccess === "public" ? "Herkese acik" : "Sadece arkadaslar"}`);
      statusText.setText(sanitizeProfileStatus(profile?.statusText ?? "-"));

      const buttonLabel =
        friendState === "friend"
          ? "Arkadas"
          : friendState === "incoming"
            ? "Istek Geldi"
            : friendState === "outgoing"
              ? "Istek Gonderildi"
              : "Arkadas Ekle";
      const disabled = friendState !== "none";

      friendButton.setFillStyle(disabled ? 0x8ba4b5 : 0xffd99d, 0.95);
      friendButton[disabled ? "disableInteractive" : "setInteractive"]({ useHandCursor: !disabled });
      friendButtonText.setText(buttonLabel);

      const canVisit = friendState === "friend" || profile?.homeAccess === "public";
      visitButton.setFillStyle(canVisit ? 0x9bd3ff : 0x8ba4b5, 0.95);
      visitButton[canVisit ? "setInteractive" : "disableInteractive"]({ useHandCursor: canVisit });
      visitButtonText.setText(canVisit ? "Evini Ziyaret Et" : "Ev Kapali");
      tradeButton.setFillStyle(0xb8f2c8, 0.95);
      tradeButton.setInteractive({ useHandCursor: true });
      tradeButtonText.setText("Trade Istegi");
      partyButton.setFillStyle(0x9bd3ff, 0.95);
      partyButton.setInteractive({ useHandCursor: true });
      partyButtonText.setText("Party Daveti");
      if (reportInput) {
        reportInput.value = "";
      }
      feedbackText.setText("");
      reportDom.node.style.display = '';
      container.setVisible(true);
    },
    close() {
      currentProfile = null;
      if (reportInput) {
        reportInput.value = "";
      }
      container.setVisible(false);
      reportDom.node.style.display = 'none';
      feedbackText.setText("");
      closeHandler?.();
    },
  };
}
