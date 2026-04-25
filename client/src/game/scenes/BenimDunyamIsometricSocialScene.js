import Phaser from "phaser";
import { AvatarSprite } from "../avatar/AvatarSprite.js";
import { DEFAULT_APPEARANCE } from "../avatar/avatarOptions.js";
import { DEFAULT_PLAYER_NAME, GAME_SIZE, TILE_SIZE } from "../constants.js";
import { getRoomDefinition } from "../world/rooms.js";
import { createMultiplayerClient } from "../network/multiplayerClient.js";
import { guestLogin } from "../network/authClient.js";
import { fetchPlayerBootstrap } from "../network/playerProfileClient.js";
import { createSession, saveAuthToken } from "../state/session.js";
import { createPlaceholderTextures } from "../utils/createPlaceholderTextures.js";
import { createPostProcessingController } from "../render/createPostProcessingController.js";
import { createWorldFx } from "../world/createWorldFx.js";

function invert2x2(matrix) {
  const [[a, b], [c, d]] = matrix;
  const determinant = a * d - b * c;
  if (Math.abs(determinant) < 0.000001) {
    throw new Error("BenimDunyamIsometricSocialScene: transform matrix is not invertible.");
  }
  return [
    [d / determinant, -b / determinant],
    [-c / determinant, a / determinant],
  ];
}

function multiplyMatrix2x2Vector2(matrix, x, y) {
  return {
    x: matrix[0][0] * x + matrix[0][1] * y,
    y: matrix[1][0] * x + matrix[1][1] * y,
  };
}

function getInventoryItemCount(inventoryState, itemId) {
  return Math.max(0, Number(inventoryState?.items?.[itemId] ?? 0));
}

function getPlayerGridPosition(playerState) {
  return {
    x: (Number(playerState?.x ?? 0) - TILE_SIZE * 0.5) / TILE_SIZE,
    y: (Number(playerState?.y ?? 0) - TILE_SIZE * 0.5) / TILE_SIZE,
  };
}

function getLogicalWorldFromGrid(gridX, gridY) {
  return {
    x: gridX * TILE_SIZE + TILE_SIZE * 0.5,
    y: gridY * TILE_SIZE + TILE_SIZE * 0.5,
  };
}

function isInsideRect(rect, x, y) {
  return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}

function getQuestProgress(activeQuest, gameplayState, currentRoomId, localActor) {
  if (!activeQuest) {
    return { ratio: 0, label: "Hazir" };
  }
  const objective = activeQuest.objective ?? activeQuest.objectives?.[0] ?? null;
  if (!objective) {
    return { ratio: 0.2, label: "Takip ediliyor" };
  }
  if (objective.type === "collect-item") {
    const count = getInventoryItemCount(gameplayState?.inventory, objective.itemId);
    const total = Math.max(1, Number(objective.targetAmount ?? 1));
    const clamped = Math.min(total, count);
    return { ratio: clamped / total, label: `${clamped}/${total}` };
  }
  if (objective.type === "open-chest") {
    const opened = Array.isArray(gameplayState?.world?.openedChestIds) && gameplayState.world.openedChestIds.includes(objective.chestId);
    return { ratio: opened ? 1 : 0.12, label: opened ? "1/1" : "0/1" };
  }
  if (objective.type === "talk-to-npc") {
    const talked = Array.isArray(activeQuest.talkedNpcIds) && activeQuest.talkedNpcIds.includes(objective.npcId);
    return { ratio: talked ? 1 : 0.2, label: talked ? "1/1" : "0/1" };
  }
  if (objective.type === "go-to-location") {
    if (objective.roomId && objective.roomId !== currentRoomId) {
      return { ratio: 0.15, label: "Oda degis" };
    }
    if (objective.position && localActor) {
      const distance = Phaser.Math.Distance.Between(localActor.x, localActor.y, objective.position.x, objective.position.y);
      return { ratio: Phaser.Math.Clamp(1 - distance / 8, 0.15, 1), label: distance <= 1 ? "Hedefte" : "Yaklas" };
    }
    return { ratio: 0.35, label: "Takip et" };
  }
  return { ratio: 0.2, label: "Takip ediliyor" };
}

const EMOTE_META = {
  wave: { label: "El Salla", bubble: "El salladi." },
  dance: { label: "Dans", bubble: "Dans ediyor." },
  sit: { label: "Otur", bubble: "Biraz oturuyor." },
  laugh: { label: "Gul", bubble: "Kahkaha atti." },
};

const UI_STYLE_ID = "benimdunyam-live-ui-styles";

