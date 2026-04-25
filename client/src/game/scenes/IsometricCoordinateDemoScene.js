import Phaser from "phaser";
import { GAME_SIZE } from "../constants.js";

function invert2x2(matrix) {
  const [[a, b], [c, d]] = matrix;
  const determinant = a * d - b * c;

  if (Math.abs(determinant) < 0.000001) {
    throw new Error("IsometricCoordinateDemoScene: isometric transform matrix is not invertible.");
  }

  const inverseScale = 1 / determinant;

  return [
    [d * inverseScale, -b * inverseScale],
    [-c * inverseScale, a * inverseScale],
  ];
}

function multiplyMatrix2x2Vector2(matrix, x, y) {
  return {
    x: matrix[0][0] * x + matrix[0][1] * y,
    y: matrix[1][0] * x + matrix[1][1] * y,
  };
}

export class IsometricCoordinateDemoScene extends Phaser.Scene {
  constructor() {
    super("isometric-coordinate-demo");
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b1822");

    this.gridWidth = 10;
    this.gridHeight = 10;

    this.isoConfig = {
      tileWidth: 64,
      tileHeight: 32,

      // Offsets let you move / center the whole isometric map on screen.
      offsetX: GAME_SIZE.width * 0.5,
      offsetY: 150,

      // These compensate for sprite origin / anchor differences.
      // For a bottom-centered sprite (origin 0.5, 1), this can stay at 0.
      spriteOriginOffsetX: 0,
      spriteOriginOffsetY: 0,
    };

    this.updateIsoMatrices();
    this.createDemoTextures();

    this.gridLayer = this.add.layer();
    this.actorLayer = this.add.layer();
    this.uiLayer = this.add.layer();

    this.drawGrid();

    this.hoverDiamond = this.add.image(0, 0, "iso-demo-tile-hover").setVisible(false);
    this.uiLayer.add(this.hoverDiamond);

    this.playerActor = this.createIsoActor("iso-demo-player", 3, 3);
    this.crateActor = this.createIsoActor("iso-demo-crate", 5, 3, 2);
    this.treeActor = this.createIsoActor("iso-demo-tree", 6, 5, 6);

    this.helpText = this.add
      .text(28, 26, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "16px",
        color: "#f2f8fc",
        lineSpacing: 6,
      })
      .setScrollFactor(0);

    this.helpText.setText([
      "Isometric Coordinate Demo",
      "Sol tik: oyuncuyu secilen hucreye gotur",
      "Depth ornegi: sprite.setDepth(projectedY)",
      "",
      "gridToScreen / screenToGrid matris tabanli calisir.",
    ]);

