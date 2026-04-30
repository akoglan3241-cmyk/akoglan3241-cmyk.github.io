import Phaser from "phaser";
import { GAME_SIZE, SCENE_KEYS } from "../constants.js";
import { createPanel } from "../ui/createPanel.js";

export class DialogScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.DIALOG);
    this.returnSceneKey = SCENE_KEYS.TOWN;
  }

  init(data) {
    this.speaker = data?.speaker ?? "NPC";
    this.npcId = data?.npcId ?? "";
    this.tree = data?.tree ?? null;
    this.node = data?.node ?? null;
    this.returnSceneKey = data?.returnSceneKey ?? SCENE_KEYS.TOWN;
    this.selectedChoiceIndex = 0;
    this.choiceLabels = [];
  }

  create() {
    const { width, height } = GAME_SIZE;
    this.canCloseAt = this.time.now + 150;

    this.add.rectangle(0, 0, width, height, 0x04101a, 0.5).setOrigin(0);

    createPanel(this, {
      x: width / 2,
      y: height - 132,
      width: width - 120,
      height: 180,
      fillColor: 0x07131d,
      fillAlpha: 0.94,
      strokeColor: 0x9bd3ff,
      strokeAlpha: 0.3,
      scrollFactor: 0,
    });

    this.add
      .text(100, height - 198, this.speaker, {
        fontFamily: "Trebuchet MS",
        fontSize: "24px",
        fontStyle: "bold",
        color: "#f4fbff",
      })
      .setScrollFactor(0);

    this.bodyText = this.add
      .text(100, height - 160, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "18px",
        color: "#d8edf9",
        wordWrap: { width: width - 200 },
        lineSpacing: 8,
      })
      .setScrollFactor(0);

    this.choiceHeader = this.add
      .text(100, height - 86, "Secim", {
        fontFamily: "Georgia",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#fff4db",
      })
      .setScrollFactor(0);

    this.add
      .text(width - 104, height - 88, "W/S + Enter", {
        fontFamily: "Trebuchet MS",
        fontSize: "15px",
        color: "#ffd99d",
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0);

    this.choiceContainer = this.add.container(100, height - 60).setScrollFactor(0);
    this.inputKeys = this.input.keyboard.addKeys("W,S,UP,DOWN,E,ESC,SPACE,ENTER,ONE,TWO,THREE,FOUR,FIVE");
    this.renderNode(this.node);
  }

  update() {
    if (this.time.now < this.canCloseAt) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.inputKeys.ESC)) {
      this.closeDialog();
      return;
    }

    if (this.choiceLabels.length === 0) {
      if (Phaser.Input.Keyboard.JustDown(this.inputKeys.E) || Phaser.Input.Keyboard.JustDown(this.inputKeys.ENTER) || Phaser.Input.Keyboard.JustDown(this.inputKeys.SPACE)) {
        this.closeDialog();
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.inputKeys.W) || Phaser.Input.Keyboard.JustDown(this.inputKeys.UP)) {
      this.selectedChoiceIndex = Phaser.Math.Wrap(this.selectedChoiceIndex - 1, 0, this.choiceLabels.length);
      this.refreshChoiceSelection();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.inputKeys.S) || Phaser.Input.Keyboard.JustDown(this.inputKeys.DOWN)) {
      this.selectedChoiceIndex = Phaser.Math.Wrap(this.selectedChoiceIndex + 1, 0, this.choiceLabels.length);
      this.refreshChoiceSelection();
      return;
    }

    const numberedChoice = [
      this.inputKeys.ONE,
      this.inputKeys.TWO,
      this.inputKeys.THREE,
      this.inputKeys.FOUR,
      this.inputKeys.FIVE,
    ].findIndex((key) => Phaser.Input.Keyboard.JustDown(key));

    if (numberedChoice >= 0 && numberedChoice < this.choiceLabels.length) {
      this.selectedChoiceIndex = numberedChoice;
      this.refreshChoiceSelection();
      this.confirmChoice();
      return;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.inputKeys.E) ||
      Phaser.Input.Keyboard.JustDown(this.inputKeys.SPACE) ||
      Phaser.Input.Keyboard.JustDown(this.inputKeys.ENTER)
    ) {
      this.confirmChoice();
    }
  }

  renderNode(node) {
    this.node = node;
    this.selectedChoiceIndex = 0;
    this.bodyText.setText(node?.text ?? "");
    this.choiceContainer.removeAll(true);
    this.choiceLabels = [];

    const choices = node?.choices ?? [];
    this.choiceHeader.setVisible(choices.length > 0);

    choices.forEach((choice, index) => {
      const choiceLabel = this.add
        .text(0, index * 32, `${index + 1}. ${choice.text}`, {
          fontFamily: "Trebuchet MS",
          fontSize: "16px",
          color: "#d8edf9",
          backgroundColor: "#102434",
          padding: { left: 10, right: 10, top: 6, bottom: 6 },
          wordWrap: { width: GAME_SIZE.width - 240 },
        })
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          this.selectedChoiceIndex = index;
          this.refreshChoiceSelection();
        })
        .on("pointerdown", () => {
          this.selectedChoiceIndex = index;
          this.refreshChoiceSelection();
          this.confirmChoice();
        });

      this.choiceContainer.add(choiceLabel);
      this.choiceLabels.push(choiceLabel);
    });

    this.refreshChoiceSelection();
  }

  refreshChoiceSelection() {
    this.choiceLabels.forEach((label, index) => {
      const isActive = index === this.selectedChoiceIndex;
      label.setStyle({
        color: isActive ? "#173449" : "#d8edf9",
        backgroundColor: isActive ? "#ffd99d" : "#102434",
      });
    });
  }

  confirmChoice() {
    const choice = this.node?.choices?.[this.selectedChoiceIndex];

    if (!choice) {
      this.closeDialog();
      return;
    }

    const returnScene = this.scene.get(this.returnSceneKey);
    const result = returnScene.handleDialogueChoice?.({
      npcId: this.npcId,
      tree: this.tree,
      currentNodeId: this.node?.id ?? null,
      choice,
    });

    if (result?.close || !result?.payload) {
      this.closeDialog();
      return;
    }

    this.speaker = result.payload.speaker ?? this.speaker;
    this.npcId = result.payload.npcId ?? this.npcId;
    this.tree = result.payload.tree ?? this.tree;
    this.renderNode(result.payload.node ?? null);
  }

  closeDialog() {
    this.scene.resume(this.returnSceneKey);
    this.scene.stop();
  }
}