const UI_STYLES = `
.ko-root{position:relative;width:1280px;height:720px;pointer-events:none;font-family:"Nunito","Trebuchet MS",system-ui,sans-serif;color:#fff}.ko-panel{background:rgba(20,15,40,.86);border:1px solid rgba(255,255,255,.1);box-shadow:0 16px 38px rgba(0,0,0,.32);backdrop-filter:blur(12px);border-radius:18px}.ko-top{position:absolute;top:0;left:0;right:0;height:54px;display:flex;align-items:center;gap:12px;padding:0 16px;background:linear-gradient(135deg,rgba(23,15,54,.96),rgba(12,31,79,.96));border-bottom:2px solid rgba(255,215,0,.16);pointer-events:auto}.ko-avatar{width:38px;height:38px;border-radius:999px;background:linear-gradient(135deg,#339af0,#1864ab);border:2px solid rgba(255,215,0,.62);display:flex;align-items:center;justify-content:center;font-weight:900}.ko-logo{display:flex;flex-direction:column;line-height:1}.ko-logo b{font-family:"Fredoka One","Nunito",system-ui,sans-serif;font-size:22px;color:#ffd45d}.ko-logo span{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.45)}.ko-top-meta{display:flex;flex-direction:column;gap:1px}.ko-top-meta b{font-size:13px}.ko-top-meta span{font-size:10px;color:rgba(255,255,255,.54);text-transform:uppercase;letter-spacing:1px}.ko-stat{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);font-size:12px;font-weight:800}.ko-stat.level{background:linear-gradient(135deg,#cc5de8,#9c36b5);border-color:transparent}.ko-stat.gold{color:#ffd45d}.ko-stat.xp{color:#73df83}.ko-stat.room{color:#b4d6ff}.ko-online{display:inline-flex;align-items:center;gap:8px;margin-left:auto;font-size:12px;font-weight:800}.ko-online-dot{width:10px;height:10px;border-radius:999px;background:#51cf66;box-shadow:0 0 0 rgba(81,207,102,.5);animation:koPulse 1.8s infinite}.ko-nav{display:flex;gap:8px}.ko-nav button,.ko-chat-send,.ko-emotes button,.ko-actions button{pointer-events:auto;cursor:pointer;transition:transform .12s ease,filter .12s ease}.ko-nav button:hover,.ko-chat-send:hover,.ko-emotes button:hover,.ko-actions button:hover{transform:translateY(-1px);filter:brightness(1.05)}.ko-nav button{border:none;border-radius:10px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);color:#fff;font:800 12px "Nunito",sans-serif;padding:7px 12px}.ko-chat{position:absolute;left:16px;bottom:88px;width:328px;overflow:hidden;pointer-events:auto}.ko-panel-head{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08);font-size:11px;font-weight:900;letter-spacing:1.3px;text-transform:uppercase;color:rgba(255,255,255,.58)}.ko-live{margin-left:auto;color:#73df83;font-size:10px}.ko-messages{height:160px;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:8px}.ko-msg{font-size:12px;line-height:1.45;color:rgba(255,255,255,.86)}.ko-msg .sender{font-weight:900}.ko-msg.system{font-size:11px;color:rgba(255,212,93,.84);font-style:italic}.ko-msg.me .sender{color:#76d0ff}.ko-msg.other .sender{color:#d99cff}.ko-chat-input{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(255,255,255,.08)}.ko-chat-input input{flex:1;min-width:0;border:none;outline:none;border-radius:12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);color:#fff;padding:9px 12px;font:700 12px "Nunito",sans-serif}.ko-chat-send{border:none;border-radius:12px;padding:9px 14px;background:linear-gradient(135deg,#ffd45d,#ff9f43);color:#1a0533;font:900 12px "Nunito",sans-serif}.ko-side{position:absolute;right:16px;width:214px;pointer-events:auto}.ko-players{top:68px;overflow:hidden}.ko-player-list{display:flex;flex-direction:column}.ko-player-row{display:flex;align-items:center;gap:10px;padding:10px 13px;border-bottom:1px solid rgba(255,255,255,.05)}.ko-player-avatar{width:28px;height:28px;border-radius:999px;background:linear-gradient(135deg,#6ea8ff,#2758aa);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900}.ko-player-meta{display:flex;flex-direction:column;gap:1px}.ko-player-meta b{font-size:12px}.ko-player-meta span{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,.45)}.ko-status-dot{margin-left:auto;width:10px;height:10px;border-radius:999px;background:#51cf66}.ko-quest{right:186px;bottom:88px;width:248px;pointer-events:auto;overflow:hidden}.ko-qbody{padding:12px 14px 14px}.ko-qbody h3{margin:0 0 6px;font-size:14px}.ko-qbody p{margin:0 0 10px;font-size:11px;line-height:1.5;color:rgba(255,255,255,.6)}.ko-progress{height:7px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin-bottom:8px}.ko-progress-bar{height:100%;width:0;background:linear-gradient(90deg,#ffd45d,#ff9f43)}.ko-quest-meta{font-size:10px;color:rgba(255,255,255,.46);margin-bottom:8px}.ko-rewards{display:flex;gap:6px;flex-wrap:wrap}.ko-rewards span{padding:4px 8px;border-radius:9px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);font-size:10px;font-weight:900}.ko-mini{bottom:88px;height:126px;overflow:hidden}.ko-mini-inner{position:relative;width:100%;height:100%;background:linear-gradient(135deg,#284e29,#456f37)}.ko-mini-road,.ko-mini-building,.ko-mini-player,.ko-mini-portal{position:absolute}.ko-mini-road{background:#927f64;border-radius:6px}.ko-mini-building{background:#d1a35d;border-radius:4px;opacity:.9}.ko-mini-portal{width:8px;height:8px;border-radius:999px;border:1px solid rgba(255,255,255,.7);background:rgba(94,182,255,.42)}.ko-mini-player{width:8px;height:8px;border-radius:999px;border:1px solid #fff;background:#5eb6ff;box-shadow:0 0 10px rgba(255,255,255,.45)}.ko-mini-player.remote{background:#fff0b8}.ko-notifs{position:absolute;top:72px;right:242px;display:flex;flex-direction:column;gap:10px;pointer-events:none}.ko-notif{min-width:220px;padding:12px 16px;border-radius:14px;background:rgba(20,15,40,.88);border:1px solid rgba(255,255,255,.12);box-shadow:0 14px 30px rgba(0,0,0,.32);transform:translateX(18px);opacity:0;animation:koSlideIn .22s ease forwards}.ko-notif b{display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px}.ko-notif.info b{color:#7ec7ff}.ko-notif.success b{color:#73df83}.ko-notif.warning b{color:#ffd45d}.ko-notif.error b{color:#ff8f7e}.ko-notif span{font-size:13px;font-weight:800}.ko-actions{position:absolute;left:0;right:0;bottom:0;height:74px;display:flex;align-items:center;justify-content:center;gap:12px;padding:0 18px;background:linear-gradient(135deg,rgba(23,15,54,.96),rgba(12,31,79,.96));border-top:2px solid rgba(255,215,0,.16);pointer-events:auto}.ko-emotes{display:flex;gap:6px;padding:7px 10px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}.ko-emotes button,.ko-actions button{border:none;border-radius:12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);color:#fff;font:900 11px "Nunito",sans-serif;padding:8px 12px}.ko-actions button{min-width:80px}.ko-actions button.hot{color:#ffd45d}.ko-collapse-chat{display:none}@keyframes koPulse{0%{box-shadow:0 0 0 0 rgba(81,207,102,.45)}70%{box-shadow:0 0 0 10px rgba(81,207,102,0)}100%{box-shadow:0 0 0 0 rgba(81,207,102,0)}}@keyframes koSlideIn{from{transform:translateX(18px);opacity:0}to{transform:translateX(0);opacity:1}}@media (max-width:768px){.ko-chat{width:58px;height:58px;border-radius:999px;overflow:hidden}.ko-chat .ko-panel-head,.ko-chat .ko-messages,.ko-chat .ko-chat-input{display:none}.ko-collapse-chat{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font:900 12px "Nunito",sans-serif}.ko-side,.ko-quest{transform:scale(.92);transform-origin:bottom right}}
`;

export class BenimDunyamIsometricSocialScene extends Phaser.Scene {
  constructor() {
    super("benimdunyam-isometric-social");
  }