    this.debugText = this.add
      .text(28, 138, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        color: "#9fd5ff",
        lineSpacing: 4,
      })
      .setScrollFactor(0);

    this.input.on("pointermove", (pointer) => {
      this.updatePointerDebug(pointer);
    });

    this.input.on("pointerdown", (pointer) => {
      if (!pointer.leftButtonDown()) {
        return;
      }

      const cell = this.screenToGridCell(pointer.x, pointer.y);

      if (!this.isInsideGrid(cell.x, cell.y)) {
        return;
      }

      this.moveActorToCell(this.playerActor, cell.x, cell.y);
    });

    this.updatePointerDebug(this.input.activePointer);
  }

  updateIsoMatrices() {
    const { tileWidth, tileHeight } = this.isoConfig;

    // Standard 2:1 isometric matrix:
    //
    // [ screenX ]   [  tileWidth / 2   -tileWidth / 2 ] [ gridX ]
    // [ screenY ] = [ tileHeight / 2    tileHeight / 2 ] [ gridY ]
    //
    // It rotates the grid by 45 degrees and compresses it vertically.
    this.gridToScreenMatrix = [
      [tileWidth * 0.5, -tileWidth * 0.5],
      [tileHeight * 0.5, tileHeight * 0.5],
    ];

    // Mouse picking uses the inverse of the same transform matrix.
    this.screenToGridMatrix = invert2x2(this.gridToScreenMatrix);
  }

  gridToScreen(gridX, gridY) {
    const projected = multiplyMatrix2x2Vector2(this.gridToScreenMatrix, Number(gridX), Number(gridY));

    return {
      x: projected.x + this.isoConfig.offsetX + this.isoConfig.spriteOriginOffsetX,
      y: projected.y + this.isoConfig.offsetY + this.isoConfig.spriteOriginOffsetY,
    };
  }

  screenToGrid(mouseX, mouseY) {
    const localX = Number(mouseX) - this.isoConfig.offsetX - this.isoConfig.spriteOriginOffsetX;
    const localY = Number(mouseY) - this.isoConfig.offsetY - this.isoConfig.spriteOriginOffsetY;

    return multiplyMatrix2x2Vector2(this.screenToGridMatrix, localX, localY);
  }

  screenToGridCell(mouseX, mouseY) {
    const grid = this.screenToGrid(mouseX, mouseY);

    return {
      x: Math.round(grid.x),
      y: Math.round(grid.y),
    };
  }

  createIsoActor(textureKey, gridX, gridY, depthOffset = 0) {
    const screen = this.gridToScreen(gridX, gridY);
    const sprite = this.add.image(screen.x, screen.y, textureKey).setOrigin(0.5, 1);

    this.actorLayer.add(sprite);

    const actor = {
      sprite,
      gridX,
      gridY,
      depthOffset,
    };

    this.syncActor(actor);

    return actor;
  }

  syncActor(actor) {
    const screen = this.gridToScreen(actor.gridX, actor.gridY);
    actor.sprite.setPosition(screen.x, screen.y);

    // Correct isometric overlap sorting:
    // use the projected screen Y of the sprite base / feet.
    actor.sprite.setDepth(Math.floor(screen.y + actor.depthOffset));
  }

  moveActorToCell(actor, gridX, gridY) {
    this.tweens.killTweensOf(actor);

    this.tweens.add({
      targets: actor,
      gridX,
      gridY,
      duration: 220,
      ease: "Sine.Out",
      onUpdate: () => {
        this.syncActor(actor);
      },
      onComplete: () => {
        this.syncActor(actor);
      },
    });
  }

  drawGrid() {
    for (let y = 0; y < this.gridHeight; y += 1) {
      for (let x = 0; x < this.gridWidth; x += 1) {
        const screen = this.gridToScreen(x, y);
        const tile = this.add.image(screen.x, screen.y, "iso-demo-tile").setOrigin(0.5, 0.5);
        tile.setDepth(Math.floor(screen.y));
        this.gridLayer.add(tile);
      }
    }
  }

  createDemoTextures() {
    if (!this.textures.exists("iso-demo-tile")) {
      const graphics = this.add.graphics();
      const halfWidth = this.isoConfig.tileWidth * 0.5;
      const halfHeight = this.isoConfig.tileHeight * 0.5;

      graphics.clear();
      graphics.fillStyle(0x5e8d67, 1);
      graphics.lineStyle(2, 0x294537, 0.9);
      graphics.beginPath();
      graphics.moveTo(halfWidth, 0);
      graphics.lineTo(this.isoConfig.tileWidth, halfHeight);
      graphics.lineTo(halfWidth, this.isoConfig.tileHeight);
      graphics.lineTo(0, halfHeight);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();
      graphics.generateTexture("iso-demo-tile", this.isoConfig.tileWidth, this.isoConfig.tileHeight);

      graphics.clear();
      graphics.fillStyle(0x9bd3ff, 0.2);
      graphics.lineStyle(3, 0xeefaff, 0.95);
      graphics.beginPath();
      graphics.moveTo(halfWidth, 0);
      graphics.lineTo(this.isoConfig.tileWidth, halfHeight);
      graphics.lineTo(halfWidth, this.isoConfig.tileHeight);
      graphics.lineTo(0, halfHeight);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();
      graphics.generateTexture("iso-demo-tile-hover", this.isoConfig.tileWidth, this.isoConfig.tileHeight);

      graphics.clear();
      graphics.fillStyle(0xf0bd78, 1);
      graphics.fillRoundedRect(10, 12, 28, 32, 10);
      graphics.fillStyle(0x173449, 1);
      graphics.fillCircle(18, 24, 2);
      graphics.fillCircle(30, 24, 2);
      graphics.fillRect(20, 34, 8, 3);
      graphics.generateTexture("iso-demo-player", 48, 48);

      graphics.clear();
      graphics.fillStyle(0x876647, 1);
      graphics.fillRoundedRect(8, 12, 32, 28, 6);
      graphics.lineStyle(2, 0x5f452c, 0.9);
      graphics.strokeRoundedRect(8, 12, 32, 28, 6);
      graphics.generateTexture("iso-demo-crate", 48, 48);

      graphics.clear();
      graphics.fillStyle(0x5b3d25, 1);
      graphics.fillRect(20, 28, 8, 22);
      graphics.fillStyle(0x4ca36d, 1);
      graphics.fillCircle(24, 20, 16);
      graphics.fillCircle(14, 24, 10);
      graphics.fillCircle(34, 24, 10);
      graphics.generateTexture("iso-demo-tree", 48, 52);

      graphics.destroy();
    }
  }

  updatePointerDebug(pointer) {
    if (!pointer) {
      return;
    }

    const exactGrid = this.screenToGrid(pointer.x, pointer.y);
    const roundedCell = this.screenToGridCell(pointer.x, pointer.y);
    const insideGrid = this.isInsideGrid(roundedCell.x, roundedCell.y);

    if (insideGrid) {
      const hoverPosition = this.gridToScreen(roundedCell.x, roundedCell.y);
      this.hoverDiamond.setPosition(hoverPosition.x, hoverPosition.y).setDepth(Math.floor(hoverPosition.y + 1)).setVisible(true);
    } else {
      this.hoverDiamond.setVisible(false);
    }

    this.debugText.setText([
      `Mouse: (${pointer.x.toFixed(1)}, ${pointer.y.toFixed(1)})`,
      `Exact Grid: (${exactGrid.x.toFixed(2)}, ${exactGrid.y.toFixed(2)})`,
      `Picked Cell: (${roundedCell.x}, ${roundedCell.y})`,
      `Player Grid: (${this.playerActor.gridX.toFixed(2)}, ${this.playerActor.gridY.toFixed(2)})`,
      `Player Depth: ${Math.floor(this.playerActor.sprite.depth)}`,
    ]);
  }

  isInsideGrid(gridX, gridY) {
    return gridX >= 0 && gridX < this.gridWidth && gridY >= 0 && gridY < this.gridHeight;
  }
}

