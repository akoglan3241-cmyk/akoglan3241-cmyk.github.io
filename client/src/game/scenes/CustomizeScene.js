import Phaser from "phaser";
import {
  AVATAR_CATEGORIES,
  DEFAULT_APPEARANCE,
  cycleAppearanceOption,
  getAppearanceLabel,
  getAppearanceOptions,
  getRandomAppearance,
  normalizeAppearance,
} from "../avatar/avatarOptions.js";
import { AvatarSprite } from "../avatar/AvatarSprite.js";
import { GAME_SIZE, SCENE_KEYS } from "../constants.js";
import { savePlayerAppearance } from "../network/playerProfileClient.js";
import { normalizeCosmeticsState } from "../state/cosmeticsState.js";
import { createPanel } from "../ui/createPanel.js";
import { logWorldFlow, validateWorldSession, showGameRootOverlay, hideGameRootOverlay } from "../ui/gameRootOverlay.js";

export class CustomizeScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.CUSTOMIZE);
    this.session = null;
    this.appearance = normalizeAppearance(DEFAULT_APPEARANCE);
    this.cosmeticsState = normalizeCosmeticsState();
    this.isSaving = false;
    this.isTransitioningToTown = false;
    this.activeCategoryKey = AVATAR_CATEGORIES[0].key;
  }

  init(data) {
    logWorldFlow("CustomizeScene init", {
      hasSession: Boolean(data?.session),
      playerName: data?.session?.playerName ?? null,
      isGuest: Boolean(data?.session?.isGuest),
    });
    this.session = data?.session;
    this.appearance = normalizeAppearance(data?.session?.appearance ?? DEFAULT_APPEARANCE);
    this.cosmeticsState = normalizeCosmeticsState(data?.session?.cosmetics ?? { equipped: this.appearance });
    this.isSaving = false;
    this.isTransitioningToTown = false;
    this.activeCategoryKey = AVATAR_CATEGORIES[0].key;
  }

  create() {
    logWorldFlow("CustomizeScene create start", {
      playerName: this.session?.playerName ?? null,
    });
    hideGameRootOverlay();
    const domContainer = this.game?.domContainer;
    if (domContainer) {
      while (domContainer.firstChild) {
        domContainer.removeChild(domContainer.firstChild);
      }
    }

    this.scene.stop(SCENE_KEYS.TOWN);
    this.scene.stop(SCENE_KEYS.DIALOG);
    const { width, height } = GAME_SIZE;
    const previewCenterX = 362;
    const previewCenterY = 394;
    const controlsCenterX = 844;
    const controlsCenterY = 396;

    this.add.rectangle(width / 2, height / 2, width, height, 0x7ec8ff, 1);
    this.add.rectangle(width / 2, height * 0.2, width, 220, 0xffd68a, 0.18);
    this.add.image(width * 0.16, 104, "cloud").setAlpha(0.88).setScale(0.92);
    this.add.image(width * 0.72, 144, "cloud").setAlpha(0.74).setScale(0.78);
    this.add.image(width * 0.88, 92, "cloud").setAlpha(0.48).setScale(0.62);
    this.add.image(width / 2, height, "grass").setOrigin(0.5, 1).setDisplaySize(width, height * 0.48).setAlpha(0.95);

    createPanel(this, {
      x: width / 2,
      y: height / 2,
      width: 1010,
      height: 560,
      fillColor: 0x0b1f2d,
      fillAlpha: 0.93,
      strokeColor: 0xffe8b1,
      strokeAlpha: 0.2,
    });

    createPanel(this, {
      x: previewCenterX,
      y: previewCenterY,
      width: 360,
      height: 404,
      fillColor: 0x133247,
      fillAlpha: 0.82,
      strokeColor: 0xffe8b1,
      strokeAlpha: 0.12,
    });

    createPanel(this, {
      x: controlsCenterX,
      y: controlsCenterY,
      width: 500,
      height: 404,
      fillColor: 0x112839,
      fillAlpha: 0.84,
      strokeColor: 0xffe8b1,
      strokeAlpha: 0.12,
    });

    this.add
      .text(width / 2, 128, "Karakterini Hazirla", {
        fontFamily: "Georgia",
        fontSize: "34px",
        fontStyle: "bold",
        color: "#fff6e0",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 168, `${this.session.playerName} icin sicak bir ilk gorunum sec`, {
        fontFamily: "Trebuchet MS",
        fontSize: "16px",
        color: "#b7d8ec",
      })
      .setOrigin(0.5);

    this.add
      .text(previewCenterX, 224, "Canli Onizleme", {
        fontFamily: "Trebuchet MS",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#fff4db",
      })
      .setOrigin(0.5);

    this.add
      .text(previewCenterX, 254, "Secenekler aninda preview'e yansir.", {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        color: "#9fc7dd",
      })
      .setOrigin(0.5);

    this.preview = new AvatarSprite(this, previewCenterX, previewCenterY + 8, this.appearance);
    this.add.existing(this.preview);
    this.preview.setScale(7.2);

    this.previewNameText = this.add
      .text(previewCenterX, 528, this.session.playerName, {
        fontFamily: "Trebuchet MS",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#fff4db",
        backgroundColor: "#173449",
        padding: { left: 10, right: 10, top: 5, bottom: 5 },
      })
      .setOrigin(0.5);

    this.previewHintText = this.add
      .text(previewCenterX, 570, "Sade, cozy ve okunakli bir gorunum icin kombinasyonunu sec.", {
        fontFamily: "Trebuchet MS",
        fontSize: "13px",
        color: "#b8d8ea",
        align: "center",
        wordWrap: { width: 270 },
      })
      .setOrigin(0.5);

    this.activeLabel = this.add
      .text(controlsCenterX, 228, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "26px",
        fontStyle: "bold",
        color: "#fff4db",
      })
      .setOrigin(0.5);

    this.add
      .text(controlsCenterX, 258, "Kategori sec, sonra oklarla gez veya rastgele karistir.", {
        fontFamily: "Trebuchet MS",
        fontSize: "13px",
        color: "#9fc7dd",
      })
      .setOrigin(0.5);

    this.activeValueText = this.add
      .text(controlsCenterX, 384, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "30px",
        fontStyle: "bold",
        color: "#9bd3ff",
      })
      .setOrigin(0.5);

    this.activeMetaText = this.add
      .text(controlsCenterX, 430, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        color: "#bdd8ea",
        align: "center",
        wordWrap: { width: 330 },
      })
      .setOrigin(0.5);

    this.optionCounterText = this.add
      .text(controlsCenterX, 474, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        color: "#f4dba0",
      })
      .setOrigin(0.5);

    this.categoryButtons = AVATAR_CATEGORIES.map((field, index) =>
      this.addChipButton(644 + index * 100, 316, field.label, () => this.setActiveCategory(field.key), 88, 34),
    );

    this.addOptionButton(662, 384, "<", () => this.changeActiveField(-1), 58, 56);
    this.addOptionButton(1026, 384, ">", () => this.changeActiveField(1), 58, 56);

    this.randomizeButton = this.addOptionButton(760, 548, "Rastgele", () => this.randomizeAppearance(), 136, 50);
    this.continueButton = this.addOptionButton(936, 548, "Sehre Gir", () => this.saveAndContinue(), 164, 52);

    this.feedbackText = this.add
      .text(width / 2, 620, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        color: "#ffd8d8",
      })
      .setOrigin(0.5);

    this.refreshAppearanceUi();
    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        this.preview.updateMotion?.({ delta: 16, isMoving: false, isSprinting: false });
      },
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.isSaving = false;
    });
  }

  addChipButton(x, y, label, onClick, width = 96, height = 34) {
    const button = this.add.rectangle(x, y, width, height, 0x173449, 1).setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, y, label, {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#dcedfa",
      })
      .setOrigin(0.5);

    button.on("pointerdown", onClick);
    button.on("pointerover", () => {
      if (!button.getData("active")) {
        button.setFillStyle(0x234a62, 1);
      }
    });
    button.on("pointerout", () => {
      if (!button.getData("active")) {
        button.setFillStyle(0x173449, 1);
      }
    });

    return { button, text };
  }

  addOptionButton(x, y, label, onClick, width = 42, height = 38) {
    const button = this.add.rectangle(x, y, width, height, 0xf2a84e, 1).setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, y, label, {
        fontFamily: "Trebuchet MS",
        fontSize: width > 100 ? "18px" : "24px",
        fontStyle: "bold",
        color: "#173449",
      })
      .setOrigin(0.5);

    button.on("pointerdown", onClick);
    button.on("pointerover", () => button.setFillStyle(0xffbf64, 1));
    button.on("pointerout", () => button.setFillStyle(0xf2a84e, 1));

    return { button, text };
  }

  setActiveCategory(categoryKey) {
    this.activeCategoryKey = categoryKey;
    this.refreshAppearanceUi();
  }

  changeActiveField(direction) {
    this.appearance = cycleAppearanceOption(this.appearance, this.activeCategoryKey, direction);
    this.refreshAppearanceUi();
  }

  randomizeAppearance() {
    this.appearance = getRandomAppearance();
    this.feedbackText.setText("Yeni bir kombinasyon hazirlandi.");
    this.refreshAppearanceUi();
  }

  async saveAndContinue() {
    if (this.isSaving || this.isTransitioningToTown) {
      return;
    }

    logWorldFlow("Enter world clicked", {
      playerName: this.session?.playerName ?? null,
      isGuest: Boolean(this.session?.isGuest),
      hasAuthToken: Boolean(this.session?.authToken),
      appearance: this.appearance,
    });

    this.isSaving = true;
    this.isTransitioningToTown = true;
    this.feedbackText.setText("Sehre giriliyor...");
    this.continueButton.text.setText("Yukleniyor");
    const nextAppearance = normalizeAppearance(this.appearance);

    // Do not block scene transition on network latency.
    savePlayerAppearance(this.session.authToken, nextAppearance).catch((error) => {
      const saveFailedMessage = error instanceof Error ? error.message : "Gorunum kaydedilemedi.";
      // eslint-disable-next-line no-console
      console.warn(`[CustomizeScene] Appearance save fallback used: ${saveFailedMessage}`);
    });

    this.isSaving = false;
    const nextScenePayload = {
      session: {
        ...this.session,
        appearance: nextAppearance,
        cosmetics: normalizeCosmeticsState({
          ...this.cosmeticsState,
          equipped: nextAppearance,
        }),
      },
    };
    const validationErrors = validateWorldSession(nextScenePayload.session);
    if (validationErrors.length > 0) {
      logWorldFlow("Enter world validation failed", validationErrors);
      this.feedbackText.setText(validationErrors.join(" "));
      this.continueButton.text.setText("Sehre Gir");
      this.isSaving = false;
      this.isTransitioningToTown = false;
      return;
    }
    this.input.enabled = false;
    showGameRootOverlay({
      title: "Kasaba Hazirlaniyor",
      message: "Dunya sahnesi baslatiliyor. Bu kez gecis fail-safe olarak izleniyor.",
      variant: "loading",
    });

    try {
      logWorldFlow("Starting TownScene from CustomizeScene", {
        sceneKey: SCENE_KEYS.TOWN,
        session: {
          playerName: nextScenePayload.session.playerName,
          isGuest: nextScenePayload.session.isGuest,
          hasAuthToken: Boolean(nextScenePayload.session.authToken),
        },
      });
      this.scene.start(SCENE_KEYS.TOWN, nextScenePayload);
    } catch (error) {
      logWorldFlow("TownScene start failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.feedbackText.setText("Sehir yuklenemedi.");
      this.continueButton.text.setText("Sehre Gir");
      this.isSaving = false;
      this.isTransitioningToTown = false;
      this.input.enabled = true;
      showGameRootOverlay({
        title: "Sehir Yuklenemedi",
        message: error instanceof Error ? error.message : "Sahne baslatilirken beklenmeyen bir hata oldu.",
        variant: "error",
        actionLabel: "Tekrar Dene",
        onAction: () => {
          hideGameRootOverlay();
          void this.saveAndContinue();
        },
      });
    }
  }

  refreshAppearanceUi() {
    this.preview.setAppearance(this.appearance);
    this.previewNameText.setText(this.session.playerName);

    const activeCategory = AVATAR_CATEGORIES.find((field) => field.key === this.activeCategoryKey) ?? AVATAR_CATEGORIES[0];
    const activeOptions = getAppearanceOptions(activeCategory.key);
    const activeIndex = Math.max(0, activeOptions.findIndex((entry) => entry.id === this.appearance[activeCategory.key]));

    this.activeLabel.setText(activeCategory.label);
    this.activeValueText.setText(getAppearanceLabel(activeCategory.key, this.appearance[activeCategory.key]));
    this.activeMetaText.setText(this.getCategoryDescription(activeCategory.key));
    this.optionCounterText.setText(`${activeIndex + 1} / ${activeOptions.length}`);

    this.categoryButtons.forEach(({ button, text }, index) => {
      const isActive = AVATAR_CATEGORIES[index].key === this.activeCategoryKey;
      button.setData("active", isActive);
      button.setFillStyle(isActive ? 0xf2a84e : 0x173449, 1);
      text.setColor(isActive ? "#173449" : "#dcedfa");
    });
  }

  getCategoryDescription(categoryKey) {
    if (categoryKey === "hair") {
      return "Sac sekilleri daha yuvarlak ve yumusak okunur. Reroll ile yeni bir stil deneyebilirsin.";
    }

    if (categoryKey === "top") {
      return "Ust giyimlerde cozy tonlar, hafif highlight ve temiz outline kullanildi.";
    }

    if (categoryKey === "bottom") {
      return "Alt parcalar ust ile kontrast kuracak sekilde sade tutuldu.";
    }

    return "Kucuk aksesuarlar karakteri bozmadan kimlik katar. Bazilari daha sosyal ve sevimli gorunur.";
  }

  update() {
    if (this.scene.isActive(SCENE_KEYS.TOWN)) {
      this.scene.stop();
    }
  }
}
