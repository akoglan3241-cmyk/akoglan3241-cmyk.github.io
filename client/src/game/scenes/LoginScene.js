import Phaser from "phaser";
import { AvatarSprite } from "../avatar/AvatarSprite.js";
import { DEFAULT_APPEARANCE } from "../avatar/avatarOptions.js";
import { GAME_SIZE, SCENE_KEYS } from "../constants.js";
import { guestLogin, loginAccount, registerAccount } from "../network/authClient.js";
import { fetchPlayerBootstrap } from "../network/playerProfileClient.js";
import { clearAuthToken, createSession, saveAuthToken } from "../state/session.js";
import { createPanel } from "../ui/createPanel.js";
import { createAuthFormMarkup } from "../ui/createAuthFormMarkup.js";
import { sanitizePlayerName } from "../utils/userContentValidation.js";
import { hideGameRootOverlay, logWorldFlow } from "../ui/gameRootOverlay.js";

const AUTH_MODE_META = {
  login: {
    title: "Giris Yap",
    description: "Hesabinla gir ve kayitli ilerlemeni kaldigin yerden devam ettir.",
    primaryLabel: "Giris Yap",
    focusField: "username",
  },
  register: {
    title: "Kayit Ol",
    description: "Yeni bir hesap ac, oyuncu adini sec ve kasabaya kalici olarak baglan.",
    primaryLabel: "Hesap Ac",
    focusField: "playerName",
  },
  guest: {
    title: "Misafir Girisi",
    description: "Hizlica oyuna bak. Misafir ilerlemesi gecicidir, sonra hesapla baglayabilirsin.",
    primaryLabel: "Misafir Olarak Basla",
    focusField: "playerName",
  },
};

