import Phaser from "phaser";
import { GAME_SIZE, SCENE_KEYS } from "../constants.js";
import { getMiniGameDefinition } from "../content/miniGames.js";
import { createPanel } from "../ui/createPanel.js";

export class CollectionMiniGameScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.MINIGAME_COLLECTION);
  }

  init(data) {
    this.returnSceneKey = data?.returnSceneKey ?? SCENE_KEYS.TOWN;
    this.miniGameId = data?.miniGameId ?? "collection";
    this.meta = getMiniGameDefinition("collection");
    this.isFinished = false;
    this.isSubmitting = false;
    this.score = 0;
    this.timeLeft = 12;
  }

  create() {
    const { width, height } = GAME_SIZE;
    this.add.rectangle(0, 0, width, height, 0x031018, 0.84).setOrigin(0);
    createPanel(this, {
      x: width / 2,
      y: height / 2,
      width: 820,
      height: 480,
      fillColor: 0x07131d,
      fillAlpha: 0.97,
      strokeColor: 0x9bd3ff,
      strokeAlpha: 0.24,
      scrollFactor: 0,
    });

    this.add.text(640, 148, this.meta.title, {
      fontFamily: "Georgia",
      fontSize: "30px",
      fontStyle: "bold",
      color: "#fff4db",
    }).setOrigin(0.5);

    this.add.text(916, 148, "Esc ile don", {
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      color: "#9bd3ff",
    }).setOrigin(1, 0.5);

    this.add.text(640, 188, `${this.meta.description}\n${this.meta.rewardsText}`, {
      fontFamily: "Trebuchet MS",
      fontSize: "15px",
      color: "#d8edf9",
      align: "center",
      wordWrap: { width: 620 },
      lineSpacing: 6,
    }).setOrigin(0.5, 0);

    this.playfield = this.add.rectangle(640, 426, 420, 180, 0x102331, 1).setStrokeStyle(2, 0xffffff, 0.08);
    this.add.rectangle(640, 426, 396, 156, 0x143042, 0.32).setStrokeStyle(1, 0xffffff, 0.04);
    this.obstacles = [
      { x: 640, y: 390, width: 54, height: 54, color: 0x2f4f62 },
      { x: 710, y: 458, width: 84, height: 22, color: 0x305a46 },
      { x: 548, y: 454, width: 72, height: 22, color: 0x49385f },
    ].map((entry) => ({
      ...entry,
      rect: this.add.rectangle(entry.x, entry.y, entry.width, entry.height, entry.color, 0.95).setStrokeStyle(1, 0xffffff, 0.08),
    }));

    this.player = this.add.rectangle(520, 426, 18, 18, 0xffd99d, 1).setStrokeStyle(2, 0xfff1d8, 0.4);
    this.collectiblePositions = [
      { x: 476, y: 368 },
      { x: 588, y: 356 },
      { x: 790, y: 370 },
      { x: 486, y: 474 },
      { x: 632, y: 500 },
      { x: 812, y: 478 },
      { x: 556, y: 410 },
      { x: 736, y: 414 },
    ];
    this.collectibles = [];
    this.resetCollectibles();

    this.timerText = this.add.text(418, 316, "Sure: 12", {
      fontFamily: "Trebuchet MS",
      fontSize: "16px",
      color: "#fff4db",
    });
    this.scoreText = this.add.text(810, 316, "Skor: 0", {
      fontFamily: "Trebuchet MS",
      fontSize: "16px",
      color: "#9bd3ff",
    }).setOrigin(1, 0);
    this.resultText = this.add.text(640, 538, "WASD ile topla | Engel bloklarina carpmadan ilerle", {
      fontFamily: "Trebuchet MS",
      fontSize: "16px",
      color: "#fff4db",
    }).setOrigin(0.5);
    this.rewardText = this.add.text(640, 570, "Sure bitince odul skoruna gore coin ve XP olarak verilir.", {
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      color: "#b7d8ec",
      align: "center",
    }).setOrigin(0.5);

    this.controls = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,ESC");
    this.retryKeys = this.input.keyboard.addKeys("SPACE,ENTER");
    this.clock = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.isFinished || this.isSubmitting) {
          return;
        }
        this.timeLeft -= 1;
        this.timerText.setText(`Sure: ${this.timeLeft}`);
        if (this.timeLeft <= 0) {
          this.finishRun();
        }
      },
    });
  }

  update(_, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.controls.ESC)) {
      this.closeScene();
      return;
    }

    if (this.isFinished) {
      if (Phaser.Input.Keyboard.JustDown(this.retryKeys.SPACE) || Phaser.Input.Keyboard.JustDown(this.retryKeys.ENTER)) {
        this.restartRun();
      }
      return;
    }

    const dirX = (this.controls.D.isDown || this.controls.RIGHT.isDown ? 1 : 0) - (this.controls.A.isDown || this.controls.LEFT.isDown ? 1 : 0);
    const dirY = (this.controls.S.isDown || this.controls.DOWN.isDown ? 1 : 0) - (this.controls.W.isDown || this.controls.UP.isDown ? 1 : 0);
    const speed = 180 * delta / 1000;
    const nextX = Phaser.Math.Clamp(this.player.x + dirX * speed, 430, 850);
    const nextY = Phaser.Math.Clamp(this.player.y + dirY * speed, 350, 500);

    if (!this.wouldCollide(nextX, this.player.y)) {
      this.player.x = nextX;
    }

    if (!this.wouldCollide(this.player.x, nextY)) {
      this.player.y = nextY;
    }

    this.collectibles = this.collectibles.filter((orb) => {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, orb.x, orb.y) < 22) {
        orb.destroy();
        this.score += 1;
        this.scoreText.setText(`Skor: ${this.score}`);
        return false;
      }
      return true;
    });

    if (this.collectibles.length === 0) {
      this.finishRun();
    }
  }

  finishRun() {
    this.isFinished = true;
    this.isSubmitting = true;
    this.resultText.setText(`Tur bitti | Toplanan: ${this.score} | Odul hesaplaniyor...`);
    this.rewardText.setText("Server sonucu dogruluyor...");
    this.scene.get(this.returnSceneKey)?.submitMiniGameScore?.(this.miniGameId, this.score);
  }

  handleServerResult(payload) {
    if (!payload) {
      return;
    }

    this.isSubmitting = false;

    if (!payload.ok) {
      this.resultText.setText(`Tur bitti | Toplanan: ${this.score} | Tekrar icin Space`);
      this.rewardText.setText(payload.message ?? "Odul alinamadi. Tekrar deneyebilirsin.");
      return;
    }

    this.resultText.setText(
      `Tur bitti | Toplanan: ${payload.score ?? this.score} | ${payload.rankLabel ?? "Run"} | Tekrar icin Space`,
    );
    this.rewardText.setText(`Odul: +${payload.coins ?? 0} coin | +${payload.xp ?? 0} XP`);
  }

  restartRun() {
    this.isFinished = false;
    this.isSubmitting = false;
    this.score = 0;
    this.timeLeft = 12;
    this.player.x = 520;
    this.player.y = 426;
    this.scoreText.setText("Skor: 0");
    this.timerText.setText("Sure: 12");
    this.resultText.setText("WASD ile topla | Engel bloklarina carpmadan ilerle");
    this.rewardText.setText("Sure bitince odul skoruna gore coin ve XP olarak verilir.");
    this.resetCollectibles();
  }

  resetCollectibles() {
    this.collectibles.forEach((orb) => orb.destroy());
    this.collectibles = this.collectiblePositions.map((entry) => {
      const orb = this.add.circle(entry.x, entry.y, 10, 0x8fe3a8, 1).setStrokeStyle(2, 0xe7fff0, 0.32);
      this.tweens.add({
        targets: orb,
        scale: { from: 0.92, to: 1.12 },
        alpha: { from: 0.7, to: 1 },
        duration: 520 + Math.round(Math.random() * 260),
        yoyo: true,
        repeat: -1,
      });
      return orb;
    });
  }

  wouldCollide(nextX, nextY) {
    const half = 9;
    const playerBounds = new Phaser.Geom.Rectangle(nextX - half, nextY - half, half * 2, half * 2);

    return this.obstacles.some((obstacle) => {
      const obstacleBounds = new Phaser.Geom.Rectangle(
        obstacle.x - obstacle.width / 2,
        obstacle.y - obstacle.height / 2,
        obstacle.width,
        obstacle.height,
      );
      return Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, obstacleBounds);
    });
  }

  closeScene() {
    this.scene.get(this.returnSceneKey)?.handleMiniGameClosed?.();
    this.scene.stop();
  }
}
