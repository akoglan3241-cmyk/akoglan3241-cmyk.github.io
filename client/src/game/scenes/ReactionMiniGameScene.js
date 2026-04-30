import Phaser from "phaser";
import { GAME_SIZE, SCENE_KEYS } from "../constants.js";
import { getMiniGameDefinition } from "../content/miniGames.js";
import { createPanel } from "../ui/createPanel.js";

export class ReactionMiniGameScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.MINIGAME_REACTION);
  }

  init(data) {
    this.returnSceneKey = data?.returnSceneKey ?? SCENE_KEYS.TOWN;
    this.miniGameId = data?.miniGameId ?? "reaction";
    this.meta = getMiniGameDefinition("reaction");
    this.isRunning = false;
    this.isSubmitting = false;
    this.lastScore = 0;
  }

  create() {
    const { width, height } = GAME_SIZE;
    this.add.rectangle(0, 0, width, height, 0x031018, 0.84).setOrigin(0);
    createPanel(this, {
      x: width / 2,
      y: height / 2,
      width: 740,
      height: 420,
      fillColor: 0x07131d,
      fillAlpha: 0.97,
      strokeColor: 0xffd99d,
      strokeAlpha: 0.24,
      scrollFactor: 0,
    });

    this.add.text(360, 166, this.meta.title, {
      fontFamily: "Georgia",
      fontSize: "30px",
      fontStyle: "bold",
      color: "#fff4db",
    }).setOrigin(0.5);

    this.add.text(640, 166, "Esc ile don", {
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      color: "#9bd3ff",
    }).setOrigin(1, 0.5);

    this.descriptionText = this.add.text(640, 214, `${this.meta.description}\n${this.meta.rewardsText}`, {
      fontFamily: "Trebuchet MS",
      fontSize: "16px",
      color: "#d8edf9",
      align: "center",
      wordWrap: { width: 560 },
      lineSpacing: 6,
    }).setOrigin(0.5, 0);

    this.trackGlow = this.add.rectangle(640, 394, 472, 38, 0x102331, 0.95).setStrokeStyle(2, 0xffffff, 0.06);
    this.track = this.add.rectangle(640, 396, 440, 18, 0x173449, 1).setStrokeStyle(2, 0xffffff, 0.08);
    this.target = this.add.rectangle(640, 396, 72, 24, 0x8fe3a8, 0.9).setStrokeStyle(2, 0xd9fff1, 0.25);
    this.markerTrail = this.add.rectangle(430, 396, 24, 8, 0xffc27a, 0.22);
    this.marker = this.add.circle(430, 396, 12, 0xffd99d, 1).setStrokeStyle(2, 0xfff1d8, 0.5);

    this.resultText = this.add.text(640, 458, "Space ile baslat", {
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      color: "#fff4db",
    }).setOrigin(0.5);

    this.scoreText = this.add.text(640, 498, "Skor: -", {
      fontFamily: "Trebuchet MS",
      fontSize: "15px",
      color: "#9bd3ff",
    }).setOrigin(0.5);

    this.rewardText = this.add.text(640, 532, "Tikla veya Space kullan. Her deneme coin ve XP kazandirir.", {
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      color: "#b7d8ec",
      align: "center",
    }).setOrigin(0.5);

    this.retryHintText = this.add.text(640, 566, "Space: tekrar | Tik: durdur | Esc: dunya", {
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      color: "#8fbcd3",
    }).setOrigin(0.5);

    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.input.on("pointerdown", this.handlePointerDown, this);
    this.direction = 1;
    this.speed = 280;
    this.tweens.add({
      targets: this.target,
      alpha: { from: 0.55, to: 1 },
      duration: 650,
      yoyo: true,
      repeat: -1,
    });
  }

  update(_, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      this.closeScene();
      return;
    }

    if (!this.isRunning) {
      if (Phaser.Input.Keyboard.JustDown(this.keySpace) || Phaser.Input.Keyboard.JustDown(this.keyEnter)) {
        this.startRun();
      }
      return;
    }

    this.marker.x += (this.speed * delta / 1000) * this.direction;
    this.markerTrail.x = this.marker.x - 10 * this.direction;
    if (this.marker.x >= 850 || this.marker.x <= 430) {
      this.direction *= -1;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keySpace) || Phaser.Input.Keyboard.JustDown(this.keyEnter)) {
      this.finishAttempt();
    }
  }

  startRun() {
    this.isRunning = true;
    this.isSubmitting = false;
    this.marker.x = 430;
    this.markerTrail.x = 420;
    this.direction = 1;
    this.resultText.setText("Tam hedefte Space'e bas");
    this.scoreText.setText("Skor: -");
    this.rewardText.setText("En iyi odul icin merkeze en yakin anda durdur.");
  }

  handlePointerDown() {
    if (this.isRunning) {
      this.finishAttempt();
      return;
    }

    this.startRun();
  }

  finishAttempt() {
    if (!this.isRunning || this.isSubmitting) {
      return;
    }

    const distance = Math.abs(this.marker.x - this.target.x);
    const score = Math.max(0, 100 - Math.round(distance * 1.6));
    this.lastScore = score;
    this.isRunning = false;
    this.isSubmitting = true;
    this.resultText.setText(score >= 85 ? "Mukemmel zamanlama" : score >= 60 ? "Temiz vurus" : score >= 35 ? "Fena degil" : "Biraz daha pratik");
    this.scoreText.setText(`Skor: ${score} | Odul hesaplaniyor...`);
    this.rewardText.setText("Server odulu dogruluyor...");
    this.scene.get(this.returnSceneKey)?.submitMiniGameScore?.(this.miniGameId, score);
  }

  handleServerResult(payload) {
    if (!payload) {
      return;
    }

    this.isSubmitting = false;
    if (!payload.ok) {
      this.rewardText.setText(payload.message ?? "Odul alinamadi. Tekrar dene.");
      this.scoreText.setText(`Skor: ${this.lastScore} | Tekrar icin Space`);
      return;
    }

    const rankLabel = payload.rankLabel ?? "Run";
    this.scoreText.setText(`Skor: ${payload.score ?? this.lastScore} | ${rankLabel}`);
    this.rewardText.setText(`Odul: +${payload.coins ?? 0} coin | +${payload.xp ?? 0} XP`);
  }

  closeScene() {
    this.input.off("pointerdown", this.handlePointerDown, this);
    this.scene.get(this.returnSceneKey)?.handleMiniGameClosed?.();
    this.scene.stop();
  }
}