export class LoginScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.LOGIN);
    this.authMode = "login";
    this.isTransitioning = false;
  }

  create() {
    logWorldFlow("LoginScene create start");
    hideGameRootOverlay();
    const domContainer = this.game?.domContainer;
    if (domContainer) {
      while (domContainer.firstChild) {
        domContainer.removeChild(domContainer.firstChild);
      }
    }

    Object.values(SCENE_KEYS).forEach((key) => {
      if (key !== SCENE_KEYS.BOOT && key !== SCENE_KEYS.LOGIN) {
        this.scene.stop(key);
      }
    });
    const { width, height } = GAME_SIZE;

    this.add.rectangle(width / 2, height / 2, width, height, 0x8fc8e8, 1);
    this.add.rectangle(width / 2, height * 0.16, width, 240, 0xffd7b3, 0.16);
    this.add.rectangle(width / 2, height * 0.77, width, 250, 0x1f4f68, 0.2);
    this.add.image(0, 0, "grass").setOrigin(0).setDisplaySize(width, height);
    this.add.rectangle(width / 2, height * 0.73, width, 210, 0x6ca9ce, 0.22);
    this.add.rectangle(width / 2, height * 0.79, width, 120, 0x3e7f5e, 0.22);

    const glow = this.add.ellipse(width * 0.5, 120, 540, 160, 0xffefc2, 0.12);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.08, to: 0.2 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
    });

    const cloudLeft = this.add.image(width * 0.18, 104, "cloud").setAlpha(0.9).setScale(1.04);
    const cloudRight = this.add.image(width * 0.78, 146, "cloud").setAlpha(0.76).setScale(0.82);
    const cloudMid = this.add.image(width * 0.56, 88, "cloud").setAlpha(0.54).setScale(0.65);

    [cloudLeft, cloudRight, cloudMid].forEach((cloud, index) => {
      this.tweens.add({
        targets: cloud,
        x: cloud.x + (index % 2 === 0 ? 28 : -24),
        duration: 6200 + index * 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    });

    const leftTree = this.add.image(width * 0.14, height * 0.74, "tree").setScale(1.38).setAlpha(0.94);
    const rightHouse = this.add.image(width * 0.84, height * 0.73, "house").setScale(1.22).setAlpha(0.98);
    const centerTree = this.add.image(width * 0.69, height * 0.68, "tree").setScale(1.04).setAlpha(0.88);

    [leftTree, rightHouse, centerTree].forEach((entry, index) => {
      this.tweens.add({
        targets: entry,
        y: entry.y - (index === 1 ? 6 : 10),
        duration: 2200 + index * 240,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    });

    createPanel(this, {
      x: width / 2,
      y: height / 2 + 10,
      width: 910,
      height: 470,
      fillColor: 0x183246,
      fillAlpha: 0.88,
      strokeColor: 0xb9d6ea,
      strokeAlpha: 0.22,
    });

    createPanel(this, {
      x: width / 2 - 206,
      y: height / 2 + 18,
      width: 294,
      height: 348,
      fillColor: 0x1f3d52,
      fillAlpha: 0.82,
      strokeColor: 0x9fc0d7,
      strokeAlpha: 0.2,
    });

    createPanel(this, {
      x: width / 2 + 168,
      y: height / 2 + 24,
      width: 452,
      height: 360,
      fillColor: 0x1a3850,
      fillAlpha: 0.84,
      strokeColor: 0xffc28a,
      strokeAlpha: 0.22,
    });

    this.add
      .text(width / 2, 118, "Sosyal Dunyaya Giris", {
        fontFamily: "Georgia",
        fontSize: "42px",
        fontStyle: "bold",
        color: "#fff4da",
        stroke: "#27485d",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 162, "Kayit ol, giris yap ya da misafir olarak baglan. Akis hizli, sade ve sosyal kalsin.", {
        fontFamily: "Trebuchet MS",
        fontSize: "16px",
        color: "#e6f3fb",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2 - 206, 214, "Avatar Preview", {
        fontFamily: "Georgia",
        fontSize: "24px",
        fontStyle: "bold",
        color: "#fff1d3",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2 - 206, 246, "Ismin ve gorunumun bir sonraki adimda da duzenlenebilir.", {
        fontFamily: "Trebuchet MS",
        fontSize: "13px",
        color: "#c2dcec",
        wordWrap: { width: 220 },
        align: "center",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2 + 169, 208, "Turkiye", {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#fef8ea",
        backgroundColor: "#35566d",
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
      })
      .setOrigin(0.5);

    this.previewShadow = this.add.ellipse(width / 2 - 206, height / 2 + 124, 132, 28, 0x07131d, 0.34);
    this.previewAvatar = new AvatarSprite(this, width / 2 - 206, height / 2 + 54, DEFAULT_APPEARANCE);
    this.add.existing(this.previewAvatar);
    this.previewAvatar.setScale(3.8);
    this.tweens.add({
      targets: [this.previewAvatar, this.previewShadow],
      y: "-=8",
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.previewNameText = this.add
      .text(width / 2 - 206, height / 2 + 164, "Traveler", {
        fontFamily: "Trebuchet MS",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#fff4db",
        backgroundColor: "#173449",
        padding: { left: 10, right: 10, top: 5, bottom: 5 },
      })
      .setOrigin(0.5);

    this.previewHintText = this.add
      .text(width / 2 - 206, height / 2 + 208, "Ozellestirme ekraninda sac, ust, alt ve aksesuar secimi yapabilirsin.", {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#c9e1ef",
        align: "center",
        wordWrap: { width: 228 },
      })
      .setOrigin(0.5);

    const formElement = this.add.dom(width / 2 + 168, height / 2 + 22).createFromHTML(createAuthFormMarkup());
    const form = formElement.node.querySelector("form");
    const modeButtons = Array.from(formElement.node.querySelectorAll("[data-auth-mode]"));
    const titleNode = formElement.node.querySelector("[data-auth-title]");
    const descriptionNode = formElement.node.querySelector("[data-auth-description]");
    const primaryButton = formElement.node.querySelector("[data-auth-primary]");
    const playerNameInput = formElement.node.querySelector('input[name="playerName"]');
    const usernameInput = formElement.node.querySelector('input[name="username"]');
    const passwordInput = formElement.node.querySelector('input[name="password"]');
    const playerNameField = formElement.node.querySelector(".auth-form__field--player-name");
    const usernameField = formElement.node.querySelector(".auth-form__field--username");
    const passwordField = formElement.node.querySelector(".auth-form__field--password");
    const loginNote = formElement.node.querySelector("[data-auth-note-login]");
    const registerNote = formElement.node.querySelector("[data-auth-note-register]");
    const guestNote = formElement.node.querySelector("[data-auth-note-guest]");

    const errorLabel = this.add
      .text(width / 2 + 168, height / 2 + 202, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        color: "#ffd8d8",
        wordWrap: { width: 380 },
        align: "center",
      })
      .setOrigin(0.5);

    const statusLabel = this.add
      .text(width / 2 + 168, height / 2 + 226, "Kasaba agina baglanmaya hazir.", {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#c0daea",
      })
      .setOrigin(0.5);

    const focusInputForMode = (mode) => {
      const fieldName = AUTH_MODE_META[mode]?.focusField;
      const nextInput =
        fieldName === "username" ? usernameInput : fieldName === "playerName" ? playerNameInput : passwordInput;
      window.setTimeout(() => {
        nextInput?.focus();
        nextInput?.select?.();
      }, 30);
    };

    const updatePreviewName = () => {
      const safeName = sanitizePlayerName(playerNameInput?.value, "Traveler");
      this.previewNameText.setText(safeName);
    };

    const setAuthMode = (mode) => {
      this.authMode = AUTH_MODE_META[mode] ? mode : "login";
      form.dataset.authMode = this.authMode;
      titleNode.textContent = AUTH_MODE_META[this.authMode].title;
      descriptionNode.textContent = AUTH_MODE_META[this.authMode].description;
      primaryButton.textContent = AUTH_MODE_META[this.authMode].primaryLabel;

      const isLogin = this.authMode === "login";
      const isRegister = this.authMode === "register";
      const isGuest = this.authMode === "guest";

      playerNameField.style.display = isLogin ? "none" : "";
      usernameField.style.display = isGuest ? "none" : "";
      passwordField.style.display = isGuest ? "none" : "";

      loginNote.style.display = isLogin ? "block" : "none";
      registerNote.style.display = isRegister ? "block" : "none";
      guestNote.style.display = isGuest ? "block" : "none";

      modeButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.authMode === this.authMode);
      });

      updatePreviewName();
      errorLabel.setText("");
      focusInputForMode(this.authMode);
    };

    const handleAuthSuccess = async ({ token, playerName, guest = false, username = "" }) => {
      logWorldFlow("LoginScene auth success", {
        playerName,
        guest,
        username,
        hasToken: Boolean(token),
      });
      errorLabel.setText("");
      statusLabel.setText("Profil bilgileri yukleniyor...");
      saveAuthToken(token);
      let appearance;
      let cosmetics;

      try {
        const bootstrap = await fetchPlayerBootstrap(token);
        appearance = bootstrap?.appearance;
        cosmetics = bootstrap?.cosmetics;
      } catch (error) {
        this.isTransitioning = false;
        statusLabel.setText("Baglanti hazir degil.");
        errorLabel.setText(error instanceof Error ? error.message : "Oyuncu profili yuklenemedi.");
        return;
      }

      const session = createSession(playerName, appearance, {
        authToken: token,
        isGuest: guest,
        username,
        cosmetics,
      });
      logWorldFlow("LoginScene starting CustomizeScene", {
        playerName: session.playerName,
        isGuest: session.isGuest,
      });
      this.scene.start(SCENE_KEYS.CUSTOMIZE, { session });
    };

    const submitByMode = async (event) => {
      event.preventDefault();
      if (this.isTransitioning) {
        return;
      }

      clearAuthToken();
      this.isTransitioning = true;
      logWorldFlow("LoginScene submit", {
        mode: this.authMode,
      });
      errorLabel.setText("");
      statusLabel.setText("Baglanti kuruluyor...");

      try {
        if (this.authMode === "login") {
          const result = await loginAccount({
            username: usernameInput?.value,
            password: passwordInput?.value,
          });
          await handleAuthSuccess({
            ...result,
            username: usernameInput?.value,
          });
          return;
        }

        if (this.authMode === "register") {
          const result = await registerAccount({
            playerName: sanitizePlayerName(playerNameInput?.value),
            username: usernameInput?.value,
            password: passwordInput?.value,
          });
          await handleAuthSuccess({
            ...result,
            username: usernameInput?.value,
          });
          return;
        }

        const result = await guestLogin({
          playerName: sanitizePlayerName(playerNameInput?.value),
        });
        await handleAuthSuccess({
          ...result,
          username: "guest",
        });
      } catch (error) {
        this.isTransitioning = false;
        statusLabel.setText("Tekrar deneyebilirsin.");
        errorLabel.setText(error instanceof Error ? error.message : "Giris basarisiz.");
      }
    };

    const modeButtonHandlers = modeButtons.map((button) => {
      const handler = () => {
        if (this.isTransitioning) {
          return;
        }
        setAuthMode(button.dataset.authMode);
      };
      button.addEventListener("click", handler);
      return { button, handler };
    });
    form.addEventListener("submit", submitByMode);
    playerNameInput?.addEventListener("input", updatePreviewName);

    setAuthMode("login");
    updatePreviewName();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      form.removeEventListener("submit", submitByMode);
      modeButtonHandlers.forEach(({ button, handler }) => {
        button.removeEventListener("click", handler);
      });
      playerNameInput?.removeEventListener("input", updatePreviewName);
    });
  }
}