  create() {
    this.session = null;
    this.multiplayerClient = null;
    this.multiplayerSelfId = "";
    this.inputSequence = 0;
    this.currentRoom = null;
    this.currentRoomDefinition = null;
    this.gameplayState = {
      inventory: { items: {} },
      quest: { activeQuest: null, completedQuestIds: [] },
      world: { collectedPickupIds: [], openedChestIds: [] },
      progression: { level: 1, xp: 0 },
    };
    this.roomBackdropEntries = [];
    this.roomInteractiveEntries = [];
    this.roomNpcEntries = [];
    this.roomWaterTiles = [];
    this.actors = new Map();
    this.remotePlayers = new Map();
    this.localPlayer = null;
    this.pendingPromptRefresh = 0;

    this.ensureUiStyles();
    createPlaceholderTextures(this);
    this.createSceneTextures();

    this.groundLayer = this.add.layer();
    this.environmentLayer = this.add.layer();
    this.labelLayer = this.add.layer();
    this.actorLayer = this.add.layer();
    this.overlayLayer = this.add.layer();

    this.hoverTile = this.add.image(0, 0, "ko-iso-hover").setVisible(false).setDepth(9999);
    this.overlayLayer.add(this.hoverTile);

    this.worldFx = createWorldFx(this);
    this.sunbeams = this.worldFx.createSunbeams({ count: 4, alpha: 0.08 });
    this.leaves = this.worldFx.createLeaves({ count: 12 });

    this.createUiOverlay();
    this.bindPointerInput();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupScene());
    void this.bootstrapMultiplayer();
  }

  update(_time, delta) {
    this.actors.forEach((actor) => {
      actor.avatar.updateMotion({ isMoving: Boolean(actor.isMoving), delta });
      if (actor.activeEmoteId && actor.emoteEndsAt && actor.emoteEndsAt <= Date.now()) {
        actor.activeEmoteId = null;
        actor.emoteEndsAt = null;
        actor.avatar.setPose("neutral");
      }
    });

    this.pendingPromptRefresh += delta;
    if (this.pendingPromptRefresh >= 100) {
      this.pendingPromptRefresh = 0;
      this.refreshNpcPrompts();
      this.updateMiniMapDots();
      this.updateQuestPanel();
    }

    if (this.localPlayer && this.postProcessing) {
      this.postProcessing.setFocusFromWorldY(this.localPlayer.y);
    }
  }

  async bootstrapMultiplayer() {
    try {
      this.appendChatMessage({ kind: "system", text: "Baglanti kuruluyor..." });
      this.setTopStatus("Baglanti kuruluyor");
      this.session = await this.ensurePlayableSession();
      this.updateTopBar();
      this.connectToMultiplayer();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Baglanti kurulamadi.";
      this.appendChatMessage({ kind: "system", text: message });
      this.showNotification("Baglanti", message, "error");
      this.setTopStatus("Baglanti hatasi");
    }
  }

  async ensurePlayableSession() {
    const initialSession = createSession();
    if (initialSession.authToken) {
      try {
        const bootstrap = await fetchPlayerBootstrap(initialSession.authToken);
        return createSession(initialSession.playerName, bootstrap?.appearance ?? initialSession.appearance, {
          authToken: initialSession.authToken,
          isGuest: initialSession.isGuest,
          username: initialSession.username,
          cosmetics: bootstrap?.cosmetics ?? initialSession.cosmetics,
        });
      } catch (_error) {
        return initialSession;
      }
    }

    const guestName = `${DEFAULT_PLAYER_NAME}${Phaser.Math.Between(100, 999)}`;
    const result = await guestLogin({ playerName: guestName });
    const authToken = String(result?.token ?? "");
    if (!authToken) {
      throw new Error("Misafir girisi basarisiz.");
    }

    saveAuthToken(authToken);
    let bootstrap = null;
    try {
      bootstrap = await fetchPlayerBootstrap(authToken);
    } catch (_error) {
      bootstrap = null;
    }

    return createSession(String(result?.playerName ?? guestName), bootstrap?.appearance ?? DEFAULT_APPEARANCE, {
      authToken,
      isGuest: Boolean(result?.guest ?? true),
      username: String(result?.username ?? "guest"),
      cosmetics: bootstrap?.cosmetics,
    });
  }

  connectToMultiplayer() {
    this.multiplayerClient = createMultiplayerClient({
      playerName: this.session?.playerName ?? DEFAULT_PLAYER_NAME,
      appearance: this.session?.appearance ?? DEFAULT_APPEARANCE,
      authToken: this.session?.authToken ?? "",
      onConnectError: (error) => {
        const message = error?.message ?? "Socket baglantisi kurulamadi.";
        this.appendChatMessage({ kind: "system", text: message });
        this.showNotification("Baglanti", message, "error");
        this.setTopStatus("Offline");
      },
      onInit: (payload) => this.handleWorldInit(payload),
      onRoomChanged: (payload) => this.handleRoomChanged(payload),
      onGameplayState: (payload) => this.applyGameplayState(payload),
      onPlayerJoined: (playerState) => {
        this.upsertLivePlayer(playerState);
        this.showNotification("Oyuncu", `${playerState?.name ?? "Biri"} odaya katildi.`, "info");
      },
      onPlayerMoved: (playerState) => this.upsertLivePlayer(playerState),
      onPlayerLeft: (playerId) => this.removeActor(playerId, true),
      onChatMessage: (message) => {
        this.appendChatMessage(message);
        this.showBubbleForChat(message);
      },
      onChatBlocked: (payload) => {
        const message = payload?.message ?? "Mesaj gonderilemedi.";
        this.appendChatMessage({ kind: "system", text: message });
        this.showNotification("Chat", message, "warning");
      },
      onRoomChatHistory: (messages) => this.setChatMessages(messages ?? []),
      onWorldEventAnnouncement: (payload) => {
        if (payload?.roomId === this.currentRoom?.id && payload?.announcement) {
          this.showNotification("Etkinlik", payload.announcement, "info");
        }
      },
      onWeatherState: () => {
        this.updateTopBar();
      },
    });
  }

  handleWorldInit(payload) {
    this.multiplayerSelfId = String(payload?.selfId ?? "");
    this.applyGameplayState(payload?.gameplayState);
    this.applyRoomSnapshot(payload?.room, payload?.players ?? [], payload?.messages ?? [], payload?.players?.find((entry) => entry.id === this.multiplayerSelfId) ?? null);
    this.setTopStatus("Canli");
    this.showNotification("Hos Geldin", "Canli isometric test sahnesi aktif.", "success");
  }

  handleRoomChanged(payload) {
    this.applyGameplayState(payload?.gameplayState);
    this.applyRoomSnapshot(payload?.room, payload?.players ?? [], payload?.messages ?? [], payload?.player ?? null);
    this.showNotification("Oda", `${payload?.room?.name ?? "Yeni oda"} yuklendi.`, "info");
  }

  applyGameplayState(rawGameplayState) {
    this.gameplayState = {
      inventory: rawGameplayState?.inventory ?? { items: {} },
      quest: rawGameplayState?.quest ?? { activeQuest: null, completedQuestIds: [] },
      world: rawGameplayState?.world ?? { collectedPickupIds: [], openedChestIds: [] },
      progression: rawGameplayState?.progression ?? { level: 1, xp: 0 },
    };
    this.updateTopBar();
    this.updateQuestPanel();
    if (this.currentRoomDefinition) {
      this.renderRoomInteractives();
    }
  }

  applyRoomSnapshot(roomPayload, players, messages, selfPlayer) {
    const nextRoomBaseId = roomPayload?.baseRoomId ?? roomPayload?.id ?? "town";
    const nextRoomDefinition = getRoomDefinition(nextRoomBaseId);
    const roomChanged = this.currentRoom?.id !== roomPayload?.id || this.currentRoomDefinition?.id !== nextRoomDefinition.id;

    this.currentRoom = roomPayload ?? { id: "town", baseRoomId: "town", name: "Town" };
    if (roomChanged) {
      this.currentRoomDefinition = nextRoomDefinition;
      this.rebuildRoom();
    }

    const activeIds = new Set();
    (Array.isArray(players) ? players : []).forEach((playerState) => {
      activeIds.add(playerState.id);
      this.upsertLivePlayer(playerState);
    });

    Array.from(this.actors.keys()).forEach((actorId) => {
      if (!activeIds.has(actorId)) {
        this.removeActor(actorId, false);
      }
    });

    const localState = selfPlayer ?? (players ?? []).find((entry) => entry.id === this.multiplayerSelfId) ?? null;
    if (localState) {
      this.localPlayer = this.actors.get(localState.id) ?? null;
      this.startFollowingLocalPlayer();
    }

    this.setChatMessages(messages);
    this.updateTopBar();
    this.updatePlayersPanel();
    this.updateMiniMap();
    this.updateQuestPanel();
  }

  rebuildRoom() {
    this.roomBackdropEntries.forEach((entry) => entry.destroy?.());
    this.roomBackdropEntries = [];
    this.roomInteractiveEntries.forEach((entry) => {
      entry.sprite?.destroy?.();
      entry.label?.destroy?.();
      entry.prompt?.destroy?.();
      entry.floatTween?.remove?.();
    });
    this.roomInteractiveEntries = [];
    this.roomNpcEntries = [];
    this.roomWaterTiles = [];
    this.groundLayer.removeAll(true);
    this.environmentLayer.removeAll(true);
    this.labelLayer.removeAll(true);

    this.configureProjection(this.currentRoomDefinition);
    this.renderBackdrop();
    this.renderGroundTiles();
    this.renderRoomDecorations();
    this.renderRoomLabels();
    this.renderRoomInteractives();
    this.hoverTile.setVisible(false);
    this.updateMiniMap();

    if (!this.postProcessing) {
      this.postProcessing = createPostProcessingController(this, {
        camera: this.cameras.main,
        ssaoConfig: { aoIntensity: 0.16, aoRadius: 2.6 },
        bloomConfig: { intensity: 0.7, threshold: 0.5, radius: 2.0 },
        colorConfig: { contrast: 1.08, saturation: 1.15 }
      });
    }
  }

  configureProjection(roomDefinition) {
    this.tileWidth = 64;
    this.tileHeight = 32;
    this.isoOffsetX = roomDefinition.height * this.tileWidth * 0.5 + 180;
    this.isoOffsetY = 180;
    this.updateIsoMatrices();
    const bounds = this.getProjectedBounds(roomDefinition.width, roomDefinition.height);
    this.projectedBounds = bounds;
    this.cameras.main.setBounds(bounds.x - 280, bounds.y - 220, bounds.width + 560, bounds.height + 440);
    this.cameras.main.setBackgroundColor("#7bb8e4");
  }

  updateIsoMatrices() {
    this.gridToScreenMatrix = [
      [this.tileWidth * 0.5, -this.tileWidth * 0.5],
      [this.tileHeight * 0.5, this.tileHeight * 0.5],
    ];
    this.screenToGridMatrix = invert2x2(this.gridToScreenMatrix);
  }

  getProjectedBounds(width, height) {
    const corners = [this.gridToScreen(0, 0), this.gridToScreen(width, 0), this.gridToScreen(0, height), this.gridToScreen(width, height)];
    const xs = corners.map((entry) => entry.x);
    const ys = corners.map((entry) => entry.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }

  gridToScreen(gridX, gridY) {
    const projected = multiplyMatrix2x2Vector2(this.gridToScreenMatrix, Number(gridX), Number(gridY));
    return { x: projected.x + this.isoOffsetX, y: projected.y + this.isoOffsetY };
  }

  screenToGrid(screenX, screenY) {
    return multiplyMatrix2x2Vector2(this.screenToGridMatrix, Number(screenX) - this.isoOffsetX, Number(screenY) - this.isoOffsetY);
  }

  screenToGridCell(screenX, screenY) {
    const exact = this.screenToGrid(screenX, screenY);
    return { x: Math.round(exact.x), y: Math.round(exact.y) };
  }

  createSceneTextures() {
    if (this.textures.exists("ko-iso-road")) {
      return;
    }
    const graphics = this.add.graphics();
    const halfWidth = 32;
    const halfHeight = 16;
    
    const drawDiamond = (key, fillColor, edgeColor, highlightColor, shadowColor, hasNoise = true) => {
      graphics.clear();
      
      // Main shape
      graphics.fillStyle(fillColor, 1);
      graphics.beginPath();
      graphics.moveTo(halfWidth, 0);
      graphics.lineTo(64, halfHeight);
      graphics.lineTo(halfWidth, 32);
      graphics.lineTo(0, halfHeight);
      graphics.closePath();
      graphics.fillPath();

      // Subtle Noise/Texture
      if (hasNoise) {
        for (let i = 0; i < 45; i++) {
          const rx = Phaser.Math.Between(4, 60);
          const ry = Phaser.Math.Between(4, 28);
          // Check if inside diamond
          const dx = Math.abs(rx - halfWidth) / halfWidth;
          const dy = Math.abs(ry - halfHeight) / halfHeight;
          if (dx + dy <= 0.9) {
            graphics.fillStyle(0x000000, 0.04);
            graphics.fillRect(rx, ry, 1, 1);
            graphics.fillStyle(0xffffff, 0.03);
            graphics.fillRect(rx + 1, ry + 1, 1, 1);
          }
        }
      }

      // Bevel / Edge highlight
      graphics.lineStyle(1.5, highlightColor, 0.4);
      graphics.beginPath();
      graphics.moveTo(halfWidth, 1);
      graphics.lineTo(62, halfHeight);
      graphics.strokePath();

      graphics.lineStyle(1.5, shadowColor, 0.3);
      graphics.beginPath();
      graphics.moveTo(62, halfHeight);
      graphics.lineTo(halfWidth, 31);
      graphics.lineTo(2, halfHeight);
      graphics.strokePath();

      // Outer border
      graphics.lineStyle(1, edgeColor, 0.6);
      graphics.beginPath();
      graphics.moveTo(halfWidth, 0);
      graphics.lineTo(64, halfHeight);
      graphics.lineTo(halfWidth, 32);
      graphics.lineTo(0, halfHeight);
      graphics.closePath();
      graphics.strokePath();

      graphics.generateTexture(key, 64, 32);
    };

    drawDiamond("ko-iso-grass", 0x7dc95e, 0x5a9e49, 0xdff6d1, 0x416f33);
    drawDiamond("ko-iso-road", 0xc8b89a, 0x8d7b62, 0xfff5df, 0x8a7354);
    drawDiamond("ko-iso-sidewalk", 0xe7dcc7, 0xbeb09b, 0xffffff, 0xc6b79d);
    drawDiamond("ko-iso-plaza", 0xd9cebc, 0xaa9b84, 0xffffff, 0xbdad94);
    drawDiamond("ko-iso-water", 0x4fc3f7, 0x2590cf, 0xdaf6ff, 0x1c73ab, false);
    drawDiamond("ko-iso-boardwalk", 0xa6764d, 0x6a4423, 0xe7c199, 0x5a361c);
    drawDiamond("ko-iso-hover", 0x7ed0ff, 0xf4fbff, 0xffffff, 0x53aee3, false);
    
    // Add a circular shadow texture for entities
    graphics.clear();
    graphics.fillStyle(0x000000, 0.25);
    graphics.fillEllipse(16, 8, 16, 8);
    graphics.generateTexture("iso-shadow", 32, 16);

    graphics.clear();
    graphics.fillStyle(0x5eb6ff, 0.18);
    graphics.lineStyle(2, 0xd6f3ff, 0.8);
    graphics.strokeEllipse(22, 14, 34, 14);
    graphics.generateTexture("ko-portal-ring", 44, 28);
    graphics.destroy();
  }

  renderBackdrop() {
    const skyColor = Number(this.currentRoomDefinition?.ambiance?.skyColor ?? 0x8cd4ff);
    const glowColor = Number(this.currentRoomDefinition?.ambiance?.glowColor ?? 0xffd98a);
    const bandColor = Number(this.currentRoomDefinition?.ambiance?.bandColor ?? 0x214f2e);
    const sky = this.add.graphics().setScrollFactor(0).setDepth(-6000);
    sky.fillGradientStyle(skyColor, skyColor, glowColor, glowColor, 1);
    sky.fillRect(-200, -160, GAME_SIZE.width + 400, GAME_SIZE.height * 0.48);
    sky.fillGradientStyle(0x9bd4ff, 0x9bd4ff, bandColor, bandColor, 1);
    sky.fillRect(-200, GAME_SIZE.height * 0.34, GAME_SIZE.width + 400, GAME_SIZE.height);
    this.roomBackdropEntries.push(sky);

    const sunGlow = this.add.circle(GAME_SIZE.width - 220, 110, 72, glowColor, 0.18).setScrollFactor(0).setDepth(-5990);
    this.roomBackdropEntries.push(sunGlow);

    [
      { x: 120, y: 94, scale: 0.9, duration: 38000 },
      { x: 420, y: 70, scale: 1.08, duration: 52000 },
      { x: 900, y: 132, scale: 0.8, duration: 46000 },
    ].forEach((entry) => {
      const cloud = this.add.container(entry.x, entry.y).setScrollFactor(0).setScale(entry.scale).setDepth(-5980);
      cloud.add([
        this.add.ellipse(-22, 8, 42, 22, 0xffffff, 0.76),
        this.add.ellipse(0, 0, 50, 28, 0xffffff, 0.8),
        this.add.ellipse(26, 7, 36, 20, 0xffffff, 0.78),
        this.add.ellipse(0, 12, 96, 18, 0xffffff, 0.5),
      ]);
      this.tweens.add({
        targets: cloud,
        x: GAME_SIZE.width + 180,
        duration: entry.duration,
        repeat: -1,
        onRepeat: () => {
          cloud.x = -180;
        },
      });
      this.roomBackdropEntries.push(cloud);
    });
  }

  renderGroundTiles() {
    const room = this.currentRoomDefinition;
    for (let y = 0; y < room.height; y += 1) {
      for (let x = 0; x < room.width; x += 1) {
        const screen = this.gridToScreen(x, y);
        const texture = this.resolveGroundTexture(room, x, y);
        const tile = this.add.image(screen.x, screen.y, texture).setOrigin(0.5).setDepth(Math.floor((x + y) * 10));
        this.groundLayer.add(tile);
        if (texture === "ko-iso-water" && (x + y) % 3 === 0) {
          this.tweens.add({
            targets: tile,
            alpha: { from: 0.88, to: 1 },
            duration: 1400 + ((x + y) % 5) * 150,
            yoyo: true,
            repeat: -1,
          });
          this.roomWaterTiles.push(tile);
        }
      }
    }
  }

  resolveGroundTexture(room, x, y) {
    if (room?.waterfront?.enabled) {
      if (y >= Number(room.waterfront.waterStartY ?? 999)) {
        return "ko-iso-water";
      }
      if (y >= Number(room.waterfront.boardwalkStartY ?? 999)) {
        return "ko-iso-boardwalk";
      }
    }
    if (Array.isArray(room?.paths) && room.paths.some((path) => isInsideRect(path, x, y))) {
      return "ko-iso-road";
    }
    if (Array.isArray(room?.crosswalks) && room.crosswalks.some((path) => isInsideRect(path, x, y))) {
      return "ko-iso-plaza";
    }
    const baseTextureMap = { grass: "ko-iso-grass", road: "ko-iso-road", sidewalk: "ko-iso-sidewalk" };
    return baseTextureMap[room?.baseTexture] ?? "ko-iso-grass";
  }

  renderRoomDecorations() {
    (this.currentRoomDefinition?.decorations ?? []).forEach((entry) => {
      const sprite = this.createGroundedSprite(entry.texture, entry.x, entry.y, {
        scale: entry.scale ?? 1,
        tint: entry.tint ?? null,
      });
      if (entry.texture?.startsWith?.("storefront")) {
        sprite.setInteractive({ useHandCursor: true });
        sprite.on("pointerdown", (_pointer, _localX, _localY, event) => {
          event?.stopPropagation?.();
          this.showNotification("Mekan", `${entry.texture} secildi.`, "info");
        });
      }
    });
  }

  renderRoomLabels() {
    (this.currentRoomDefinition?.labels ?? []).forEach((entry) => {
      const screen = this.gridToScreen(entry.x, entry.y);
      const label = this.add
        .text(screen.x, screen.y - 72, String(entry.text ?? ""), {
          fontFamily: "Nunito",
          fontSize: "13px",
          color: "#173449",
          backgroundColor: "#f1f4f7",
          padding: { left: 8, right: 8, top: 4, bottom: 4 },
        })
        .setOrigin(0.5)
        .setDepth(Math.floor((entry.x + entry.y) * 10 + 18));
      this.labelLayer.add(label);
    });
  }

  renderRoomInteractives() {
    this.roomInteractiveEntries.forEach((entry) => {
      entry.sprite?.destroy?.();
      entry.label?.destroy?.();
      entry.prompt?.destroy?.();
      entry.floatTween?.remove?.();
    });
    this.roomInteractiveEntries = [];
    this.roomNpcEntries = [];

    const collectedPickupIds = new Set(this.gameplayState?.world?.collectedPickupIds ?? []);
    const openedChestIds = new Set(this.gameplayState?.world?.openedChestIds ?? []);

    (this.currentRoomDefinition?.npcs ?? []).forEach((npc) => {
      const sprite = this.createGroundedSprite("npc", npc.x, npc.y, { scale: 1.08, tint: npc.tint ?? 0xffffff });
      const prompt = this.add
        .text(0, 0, "[E] Konus", {
          fontFamily: "Nunito",
          fontSize: "12px",
          color: "#173449",
          backgroundColor: "#fff4cf",
          padding: { left: 6, right: 6, top: 3, bottom: 3 },
        })
        .setOrigin(0.5)
        .setVisible(false);
      const label = this.add
        .text(0, 0, npc.name, {
          fontFamily: "Nunito",
          fontSize: "12px",
          color: "#f6fbff",
          backgroundColor: "#173449",
          padding: { left: 6, right: 6, top: 3, bottom: 3 },
        })
        .setOrigin(0.5);
      this.labelLayer.add([prompt, label]);
      const screen = this.gridToScreen(npc.x, npc.y);
      prompt.setPosition(screen.x, screen.y - sprite.displayHeight - 24).setDepth(sprite.depth + 3);
      label.setPosition(screen.x, screen.y - sprite.displayHeight - 2).setDepth(sprite.depth + 2);
      sprite.setInteractive({ useHandCursor: true });
      const entry = { kind: "npc", id: npc.id, gridX: npc.x, gridY: npc.y, dialog: npc.dialog, name: npc.name, sprite, label, prompt };
      sprite.on("pointerdown", (_pointer, _localX, _localY, event) => {
        event?.stopPropagation?.();
        this.multiplayerClient?.requestNpcTalk(npc.id);
        this.showNpcBubble(entry);
      });
      this.roomInteractiveEntries.push(entry);
      this.roomNpcEntries.push(entry);
    });

    (this.currentRoomDefinition?.pickups ?? []).forEach((pickup) => {
      if (collectedPickupIds.has(pickup.id)) {
        return;
      }
      const sprite = this.createGroundedSprite(pickup.texture ?? "pickupCoin", pickup.x, pickup.y, { scale: 1 });
      const label = this.add
        .text(0, 0, pickup.label ?? pickup.itemId, {
          fontFamily: "Nunito",
          fontSize: "11px",
          color: "#ffffff",
          backgroundColor: "rgba(14,14,29,0.7)",
          padding: { left: 6, right: 6, top: 3, bottom: 3 },
        })
        .setOrigin(0.5);
      const screen = this.gridToScreen(pickup.x, pickup.y);
      label.setPosition(screen.x, screen.y - sprite.displayHeight - 12).setDepth(sprite.depth + 2);
      this.labelLayer.add(label);
      const floatTween = this.tweens.add({
        targets: sprite,
        y: sprite.y - 6,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
      sprite.setInteractive({ useHandCursor: true });
      sprite.on("pointerdown", (_pointer, _localX, _localY, event) => {
        event?.stopPropagation?.();
        this.multiplayerClient?.requestCollectPickup(pickup.id);
      });
      this.roomInteractiveEntries.push({ kind: "pickup", id: pickup.id, gridX: pickup.x, gridY: pickup.y, sprite, label, floatTween });
    });

    (this.currentRoomDefinition?.chests ?? []).forEach((chest) => {
      const texture = openedChestIds.has(chest.id) ? "chestOpen" : "chestClosed";
      const sprite = this.createGroundedSprite(texture, chest.x, chest.y, { scale: 1 });
      const label = this.add
        .text(0, 0, openedChestIds.has(chest.id) ? "Acildi" : "Sandik", {
          fontFamily: "Nunito",
          fontSize: "11px",
          color: "#ffffff",
          backgroundColor: "rgba(14,14,29,0.7)",
          padding: { left: 6, right: 6, top: 3, bottom: 3 },
        })
        .setOrigin(0.5);
      const screen = this.gridToScreen(chest.x, chest.y);
      label.setPosition(screen.x, screen.y - sprite.displayHeight - 10).setDepth(sprite.depth + 2);
      this.labelLayer.add(label);
      if (!openedChestIds.has(chest.id)) {
        sprite.setInteractive({ useHandCursor: true });
        sprite.on("pointerdown", (_pointer, _localX, _localY, event) => {
          event?.stopPropagation?.();
          this.multiplayerClient?.requestOpenChest(chest.id);
        });
      }
      this.roomInteractiveEntries.push({ kind: "chest", id: chest.id, gridX: chest.x, gridY: chest.y, sprite, label });
    });

    (this.currentRoomDefinition?.portals ?? []).forEach((portal) => {
      const screen = this.gridToScreen(portal.x, portal.y);
      const sprite = this.add.image(screen.x, screen.y + 8, "ko-portal-ring").setOrigin(0.5).setDepth(Math.floor((portal.x + portal.y) * 10 + 1));
      const label = this.add
        .text(screen.x, screen.y - 10, portal.label ?? portal.targetRoomId, {
          fontFamily: "Nunito",
          fontSize: "12px",
          color: "#f6fbff",
          backgroundColor: "#173449",
          padding: { left: 7, right: 7, top: 3, bottom: 3 },
        })
        .setOrigin(0.5)
        .setDepth(sprite.depth + 2);
      this.environmentLayer.add(sprite);
      this.labelLayer.add(label);
      sprite.setInteractive({ useHandCursor: true });
      sprite.on("pointerdown", (_pointer, _localX, _localY, event) => {
        event?.stopPropagation?.();
        this.multiplayerClient?.requestRoomChange(portal.targetRoomId);
      });
      this.roomInteractiveEntries.push({ kind: "portal", id: portal.id, targetRoomId: portal.targetRoomId, gridX: portal.x, gridY: portal.y, sprite, label });
    });
  }

  createGroundedSprite(textureKey, gridX, gridY, options = {}) {
    const screen = this.gridToScreen(gridX, gridY);
    const sprite = this.add.image(screen.x, screen.y, textureKey).setOrigin(0.5, 1).setScale(options.scale ?? 1);
    if (options.tint) {
      sprite.setTint(options.tint);
    }
    sprite.setDepth(Math.floor((gridX + gridY) * 10 + 6));
    this.environmentLayer.add(sprite);
    return sprite;
  }

  createActor(playerState, isLocalPlayer = false) {
    const avatar = new AvatarSprite(this, 0, 0, playerState?.appearance ?? DEFAULT_APPEARANCE);
    this.add.existing(avatar);
    this.actorLayer.add(avatar);

    const levelBadge = this.add
      .text(0, 0, `Lv.${Math.max(1, Number(playerState?.level ?? 1))}`, {
        fontFamily: "Fredoka One",
        fontSize: "11px",
        color: "#352000",
        backgroundColor: "#ffd45d",
        padding: { left: 6, right: 6, top: 4, bottom: 4 },
      })
      .setOrigin(0.5);
    const nameLabel = this.add
      .text(0, 0, playerState?.name ?? DEFAULT_PLAYER_NAME, {
        fontFamily: "Nunito",
        fontSize: "12px",
        color: "#ffffff",
        backgroundColor: "rgba(20,15,40,0.82)",
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
      })
      .setOrigin(0.5);

    this.actorLayer.add([levelBadge, nameLabel]);

    const actor = {
      id: playerState.id,
      avatar,
      levelBadge,
      nameLabel,
      bubbleText: null,
      bubbleTimer: null,
      isLocalPlayer,
      isMoving: false,
      name: playerState.name,
      level: Math.max(1, Number(playerState?.level ?? 1)),
      appearance: playerState?.appearance ?? DEFAULT_APPEARANCE,
      flipX: Boolean(playerState?.flipX),
      activeEmoteId: playerState?.activeEmoteId ?? null,
      emoteEndsAt: playerState?.emoteEndsAt ?? null,
      ...getPlayerGridPosition(playerState),
      logicalX: Number(playerState?.x ?? 0),
      logicalY: Number(playerState?.y ?? 0),
    };

    this.actors.set(actor.id, actor);
    if (isLocalPlayer) {
      this.localPlayer = actor;
    } else {
      this.remotePlayers.set(actor.id, actor);
    }
    this.syncActor(actor, false);
    return actor;
  }

  syncActor(actor, animateMotion = false) {
    const screen = this.gridToScreen(actor.x, actor.y);
    actor.avatar.setPosition(screen.x, screen.y);
    actor.avatar.setAppearance(actor.appearance ?? DEFAULT_APPEARANCE);
    actor.avatar.setFacing(Boolean(actor.flipX));
    actor.avatar.setPose(actor.activeEmoteId ?? "neutral");
    actor.avatar.setDepth(Math.floor((actor.x + actor.y) * 10 + 8));
    actor.levelBadge.setText(`Lv.${actor.level}`);
    actor.levelBadge.setPosition(screen.x, screen.y - actor.avatar.height - 26).setDepth(actor.avatar.depth + 3);
    actor.nameLabel.setText(actor.name);
    actor.nameLabel.setPosition(screen.x, screen.y - actor.avatar.height - 8).setDepth(actor.avatar.depth + 2);
    if (actor.bubbleText?.active) {
      actor.bubbleText.setPosition(screen.x, screen.y - actor.avatar.height - 48).setDepth(actor.avatar.depth + 4);
    }
    actor.isMoving = Boolean(animateMotion);
  }

  upsertLivePlayer(playerState) {
    if (!playerState?.id) {
      return null;
    }

    const isLocal = playerState.id === this.multiplayerSelfId;
    const nextGrid = getPlayerGridPosition(playerState);
    const existing = this.actors.get(playerState.id);

    if (!existing) {
      const actor = this.createActor(playerState, isLocal);
      if (isLocal) {
        this.startFollowingLocalPlayer();
      }
      this.updatePlayersPanel();
      this.updateMiniMap();
      return actor;
    }

    existing.name = playerState.name;
    existing.level = Math.max(1, Number(playerState?.level ?? existing.level));
    existing.appearance = playerState.appearance ?? existing.appearance;
    existing.flipX = Boolean(playerState?.flipX);
    existing.activeEmoteId = playerState?.activeEmoteId ?? null;
    existing.emoteEndsAt = playerState?.emoteEndsAt ?? null;
    existing.logicalX = Number(playerState?.x ?? existing.logicalX);
    existing.logicalY = Number(playerState?.y ?? existing.logicalY);
    this.moveActorTo(existing, nextGrid.x, nextGrid.y, 200);
    this.updatePlayersPanel();
    return existing;
  }

  moveActorTo(actor, targetGridX, targetGridY, duration = 220) {
    this.tweens.killTweensOf(actor);
    const previousX = actor.x;
    actor.flipX = targetGridX < previousX;
    this.tweens.add({
      targets: actor,
      x: targetGridX,
      y: targetGridY,
      duration,
      ease: "Sine.Out",
      onUpdate: () => {
        this.syncActor(actor, true);
      },
      onComplete: () => {
        actor.isMoving = false;
        this.syncActor(actor, false);
        if (actor.isLocalPlayer) {
          this.updateMiniMapDots();
        }
      },
    });
  }

  removeActor(playerId, animate = true) {
    const actor = this.actors.get(playerId);
    if (!actor) {
      return;
    }
    this.actors.delete(playerId);
    this.remotePlayers.delete(playerId);
    if (this.localPlayer?.id === playerId) {
      this.localPlayer = null;
    }

    const destroyActor = () => {
      actor.bubbleTimer?.remove?.(false);
      actor.bubbleText?.destroy?.();
      actor.levelBadge.destroy();
      actor.nameLabel.destroy();
      actor.avatar.destroy();
    };

    if (animate) {
      this.tweens.add({
        targets: [actor.avatar, actor.levelBadge, actor.nameLabel, actor.bubbleText].filter(Boolean),
        alpha: 0,
        duration: 500,
        onComplete: destroyActor,
      });
    } else {
      destroyActor();
    }
    this.updatePlayersPanel();
    this.updateMiniMap();
  }

  showNpcBubble(npcEntry) {
    if (!npcEntry) {
      return;
    }
    const tempActor = {
      avatar: { height: npcEntry.sprite.displayHeight },
      bubbleText: npcEntry.promptBubble ?? null,
      bubbleTimer: npcEntry.promptTimer ?? null,
      x: npcEntry.gridX,
      y: npcEntry.gridY,
    };
    this.showBubble(tempActor, npcEntry.dialog || `${npcEntry.name} ile konusuldu.`);
    npcEntry.promptBubble = tempActor.bubbleText;
    npcEntry.promptTimer = tempActor.bubbleTimer;
  }

  showBubble(actor, text) {
    if (!actor) {
      return;
    }
    if (!actor.bubbleText || !actor.bubbleText.active) {
      actor.bubbleText = this.add
        .text(0, 0, "", {
          fontFamily: "Nunito",
          fontSize: "12px",
          color: "#2b3038",
          backgroundColor: "#ffffff",
          padding: { left: 8, right: 8, top: 5, bottom: 5 },
        })
        .setOrigin(0.5)
        .setScale(0);
      this.actorLayer.add(actor.bubbleText);
    }

    actor.bubbleText.setText(text.length > 40 ? `${text.slice(0, 39)}...` : text);
    if (typeof actor.x === "number" && typeof actor.y === "number") {
      const screen = this.gridToScreen(actor.x, actor.y);
      actor.bubbleText.setPosition(screen.x, screen.y - (actor.avatar?.height ?? 48) - 48).setDepth(Math.floor((actor.x + actor.y) * 10 + 12));
    }

    this.tweens.killTweensOf(actor.bubbleText);
    actor.bubbleText.setAlpha(1);
    this.tweens.add({
      targets: actor.bubbleText,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: "Back.Out",
    });

    actor.bubbleTimer?.remove?.(false);
    actor.bubbleTimer = this.time.delayedCall(3500, () => {
      if (!actor.bubbleText) {
        return;
      }
      this.tweens.add({
        targets: actor.bubbleText,
        alpha: 0,
        y: actor.bubbleText.y - 8,
        duration: 220,
        onComplete: () => {
          actor.bubbleText?.destroy();
          actor.bubbleText = null;
          actor.bubbleTimer = null;
        },
      });
    });
  }

  showBubbleForChat(message) {
    if (!message?.playerId) {
      return;
    }
    const actor = this.actors.get(message.playerId);
    if (actor) {
      this.showBubble(actor, message.text ?? "");
    }
  }

  refreshNpcPrompts() {
    if (!this.localPlayer) {
      this.roomNpcEntries.forEach((entry) => entry.prompt.setVisible(false));
      return;
    }
    const localWorld = getLogicalWorldFromGrid(this.localPlayer.x, this.localPlayer.y);
    this.roomNpcEntries.forEach((entry) => {
      const npcWorld = getLogicalWorldFromGrid(entry.gridX, entry.gridY);
      const isNear = Phaser.Math.Distance.Between(localWorld.x, localWorld.y, npcWorld.x, npcWorld.y) <= 80;
      entry.prompt.setVisible(isNear);
    });
  }

  startFollowingLocalPlayer() {
    if (!this.localPlayer) {
      return;
    }
    this.cameras.main.startFollow(this.localPlayer.avatar, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(220, 140);
  }

  bindPointerInput() {
    this.input.on("pointermove", (pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const pickedCell = this.screenToGridCell(worldPoint.x, worldPoint.y);
      if (this.isInsideGrid(pickedCell.x, pickedCell.y)) {
        const screen = this.gridToScreen(pickedCell.x, pickedCell.y);
        this.hoverTile.setPosition(screen.x, screen.y).setDepth(Math.floor((pickedCell.x + pickedCell.y) * 10 + 1)).setVisible(true);
      } else {
        this.hoverTile.setVisible(false);
      }
    });

    this.input.on("pointerdown", (pointer) => {
      if (!pointer.leftButtonDown() || !this.multiplayerClient || !this.localPlayer) {
        return;
      }
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const pickedCell = this.screenToGridCell(worldPoint.x, worldPoint.y);
      if (!this.isInsideGrid(pickedCell.x, pickedCell.y)) {
        return;
      }
      const worldTarget = getLogicalWorldFromGrid(pickedCell.x, pickedCell.y);
      this.inputSequence += 1;
      this.moveActorTo(this.localPlayer, pickedCell.x, pickedCell.y, 180);
      this.multiplayerClient.sendMovement({
        x: worldTarget.x,
        y: worldTarget.y,
        inputSequence: this.inputSequence,
        flipX: pickedCell.x < this.localPlayer.x,
      });
    });
  }

  createUiOverlay() {
    const html = `
      <div class="ko-root">
        <div class="ko-top">
          <div class="ko-avatar" data-role="avatar">KO</div>
          <div class="ko-logo"><b>Kasaba Online</b><span>Isometric Social Test</span></div>
          <div class="ko-top-meta"><b data-role="player-name">Traveler</b><span data-role="player-title">Baglaniyor</span></div>
          <div class="ko-stat room" data-role="room-pill">Town</div>
          <div class="ko-stat level" data-role="level-pill">Lv.1</div>
          <div class="ko-stat gold" data-role="gold-pill">0 coin</div>
          <div class="ko-stat xp" data-role="xp-pill">0 XP</div>
          <div class="ko-online"><span class="ko-online-dot"></span><span data-role="online-pill">0 online</span></div>
          <div class="ko-nav">
            <button type="button" data-nav="town">Ana Sehir</button>
            <button type="button" data-nav="map">Harita</button>
            <button type="button" data-nav="friends">Arkadaslar</button>
            <button type="button" data-nav="shop">Magaza</button>
          </div>
        </div>
        <div class="ko-chat ko-panel">
          <div class="ko-collapse-chat">CHAT</div>
          <div class="ko-panel-head">Sohbet <span class="ko-live" data-role="chat-status">Canli</span></div>
          <div class="ko-messages" data-role="messages"></div>
          <div class="ko-chat-input"><input data-role="chat-input" placeholder="Mesaj yaz..." /><button class="ko-chat-send" type="button" data-role="chat-send">Gonder</button></div>
        </div>
        <div class="ko-side ko-panel ko-players">
          <div class="ko-panel-head">Oyuncular <span class="ko-live" data-role="players-live">0 online</span></div>
          <div class="ko-player-list" data-role="players-list"></div>
        </div>
        <div class="ko-side ko-panel ko-mini">
          <div class="ko-panel-head">Mini Harita</div>
          <div class="ko-mini-inner" data-role="mini-map"></div>
        </div>
        <div class="ko-panel ko-quest">
          <div class="ko-panel-head">Aktif Gorev</div>
          <div class="ko-qbody">
            <h3 data-role="quest-title">Quest yok</h3>
            <p data-role="quest-desc">Canli baglanti kurulunca gorev paneli guncellenir.</p>
            <div class="ko-progress"><div class="ko-progress-bar" data-role="quest-bar"></div></div>
            <div class="ko-quest-meta" data-role="quest-meta">Hazir</div>
            <div class="ko-rewards" data-role="quest-rewards"></div>
          </div>
        </div>
        <div class="ko-notifs" data-role="notifications"></div>
        <div class="ko-actions">
          <div class="ko-emotes">
            <button type="button" data-emote="wave">El Salla</button>
            <button type="button" data-emote="dance">Dans</button>
            <button type="button" data-emote="sit">Otur</button>
            <button type="button" data-emote="laugh">Gul</button>
          </div>
          <button class="hot" type="button" data-action="shop">Magaza</button>
          <button type="button" data-action="inventory">Envanter</button>
          <button type="button" data-action="social">Sosyal</button>
        </div>
      </div>
    `;

    this.uiDom = this.add.dom(GAME_SIZE.width * 0.5, GAME_SIZE.height * 0.5).createFromHTML(html).setDepth(10000);
    const root = this.uiDom.node;
    this.ui = {
      avatar: root.querySelector('[data-role="avatar"]'),
      playerName: root.querySelector('[data-role="player-name"]'),
      playerTitle: root.querySelector('[data-role="player-title"]'),
      roomPill: root.querySelector('[data-role="room-pill"]'),
      levelPill: root.querySelector('[data-role="level-pill"]'),
      goldPill: root.querySelector('[data-role="gold-pill"]'),
      xpPill: root.querySelector('[data-role="xp-pill"]'),
      onlinePill: root.querySelector('[data-role="online-pill"]'),
      chatStatus: root.querySelector('[data-role="chat-status"]'),
      messages: root.querySelector('[data-role="messages"]'),
      chatInput: root.querySelector('[data-role="chat-input"]'),
      chatSend: root.querySelector('[data-role="chat-send"]'),
      playersLive: root.querySelector('[data-role="players-live"]'),
      playersList: root.querySelector('[data-role="players-list"]'),
      miniMap: root.querySelector('[data-role="mini-map"]'),
      questTitle: root.querySelector('[data-role="quest-title"]'),
      questDesc: root.querySelector('[data-role="quest-desc"]'),
      questBar: root.querySelector('[data-role="quest-bar"]'),
      questMeta: root.querySelector('[data-role="quest-meta"]'),
      questRewards: root.querySelector('[data-role="quest-rewards"]'),
      notifications: root.querySelector('[data-role="notifications"]'),
    };

    this.ui.chatSend.addEventListener("click", () => this.handleChatSend());
    this.ui.chatInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.handleChatSend();
      }
    });

    root.querySelectorAll("[data-emote]").forEach((button) => {
      button.addEventListener("click", () => {
        const emoteId = button.getAttribute("data-emote");
        if (!emoteId || !this.multiplayerClient) {
          return;
        }
        this.multiplayerClient.requestPlayEmote(emoteId);
        if (this.localPlayer) {
          this.showBubble(this.localPlayer, EMOTE_META[emoteId]?.bubble ?? "Bir emote kullandin.");
        }
      });
    });

    root.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.getAttribute("data-action");
        const feedback = {
          shop: "Magaza akislarini mevcut oyun mantigi kullanir.",
          inventory: `Coin: ${getInventoryItemCount(this.gameplayState?.inventory, "coin")}`,
          social: `${this.remotePlayers.size} uzak oyuncu gorunuyor.`,
        };
        this.showNotification("Aksiyon", feedback[action] ?? "Aksiyon secildi.", "info");
      });
    });

    root.querySelectorAll("[data-nav]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.getAttribute("data-nav");
        if (target === "town") {
          this.multiplayerClient?.requestRoomChange("town");
          return;
        }
        this.showNotification("Navigasyon", `${target} paneli bu test sahnesinde hafif tutuldu.`, "info");
      });
    });
  }

  ensureUiStyles() {
    if (typeof document === "undefined" || document.getElementById(UI_STYLE_ID)) {
      return;
    }
    const style = document.createElement("style");
    style.id = UI_STYLE_ID;
    style.textContent = UI_STYLES;
    document.head.appendChild(style);
  }

  handleChatSend() {
    const value = String(this.ui?.chatInput?.value ?? "").trim();
    if (!value || !this.multiplayerClient) {
      return;
    }
    this.multiplayerClient.sendChat(value);
    this.ui.chatInput.value = "";
  }

  setChatMessages(messages) {
    if (!this.ui?.messages) {
      return;
    }
    this.ui.messages.innerHTML = "";
    (Array.isArray(messages) ? messages : []).forEach((entry) => this.appendChatMessage(entry, false));
    this.ui.messages.scrollTop = this.ui.messages.scrollHeight;
  }

  appendChatMessage(message, autoScroll = true) {
    if (!this.ui?.messages) {
      return;
    }
    const line = document.createElement("div");
    const isSystem = message?.kind === "system";
    const isSelf = message?.playerId && message.playerId === this.multiplayerSelfId;
    line.className = `ko-msg ${isSystem ? "system" : isSelf ? "me" : "other"}`;
    if (isSystem) {
      line.textContent = String(message?.text ?? "");
    } else {
      const sender = document.createElement("span");
      sender.className = "sender";
      sender.textContent = `${String(message?.name ?? "Oyuncu")}: `;
      const text = document.createElement("span");
      text.textContent = String(message?.text ?? "");
      line.append(sender, text);
    }
    this.ui.messages.appendChild(line);
    if (autoScroll) {
      this.ui.messages.scrollTop = this.ui.messages.scrollHeight;
    }
  }

  setTopStatus(text) {
    if (this.ui?.playerTitle) {
      this.ui.playerTitle.textContent = String(text ?? "");
    }
  }

  updateTopBar() {
    if (!this.ui) {
      return;
    }
    const level = Math.max(1, Number(this.gameplayState?.progression?.level ?? 1));
    const xp = Math.max(0, Number(this.gameplayState?.progression?.xp ?? 0));
    const coinCount = getInventoryItemCount(this.gameplayState?.inventory, "coin");
    const currentName = this.localPlayer?.name ?? this.session?.playerName ?? DEFAULT_PLAYER_NAME;
    const roomName = this.currentRoom?.name ?? "Kasaba";
    const onlineCount = this.actors.size;
    this.ui.avatar.textContent = currentName.slice(0, 2).toUpperCase();
    this.ui.playerName.textContent = currentName;
    this.ui.roomPill.textContent = roomName;
    this.ui.levelPill.textContent = `Lv.${level}`;
    this.ui.goldPill.textContent = `${coinCount} coin`;
    this.ui.xpPill.textContent = `${xp} XP`;
    this.ui.onlinePill.textContent = `${onlineCount} online`;
    this.ui.playersLive.textContent = `${onlineCount} online`;
    this.ui.chatStatus.textContent = this.multiplayerClient?.isConnected?.() ? "Canli" : "Bekliyor";
  }

  updatePlayersPanel() {
    if (!this.ui?.playersList) {
      return;
    }
    this.ui.playersList.innerHTML = "";
    Array.from(this.actors.values())
      .sort((left, right) => left.name.localeCompare(right.name))
      .forEach((actor) => {
        const row = document.createElement("div");
        row.className = "ko-player-row";
        const avatar = document.createElement("div");
        avatar.className = "ko-player-avatar";
        avatar.textContent = actor.name.slice(0, 2).toUpperCase();
        const meta = document.createElement("div");
        meta.className = "ko-player-meta";
        const strong = document.createElement("b");
        strong.textContent = actor.name;
        const small = document.createElement("span");
        small.textContent = `Lv.${actor.level} - ${this.currentRoom?.name ?? "Oda"}`;
        meta.append(strong, small);
        const dot = document.createElement("div");
        dot.className = "ko-status-dot";
        row.append(avatar, meta, dot);
        this.ui.playersList.appendChild(row);
      });
    this.updateTopBar();
  }

  updateMiniMap() {
    if (!this.ui?.miniMap || !this.currentRoomDefinition) {
      return;
    }
    const width = 182;
    const height = 92;
    const room = this.currentRoomDefinition;
    this.ui.miniMap.innerHTML = "";
    const createBox = (className, styles = {}) => {
      const element = document.createElement("div");
      element.className = className;
      Object.assign(element.style, styles);
      this.ui.miniMap.appendChild(element);
      return element;
    };
    (room.paths ?? []).forEach((path) => {
      createBox("ko-mini-road", {
        left: `${(path.x / room.width) * width}px`,
        top: `${(path.y / room.height) * height}px`,
        width: `${(path.width / room.width) * width}px`,
        height: `${(path.height / room.height) * height}px`,
      });
    });
    (room.decorations ?? [])
      .filter((entry) => String(entry.texture ?? "").startsWith("storefront") || entry.texture === "house")
      .forEach((entry) => {
        createBox("ko-mini-building", {
          left: `${(entry.x / room.width) * width}px`,
          top: `${(entry.y / room.height) * height}px`,
          width: "12px",
          height: "10px",
        });
      });
    (room.portals ?? []).forEach((portal) => {
      createBox("ko-mini-portal", {
        left: `${(portal.x / room.width) * width}px`,
        top: `${(portal.y / room.height) * height}px`,
      });
    });
    this.localMiniDot = createBox("ko-mini-player", { left: "0px", top: "0px" });
    this.remoteMiniDots = new Map();
    this.remotePlayers.forEach((actor, actorId) => {
      const dot = createBox("ko-mini-player remote", { left: "0px", top: "0px" });
      this.remoteMiniDots.set(actorId, dot);
    });
    this.updateMiniMapDots();
  }

  updateMiniMapDots() {
    if (!this.currentRoomDefinition || !this.localMiniDot) {
      return;
    }
    const width = 182;
    const height = 92;
    const placeDot = (dot, actor) => {
      if (!dot || !actor) {
        return;
      }
      dot.style.left = `${Phaser.Math.Clamp((actor.x / this.currentRoomDefinition.width) * width, 2, width - 10)}px`;
      dot.style.top = `${Phaser.Math.Clamp((actor.y / this.currentRoomDefinition.height) * height, 2, height - 10)}px`;
    };
    placeDot(this.localMiniDot, this.localPlayer);
    this.remotePlayers.forEach((actor, actorId) => {
      placeDot(this.remoteMiniDots?.get(actorId), actor);
    });
  }

  updateQuestPanel() {
    if (!this.ui) {
      return;
    }
    const activeQuest = this.gameplayState?.quest?.activeQuest ?? null;
    if (!activeQuest) {
      this.ui.questTitle.textContent = "Quest yok";
      this.ui.questDesc.textContent = "Yeni gorev almak icin NPC'lerle konus.";
      this.ui.questBar.style.width = "0%";
      this.ui.questMeta.textContent = "Hazir";
      this.ui.questRewards.innerHTML = "";
      return;
    }
    const progress = getQuestProgress(activeQuest, this.gameplayState, this.currentRoom?.baseRoomId ?? this.currentRoom?.id, this.localPlayer);
    this.ui.questTitle.textContent = String(activeQuest.title ?? "Aktif Gorev");
    this.ui.questDesc.textContent = String(activeQuest.description ?? "");
    this.ui.questBar.style.width = `${Math.round(progress.ratio * 100)}%`;
    this.ui.questMeta.textContent = progress.label;
    this.ui.questRewards.innerHTML = "";
    const rewards = [];
    if (Number(activeQuest?.rewards?.coins ?? 0) > 0) {
      rewards.push(`${activeQuest.rewards.coins} coin`);
    }
    if (Number(activeQuest?.rewards?.xp ?? 0) > 0) {
      rewards.push(`${activeQuest.rewards.xp} XP`);
    }
    (Array.isArray(activeQuest?.rewards?.items) ? activeQuest.rewards.items : []).forEach((entry) => {
      rewards.push(`${entry.itemId} x${entry.amount}`);
    });
    rewards.forEach((label) => {
      const chip = document.createElement("span");
      chip.textContent = label;
      this.ui.questRewards.appendChild(chip);
    });
  }

  showNotification(title, body, type = "info") {
    if (!this.ui?.notifications) {
      return;
    }
    const notification = document.createElement("div");
    notification.className = `ko-notif ${type}`;
    const heading = document.createElement("b");
    heading.textContent = String(title ?? "Bildirim");
    const content = document.createElement("span");
    content.textContent = String(body ?? "");
    notification.append(heading, content);
    this.ui.notifications.appendChild(notification);
    this.time.delayedCall(3500, () => {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(22px)";
      this.time.delayedCall(200, () => notification.remove());
    });
  }

  isInsideGrid(gridX, gridY) {
    if (!this.currentRoomDefinition) {
      return false;
    }
    return gridX >= 0 && gridX < this.currentRoomDefinition.width && gridY >= 0 && gridY < this.currentRoomDefinition.height;
  }

  cleanupScene() {
    this.multiplayerClient?.disconnect?.();
    this.multiplayerClient = null;
    if (this.uiDom) {
      this.uiDom.destroy();
      this.uiDom = null;
      this.ui = null;
    }
  }
}
