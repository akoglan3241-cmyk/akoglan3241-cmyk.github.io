import Phaser from "phaser";
import {
  CHEST_INTERACTION_RANGE,
  NPC_INTERACTION_RANGE,
  PICKUP_RANGE,
  PLAYER_SYNC_INTERVAL,
  PORTAL_INTERACTION_RANGE,
  QUEST_TARGET_RANGE,
  SCENE_KEYS,
  TILE_SIZE,
} from "../constants.js";
import { getQuestDefinition } from "../content/questContent.js";
import { listCraftingRecipes } from "../content/craftingContent.js";
import { getItemDefinition, getItemRarityMeta } from "../content/itemContent.js";
import { getDialogueNode, resolveNpcDialogueStart } from "../content/dialogueRuntime.js";
import { getMiniGameDefinition } from "../content/miniGames.js";
import { getEmoteDefinition, parseEmoteCommand } from "../content/emotes.js";
import { getSeasonalBannerForRoom } from "../content/seasonalEventContent.js";
import { getShopById, getShopByNpcId } from "../content/shopContent.js";
import { createEntityRegistry } from "../entities/entityRegistry.js";
import { HomeFurniture } from "../entities/HomeFurniture.js";
import { Player } from "../entities/Player.js";
import { RemotePlayer } from "../entities/RemotePlayer.js";
import { createNameTag } from "../ui/createNameTag.js";
import { createMovementControls } from "../input/createMovementControls.js";
import { createPixelPerfectCameraController } from "../camera/createPixelPerfectCameraController.js";
import { getAudioManager } from "../audio/audioManager.js";
import { createGameEventBus, GAME_EVENTS } from "../events/gameEventBus.js";
import { createMultiplayerClient } from "../network/multiplayerClient.js";
import { sanitizeChatMessage, sanitizePlainText, sanitizePlayerName, sanitizeProfileStatus } from "../utils/userContentValidation.js";
import { getDefaultAchievementsState, normalizeAchievementsState } from "../state/achievementsState.js";
import { loadAudioSettings, saveAudioSettings } from "../state/audioSettingsState.js";
import { getDefaultBadgesState, getEquippedBadgeLabel, normalizeBadgesState } from "../state/badgesState.js";
import { getDefaultCosmeticsState, getNextOwnedCosmeticId, normalizeCosmeticsState } from "../state/cosmeticsState.js";
import { getDefaultFriendsState, getFriendRelationship, normalizeFriendsState } from "../state/friendsState.js";
import { getDefaultInventoryState, getInventoryEntries, getItemCount, hasEnoughItems, INVENTORY_ITEMS, normalizeInventoryState } from "../state/inventoryState.js";
import { getDefaultDirectMessagesState, normalizeDirectMessagesState } from "../state/directMessagesState.js";
import { getDefaultMailboxState, normalizeMailboxState } from "../state/mailboxState.js";
import { getDefaultDailyQuestsState, normalizeDailyQuestsState } from "../state/dailyQuestsState.js";
import { getDefaultDialogueState, rememberDialogueChoice, rememberDialogueEntry } from "../state/dialogueState.js";
import { getDefaultProgressionState, getXpProgressText, normalizeProgressionState } from "../state/progressionState.js";
import { getDefaultPartyState, normalizePartyState } from "../state/partyState.js";
import { getDefaultQuestState, normalizeQuestState } from "../state/questState.js";
import { createSession } from "../state/session.js";
import { getDefaultTutorialState, getNextTutorialStepId, isTutorialStepComplete, normalizeTutorialState } from "../state/tutorialState.js";
import { getRoomWeather, normalizeWeatherState } from "../state/weatherState.js";
import { getDefaultWeeklyTasksState, normalizeWeeklyTasksState } from "../state/weeklyTasksState.js";
import { getDefaultWorldState, isChestOpened, isPickupCollected, normalizeWorldState } from "../state/worldState.js";
import { getRoomWorldEvents, normalizeWorldEventsState } from "../state/worldEventsState.js";
import { createAchievementsPanel } from "../ui/createAchievementsPanel.js";
import { createBadgesPanel } from "../ui/createBadgesPanel.js";
import { bindTownUiEvents } from "../ui/bindTownUiEvents.js";
import { createChatPanel } from "../ui/createChatPanel.js";
import { createAudioPanel } from "../ui/createAudioPanel.js";
import { createCraftingPanel } from "../ui/createCraftingPanel.js";
import { createCosmeticsShopPanel } from "../ui/createCosmeticsShopPanel.js";
import { createFriendsPanel } from "../ui/createFriendsPanel.js";
import { createInventoryPanel } from "../ui/createInventoryPanel.js";
import { createLootPopup } from "../ui/createLootPopup.js";
import { createHomeEditorPanel } from "../ui/createHomeEditorPanel.js";
import { createTradePanel } from "../ui/createTradePanel.js";
import { createTutorialOverlay } from "../ui/createTutorialOverlay.js";
import { createPanel } from "../ui/createPanel.js";
import { createPlayerProfilePanel } from "../ui/createPlayerProfilePanel.js";
import { createPartyPanel } from "../ui/createPartyPanel.js";
import { createPhotoModePanel } from "../ui/createPhotoModePanel.js";
import { createRewardPopup } from "../ui/createRewardPopup.js";
import { createEmoteBar } from "../ui/createEmoteBar.js";
import { createDailyQuestsPanel } from "../ui/createDailyQuestsPanel.js";
import { createDailyLoginRewardPopup } from "../ui/createDailyLoginRewardPopup.js";
import { createMailboxPanel } from "../ui/createMailboxPanel.js";
import { createNotificationCenter } from "../ui/createNotificationCenter.js";
import { createShopPanel } from "../ui/createShopPanel.js";
import { createWeeklyTasksPanel } from "../ui/createWeeklyTasksPanel.js";
import { createWardrobePanel } from "../ui/createWardrobePanel.js";
import { buildRoomMap } from "../world/buildRoomMap.js";
import { createRoomInteractives } from "../world/createRoomInteractives.js";
import { createDayNightController } from "../world/createDayNightController.js";
import { createWeatherController } from "../world/createWeatherController.js";
import { createWorldFx } from "../world/createWorldFx.js";
import { createRoomNpcs } from "../world/createRoomNpcs.js";
import { buildBlockedTileSet, findWorldPath } from "../world/pathfinding.js";
import { findRoomByChestId, findRoomByNpcId, findRoomByPickupItemId, getRoomDefinition } from "../world/rooms.js";
import { tileToWorld, worldToTile, screenToLogical, logicalToScreen } from "../world/roomUtils.js";
import { ensureGameCanvasVisible, hideGameRootOverlay, logWorldFlow, showGameRootOverlay, validateWorldSession } from "../ui/gameRootOverlay.js";

const CRAFTING_RECIPES = listCraftingRecipes();
const LOCAL_PREDICTION_SNAP_DISTANCE = 36;
const LOCAL_PREDICTION_CORRECTION_SPEED = 0.2;
const LOCAL_PREDICTION_HISTORY_LIMIT = 24;

function createDefaultGameplayState() {
  return {
    inventory: getDefaultInventoryState(),
    quest: getDefaultQuestState(),
    world: getDefaultWorldState(),
    cosmetics: getDefaultCosmeticsState(),
    progression: getDefaultProgressionState(),
    achievements: getDefaultAchievementsState(),
    badges: getDefaultBadgesState(),
    dailyQuests: getDefaultDailyQuestsState(),
    weeklyTasks: getDefaultWeeklyTasksState(),
    friends: getDefaultFriendsState(),
    mailbox: getDefaultMailboxState(),
    party: getDefaultPartyState(),
  };
}

export class TownScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.TOWN);
    this.session = createSession();
    this.gameplayState = createDefaultGameplayState();
    this.directMessagesState = getDefaultDirectMessagesState();
    this.currentRoomId = "town";
    this.currentRoomBaseId = "town";
    this.currentRoomOwnerName = "";
    this.roomHomeState = null;
    this.isMiniGameActive = false;
    this.homeFurniture = [];
    this.homeEditMode = false;
    this.pixelPerfectCamera = null;
    this.localSeatedFurnitureId = null;
    this.pendingFurnitureItemId = null;
    this.selectedFurniturePlacementId = null;
    this.pendingFurnitureMove = false;
    this.remotePlayers = new Map();
    this.selectedRemotePlayerId = null;
    this.lastNetworkSyncAt = 0;
    this.lastSentPosition = null;
    this.multiplayerSelfId = null;
    this.pendingPickupIds = new Set();
    this.pendingChestIds = new Set();
    this.pendingQuestIds = new Set();
    this.pendingRoomChange = false;
    this.activeShop = null;
    this.hasReceivedGameplayState = false;
    this.achievementPopupQueue = [];
    this.isAchievementPopupActive = false;
    this.dialogueState = getDefaultDialogueState();
    this.shopSessionState = { buybackItems: [] };
    this.activeWorldEvents = [];
    this.weatherState = [];
    this.homeState = null;
    this.tradeState = null;
    this.partyState = getDefaultPartyState();
    this.photoMode = {
      isHudHidden: false,
      cameraMode: "follow",
      pose: "neutral",
    };
    this.tutorialState = getDefaultTutorialState();
    this.tutorialMovementDistance = 0;
    this.lastTutorialPosition = null;
    this.hasSeenNonTownRoom = false;
    this.previousCompletedQuestIds = [];
    this.nextInputSequence = 1;
    this.pendingMovementInputs = [];
    this.reconciliationOffset = { x: 0, y: 0 };
    this.movementTarget = null;
    this.movementPath = [];
    this.blockedMovementTiles = new Set();
    this.pointerActionTarget = null;
    this.lastPointerActionTargetKey = null;
    this.pointerActionRangeRing = null;
    this.eventBus = createGameEventBus();
    this.entityRegistry = createEntityRegistry();
    this.unsubscribeUiEvents = null;
    this.uiEventCleanups = [];
    this.worldInitTimeout = null;
    this.hasReceivedWorldInit = false;
    this.worldDebugText = null;
    this.worldSpawnMarker = null;
    this.worldEntryError = null;
    this.playerFallbackMarker = null;
  }

  init(data) {
    logWorldFlow("TownScene init", {
      hasSession: Boolean(data?.session),
      playerName: data?.session?.playerName ?? null,
      source: data?.entrySource ?? null,
    });
    this.session = createSession(data?.session?.playerName, data?.session?.appearance, data?.session);
    this.gameplayState = createDefaultGameplayState();
    this.currentRoomId = "town";
    this.currentRoomBaseId = "town";
    this.currentRoomOwnerName = "";
    this.roomHomeState = null;
    this.isMiniGameActive = false;
    this.homeFurniture = [];
    this.homeEditMode = false;
    this.pixelPerfectCamera = null;
    this.localSeatedFurnitureId = null;
    this.pendingFurnitureItemId = null;
    this.selectedFurniturePlacementId = null;
    this.pendingFurnitureMove = false;
    this.remotePlayers = new Map();
    this.selectedRemotePlayerId = null;
    this.lastNetworkSyncAt = 0;
    this.lastSentPosition = null;
    this.multiplayerSelfId = null;
    this.pendingPickupIds = new Set();
    this.pendingChestIds = new Set();
    this.pendingQuestIds = new Set();
    this.pendingRoomChange = false;
    this.activeShop = null;
    this.hasReceivedGameplayState = false;
    this.achievementPopupQueue = [];
    this.isAchievementPopupActive = false;
    this.dialogueState = getDefaultDialogueState();
    this.shopSessionState = { buybackItems: [] };
    this.activeWorldEvents = [];
    this.weatherState = [];
    this.homeState = null;
    this.tradeState = null;
    this.partyState = getDefaultPartyState();
    this.photoMode = {
      isHudHidden: false,
      cameraMode: "follow",
      pose: "neutral",
    };
    this.tutorialState = getDefaultTutorialState();
    this.tutorialMovementDistance = 0;
    this.lastTutorialPosition = null;
    this.hasSeenNonTownRoom = false;
    this.previousCompletedQuestIds = [];
    this.nextInputSequence = 1;
    this.pendingMovementInputs = [];
    this.reconciliationOffset = { x: 0, y: 0 };
    this.movementTarget = null;
    this.movementPath = [];
    this.blockedMovementTiles = new Set();
    this.pointerActionTarget = null;
    this.lastPointerActionTargetKey = null;
    this.pointerActionRangeRing = null;
    this.eventBus = createGameEventBus();
    this.entityRegistry = createEntityRegistry();
    this.unsubscribeUiEvents = null;
    this.uiEventCleanups = [];
    this.worldInitTimeout = null;
    this.hasReceivedWorldInit = false;
    this.worldDebugText = null;
    this.worldSpawnMarker = null;
    this.worldEntryError = null;
    this.playerFallbackMarker = null;
  }

  create() {
    logWorldFlow("TownScene create start", {
      playerName: this.session?.playerName ?? null,
      isGuest: Boolean(this.session?.isGuest),
      hasAuthToken: Boolean(this.session?.authToken),
    });
    const canvasState = ensureGameCanvasVisible(this.game);
    logWorldFlow("TownScene canvas state", canvasState);
    const canvasHasSize = Number(canvasState?.clientWidth ?? 0) > 0 && Number(canvasState?.clientHeight ?? 0) > 0;
    if (!canvasHasSize) {
      this.showWorldEntryError("Oyun alani boyutu sifir gorunuyor. Lutfen pencereyi yenileyip tekrar dene.");
      return;
    }
    showGameRootOverlay({
      title: "Kasaba Yukleniyor",
      message: "Sehir sahnesi baslatiliyor. Harita ve oyuncu once yerel olarak kurulacak.",
      variant: "loading",
    });

    const domContainer = this.game?.domContainer;
    if (domContainer) {
      while (domContainer.firstChild) {
        domContainer.removeChild(domContainer.firstChild);
      }
    }

    const sessionErrors = validateWorldSession(this.session);
    if (sessionErrors.length > 0) {
      logWorldFlow("TownScene session validation failed", sessionErrors);
      this.showWorldEntryError(sessionErrors.join(" "), { shouldReturnToLogin: true });
      return;
    }

    Object.values(SCENE_KEYS).forEach((key) => {
      if (key !== SCENE_KEYS.BOOT && key !== SCENE_KEYS.TOWN) {
        this.scene.stop(key);
      }
    });
    this.cameras.main.setBackgroundColor(0x122d3f);
    this.worldDebugText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "Town Scene Loaded", {
        fontFamily: "Trebuchet MS",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#fff4db",
        backgroundColor: "#173449",
        padding: { left: 10, right: 10, top: 6, bottom: 6 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3000);
    this.player = new Player(this, 0, 0, this.session.appearance);
    this.pixelPerfectCamera = createPixelPerfectCameraController(this, {
      zoom: 1,
      integerZoom: true,
      deadzoneWidth: 176,
      deadzoneHeight: 104,
      followEnabled: true,
    });
    this.controls = createMovementControls(this);
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.inventoryKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.friendsKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.partyKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.achievementsKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.badgesKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    this.dailyQuestsKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
    this.weeklyTasksKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U);
    this.wardrobeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O);
    this.mailboxKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
    this.craftingKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
    this.audioKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.homeEditorKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
    this.photoModeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V);
    this.chatKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.emoteKeys = {
      one: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      two: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      three: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      four: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
    };

    this.nameLabel = createNameTag(this, this.player.x, this.player.y - 36, {
      isLocal: true,
      initialName: this.session.playerName,
    });

    this.questMarker = this.add
      .circle(0, 0, 16, 0xffd166, 0.32)
      .setStrokeStyle(3, 0xffd166, 0.95)
      .setVisible(false);
    this.tutorialMarker = this.add
      .circle(0, 0, 18, 0x9bd3ff, 0.22)
      .setStrokeStyle(3, 0x9bd3ff, 0.9)
      .setVisible(false);
    this.moveTargetMarker = this.add
      .circle(0, 0, 14, 0x9bd3ff, 0.16)
      .setStrokeStyle(3, 0xeefaff, 0.78)
      .setVisible(false);
    this.movePathMarkers = Array.from({ length: 8 }, () =>
      this.add.circle(0, 0, 5, 0x9bd3ff, 0.18).setStrokeStyle(2, 0xeefaff, 0.42).setVisible(false),
    );
    this.pointerActionMarker = this.add
      .circle(0, 0, 12, 0xffe0a1, 0.18)
      .setStrokeStyle(2, 0xfff2bf, 0.84)
      .setVisible(false);
    this.pointerActionLabel = this.add
      .text(0, 0, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#173449",
        backgroundColor: "#fff4cf",
        padding: { left: 6, right: 6, top: 3, bottom: 3 },
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.pointerActionRangeRing = this.add.graphics().setVisible(false);

    this.questPulse = this.tweens.add({
      targets: this.questMarker,
      scale: { from: 0.9, to: 1.22 },
      alpha: { from: 0.35, to: 0.8 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });
    this.tutorialPulse = this.tweens.add({
      targets: this.tutorialMarker,
      scale: { from: 0.92, to: 1.18 },
      alpha: { from: 0.24, to: 0.68 },
      duration: 860,
      yoyo: true,
      repeat: -1,
    });
    this.moveTargetPulse = this.tweens.add({
      targets: this.moveTargetMarker,
      scale: { from: 0.88, to: 1.14 },
      alpha: { from: 0.18, to: 0.46 },
      duration: 620,
      yoyo: true,
      repeat: -1,
    });

    createPanel(this, {
      x: 184,
      y: 132,
      width: 312,
      height: 214,
      fillColor: 0x081722,
      fillAlpha: 0.92,
      strokeColor: 0xffe0a1,
      strokeAlpha: 0.16,
      scrollFactor: 0,
    });

    this.add
      .text(54, 40, "Social RPG", {
        fontFamily: "Georgia",
        fontSize: "25px",
        fontStyle: "bold",
        color: "#fff4db",
      })
      .setScrollFactor(0);

    createPanel(this, {
      x: 184,
      y: 318,
      width: 312,
      height: 168,
      fillColor: 0x081722,
      fillAlpha: 0.9,
      strokeColor: 0x9bd3ff,
      strokeAlpha: 0.18,
      scrollFactor: 0,
    });

    this.questGuideTitleText = this.add
      .text(54, 246, "Quest Guide", {
        fontFamily: "Georgia",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#fff4db",
      })
      .setScrollFactor(0);

    this.questGuideHintText = this.add
      .text(54, 274, "Aktif gorev hedefi burada gorunecek.", {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#b7d8ec",
        lineSpacing: 4,
        wordWrap: { width: 136 },
      })
      .setScrollFactor(0);

    this.questGuideMinimap = this.add.graphics().setScrollFactor(0).setDepth(25);

    this.seasonalBannerText = this.add
      .text(640, 22, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#173449",
        backgroundColor: "#ffd99d",
        padding: { left: 10, right: 10, top: 5, bottom: 5 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(35)
      .setVisible(false);

    this.roomNameText = this.add
      .text(54, 76, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "19px",
        color: "#ffd99d",
        fontStyle: "bold",
      })
      .setScrollFactor(0);

    this.roomOwnerText = this.add
      .text(54, 102, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#f4e8cf",
      })
      .setScrollFactor(0);

    this.roomEventText = this.add
      .text(54, 122, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#d7ebf7",
        wordWrap: { width: 250 },
      })
      .setScrollFactor(0);

    this.weatherText = this.add
      .text(54, 146, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#9bd3ff",
      })
      .setScrollFactor(0);

    this.onlineCountText = this.add
      .text(54, 166, "Oyuncular: 1", {
        fontFamily: "Trebuchet MS",
        fontSize: "13px",
        color: "#d7ebf7",
      })
      .setScrollFactor(0);

    this.levelHudText = this.add
      .text(54, 188, "Level 1", {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#fff4db",
      })
      .setScrollFactor(0);

    this.xpBarBackground = this.add
      .rectangle(186, 216, 264, 14, 0x173449, 0.95)
      .setScrollFactor(0)
      .setStrokeStyle(2, 0xffe0a1, 0.18);

    this.xpBarFill = this.add.rectangle(54, 216, 0, 10, 0x6dd3ff, 0.95).setOrigin(0, 0.5).setScrollFactor(0);

    this.xpBarText = this.add
      .text(318, 198, "0/60 XP", {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#b7d8ec",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    createPanel(this, {
      x: 1084,
      y: 138,
      width: 320,
      height: 228,
      fillColor: 0x081722,
      fillAlpha: 0.92,
      strokeColor: 0xffe0a1,
      strokeAlpha: 0.16,
      scrollFactor: 0,
    });

    this.coinText = this.add
      .text(946, 48, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "19px",
        fontStyle: "bold",
        color: "#ffd99d",
      })
      .setScrollFactor(0);

    this.progressHintText = this.add
      .text(946, 78, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#8fb7cf",
        wordWrap: { width: 250 },
      })
      .setScrollFactor(0);

    this.timeOfDayText = this.add
      .text(946, 100, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#d7ebf7",
      })
      .setScrollFactor(0);

    this.questTitleText = this.add
      .text(946, 128, "Aktif Gorev", {
        fontFamily: "Georgia",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#fff4db",
      })
      .setScrollFactor(0);

    this.questBodyText = this.add
      .text(946, 156, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        color: "#b7d8ec",
        wordWrap: { width: 250 },
        lineSpacing: 5,
      })
      .setScrollFactor(0);

    this.inventoryPanel = createInventoryPanel(this);
    this.achievementsPanel = createAchievementsPanel(this);
    this.badgesPanel = createBadgesPanel(this);
    this.dailyQuestsPanel = createDailyQuestsPanel(this);
    this.weeklyTasksPanel = createWeeklyTasksPanel(this);
    this.audioSettings = loadAudioSettings();
    this.audioManager = getAudioManager();
    this.audioManager.applySettings(this.audioSettings);
    this.audioPanel = createAudioPanel(this, this.audioSettings);
    this.craftingPanel = createCraftingPanel(this);
    this.friendsPanel = createFriendsPanel(this);
    this.mailboxPanel = createMailboxPanel(this);
    this.wardrobePanel = createWardrobePanel(this);
    this.shopPanel = createShopPanel(this);
    this.cosmeticsShopPanel = createCosmeticsShopPanel(this);
    this.chatPanel = createChatPanel(this);
    this.homeEditorPanel = createHomeEditorPanel(this);
    this.lootPopup = createLootPopup(this);
    this.notificationCenter = createNotificationCenter(this);
    this.rewardPopup = createRewardPopup(this);
    this.emoteBar = createEmoteBar(this);
    this.dailyLoginRewardPopup = createDailyLoginRewardPopup(this);
    this.playerProfilePanel = createPlayerProfilePanel(this);
    this.playerProfilePanel.onClose(() => {
      this.setSelectedRemotePlayer(null);
    });
    this.tradePanel = createTradePanel(this);
    this.partyPanel = createPartyPanel(this);
    this.photoModePanel = createPhotoModePanel(this, {
      hudHidden: this.photoMode.isHudHidden,
      cameraMode: this.photoMode.cameraMode,
    });
    this.tutorialOverlay = createTutorialOverlay(this, {
      onSkip: () => {
        this.skipTutorial();
      },
    });
    this.unsubscribeUiEvents = bindTownUiEvents({
      eventBus: this.eventBus,
      panels: {
        audioPanel: this.audioPanel,
        craftingPanel: this.craftingPanel,
        friendsPanel: this.friendsPanel,
        mailboxPanel: this.mailboxPanel,
        wardrobePanel: this.wardrobePanel,
        shopPanel: this.shopPanel,
        cosmeticsShopPanel: this.cosmeticsShopPanel,
        chatPanel: this.chatPanel,
        homeEditorPanel: this.homeEditorPanel,
        badgesPanel: this.badgesPanel,
        playerProfilePanel: this.playerProfilePanel,
        tradePanel: this.tradePanel,
        partyPanel: this.partyPanel,
      },
    });
    this.emoteBar.onSelect((emoteId) => {
      this.playEmote(emoteId);
    });
    this.worldFx = createWorldFx(this);
    this.sunbeams = this.worldFx.createSunbeams({ count: 6, alpha: 0.1 });
    this.leaves = this.worldFx.createLeaves({ count: 18 });
    this.registerUiEventHandlers();
    this.applyClientSettings();

    this.staminaText = this.add
      .text(946, 272, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "13px",
        color: "#9bd3ff",
      })
      .setScrollFactor(0);

    this.hudHelpText = this.add
      .text(946, 294, "Shift: kos | 1-4: emote | I: inventory | N: mailbox | K: crafting | M: settings | V: photo | J: achievements | B: badges | L: dailies | U: weekly | F: friends | O: wardrobe", {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#d9e8f3",
        wordWrap: { width: 250 },
      })
      .setScrollFactor(0);

    this.achievementPopup = this.add.container(1028, 334).setScrollFactor(0).setDepth(2200).setVisible(false);
    const achievementPopupBg = this.add.rectangle(0, 0, 286, 88, 0x07131d, 0.96).setStrokeStyle(2, 0xffd99d, 0.22);
    this.achievementPopupTitle = this.add.text(-122, -26, "Achievement Unlocked", {
      fontFamily: "Georgia",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#fff4db",
    });
    this.achievementPopupBody = this.add.text(-122, 0, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      color: "#b7d8ec",
      wordWrap: { width: 236 },
    });
    this.achievementPopup.add([achievementPopupBg, this.achievementPopupTitle, this.achievementPopupBody]);

    this.dayNightController = createDayNightController(this);
    this.weatherController = createWeatherController(this);
    this.audioManager.unlock();
    try {
      logWorldFlow("TownScene local room bootstrap start", {
        roomId: "town",
      });
      this.rebuildRoom("town");
      this.ensureSceneVisualFallback("local-bootstrap");
      logWorldFlow("TownScene local room bootstrap complete", {
        roomId: this.currentRoomId,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[TownScene] rebuildRoom failed", error);
      logWorldFlow("TownScene rebuildRoom failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      const fallbackWidth = Number(this.scale.width ?? 1280);
      const fallbackHeight = Number(this.scale.height ?? 720);
      this.add.rectangle(fallbackWidth / 2, fallbackHeight / 2, fallbackWidth, fallbackHeight, 0x2f6c8d, 1).setDepth(-2000);
      this.showStatusToast("Sehir yuklenirken hata oldu, tekrar baglaniliyor...", "warning");
      this.showWorldEntryError("Sehir yuklenemedi. Harita kurulurken hata oldu.");
    }
    this.refreshQuestHud();
    this.refreshInventoryUi();
    this.connectMultiplayer();
    this.startWorldInitTimeout();

    this.postProcessing = null;

    this.input.on("pointerdown", (pointer) => {
      this.handlePointerDown(pointer);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      const sceneDomContainer = this.game?.domContainer;
      if (sceneDomContainer) {
        while (sceneDomContainer.firstChild) {
          sceneDomContainer.removeChild(sceneDomContainer.firstChild);
        }
      }
      this.unsubscribeUiEvents?.();
      this.uiEventCleanups.forEach((cleanup) => cleanup?.());
      this.uiEventCleanups = [];
      this.eventBus?.clear();
      this.pixelPerfectCamera?.destroy();
      this.pixelPerfectCamera = null;
      this.worldInitTimeout?.remove(false);
      this.worldInitTimeout = null;
      hideGameRootOverlay();
      this.disconnectMultiplayer();
    });
    logWorldFlow("TownScene create end");
  }

  update(_, delta = 16) {
    if (this.scene.isActive(SCENE_KEYS.CUSTOMIZE)) {
      this.scene.stop(SCENE_KEYS.CUSTOMIZE);
    }
    if (this.scene.isActive(SCENE_KEYS.LOGIN)) {
      this.scene.stop(SCENE_KEYS.LOGIN);
    }

    this.pixelPerfectCamera?.update();

    if (this.player && this.postProcessing) {
      this.postProcessing.setFocusFromWorldY(this.player.y);
    }
    this.remotePlayers.forEach((remotePlayer) => remotePlayer.tick(delta));

    if (Phaser.Input.Keyboard.JustDown(this.chatKey) && !this.chatPanel.isOpen()) {
      this.chatPanel.open();
      return;
    }

    if (this.chatPanel.isOpen()) {
      if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
        this.chatPanel.close();
      }
      return;
    }

    if (this.shopPanel.isVisible()) {
      if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
        this.closeShop();
      }
      return;
    }

    if (this.friendsPanel.isVisible()) {
      if (Phaser.Input.Keyboard.JustDown(this.escapeKey) || Phaser.Input.Keyboard.JustDown(this.friendsKey)) {
        this.toggleFriendsPanel();
      }
      return;
    }

    if (this.tradePanel.isVisible()) {
      if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
        this.multiplayerClient?.cancelTrade();
      }
      return;
    }

    if (this.partyPanel.isVisible()) {
      if (Phaser.Input.Keyboard.JustDown(this.escapeKey) || Phaser.Input.Keyboard.JustDown(this.partyKey)) {
        this.togglePartyPanel();
      }
      return;
    }

    if (this.mailboxPanel.isVisible()) {
      if (Phaser.Input.Keyboard.JustDown(this.escapeKey) || Phaser.Input.Keyboard.JustDown(this.mailboxKey)) {
        this.toggleMailboxPanel();
      }
      return;
    }

    if (this.achievementsPanel.isVisible()) {
      if (Phaser.Input.Keyboard.JustDown(this.escapeKey) || Phaser.Input.Keyboard.JustDown(this.achievementsKey)) {
        this.toggleAchievementsPanel();
      }
      return;
    }

    if (this.badgesPanel.isVisible()) {
      if (Phaser.Input.Keyboard.JustDown(this.escapeKey) || Phaser.Input.Keyboard.JustDown(this.badgesKey)) {
        this.toggleBadgesPanel();
      }
      return;
    }

    if (this.dailyQuestsPanel.isVisible()) {
      if (Phaser.Input.Keyboard.JustDown(this.escapeKey) || Phaser.Input.Keyboard.JustDown(this.dailyQuestsKey)) {
        this.toggleDailyQuestsPanel();
      }
      return;
    }

    if (this.weeklyTasksPanel.isVisible()) {
      if (Phaser.Input.Keyboard.JustDown(this.escapeKey) || Phaser.Input.Keyboard.JustDown(this.weeklyTasksKey)) {
        this.toggleWeeklyTasksPanel();
      }
      return;
    }

    if (this.craftingPanel.isVisible()) {
      if (Phaser.Input.Keyboard.JustDown(this.escapeKey) || Phaser.Input.Keyboard.JustDown(this.craftingKey)) {
        this.toggleCraftingPanel();
      }
      return;
    }

    if (this.audioPanel.isVisible()) {
      if (Phaser.Input.Keyboard.JustDown(this.escapeKey) || Phaser.Input.Keyboard.JustDown(this.audioKey)) {
        this.toggleAudioPanel();
      }
      return;
    }

    if (this.photoModePanel.isVisible()) {
      if (Phaser.Input.Keyboard.JustDown(this.escapeKey) || Phaser.Input.Keyboard.JustDown(this.photoModeKey)) {
        this.togglePhotoModePanel();
      }
      return;
    }

    if (this.homeEditorPanel.isVisible()) {
      if (Phaser.Input.Keyboard.JustDown(this.escapeKey) || Phaser.Input.Keyboard.JustDown(this.homeEditorKey)) {
        this.toggleHomeEditor();
      }
      return;
    }

    if (this.playerProfilePanel.isVisible()) {
      if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
        this.playerProfilePanel.close();
      }
      return;
    }

    if (this.cosmeticsShopPanel.isVisible()) {
      if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
        this.closeCosmeticsShop();
      }
      return;
    }

    if (this.wardrobePanel.isVisible()) {
      if (Phaser.Input.Keyboard.JustDown(this.escapeKey) || Phaser.Input.Keyboard.JustDown(this.wardrobeKey)) {
        this.toggleWardrobe();
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.inventoryKey)) {
      this.toggleInventory();
    }

    if (Phaser.Input.Keyboard.JustDown(this.friendsKey)) {
      this.toggleFriendsPanel();
    }

    if (Phaser.Input.Keyboard.JustDown(this.partyKey)) {
      this.togglePartyPanel();
    }

    if (Phaser.Input.Keyboard.JustDown(this.mailboxKey)) {
      this.toggleMailboxPanel();
    }

    if (Phaser.Input.Keyboard.JustDown(this.achievementsKey)) {
      this.toggleAchievementsPanel();
    }

    if (Phaser.Input.Keyboard.JustDown(this.badgesKey)) {
      this.toggleBadgesPanel();
    }

    if (Phaser.Input.Keyboard.JustDown(this.dailyQuestsKey)) {
      this.toggleDailyQuestsPanel();
    }

    if (Phaser.Input.Keyboard.JustDown(this.weeklyTasksKey)) {
      this.toggleWeeklyTasksPanel();
    }

    if (Phaser.Input.Keyboard.JustDown(this.wardrobeKey)) {
      this.toggleWardrobe();
    }

    if (Phaser.Input.Keyboard.JustDown(this.craftingKey)) {
      this.toggleCraftingPanel();
    }

    if (Phaser.Input.Keyboard.JustDown(this.audioKey)) {
      this.toggleAudioPanel();
    }

    if (Phaser.Input.Keyboard.JustDown(this.photoModeKey)) {
      this.togglePhotoModePanel();
    }

    if (Phaser.Input.Keyboard.JustDown(this.homeEditorKey)) {
      this.toggleHomeEditor();
    }

    if (Phaser.Input.Keyboard.JustDown(this.emoteKeys.one)) {
      this.playEmote("wave");
    }

    if (Phaser.Input.Keyboard.JustDown(this.emoteKeys.two)) {
      this.playEmote("dance");
    }

    if (Phaser.Input.Keyboard.JustDown(this.emoteKeys.three)) {
      this.playEmote("sit");
    }

    if (Phaser.Input.Keyboard.JustDown(this.emoteKeys.four)) {
      this.playEmote("laugh");
    }

    if (this.isInventoryOpen || this.pendingRoomChange || this.homeEditMode || this.isMiniGameActive) {
      return;
    }

    this.activeFurniture = this.getNearestFurniture();

    const seatedFurniture = this.localSeatedFurnitureId
      ? this.homeFurniture.find((entry) => entry.placement.id === this.localSeatedFurnitureId) ?? null
      : null;

    let movementState = {
      isMoving: false,
      isSprinting: false,
    };

    if (seatedFurniture) {
      this.player.body.setVelocity(0, 0);
      this.player.setPosition(seatedFurniture.x, seatedFurniture.y + 8);
      this.player.body.reset(seatedFurniture.x, seatedFurniture.y + 8);
    } else if (this.player.hasMovementLockedEmote?.()) {
      this.player.body.setVelocity(0, 0);
      this.player.avatar.updateMotion?.({ isMoving: false, isSprinting: false, delta });
    } else {
      movementState = this.player.update(this.getMovementInput());
      if (movementState.isMoving) {
        this.worldFx?.spawnWalkDust(this.player.x, this.player.y, movementState.isSprinting);
      }
    }
    this.applyMovementReconciliation();
    this.updateTutorialMovementProgress();
    this.player.update({ x: 0, y: 0, isSprinting: false });
    this.nameLabel.setPosition(this.player.avatar.x, this.player.avatar.y - 36);
    this.nameLabel.setDepth(this.player.depth + 20);
    this.updateLocalNameLabel();
    this.updateQuestMarker();
    if (!seatedFurniture) {
      this.syncLocalPlayer();
    }
    this.staminaText.setText(seatedFurniture ? "Durum: Oturuyor" : movementState.isSprinting ? "Durum: Kosuyor" : "Durum: Geziyor");
    this.updateTimeOfDayHud();
    this.weatherController?.update();
    this.weatherController?.update();

    this.activeNpc = this.getNearestNpc();
    this.activeChest = this.getNearestChest();
    this.activePortal = this.getNearestPortal();
    this.tryResolvePointerActionTarget();
    this.updateMoveTargetMarker();
    this.updatePointerActionIndicator();
    const pointerNpc = this.pointerActionTarget?.type === "npc" ? this.pointerActionTarget.target : null;
    const pointerChest = this.pointerActionTarget?.type === "chest" ? this.pointerActionTarget.target : null;
    const pointerPortal = this.pointerActionTarget?.type === "portal" ? this.pointerActionTarget.target : null;
    const pointerFurniture = this.pointerActionTarget?.type === "furniture" ? this.pointerActionTarget.target : null;
    const pointerPickup = this.pointerActionTarget?.type === "pickup" ? this.pointerActionTarget.target : null;

    this.npcs.forEach((npc) => {
      npc.setPromptVisible(npc === this.activeNpc);
      npc.setContextFocused(npc === this.activeNpc || npc === pointerNpc);
    });

    this.chests.forEach((chest) => {
      chest.setPromptVisible(chest === this.activeChest && !chest.isOpened);
      chest.setHovered(chest === this.activeChest || chest === pointerChest);
    });

    this.homeFurniture.forEach((entry) => {
      entry.setPromptVisible(entry === this.activeFurniture && !this.homeEditMode, this.multiplayerSelfId);
      entry.setContextFocused(!this.homeEditMode && (entry === this.activeFurniture || entry === pointerFurniture));
    });

    this.pickups.forEach((pickup) => {
      pickup.setHovered?.(pickup === pointerPickup);
    });

    this.portals.forEach((portal) => {
      portal.setContextFocused?.(portal === this.activePortal || portal === pointerPortal);
    });

    this.collectNearbyPickups();

    if (this.activeFurniture && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.handleFurnitureInteract(this.activeFurniture);
      return;
    }

    if (this.activeNpc && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.openNpcDialog(this.activeNpc);
      return;
    }

    if (this.activeChest && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.tryOpenChest(this.activeChest);
      return;
    }

    if (this.activePortal && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.requestRoomChange(this.activePortal.targetRoomId);
    }
  }

  connectMultiplayer() {
    logWorldFlow("TownScene connectMultiplayer start", {
      playerName: this.session.playerName,
      hasAuthToken: Boolean(this.session.authToken),
    });
    this.multiplayerClient = createMultiplayerClient({
      playerName: this.session.playerName,
      appearance: this.session.appearance,
      authToken: this.session.authToken,
      onSocketConnected: (payload) => {
        logWorldFlow("TownScene socket connected", payload);
      },
      onSocketDisconnected: (payload) => {
        logWorldFlow("TownScene socket disconnected", payload);
      },
      onConnectError: (error) => {
        logWorldFlow("TownScene socket connect error", {
          message: error?.message ?? "Bilinmeyen baglanti hatasi",
        });
        const errorMessage = error?.message ?? "Sunucu baglantisi kurulamadi.";
        if (!this.hasReceivedWorldInit) {
          this.showWorldEntryError(errorMessage, {
            shouldReturnToLogin: /auth|oturum|token/i.test(errorMessage),
          });
          return;
        }
        this.notify({ type: "warning", message: errorMessage });
      },
      onInit: ({ selfId, room, players, messages, gameplayState, homeState, tutorialState, roomHomeState, worldEvents, weatherState, dailyLoginReward, mailboxState, directMessagesState }) => {
        logWorldFlow("TownScene world:init received", {
          selfId,
          roomId: room?.id ?? null,
          roomName: room?.name ?? null,
          playerCount: Array.isArray(players) ? players.length : 0,
        });
        this.hasReceivedWorldInit = true;
        this.worldEntryError = null;
        this.worldInitTimeout?.remove(false);
        this.worldInitTimeout = null;
        hideGameRootOverlay();
        this.multiplayerSelfId = selfId;
        this.resetMovementPrediction();
        this.chatPanel.setMessages(messages ?? []);
        this.activeWorldEvents = normalizeWorldEventsState(worldEvents);
        this.weatherState = normalizeWeatherState(weatherState);
        this.homeState = homeState ?? this.homeState;
        this.tutorialState = normalizeTutorialState(tutorialState);
        this.directMessagesState = normalizeDirectMessagesState(directMessagesState);
        this.roomHomeState = roomHomeState ?? null;
        this.gameplayState.mailbox = normalizeMailboxState(mailboxState);
        const safeRoom =
          room && typeof room === "object"
            ? room
            : {
                id: this.currentRoomId ?? "town",
                baseRoomId: this.currentRoomBaseId ?? "town",
                name: "Kasaba",
              };
        const safePlayers = Array.isArray(players) ? players.filter((entry) => entry && typeof entry === "object") : [];
        try {
          this.applyGameplayState(gameplayState);
          this.applyRoomState(safeRoom, safePlayers, safePlayers.find((entry) => entry.id === selfId));
          this.ensureSceneVisualFallback("world:init");
          this.refreshTutorialUi();
          this.worldDebugText?.setText(`Town Scene Loaded\n${safeRoom?.name ?? "Kasaba"}`);
          if (dailyLoginReward) {
            this.dailyLoginRewardPopup.show(dailyLoginReward);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("[TownScene] onInit apply failed", error);
          logWorldFlow("TownScene world:init apply failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          this.showWorldEntryError(`Sehir ilk verisi islenemedi. ${error instanceof Error ? error.message : "Bilinmeyen hata."}`);
        }
      },
      onRoomChanged: ({ room, player, players, messages, gameplayState, homeState, roomHomeState, worldEvents, weatherState }) => {
        logWorldFlow("TownScene room changed", {
          roomId: room?.id ?? null,
          roomName: room?.name ?? null,
          playerCount: Array.isArray(players) ? players.length : 0,
        });
        this.pendingRoomChange = false;
        this.resetMovementPrediction();
        this.activeWorldEvents = normalizeWorldEventsState(worldEvents);
        this.weatherState = normalizeWeatherState(weatherState);
        this.homeState = homeState ?? this.homeState;
        this.roomHomeState = roomHomeState ?? null;
        const safeRoom =
          room && typeof room === "object"
            ? room
            : {
                id: this.currentRoomId ?? "town",
                baseRoomId: this.currentRoomBaseId ?? "town",
                name: "Kasaba",
              };
        const safePlayers = Array.isArray(players) ? players.filter((entry) => entry && typeof entry === "object") : [];
        try {
          this.applyGameplayState(gameplayState);
          this.chatPanel.setMessages(messages ?? []);
          this.applyRoomState(safeRoom, safePlayers, player ?? null);
          this.ensureSceneVisualFallback("room-change");
          if ((safeRoom?.baseRoomId ?? safeRoom?.id) && (safeRoom?.baseRoomId ?? safeRoom?.id) !== "town") {
            this.hasSeenNonTownRoom = true;
            this.completeTutorialStep("room-transition");
            if ((safeRoom?.baseRoomId ?? safeRoom?.id) === "cafe" && this.isTutorialActive()) {
              this.notify({ type: "info", message: "Baris hemen onunde. Kahve alarak ilk alisverisini gorebilirsin." });
            }
          }
          this.applyClientSettings();
          this.refreshTutorialUi();
          this.notify({ type: "info", message: `Oda degisti: ${safeRoom?.name ?? getRoomDefinition(safeRoom?.baseRoomId ?? safeRoom?.id ?? "town").name}` });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("[TownScene] onRoomChanged apply failed", error);
          logWorldFlow("TownScene room change apply failed", {
            error: error instanceof Error ? error.message : String(error),
            roomId: safeRoom?.id ?? null,
          });
          this.showWorldEntryError(`Oda gecisi tamamlanamadi. ${error instanceof Error ? error.message : "Bilinmeyen hata."}`);
        }
      },
      onGameplayState: (gameplayState) => {
        this.pendingPickupIds.clear();
        this.pendingChestIds.clear();
        this.pendingQuestIds.clear();
        this.applyGameplayState(gameplayState);
      },
      onPurchaseResult: (payload) => {
        this.handlePurchaseResult(payload);
        this.badgesPanel.setFeedback("");
      },
      onSellResult: (payload) => {
        this.handleSellResult(payload);
      },
      onBuybackResult: (payload) => {
        this.handleBuybackResult(payload);
      },
      onShopSessionState: (payload) => {
        this.shopSessionState = {
          buybackItems: Array.isArray(payload?.buybackItems) ? payload.buybackItems : [],
        };
        if (this.activeShop) {
          this.shopPanel.update(this.activeShop, this.gameplayState.inventory, this.gameplayState.cosmetics, this.shopSessionState.buybackItems);
        }
      },
      onCraftResult: (payload) => {
        this.handleCraftResult(payload);
      },
      onMiniGameResult: (payload) => {
        this.handleMiniGameResult(payload);
      },
      onChestLootResult: (payload) => {
        const rewards = Array.isArray(payload?.rewards) ? payload.rewards : [];
        if (rewards.length > 0) {
          this.lootPopup.show(rewards);
        }
      },
      onPlayerJoined: (playerState) => {
        this.upsertRemotePlayer(playerState);
        this.refreshOnlineCount();
      },
      onPlayerMoved: (playerState) => {
        if (playerState?.id === this.multiplayerSelfId) {
          this.handleSelfServerMovement(playerState);
          return;
        }

        this.upsertRemotePlayer(playerState);
      },
      onPlayerLeft: (playerId) => {
        this.removeRemotePlayer(playerId);
      },
      onChatMessage: (message) => {
        this.chatPanel.pushMessage(message);
        this.showSpeechBubbleForMessage(message);
        if (message?.playerId === this.multiplayerSelfId) {
          this.completeTutorialStep("chat");
        }
      },
      onChatBlocked: (payload) => {
        const feedbackText = payload?.message ?? "Mesaj gonderilemedi";
        this.chatPanel.pushMessage({
          id: `chat-blocked-${Date.now()}`,
          name: "System",
          text: feedbackText,
          kind: "system",
          playerId: null,
          roomId: this.currentRoomId,
          timestamp: Date.now(),
        });
        this.notify({ type: "warning", message: feedbackText });
      },
      onAdminActionResult: (payload) => {
        const feedbackText = payload?.message ?? "Admin islemi tamamlanamadi";
        this.chatPanel.pushMessage({
          id: `admin-result-${Date.now()}`,
          name: "System",
          text: feedbackText,
          kind: "system",
          playerId: null,
          roomId: this.currentRoomId,
          timestamp: Date.now(),
        });
        this.notify({ type: payload?.ok ? "success" : "warning", message: feedbackText });
      },
      onAchievementUnlocked: (payload) => {
        this.queueAchievementPopup(payload);
      },
      onWorldEventsState: (payload) => {
        this.activeWorldEvents = normalizeWorldEventsState(payload);
        this.syncRoomEventInteractives();
      },
      onWorldEventAnnouncement: (payload) => {
        if (payload?.roomId === this.currentRoomId && payload?.announcement) {
          this.notify({ type: "info", message: payload.announcement });
        }
      },
      onWeatherState: (payload) => {
        this.weatherState = normalizeWeatherState(payload);
        this.weatherController?.setWeatherState(this.weatherState);
        this.updateWeatherHud();
        this.updateAudioEnvironment();
      },
      onRoomChatHistory: (messages) => {
        this.chatPanel.setMessages(messages ?? []);
      },
      onTutorialState: (payload) => {
        this.tutorialState = normalizeTutorialState(payload);
        this.refreshTutorialUi();
      },
        onFriendsState: (payload) => {
          this.gameplayState.friends = normalizeFriendsState(payload);
          this.friendsPanel.update(this.gameplayState.friends, this.homeState);
          this.friendsPanel.updateDirectMessages(this.directMessagesState);
          this.friendsPanel.setFeedback("");
        },
        onFriendsError: (payload) => {
        const message = payload?.message ?? "Arkadas islemi basarisiz.";
        this.friendsPanel.setFeedback(message, true);
        this.playerProfilePanel.setFeedback(message, true);
        this.notify({ type: "error", message });
      },
        onDirectMessagesState: (payload) => {
          this.directMessagesState = normalizeDirectMessagesState(payload);
          this.friendsPanel.updateDirectMessages(this.directMessagesState);
          this.friendsPanel.setFeedback("");
        },
        onDirectMessageError: (payload) => {
          const message = payload?.message ?? "Ozel mesaj gonderilemedi.";
          this.friendsPanel.setFeedback(message, true);
          this.notify({ type: "error", message });
        },
        onMailboxState: (payload) => {
        this.gameplayState.mailbox = normalizeMailboxState(payload);
        this.mailboxPanel.update(this.gameplayState.mailbox, this.gameplayState.friends, getInventoryEntries(this.gameplayState.inventory));
        this.mailboxPanel.setFeedback("");
      },
      onMailboxError: (payload) => {
        const message = payload?.message ?? "Posta islemi basarisiz.";
        this.mailboxPanel.setFeedback(message, true);
        this.notify({ type: "error", message });
      },
      onTradeState: (payload) => {
        this.tradeState = payload ?? null;
        if (this.tradeState) {
          this.playerProfilePanel.close();
          this.friendsPanel.close();
          this.mailboxPanel.close();
          this.tradePanel.open();
          this.tradePanel.update(this.tradeState, getInventoryEntries(this.gameplayState.inventory), this.multiplayerSelfId);
          this.tradePanel.setStatus(
            this.tradeState.status === "pending" ? "Trade istegi acik." : "Trade aktif. Her degisimde onaylar sifirlanir.",
            false,
          );
        }
      },
      onTradeClosed: (payload) => {
        this.tradeState = null;
        this.tradePanel.close();
        const message = payload?.reason ?? "Trade kapandi.";
        this.notify({ type: "info", message });
      },
      onTradeError: (payload) => {
        const message = payload?.message ?? "Trade islemi basarisiz.";
        this.tradePanel.setStatus(message, true);
        this.notify({ type: "error", message });
      },
      onPartyState: (payload) => {
        this.partyState = normalizePartyState(payload);
        this.partyPanel.update(this.partyState, this.multiplayerSelfId);
        this.refreshPartyPresentation();
      },
      onPartyError: (payload) => {
        const message = payload?.message ?? "Party islemi basarisiz.";
        this.partyPanel.setFeedback(message, true);
        this.notify({ type: payload?.ok ? "success" : "warning", message });
      },
      onProfileData: (payload) => {
        const relationship = getFriendRelationship(this.gameplayState.friends, payload?.displayName);
        this.playerProfilePanel.show(payload, relationship);
      },
      onProfileReportResult: (payload) => {
        const message = payload?.message ?? "Rapor gonderilemedi.";
        this.playerProfilePanel.setFeedback(message, !payload?.ok);
        this.showStatusToast(message);
      },
      onHomeState: (payload) => {
        this.homeState = payload ?? this.homeState;
        this.friendsPanel.update(this.gameplayState.friends, this.homeState);
        this.friendsPanel.setHomeAccess(this.homeState?.access?.isPublic);
      },
      onHomeLayoutState: (payload) => {
        this.roomHomeState = payload ?? null;
        this.renderHomeFurniture();
        this.syncLocalFurnitureState();
        this.refreshHomeEditorUi();
      },
      onHomeError: (payload) => {
        const message = payload?.message ?? "Ev islemi basarisiz.";
        this.friendsPanel.setFeedback(message, true);
        this.playerProfilePanel.setFeedback(message, true);
        this.showStatusToast(message);
      },
    });
  }

  disconnectMultiplayer() {
    this.multiplayerClient?.disconnect();
    this.multiplayerClient = null;
    this.resetMovementPrediction();
    this.clearRemotePlayers();
  }

  ensureFallbackPlayerMarker(worldX, worldY) {
    const screenPos = logicalToScreen(worldX, worldY);
    if (!this.playerFallbackMarker) {
      this.playerFallbackMarker = this.add
        .rectangle(screenPos.x, screenPos.y, 22, 28, 0xff6b6b, 0.9)
        .setStrokeStyle(2, 0xfff4db, 0.8)
        .setDepth(2200);
      return;
    }

    this.playerFallbackMarker.setPosition(screenPos.x, screenPos.y).setVisible(true).setDepth(2200);
  }

  ensureSceneVisualFallback(reason = "unknown") {
    const hasRoomObjects = Array.isArray(this.roomMap?.createdObjects) && this.roomMap.createdObjects.length > 0;
    const playerAvatar = this.player?.avatar;
    const hasPlayerAvatar = Boolean(playerAvatar && Number.isFinite(playerAvatar.x) && Number.isFinite(playerAvatar.y));

    if (hasRoomObjects && hasPlayerAvatar) {
      return;
    }

    logWorldFlow("TownScene visual fallback engaged", {
      reason,
      hasRoomObjects,
      hasPlayerAvatar,
      roomId: this.currentRoomId,
    });

    const fallbackWidth = Math.max(320, Number(this.scale.width ?? 1280));
    const fallbackHeight = Math.max(180, Number(this.scale.height ?? 720));
    const centerX = fallbackWidth / 2;
    const centerY = fallbackHeight / 2;

    if (!hasRoomObjects) {
      this.add.rectangle(centerX, centerY, fallbackWidth, fallbackHeight, 0x2f6c8d, 1).setDepth(-2100);
      this.add
        .text(centerX, centerY - 42, "Town Scene Loaded (Fallback Render)", {
          fontFamily: "Trebuchet MS",
          fontSize: "18px",
          fontStyle: "bold",
          color: "#fff4db",
          backgroundColor: "#173449",
          padding: { left: 8, right: 8, top: 4, bottom: 4 },
        })
        .setOrigin(0.5)
        .setDepth(2400);
    }

    if (!hasPlayerAvatar) {
      const fallbackX = Number.isFinite(this.player?.x) ? this.player.x : TILE_SIZE * 4;
      const fallbackY = Number.isFinite(this.player?.y) ? this.player.y : TILE_SIZE * 4;
      this.ensureFallbackPlayerMarker(fallbackX, fallbackY);
    }
  }

  clearFallbackPlayerMarker() {
    this.playerFallbackMarker?.destroy();
    this.playerFallbackMarker = null;
  }

  startWorldInitTimeout() {
    this.worldInitTimeout?.remove(false);
    this.worldInitTimeout = this.time.delayedCall(6000, () => {
      if (this.hasReceivedWorldInit || this.worldEntryError) {
        return;
      }

      logWorldFlow("TownScene world init timeout", {
        roomId: this.currentRoomId,
      });
      this.notify({ type: "warning", message: "Sunucu gecikti. Kasaba yerel gorunumle acildi." });
      showGameRootOverlay({
        title: "Sunucu Yaniti Gecikti",
        message: "Kasaba sahnesi acildi ama ilk oda verisi gecikti. Tekrar baglanmayi deneyebilirsin.",
        variant: "error",
        actionLabel: "Tekrar Dene",
        onAction: () => {
          this.retryWorldConnection();
        },
      });
    });
  }

  retryWorldConnection() {
    logWorldFlow("TownScene retry world connection");
    hideGameRootOverlay();
    this.worldEntryError = null;
    this.hasReceivedWorldInit = false;
    this.disconnectMultiplayer();
    showGameRootOverlay({
      title: "Yeniden Baglaniliyor",
      message: "Sunucu baglantisi yeniden kuruluyor...",
      variant: "loading",
    });
    this.connectMultiplayer();
    this.startWorldInitTimeout();
  }

  showWorldEntryError(message, { shouldReturnToLogin = false } = {}) {
    this.worldEntryError = String(message ?? "Sehir yuklenemedi.");
    logWorldFlow("TownScene entry error", {
      message: this.worldEntryError,
      shouldReturnToLogin,
    });
    showGameRootOverlay({
      title: "Sehir Yuklenemedi",
      message: this.worldEntryError,
      variant: "error",
      actionLabel: shouldReturnToLogin ? "Giris Ekrani" : "Tekrar Dene",
      onAction: () => {
        hideGameRootOverlay();
        if (shouldReturnToLogin) {
          this.scene.start(SCENE_KEYS.LOGIN);
          return;
        }
        this.retryWorldConnection();
      },
    });
  }

  applyClientSettings() {
    this.chatPanel?.setVisibilityPreference(this.audioSettings.chatVisible);
    this.player?.setSpeechBubblesEnabled(this.audioSettings.speechBubblesEnabled);
    this.player?.setPerformanceMode?.(this.audioSettings.performanceMode);
    this.remotePlayers?.forEach((remotePlayer) => {
      remotePlayer.setSpeechBubblesEnabled(this.audioSettings.speechBubblesEnabled);
      remotePlayer.setPerformanceMode?.(this.audioSettings.performanceMode);
    });
    this.pickups?.forEach((pickup) => pickup.setPerformanceMode?.(this.audioSettings.performanceMode));
    this.weatherController?.setPerformanceMode?.(this.audioSettings.performanceMode);
    this.dayNightController?.setPerformanceMode?.(this.audioSettings.performanceMode);
    this.notificationCenter?.setPerformanceMode?.(this.audioSettings.performanceMode);
    this.rewardPopup?.setPerformanceMode?.(this.audioSettings.performanceMode);
    this.lootPopup?.setPerformanceMode?.(this.audioSettings.performanceMode);
    this.dailyLoginRewardPopup?.setPerformanceMode?.(this.audioSettings.performanceMode);
    this.tutorialOverlay?.setPerformanceMode?.(this.audioSettings.performanceMode);
    if (this.questPulse) {
      if (this.audioSettings.performanceMode) {
        this.questPulse.pause();
        this.questMarker.setScale(1).setAlpha(0.45);
      } else {
        this.questPulse.resume();
      }
    }
    if (this.tutorialPulse) {
      if (this.audioSettings.performanceMode) {
        this.tutorialPulse.pause();
        this.tutorialMarker.setScale(1).setAlpha(0.4);
      } else {
        this.tutorialPulse.resume();
      }
    }
  }

  getPhotoHudObjects() {
    return [
      this.questGuideTitleText,
      this.questGuideHintText,
      this.questGuideMinimap,
      this.roomNameText,
      this.roomOwnerText,
      this.roomEventText,
      this.weatherText,
      this.onlineCountText,
      this.levelHudText,
      this.xpBarBackground,
      this.xpBarFill,
      this.xpBarText,
      this.coinText,
      this.progressHintText,
      this.timeOfDayText,
      this.questTitleText,
      this.questBodyText,
      this.staminaText,
      this.hudHelpText,
      this.seasonalBannerText,
      this.questMarker,
      this.tutorialMarker,
    ].filter(Boolean);
  }

  applyPhotoMode() {
    const hudVisible = !this.photoMode.isHudHidden;
    this.getPhotoHudObjects().forEach((entry) => entry.setVisible?.(hudVisible));
    if (hudVisible) {
      this.refreshTutorialUi();
    } else {
      this.tutorialOverlay?.hide();
      this.tutorialMarker?.setVisible(false);
    }
    this.player?.setPhotoPose?.(this.photoMode.pose);

    if (this.photoMode.cameraMode === "follow") {
      this.pixelPerfectCamera?.setFollowEnabled(true);
    } else {
      this.pixelPerfectCamera?.setFollowEnabled(false);
    }

    this.photoModePanel?.update({
      hudHidden: this.photoMode.isHudHidden,
      cameraMode: this.photoMode.cameraMode,
    });
    this.photoModePanel?.setFeedback(
      `${this.photoMode.pose} poz | ${this.photoMode.cameraMode === "follow" ? "kamera oyuncuda" : "kamera sabit"}`
    );
  }

  registerUiEventHandlers() {
    this.uiEventCleanups.forEach((cleanup) => cleanup?.());
    this.photoModePanel?.onToggleHud(() => {
      this.photoMode.isHudHidden = !this.photoMode.isHudHidden;
      this.applyPhotoMode();
    });
    this.photoModePanel?.onToggleCameraMode(() => {
      this.photoMode.cameraMode = this.photoMode.cameraMode === "follow" ? "free" : "follow";
      this.applyPhotoMode();
    });
    this.photoModePanel?.onSelectPose((poseId) => {
      this.photoMode.pose = poseId;
      this.applyPhotoMode();
    });
    this.uiEventCleanups = [
      this.eventBus.on(GAME_EVENTS.AUDIO_SETTINGS_CHANGED, (partialSettings) => {
        this.audioSettings = saveAudioSettings({
          ...this.audioSettings,
          ...partialSettings,
        });
        this.audioManager.applySettings(this.audioSettings);
        this.audioPanel.update(this.audioSettings);
        this.applyClientSettings();
        this.audioPanel.setFeedback("Ses ayarlari kaydedildi.", false);
        this.notify({ type: "success", message: "Ses ayarlari kaydedildi." });
        this.audioManager.playUiTone("confirm");
      }),
      this.eventBus.on(GAME_EVENTS.NOTIFICATION_PUSHED, (payload) => {
        this.notify(payload);
      }),
      this.eventBus.on(GAME_EVENTS.CRAFT_REQUESTED, (recipe) => {
        this.craftRecipe(recipe);
      }),
      this.eventBus.on(GAME_EVENTS.FRIEND_REQUESTED, (playerName) => {
        const normalized = sanitizePlayerName(playerName, "");

        if (!normalized) {
          this.friendsPanel.setFeedback("Bir oyuncu adi gir.", true);
          return;
        }

        this.multiplayerClient?.requestSendFriendRequest(normalized);
        this.friendsPanel.setFeedback("Arkadas istegi gonderiliyor...", false);
      }),
        this.eventBus.on(GAME_EVENTS.FRIEND_RESPONSE_REQUESTED, ({ playerId, action }) => {
          this.multiplayerClient?.requestRespondToFriendRequest(playerId, action);
          this.friendsPanel.setFeedback("Istek guncelleniyor...", false);
        }),
        this.eventBus.on(GAME_EVENTS.DIRECT_MESSAGE_REQUESTED, ({ targetUserId, text }) => {
          const normalized = sanitizeChatMessage(text);
          if (!targetUserId || !normalized) {
            this.friendsPanel.setFeedback("Mesaj bos olamaz.", true);
            return;
          }
          this.multiplayerClient?.requestSendDirectMessage(targetUserId, normalized);
          this.friendsPanel.setFeedback("Mesaj gonderiliyor...", false);
        }),
        this.eventBus.on(GAME_EVENTS.PROFILE_STATUS_REQUESTED, (statusText) => {
        this.player.statusText = sanitizeProfileStatus(statusText);
        this.friendsPanel.setStatusValue(this.player.statusText);
        this.multiplayerClient?.requestSetProfileStatus(this.player.statusText);
        this.friendsPanel.setFeedback("Durum guncelleniyor...", false);
      }),
      this.eventBus.on(GAME_EVENTS.HOME_ACCESS_REQUESTED, (isPublic) => {
        this.multiplayerClient?.requestSetHomeAccess(isPublic);
        this.friendsPanel.setFeedback("Ev erisimi guncelleniyor...", false);
      }),
      this.eventBus.on(GAME_EVENTS.HOME_VISIT_REQUESTED, (ownerUserId) => {
        this.visitPlayerHome(ownerUserId);
      }),
      this.eventBus.on(GAME_EVENTS.TRADE_REQUESTED, ({ playerId, source }) => {
        this.multiplayerClient?.requestTrade(playerId);
        if (source === "friends") {
          this.friendsPanel.setFeedback("Trade istegi gonderiliyor...", false);
        }
      }),
      this.eventBus.on(GAME_EVENTS.PARTY_INVITE_REQUESTED, ({ playerId, source }) => {
        this.multiplayerClient?.requestPartyInvite(playerId);
        if (source === "friends") {
          this.friendsPanel.setFeedback("Party daveti gonderiliyor...", false);
        }
      }),
      this.eventBus.on(GAME_EVENTS.MAIL_CLAIM_REQUESTED, (mailId) => {
        this.multiplayerClient?.requestClaimMail(mailId);
        this.mailboxPanel.setFeedback("Posta claim ediliyor...", false);
      }),
      this.eventBus.on(GAME_EVENTS.GIFT_SEND_REQUESTED, (payload) => {
        this.multiplayerClient?.requestSendGift(payload.targetUserId, payload.itemId, payload.quantity, payload.message);
        this.mailboxPanel.setFeedback("Hediye gonderiliyor...", false);
      }),
      this.eventBus.on(GAME_EVENTS.WARDROBE_CYCLE_REQUESTED, (slot) => {
        this.cycleWardrobeSlot(slot);
      }),
      this.eventBus.on(GAME_EVENTS.SHOP_BUY_REQUESTED, (shopItem) => {
        this.buyShopItem(shopItem);
      }),
      this.eventBus.on(GAME_EVENTS.SHOP_SELL_REQUESTED, ({ inventoryEntry, quantity }) => {
        this.sellShopItem(inventoryEntry, quantity);
      }),
      this.eventBus.on(GAME_EVENTS.SHOP_BUYBACK_REQUESTED, (buybackEntry) => {
        this.buybackShopItem(buybackEntry);
      }),
      this.eventBus.on(GAME_EVENTS.COSMETIC_SHOP_BUY_REQUESTED, (shopItem) => {
        this.buyCosmeticShopItem(shopItem);
      }),
      this.eventBus.on(GAME_EVENTS.HOME_EDITOR_ITEM_SELECTED, (itemId) => {
        this.pendingFurnitureItemId = itemId;
        this.pendingFurnitureMove = false;
        this.selectedFurniturePlacementId = null;
        this.refreshHomeEditorUi();
      }),
      this.eventBus.on(GAME_EVENTS.HOME_EDITOR_ACTION_REQUESTED, (action) => {
        this.handleHomeEditorAction(action);
      }),
      this.eventBus.on(GAME_EVENTS.BADGE_EQUIP_REQUESTED, (badgeId) => {
        this.badgesPanel.setFeedback(badgeId ? "Badge guncelleniyor..." : "Badge kaldiriliyor...", false);
        this.multiplayerClient?.requestEquipBadge(badgeId);
      }),
      this.eventBus.on(GAME_EVENTS.PROFILE_FRIEND_REQUESTED, (profile) => {
        this.multiplayerClient?.requestSendFriendRequest(profile.displayName);
        this.playerProfilePanel.setFeedback("Arkadas istegi gonderiliyor...", false);
      }),
      this.eventBus.on(GAME_EVENTS.PROFILE_HOME_VISIT_REQUESTED, (profile) => {
        this.visitPlayerHome(profile?.accountId);
      }),
      this.eventBus.on(GAME_EVENTS.PROFILE_TRADE_REQUESTED, (profile) => {
        this.multiplayerClient?.requestTrade(profile?.playerId);
        this.playerProfilePanel.setFeedback("Trade istegi gonderiliyor...", false);
      }),
      this.eventBus.on(GAME_EVENTS.PROFILE_PARTY_INVITE_REQUESTED, (profile) => {
        this.multiplayerClient?.requestPartyInvite(profile?.playerId);
        this.playerProfilePanel.setFeedback("Party daveti gonderiliyor...", false);
      }),
      this.eventBus.on(GAME_EVENTS.PROFILE_REPORT_REQUESTED, ({ profile, reason }) => {
        const normalizedReason = sanitizePlainText(reason, 240);
        if (!normalizedReason) {
          this.playerProfilePanel.setFeedback("Rapor nedeni gir.", true);
          return;
        }
        this.multiplayerClient?.requestReportPlayer(profile?.playerId, normalizedReason);
        this.playerProfilePanel.setFeedback("Rapor gonderiliyor...", false);
      }),
      this.eventBus.on(GAME_EVENTS.TRADE_OFFER_UPDATED, (offer) => {
        this.multiplayerClient?.updateTradeOffer(offer);
        this.tradePanel.setStatus("Teklif guncelleniyor...", false);
      }),
      this.eventBus.on(GAME_EVENTS.TRADE_ACTION_REQUESTED, (action) => {
        if (action === "accept") {
          this.multiplayerClient?.respondTrade(true);
        } else if (action === "reject") {
          this.multiplayerClient?.respondTrade(false);
        } else if (action === "confirm") {
          this.multiplayerClient?.confirmTrade(true);
        } else if (action === "cancel") {
          this.multiplayerClient?.cancelTrade();
        }
      }),
      this.eventBus.on(GAME_EVENTS.PARTY_ACTION_REQUESTED, (action) => {
        if (action === "accept") {
          this.multiplayerClient?.respondPartyInvite(true);
        } else if (action === "reject") {
          this.multiplayerClient?.respondPartyInvite(false);
        } else if (action === "leave") {
          this.multiplayerClient?.leaveParty();
        }
      }),
      this.eventBus.on(GAME_EVENTS.CHAT_SUBMITTED, (messageText) => {
        const normalized = sanitizeChatMessage(messageText);

        if (!normalized) {
          this.chatPanel.close();
          return;
        }

        const emote = parseEmoteCommand(normalized);
        if (emote) {
          this.playEmote(emote.id);
          this.chatPanel.close();
          return;
        }

        this.multiplayerClient?.sendChat(normalized);
        this.chatPanel.close();
      }),
    ];
  }

  resetMovementPrediction() {
    this.nextInputSequence = 1;
    this.pendingMovementInputs = [];
    this.reconciliationOffset = { x: 0, y: 0 };
    this.lastSentPosition = null;
  }

  handleSelfServerMovement(playerState) {
    if (!playerState) {
      return;
    }

    const acknowledgedSequence = Number(playerState.lastProcessedInputSequence);
    const hasAcknowledgedSequence = Number.isFinite(acknowledgedSequence);
    const acknowledgedInput = hasAcknowledgedSequence
      ? this.pendingMovementInputs.find((entry) => entry.sequence === acknowledgedSequence) ?? null
      : null;

    if (hasAcknowledgedSequence) {
      this.pendingMovementInputs = this.pendingMovementInputs.filter((entry) => entry.sequence > acknowledgedSequence);
    }

    const targetFlipX = Boolean(playerState.flipX);
    this.player.setFlipX(targetFlipX);
    this.player.avatar.setFacing(targetFlipX);
    this.player.setEmoteState?.(playerState.activeEmoteId ?? null, playerState.emoteEndsAt ?? 0);

    if (!acknowledgedInput) {
      return;
    }

    const deltaX = Number(playerState.x ?? this.player.x) - acknowledgedInput.x;
    const deltaY = Number(playerState.y ?? this.player.y) - acknowledgedInput.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance >= LOCAL_PREDICTION_SNAP_DISTANCE) {
      this.reconciliationOffset = { x: 0, y: 0 };
      this.player.setPosition(playerState.x, playerState.y);
      this.player.body.reset(playerState.x, playerState.y);
      return;
    }

    this.reconciliationOffset.x += deltaX;
    this.reconciliationOffset.y += deltaY;
  }

  applyMovementReconciliation() {
    const offsetX = Number(this.reconciliationOffset?.x ?? 0);
    const offsetY = Number(this.reconciliationOffset?.y ?? 0);

    if (Math.abs(offsetX) < 0.01 && Math.abs(offsetY) < 0.01) {
      this.reconciliationOffset.x = 0;
      this.reconciliationOffset.y = 0;
      return;
    }

    const stepX = offsetX * LOCAL_PREDICTION_CORRECTION_SPEED;
    const stepY = offsetY * LOCAL_PREDICTION_CORRECTION_SPEED;
    this.player.x += stepX;
    this.player.y += stepY;
    this.player.body.position.x += stepX;
    this.player.body.position.y += stepY;
    this.reconciliationOffset.x -= stepX;
    this.reconciliationOffset.y -= stepY;
  }

  applyGameplayState(rawGameplayState) {
    const previousInventoryState = normalizeInventoryState(this.gameplayState?.inventory);
    const previousWorldState = normalizeWorldState(this.gameplayState?.world);
    const previousLevel = Number(this.gameplayState?.progression?.level ?? 1);
    const previousXp = Number(this.gameplayState?.progression?.xp ?? 0);
    const previousUnlockIds = new Set(this.gameplayState?.progression?.unlockedContentIds ?? []);

    this.gameplayState = {
      inventory: normalizeInventoryState(rawGameplayState?.inventory),
      quest: normalizeQuestState(rawGameplayState?.quest),
      world: normalizeWorldState(rawGameplayState?.world),
      cosmetics: normalizeCosmeticsState(rawGameplayState?.cosmetics),
      progression: normalizeProgressionState(rawGameplayState?.progression),
      achievements: normalizeAchievementsState(rawGameplayState?.achievements),
      badges: normalizeBadgesState(rawGameplayState?.badges),
      dailyQuests: normalizeDailyQuestsState(rawGameplayState?.dailyQuests),
      weeklyTasks: normalizeWeeklyTasksState(rawGameplayState?.weeklyTasks),
      friends: normalizeFriendsState(this.gameplayState?.friends),
      mailbox: normalizeMailboxState(this.gameplayState?.mailbox),
    };
    this.player.setAppearance(this.gameplayState.cosmetics.equipped);
    this.session = createSession(this.session.playerName, this.gameplayState.cosmetics.equipped, {
      ...this.session,
      cosmetics: this.gameplayState.cosmetics,
    });
    this.player.statusText = sanitizeProfileStatus(this.player.statusText);
    this.updateLocalNameLabel();
    this.refreshQuestHud();
    this.refreshInventoryUi();
    this.updateQuestMarker();
    this.syncWorldPresentation();

    if (this.hasReceivedGameplayState && this.gameplayState.progression.level > previousLevel) {
      this.notify({ type: "success", message: `Level ${this.gameplayState.progression.level} oldun` });
    }

    const newUnlock = (this.gameplayState.progression.unlockedContentIds ?? []).find((unlockId) => !previousUnlockIds.has(unlockId));
    if (this.hasReceivedGameplayState && newUnlock) {
      this.notify({ type: "success", message: "Yeni seviye icerigi acildi" });
    }

    const previousCompletedQuestIds = new Set(this.previousCompletedQuestIds ?? []);
    const currentCompletedQuestIds = this.gameplayState.quest.completedQuestIds ?? [];
    const latestCompletedQuestId = currentCompletedQuestIds.find((questId) => !previousCompletedQuestIds.has(questId));
    if (this.hasReceivedGameplayState && latestCompletedQuestId) {
      const completedQuest = getQuestDefinition(latestCompletedQuestId);
      this.notify({ type: "success", message: `${completedQuest?.title ?? "Gorev"} tamamlandi` });
    }

    this.previousCompletedQuestIds = [...currentCompletedQuestIds];
    if (currentCompletedQuestIds.length > 0) {
      this.completeTutorialStep("first-quest");
    }
    if ((this.gameplayState.world.collectedPickupIds ?? []).length > 0) {
      this.completeTutorialStep("collect-item");
    }
    if (this.hasSeenNonTownRoom || this.currentRoomBaseId !== "town") {
      this.completeTutorialStep("room-transition");
    }
    this.showRewardDeltaPopup(rawGameplayState, {
      previousLevel,
      previousXp,
      latestCompletedQuestId,
      previousInventory: previousInventoryState,
    });
    this.playWorldStateEffects(previousWorldState, this.gameplayState.world);
    this.refreshTutorialUi();
    this.hasReceivedGameplayState = true;
  }

  playWorldStateEffects(previousWorldState, nextWorldState) {
    const previousPickups = new Set(previousWorldState?.collectedPickupIds ?? []);
    const previousChests = new Set(previousWorldState?.openedChestIds ?? []);

    (nextWorldState?.collectedPickupIds ?? []).forEach((pickupId) => {
      if (previousPickups.has(pickupId)) {
        return;
      }
      const pickup = this.pickups?.find((entry) => entry.id === pickupId);
      if (pickup) {
        this.worldFx?.spawnPickupSparkle(pickup.x, pickup.y);
      }
    });

    (nextWorldState?.openedChestIds ?? []).forEach((chestId) => {
      if (previousChests.has(chestId)) {
        return;
      }
      const chest = this.chests?.find((entry) => entry.id === chestId);
      if (chest) {
        this.worldFx?.spawnChestBurst(chest.x, chest.y);
      }
    });
  }

  applyRoomState(roomData, players = [], selfPlayer = null) {
    this.clearRemotePlayers();
    this.rebuildRoom(roomData, selfPlayer);

    players.forEach((playerState) => {
      if (playerState.id !== this.multiplayerSelfId) {
        this.upsertRemotePlayer(playerState);
      }
    });

    this.refreshPartyPresentation();
    this.refreshOnlineCount();
  }

  rebuildRoom(roomData, selfPlayer = null) {
    const targetRoomId = typeof roomData === "string" ? roomData : roomData?.id ?? "town";
    logWorldFlow("TownScene rebuildRoom start", {
      roomId: targetRoomId,
      selfPlayer: selfPlayer ? { x: selfPlayer.x, y: selfPlayer.y } : null,
    });
    
    try {
      this.destroyCurrentRoom();

      const roomId = roomData?.id ?? "town";
      const baseRoomId = roomData?.baseRoomId ?? roomId;
      
      logWorldFlow("rebuildRoom: getting room definition", { baseRoomId });
      const roomDef = getRoomDefinition(baseRoomId);
      
      const room = {
        ...roomDef,
        id: roomId,
        baseRoomId,
        name: roomData?.name ?? roomDef.name,
        ownerProfileId: roomData?.ownerProfileId ?? null,
        ownerName: roomData?.ownerName ?? "",
        isPersonalHome: Boolean(roomData?.isPersonalHome),
      };
      
      logWorldFlow("rebuildRoom: building room map");
      const roomMap = buildRoomMap(this, room);
      
      logWorldFlow("rebuildRoom: creating interactives");
      const interactives = createRoomInteractives(this, room, getRoomWorldEvents(this.activeWorldEvents, room.id));

      this.currentRoomId = room.id;
      this.currentRoomBaseId = room.baseRoomId ?? room.id;
      this.currentRoomOwnerName = room.ownerName ?? "";
      this.currentRoom = room;
      this.roomMap = roomMap;
      
      logWorldFlow("rebuildRoom: building blocked tiles");
      this.blockedMovementTiles = buildBlockedTileSet(room);
      this.clearMovementTarget();
      
      logWorldFlow("rebuildRoom: creating npcs");
      this.npcs = createRoomNpcs(this, room);
      this.pickups = interactives.pickups;
      this.chests = interactives.chests;
      
      this.entityRegistry.replaceGroup("npcs", this.npcs, (entry) => entry.npcId);
      this.entityRegistry.replaceGroup("pickups", this.pickups);
      this.entityRegistry.replaceGroup("chests", this.chests);
      this.roomEventObjects = interactives.eventObjects ?? [];
      this.portals = roomMap.portals;
      
      logWorldFlow("rebuildRoom: creating home overlay");
      this.createHomeEditOverlay();

      if (this.currentRoomBaseId !== "home" || room.ownerProfileId !== this.homeState?.ownerProfileId) {
        this.homeEditMode = false;
        this.pendingFurnitureItemId = null;
        this.selectedFurniturePlacementId = null;
        this.pendingFurnitureMove = false;
        this.homeEditorPanel?.close();
      }

      this.roomNameText.setText(room.name);
      this.roomOwnerText.setText(room.isPersonalHome && room.ownerName ? `Ev Sahibi: ${room.ownerName}` : "");
      this.updateRoomEventHud();
      this.updateSeasonalEventHud();

      const nextPosition = selfPlayer ?? { x: roomMap.spawnPoint.x, y: roomMap.spawnPoint.y };
      if (selfPlayer?.appearance) {
        this.session = createSession(this.session.playerName, selfPlayer.appearance, {
          ...this.session,
          cosmetics: this.gameplayState.cosmetics,
        });
        this.player.setAppearance(selfPlayer.appearance);
      }
      
      logWorldFlow("rebuildRoom: updating player state", { nextPosition });
      this.player.statusText = sanitizeProfileStatus(selfPlayer?.statusText ?? this.player.statusText ?? "");
      this.player.setEmoteState?.(selfPlayer?.activeEmoteId ?? null, selfPlayer?.emoteEndsAt ?? 0);
      this.player.setPosition(nextPosition.x, nextPosition.y);
      this.player.body.reset(nextPosition.x, nextPosition.y);
      this.player.update({ x: 0, y: 0, isSprinting: false });
      this.player.setFlipX(Boolean(selfPlayer?.flipX));
      this.player.avatar.setFacing(Boolean(selfPlayer?.flipX));
      this.nameLabel.setPosition(this.player.avatar.x, this.player.avatar.y - 36);
      this.nameLabel.setDepth(this.player.depth + 20);
      this.updateLocalNameLabel();
      
      if (!this.player?.avatar || !Number.isFinite(this.player.avatar.x) || !Number.isFinite(this.player.avatar.y)) {
        logWorldFlow("TownScene player presentation fallback engaged", {
          x: nextPosition.x,
          y: nextPosition.y,
        });
        this.ensureFallbackPlayerMarker(nextPosition.x, nextPosition.y);
      } else {
        this.clearFallbackPlayerMarker();
      }

      this.physics.world.setBounds(0, 0, roomMap.worldWidth, roomMap.worldHeight);
      this.pixelPerfectCamera?.attach(this.cameras.main, this.player.avatar, {
        followEnabled: this.photoMode.cameraMode === "follow",
      });
      
      const projectedBounds = roomMap.projectedBounds ?? {
        minX: -roomMap.worldWidth,
        minY: -roomMap.worldHeight,
        width: roomMap.worldWidth * 3,
        height: roomMap.worldHeight * 3,
      };
      
      const cameraPaddingX = 240;
      const cameraPaddingY = 180;
      this.pixelPerfectCamera?.setBounds(
        projectedBounds.minX - cameraPaddingX,
        projectedBounds.minY - cameraPaddingY,
        projectedBounds.width + cameraPaddingX * 2,
        projectedBounds.height + cameraPaddingY * 2,
      );

      if (this.photoMode.cameraMode === "follow") {
        this.cameras.main.centerOn(Math.floor(this.player.avatar.x), Math.floor(this.player.avatar.y));
      }
      
      this.worldSpawnMarker?.destroy();
      this.worldSpawnMarker = this.add.circle(this.player.avatar.x, this.player.avatar.y + 8, 10, 0xffd166, 0.32).setDepth(this.player.depth + 4);
      this.worldDebugText?.setText(`Town Scene Loaded\n${room.name}`);
      
      logWorldFlow("TownScene camera setup finished", {
        roomId: room.id,
        roomName: room.name,
        spawnX: nextPosition.x,
        spawnY: nextPosition.y,
        avatarX: this.player.avatar.x,
        avatarY: this.player.avatar.y,
        projectedBounds,
      });

      this.playerObstacleCollider?.destroy();
      this.playerObstacleCollider = this.physics.add.collider(this.player, roomMap.obstacles);
      this.dayNightController?.setRoom(room, roomMap);
      this.weatherController?.setRoom(room, roomMap);
      this.weatherController?.setWeatherState(this.weatherState);
      this.applyClientSettings();
      this.applyPhotoMode();
      this.updateAudioEnvironment();
      this.syncWorldPresentation();
      this.renderHomeFurniture();
      this.updateQuestMarker();
      this.updateWeatherHud();
      this.refreshHomeEditorUi();
      
      logWorldFlow("TownScene rebuildRoom complete", { roomId: this.currentRoomId });
    } catch (error) {
      console.error("[TownScene] rebuildRoom critical error:", error);
      logWorldFlow("TownScene rebuildRoom failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null
      });
      throw error; // Re-throw to be caught by the caller in create()
    }
  }

  destroyCurrentRoom() {
    this.clearMovementTarget();
    this.pointerActionTarget = null;
    this.lastPointerActionTargetKey = null;
    this.playerObstacleCollider?.destroy();
    this.playerObstacleCollider = null;

    this.roomMap?.createdObjects?.forEach((object) => object.destroy());
    this.roomMap?.obstacles?.clear(true, true);
    this.npcs?.forEach((npc) => npc.destroy());
    this.pickups?.forEach((pickup) => pickup.destroy());
    this.chests?.forEach((chest) => chest.destroy());
    this.roomEventObjects?.forEach((object) => object.destroy?.());
    this.homeFurniture?.forEach((entry) => entry.destroy());
    this.worldSpawnMarker?.destroy();
    this.worldSpawnMarker = null;
    this.clearFallbackPlayerMarker();
    this.homeGridOverlay?.destroy(true);
    this.homeGridOverlay = null;

    this.roomMap = null;
    this.npcs = [];
    this.pickups = [];
    this.chests = [];
    this.entityRegistry.clearGroup("npcs");
    this.entityRegistry.clearGroup("pickups");
    this.entityRegistry.clearGroup("chests");
    this.roomEventObjects = [];
    this.homeFurniture = [];
    this.portals = [];
  }

  syncWorldPresentation() {
    const worldState = this.gameplayState.world;

    this.pickups = this.pickups.filter((pickup) => {
      if (!isPickupCollected(worldState, pickup.id)) {
        return true;
      }

      pickup.destroy();
      return false;
    });

      this.chests.forEach((chest) => {
        if (isChestOpened(worldState, chest.id) && !chest.isOpened) {
          chest.open();
        }
      });

    this.updateRoomEventHud();
  }

  syncRoomEventInteractives() {
    if (!this.currentRoom) {
      return;
    }

    this.pickups?.forEach((pickup) => pickup.destroy());
    this.chests?.forEach((chest) => chest.destroy());
    this.roomEventObjects?.forEach((object) => object.destroy?.());

    const interactives = createRoomInteractives(this, this.currentRoom, getRoomWorldEvents(this.activeWorldEvents, this.currentRoomId));
    this.pickups = interactives.pickups;
    this.chests = interactives.chests;
    this.entityRegistry.replaceGroup("pickups", this.pickups);
    this.entityRegistry.replaceGroup("chests", this.chests);
    this.roomEventObjects = interactives.eventObjects ?? [];
    this.syncWorldPresentation();
  }

  createHomeEditOverlay() {
    this.homeGridOverlay?.destroy(true);
    this.homeGridOverlay = this.add.container(0, 0).setVisible(false);

    if (this.currentRoomBaseId !== "home" && this.currentRoom?.baseRoomId !== "home") {
      return;
    }

    const width = this.currentRoom.width ?? 0;
    const height = this.currentRoom.height ?? 0;

    for (let x = 1; x < width - 1; x += 1) {
      for (let y = 2; y < height - 1; y += 1) {
        const position = tileToWorld(x, y);
        const cell = this.add.rectangle(position.x, position.y, 46, 46, 0x72c8ff, 0.06).setStrokeStyle(1, 0x72c8ff, 0.08);
        cell.setDepth(1500);
        this.homeGridOverlay.add(cell);
      }
    }
  }

  renderHomeFurniture() {
    this.homeFurniture?.forEach((entry) => entry.destroy());
    this.homeFurniture = [];

    if (this.currentRoomBaseId !== "home" || !Array.isArray(this.roomHomeState?.placedFurniture)) {
      return;
    }

    this.homeFurniture = this.roomHomeState.placedFurniture.map((placement) => {
      const furniture = new HomeFurniture(this, placement, this.homeEditMode);
      furniture.onSelect((selectedFurniture) => {
        if (!this.homeEditMode) {
          return;
        }

        this.pendingFurnitureItemId = null;
        this.pendingFurnitureMove = false;
        this.selectedFurniturePlacementId = selectedFurniture.placement.id;
        this.refreshHomeFurnitureSelection();
        this.refreshHomeEditorUi();
      });
      return furniture;
    });

    this.refreshHomeFurnitureSelection();
  }

  refreshHomeFurnitureSelection() {
    this.homeFurniture.forEach((entry) => {
      entry.setSelected(entry.placement.id === this.selectedFurniturePlacementId, this.homeEditMode);
      entry.setEditMode(this.homeEditMode);
    });
  }

  getFurnitureInventoryEntries() {
    return getInventoryEntries(this.gameplayState.inventory).filter((entry) => entry.placeable && entry.amount > 0);
  }

  canEditCurrentHome() {
    return this.currentRoomBaseId === "home" && this.currentRoom?.ownerProfileId === this.homeState?.ownerProfileId;
  }

  toggleHomeEditor() {
    if (!this.canEditCurrentHome()) {
      if (this.currentRoomBaseId === "home") {
        this.showStatusToast("Bu evde duzenleme yetkin yok");
      }
      return;
    }

    const nextVisible = !this.homeEditorPanel.isVisible();

    if (nextVisible) {
      this.isInventoryOpen = false;
      this.inventoryPanel.setVisible(false);
      this.achievementsPanel.close();
      this.badgesPanel.close();
      this.dailyQuestsPanel.close();
      this.weeklyTasksPanel.close();
      this.friendsPanel.close();
      this.playerProfilePanel.close();
      this.wardrobePanel.setVisible(false);
      this.craftingPanel.close();
      this.audioPanel.close();
      this.chatPanel.close();
      this.homeEditMode = true;
      this.homeGridOverlay?.setVisible(true);
      this.homeEditorPanel.open();
      this.showStatusToast("Ev duzenleme modu acildi");
    } else {
      this.homeEditMode = false;
      this.pendingFurnitureItemId = null;
      this.pendingFurnitureMove = false;
      this.selectedFurniturePlacementId = null;
      this.homeGridOverlay?.setVisible(false);
      this.homeEditorPanel.close();
    }

    this.refreshHomeFurnitureSelection();
    this.refreshHomeEditorUi();
  }

  refreshHomeEditorUi() {
    if (!this.homeEditorPanel) {
      return;
    }

    const selectedPlacement =
      Array.isArray(this.roomHomeState?.placedFurniture)
        ? this.roomHomeState.placedFurniture.find((entry) => entry.id === this.selectedFurniturePlacementId) ?? null
        : null;

    this.homeEditorPanel.update(this.getFurnitureInventoryEntries(), this.pendingFurnitureItemId, selectedPlacement);
  }

  handleHomeEditorAction(action) {
    if (action === "move") {
      if (!this.selectedFurniturePlacementId) {
        this.homeEditorPanel.setFeedback("Once bir mobilya sec.", true);
        return;
      }

      this.pendingFurnitureMove = true;
      this.homeEditorPanel.setFeedback("Yeni kareye tikla.", false);
      return;
    }

    if (action === "rotate") {
      if (!this.selectedFurniturePlacementId) {
        this.homeEditorPanel.setFeedback("Once bir mobilya sec.", true);
        return;
      }

      this.multiplayerClient?.requestRotateFurniture(this.selectedFurniturePlacementId);
      this.homeEditorPanel.setFeedback("Mobilya donduruluyor...", false);
      return;
    }

    if (action === "remove") {
      if (!this.selectedFurniturePlacementId) {
        this.homeEditorPanel.setFeedback("Once bir mobilya sec.", true);
        return;
      }

      this.multiplayerClient?.requestRemoveFurniture(this.selectedFurniturePlacementId);
      this.homeEditorPanel.setFeedback("Mobilya kaldiriliyor...", false);
    }
  }

  handleHomeEditorPointer(pointer) {
    if (!this.homeEditMode || !this.canEditCurrentHome() || !pointer.leftButtonDown()) {
      return;
    }

    const worldPoint = pointer.positionToCamera(this.cameras.main);
    const tile = worldToTile(worldPoint.x, worldPoint.y);

    if (tile.x < 1 || tile.y < 2 || tile.x > 16 || tile.y > 10) {
      return;
    }

    if (this.pendingFurnitureMove && this.selectedFurniturePlacementId) {
      this.multiplayerClient?.requestMoveFurniture(this.selectedFurniturePlacementId, tile.x, tile.y);
      this.pendingFurnitureMove = false;
      this.homeEditorPanel.setFeedback("Mobilya tasiniyor...", false);
      return;
    }

    if (this.pendingFurnitureItemId) {
      this.multiplayerClient?.requestPlaceFurniture(this.pendingFurnitureItemId, tile.x, tile.y, 0);
      this.homeEditorPanel.setFeedback("Mobilya yerlestiriliyor...", false);
    }
  }

  handlePointerDown(pointer) {
    this.handleHomeEditorPointer(pointer);

    if (!pointer.leftButtonDown() || this.homeEditMode) {
      return;
    }

    if (this.isPointerMovementBlocked()) {
      return;
    }

    const worldPoint = pointer.positionToCamera(this.cameras.main);
    const actionTarget = this.findPointerActionTarget(worldPoint.x, worldPoint.y);

    if (actionTarget) {
      this.pointerActionTarget = actionTarget;
      this.pulsePointerActionTarget();
      this.setMovementTarget(actionTarget.logicalX, actionTarget.logicalY);
      this.tryResolvePointerActionTarget();
      return;
    }

    const logicalPos = screenToLogical(worldPoint.x, worldPoint.y);
    this.pointerActionTarget = null;
    this.setMovementTarget(logicalPos.x, logicalPos.y);
  }

  isPointerMovementBlocked() {
    return Boolean(
      this.chatPanel?.isOpen() ||
        this.shopPanel?.isVisible() ||
        this.friendsPanel?.isVisible() ||
        this.tradePanel?.isVisible() ||
        this.partyPanel?.isVisible() ||
        this.playerProfilePanel?.isVisible?.() ||
        this.isInventoryOpen ||
        this.isMiniGameActive ||
        this.pendingRoomChange ||
        this.player?.hasMovementLockedEmote?.() ||
        this.localSeatedFurnitureId,
    );
  }

  setMovementTarget(x, y) {
    const worldWidth = Number(this.roomMap?.worldWidth ?? this.scale.width);
    const worldHeight = Number(this.roomMap?.worldHeight ?? this.scale.height);
    const clampedTarget = {
      x: Phaser.Math.Clamp(Number(x), 12, worldWidth - 12),
      y: Phaser.Math.Clamp(Number(y), 12, worldHeight - 12),
    };
    this.movementTarget = clampedTarget;

    if (!this.currentRoom || !this.player) {
      this.movementPath = [clampedTarget];
      return;
    }

    const path = findWorldPath(this.currentRoom, this.player.x, this.player.y, clampedTarget.x, clampedTarget.y, {
      blockedTiles: this.blockedMovementTiles,
    });
    this.movementPath = Array.isArray(path) && path.length > 1 ? path.slice(1) : [clampedTarget];
  }

  clearMovementTarget() {
    this.movementTarget = null;
    this.movementPath = [];
  }

  updateMoveTargetMarker() {
    if (!this.moveTargetMarker) {
      return;
    }

    if (!this.movementTarget || this.isPointerMovementBlocked()) {
      this.moveTargetMarker.setVisible(false);
      this.movePathMarkers?.forEach((marker) => marker.setVisible(false));
      return;
    }

    this.moveTargetMarker
      .setPosition(this.movementTarget.x, this.movementTarget.y + 6)
      .setDepth(this.movementTarget.y + 6)
      .setVisible(true);

    const previewPoints = Array.isArray(this.movementPath) ? this.movementPath.slice(0, this.movePathMarkers.length) : [];
    this.movePathMarkers?.forEach((marker, index) => {
      const waypoint = previewPoints[index];
      if (!waypoint) {
        marker.setVisible(false);
        return;
      }

      marker
        .setPosition(waypoint.x, waypoint.y + 4)
        .setDepth(waypoint.y + 4)
        .setVisible(true);
    });
  }

  getPointerActionTargetKey(target) {
    if (!target?.type || !target?.target) {
      return null;
    }

    if (target.type === "npc") {
      return `npc:${target.target.npcId ?? target.target.name ?? "unknown"}`;
    }

    if (target.type === "chest") {
      return `chest:${target.target.id ?? "unknown"}`;
    }

    if (target.type === "pickup") {
      return `pickup:${target.target.id ?? "unknown"}`;
    }

    if (target.type === "furniture") {
      return `furniture:${target.target.placement?.id ?? "unknown"}`;
    }

    if (target.type === "portal") {
      return `portal:${target.target.targetRoomId ?? target.target.label ?? "unknown"}`;
    }

    return `${target.type}:${target.target.x ?? 0}:${target.target.y ?? 0}`;
  }

  getPointerActionLabel(target) {
    if (!target?.type) {
      return "";
    }

    if (target.type === "npc") {
      return "[E] Konus";
    }
    if (target.type === "chest") {
      return "[E] Sandik";
    }
    if (target.type === "pickup") {
      return "Topla";
    }
    if (target.type === "furniture") {
      return "[E] Etkilesim";
    }
    if (target.type === "portal") {
      return "[E] Giris";
    }

    return "";
  }

  getPointerActionVisual(target) {
    const type = target?.type ?? "";
    if (type === "npc") {
      return { icon: "💬", fill: 0x8ecbff, stroke: 0xeef8ff, alpha: 0.24 };
    }
    if (type === "chest") {
      return { icon: "📦", fill: 0xffd99d, stroke: 0xfff0d5, alpha: 0.26 };
    }
    if (type === "pickup") {
      return { icon: "✨", fill: 0xc7f5d9, stroke: 0xeefff5, alpha: 0.24 };
    }
    if (type === "furniture") {
      return { icon: "🪑", fill: 0xd9c8ff, stroke: 0xf4ecff, alpha: 0.24 };
    }
    if (type === "portal") {
      return { icon: "🚪", fill: 0xb8e8ff, stroke: 0xe9f9ff, alpha: 0.24 };
    }
    return { icon: "•", fill: 0xffe0a1, stroke: 0xfff2bf, alpha: 0.2 };
  }

  getPointerActionRange(target) {
    if (!target?.type) {
      return 0;
    }

    if (target.type === "npc" || target.type === "furniture") {
      return NPC_INTERACTION_RANGE;
    }
    if (target.type === "chest") {
      return CHEST_INTERACTION_RANGE;
    }
    if (target.type === "pickup") {
      return PICKUP_RANGE;
    }
    if (target.type === "portal") {
      return PORTAL_INTERACTION_RANGE;
    }
    return 0;
  }

  updatePointerActionIndicator() {
    if (!this.pointerActionMarker || !this.pointerActionLabel || !this.pointerActionRangeRing) {
      return;
    }

    const target = this.pointerActionTarget;
    if (!target?.target || this.isPointerMovementBlocked()) {
      this.pointerActionMarker.setVisible(false);
      this.pointerActionLabel.setVisible(false);
      this.pointerActionRangeRing.setVisible(false);
      this.lastPointerActionTargetKey = null;
      return;
    }

    const { x, y } = target.target;
    const label = this.getPointerActionLabel(target);
    const visual = this.getPointerActionVisual(target);
    const markerY = y - 22;
    const markerDepth = y + 22;

    this.pointerActionMarker
      .setPosition(x, markerY)
      .setDepth(markerDepth)
      .setFillStyle(visual.fill, visual.alpha)
      .setStrokeStyle(2, visual.stroke, 0.9)
      .setVisible(true);

    if (label) {
      this.pointerActionLabel
        .setText(`${visual.icon} ${label}`)
        .setPosition(x, markerY - 20)
        .setDepth(markerDepth + 1)
        .setVisible(true);
    } else {
      this.pointerActionLabel.setVisible(false);
    }

    const interactionRange = this.getPointerActionRange(target);
    const distanceToTarget = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y);
    const progress = interactionRange > 0 ? Phaser.Math.Clamp(1 - distanceToTarget / interactionRange, 0, 1) : 0;
    const ringRadius = 9;
    this.pointerActionRangeRing
      .setPosition(x, markerY)
      .setDepth(markerDepth + 0.5)
      .setVisible(interactionRange > 0);
    this.pointerActionRangeRing.clear();
    if (interactionRange > 0) {
      this.pointerActionRangeRing.lineStyle(2, 0x133042, 0.35);
      this.pointerActionRangeRing.strokeCircle(0, 0, ringRadius);
      this.pointerActionRangeRing.lineStyle(3, visual.stroke, 0.95);
      this.pointerActionRangeRing.beginPath();
      this.pointerActionRangeRing.arc(0, 0, ringRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress, false);
      this.pointerActionRangeRing.strokePath();
    }

    const targetKey = this.getPointerActionTargetKey(target);
    if (targetKey && targetKey !== this.lastPointerActionTargetKey) {
      this.pulsePointerActionTarget();
    }
    this.lastPointerActionTargetKey = targetKey;
  }

  pulsePointerActionTarget() {
    if (!this.pointerActionMarker) {
      return;
    }

    this.tweens.killTweensOf(this.pointerActionMarker);
    this.pointerActionMarker.setScale(0.72).setAlpha(0.5);
    this.tweens.add({
      targets: this.pointerActionMarker,
      scale: 1.15,
      alpha: 0.22,
      duration: 240,
      yoyo: true,
      ease: "Sine.easeOut",
    });
  }

  getMovementInput() {
    const leftDown = this.controls.left.isDown || this.controls.cursors.left.isDown;
    const rightDown = this.controls.right.isDown || this.controls.cursors.right.isDown;
    const upDown = this.controls.up.isDown || this.controls.cursors.up.isDown;
    const downDown = this.controls.down.isDown || this.controls.cursors.down.isDown;
    const isSprinting = Boolean(this.controls.sprint?.isDown);

    const keyboardX = (rightDown ? 1 : 0) - (leftDown ? 1 : 0);
    const keyboardY = (downDown ? 1 : 0) - (upDown ? 1 : 0);
    const hasKeyboardInput = keyboardX !== 0 || keyboardY !== 0;

    if (hasKeyboardInput) {
      this.clearMovementTarget();
      this.pointerActionTarget = null;
      return {
        x: keyboardX,
        y: keyboardY,
        isSprinting,
      };
    }

    if (!this.movementTarget) {
      return {
        x: 0,
        y: 0,
        isSprinting: false,
      };
    }

    while (this.movementPath.length > 0) {
      const nextWaypoint = this.movementPath[0];
      const distanceToWaypoint = Phaser.Math.Distance.Between(this.player.x, this.player.y, nextWaypoint.x, nextWaypoint.y);
      if (distanceToWaypoint > 10) {
        break;
      }
      this.movementPath.shift();
    }

    const activeWaypoint = this.movementPath[0] ?? this.movementTarget;
    const deltaX = activeWaypoint.x - this.player.x;
    const deltaY = activeWaypoint.y - this.player.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance <= 10) {
      this.clearMovementTarget();
      return {
        x: 0,
        y: 0,
        isSprinting: false,
      };
    }

    return {
      x: deltaX / distance,
      y: deltaY / distance,
      isSprinting,
    };
  }

  findPointerActionTarget(worldX, worldY) {
    const clickRange = 34;
    const furnitureCandidates = this.homeEditMode
      ? []
      : this.homeFurniture.map((entry) => ({ type: "furniture", target: entry, x: entry.x, y: entry.y, logicalX: entry.logicalX, logicalY: entry.logicalY }));
    const candidates = [
      ...this.npcs.map((entry) => ({ type: "npc", target: entry, x: entry.x, y: entry.y, logicalX: entry.logicalX, logicalY: entry.logicalY })),
      ...furnitureCandidates,
      ...this.pickups
        .filter((entry) => !isPickupCollected(this.gameplayState.world, entry.id))
        .map((entry) => ({ type: "pickup", target: entry, x: entry.x, y: entry.y, logicalX: entry.logicalX, logicalY: entry.logicalY })),
      ...this.chests.filter((entry) => !entry.isOpened).map((entry) => ({ type: "chest", target: entry, x: entry.x, y: entry.y, logicalX: entry.logicalX, logicalY: entry.logicalY })),
      ...this.portals.map((entry) => ({ type: "portal", target: entry, x: entry.x, y: entry.y, logicalX: entry.x, logicalY: entry.y })),
    ];

    let bestCandidate = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    candidates.forEach((candidate) => {
      const distance = Phaser.Math.Distance.Between(worldX, worldY, candidate.x, candidate.y);
      if (distance <= clickRange && distance < bestDistance) {
        bestCandidate = candidate;
        bestDistance = distance;
      }
    });

    return bestCandidate;
  }

  tryResolvePointerActionTarget() {
    if (!this.pointerActionTarget || this.isPointerMovementBlocked()) {
      return;
    }

    if (this.pointerActionTarget.type === "npc") {
      const npc = this.pointerActionTarget.target;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (distance <= NPC_INTERACTION_RANGE) {
        this.pointerActionTarget = null;
        this.clearMovementTarget();
        this.openNpcDialog(npc);
      }
      return;
    }

    if (this.pointerActionTarget.type === "chest") {
      const chest = this.pointerActionTarget.target;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, chest.x, chest.y);
      if (distance <= CHEST_INTERACTION_RANGE) {
        this.pointerActionTarget = null;
        this.clearMovementTarget();
        this.tryOpenChest(chest);
      }
      return;
    }

    if (this.pointerActionTarget.type === "pickup") {
      const pickup = this.pointerActionTarget.target;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, pickup.x, pickup.y);
      if (distance <= PICKUP_RANGE) {
        this.pointerActionTarget = null;
        this.clearMovementTarget();
        if (!this.pendingPickupIds.has(pickup.id) && !isPickupCollected(this.gameplayState.world, pickup.id)) {
          this.multiplayerClient?.requestCollectPickup(pickup.id);
          this.markPending(this.pendingPickupIds, pickup.id);
        }
      }
      return;
    }

    if (this.pointerActionTarget.type === "furniture") {
      const furniture = this.pointerActionTarget.target;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, furniture.x, furniture.y);
      if (distance <= NPC_INTERACTION_RANGE) {
        this.pointerActionTarget = null;
        this.clearMovementTarget();
        this.handleFurnitureInteract(furniture);
      }
      return;
    }

    if (this.pointerActionTarget.type === "portal") {
      const portal = this.pointerActionTarget.target;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, portal.x, portal.y);
      if (distance <= PORTAL_INTERACTION_RANGE) {
        this.pointerActionTarget = null;
        this.clearMovementTarget();
        this.requestRoomChange(portal.targetRoomId);
      }
    }
  }

  syncLocalPlayer() {
    if (!this.multiplayerClient?.isConnected()) {
      return;
    }

    const now = this.time.now;
    const currentPosition = {
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      flipX: this.player.flipX,
    };

    const hasMoved =
      !this.lastSentPosition ||
      currentPosition.x !== this.lastSentPosition.x ||
      currentPosition.y !== this.lastSentPosition.y ||
      currentPosition.flipX !== this.lastSentPosition.flipX;

    if (!hasMoved || now - this.lastNetworkSyncAt < PLAYER_SYNC_INTERVAL) {
      return;
    }

    const inputSequence = this.nextInputSequence++;
    this.pendingMovementInputs.push({
      sequence: inputSequence,
      x: currentPosition.x,
      y: currentPosition.y,
      flipX: currentPosition.flipX,
    });
    if (this.pendingMovementInputs.length > LOCAL_PREDICTION_HISTORY_LIMIT) {
      this.pendingMovementInputs = this.pendingMovementInputs.slice(-LOCAL_PREDICTION_HISTORY_LIMIT);
    }

    this.multiplayerClient.sendMovement({
      ...currentPosition,
      inputSequence,
    });
    this.lastSentPosition = currentPosition;
    this.lastNetworkSyncAt = now;
  }

  playEmote(emoteId) {
    const emote = getEmoteDefinition(emoteId);
    if (!emote) {
      return;
    }

    this.multiplayerClient?.requestPlayEmote(emote.id);
    this.notify({ type: "info", message: `${emote.label} hazir` });
  }

  getNearestNpc() {
    return this.getNearestByRange(this.npcs, NPC_INTERACTION_RANGE);
  }

  getNearestChest() {
    return this.getNearestByRange(this.chests.filter((chest) => !chest.isOpened), CHEST_INTERACTION_RANGE);
  }

  getNearestPortal() {
    return this.getNearestByRange(this.portals, PORTAL_INTERACTION_RANGE);
  }

  getNearestFurniture() {
    if (this.localSeatedFurnitureId) {
      return this.homeFurniture.find((entry) => entry.placement.id === this.localSeatedFurnitureId) ?? null;
    }

    return this.getNearestByRange(this.homeFurniture, NPC_INTERACTION_RANGE);
  }

  getNearestByRange(entries, range) {
    let nearestEntry = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    entries.forEach((entry) => {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, entry.x, entry.y);

      if (distance <= range && distance < nearestDistance) {
        nearestEntry = entry;
        nearestDistance = distance;
      }
    });

    return nearestEntry;
  }

  handleFurnitureInteract(furniture) {
    if (!furniture?.placement?.id) {
      return;
    }

    const item = getItemDefinition(furniture.placement.itemId);
    const category = item?.category ?? "";

    if (["table", "plant", "decoration"].includes(category)) {
      this.showStatusToast(`${item?.label ?? "Esya"} dikkat cekiyor`);
    }

    this.multiplayerClient?.requestInteractFurniture(furniture.placement.id);
  }

  syncLocalFurnitureState() {
    const occupiedPlacement =
      this.roomHomeState?.placedFurniture?.find((entry) => entry?.interactionState?.occupiedByPlayerId === this.multiplayerSelfId) ?? null;

    this.localSeatedFurnitureId = occupiedPlacement?.id ?? null;

    if (occupiedPlacement) {
      const worldPosition = tileToWorld(occupiedPlacement.x, occupiedPlacement.y);
      this.player.setPosition(worldPosition.x, worldPosition.y + 8);
      this.player.body.reset(worldPosition.x, worldPosition.y + 8);
    }
  }

  openNpcDialog(npc) {
    this.multiplayerClient?.requestNpcTalk(npc.npcId);
    this.completeTutorialStep("npc-interaction");
    const payload = resolveNpcDialogueStart(npc, this.gameplayState.quest, this.dialogueState);
    rememberDialogueEntry(this.dialogueState, payload.entryId);
    const node = getDialogueNode(payload.tree, payload.nodeId, npc, this.gameplayState.quest, this.dialogueState);

    this.scene.launch(SCENE_KEYS.DIALOG, {
      speaker: payload.speaker,
      npcId: payload.npcId,
      tree: payload.tree,
      node,
      returnSceneKey: SCENE_KEYS.TOWN,
    });
    this.scene.pause();
  }

  handleDialogueChoice({ npcId, tree, currentNodeId, choice }) {
    const npc = this.npcs.find((entry) => entry.npcId === npcId);

    if (!npc || !choice) {
      return { close: true };
    }

    rememberDialogueChoice(this.dialogueState, choice.id);
    this.executeDialogueAction(choice.action, npc);

    if (choice.close || !choice.nextNodeId) {
      return { close: true };
    }

    const nextNode = getDialogueNode(tree, choice.nextNodeId, npc, this.gameplayState.quest, this.dialogueState);

    if (!nextNode) {
      return { close: true };
    }

    return {
      close: false,
      payload: {
        speaker: tree.speaker || npc.name,
        npcId,
        tree,
        node: nextNode,
        currentNodeId,
      },
    };
  }

  executeDialogueAction(action, npc) {
    if (!action?.type) {
      return;
    }

    if (action.type === "start-quest" && action.questId) {
      this.multiplayerClient?.requestStartQuest(action.questId);
      this.markPending(this.pendingQuestIds, action.questId);
      return;
    }

    if (action.type === "open-shop") {
      this.openShop(action.shopId ?? npc?.shopId ?? null);
      return;
    }

    if (action.type === "start-minigame" && action.miniGameId) {
      this.openMiniGame(action.miniGameId);
    }
  }

  openMiniGame(miniGameId) {
    const miniGame = getMiniGameDefinition(miniGameId);

    if (!miniGame || this.isMiniGameActive) {
      return;
    }

    this.closeShop();
    this.closeCosmeticsShop();
    this.playerProfilePanel.close();
    this.chatPanel.close();
    this.isMiniGameActive = true;
    this.showStatusToast(`${miniGame.title} aciliyor`);
    this.scene.launch(miniGame.sceneKey, {
      returnSceneKey: SCENE_KEYS.TOWN,
      miniGameId: miniGame.id,
    });
  }

  submitMiniGameScore(miniGameId, score) {
    this.multiplayerClient?.requestMiniGameScore(miniGameId, score);
  }

  handleMiniGameResult(payload) {
    const message = payload?.message ?? "Mini-game sonucu alindi";
    const miniGame = getMiniGameDefinition(payload?.miniGameId);

    if (payload?.ok) {
      this.showStatusToast(message);
    } else {
      this.showStatusToast(message);
    }

    if (!miniGame?.sceneKey) {
      return;
    }

    const miniGameScene = this.scene.get(miniGame.sceneKey);
    miniGameScene?.handleServerResult?.(payload);
  }

  handleMiniGameClosed() {
    this.isMiniGameActive = false;
  }

  openShop(shopId) {
    const shop = getShopById(shopId) ?? getShopByNpcId(this.activeNpc?.npcId);

    if (!shop) {
      this.showStatusToast("Magaza verisi bulunamadi");
      return;
    }

    this.activeShop = shop;
    this.shopPanel.update(shop, this.gameplayState.inventory, this.gameplayState.cosmetics, this.shopSessionState.buybackItems);
    this.shopPanel.setFeedback("");
    this.shopPanel.setVisible(true);
    this.cosmeticsShopPanel.setVisible(false);
  }

  closeShop() {
    this.activeShop = null;
    this.shopPanel.setVisible(false);
    this.shopPanel.setFeedback("");
  }

  closeCosmeticsShop() {
    this.activeShop = null;
    this.cosmeticsShopPanel.setVisible(false);
    this.cosmeticsShopPanel.setFeedback("");
  }

  buyShopItem(shopItem) {
    if (!this.activeShop || !shopItem) {
      return;
    }

    if (getItemCount(this.gameplayState.inventory, "coin") < shopItem.price) {
      this.shopPanel.setFeedback("Yetersiz coin", true);
      this.showStatusToast("Yetersiz coin");
      return;
    }

    this.shopPanel.setFeedback(`${shopItem.label} satin aliniyor...`);
    this.multiplayerClient?.requestPurchase(this.activeShop.id, shopItem.id);
  }

  sellShopItem(inventoryEntry, quantity = 1) {
    if (!this.activeShop || !inventoryEntry?.itemId) {
      return;
    }

    this.shopPanel.setFeedback(`${inventoryEntry.label} satiliyor...`);
    this.multiplayerClient?.requestSell(this.activeShop.id, inventoryEntry.itemId, quantity);
  }

  buybackShopItem(buybackEntry) {
    if (!this.activeShop || !buybackEntry?.id) {
      return;
    }

    const totalPrice = Number(buybackEntry.unitPrice ?? 0) * Number(buybackEntry.quantity ?? 0);

    if (getItemCount(this.gameplayState.inventory, "coin") < totalPrice) {
      this.shopPanel.setFeedback("Yetersiz coin", true);
      this.showStatusToast("Yetersiz coin");
      return;
    }

    this.shopPanel.setFeedback(`${buybackEntry.label} geri aliniyor...`);
    this.multiplayerClient?.requestBuyback(this.activeShop.id, buybackEntry.id);
  }

  buyCosmeticShopItem(shopItem) {
    if (!this.activeShop || !shopItem) {
      return;
    }

    if (getItemCount(this.gameplayState.inventory, "coin") < shopItem.price) {
      this.cosmeticsShopPanel.setFeedback("Yetersiz coin", true);
      this.showStatusToast("Yetersiz coin");
      return;
    }

    this.cosmeticsShopPanel.setFeedback(`${shopItem.label} satin aliniyor...`);
    this.multiplayerClient?.requestPurchase(this.activeShop.id, shopItem.id);
  }

  craftRecipe(recipe) {
    if (!recipe?.id) {
      return;
    }

    if (getItemCount(this.gameplayState.inventory, "coin") < Number(recipe.coinCost ?? 0)) {
      this.craftingPanel.setFeedback("Yetersiz coin", true);
      this.showStatusToast("Yetersiz coin");
      return;
    }

    const hasRequirements = (recipe.requirements ?? []).every((entry) => getItemCount(this.gameplayState.inventory, entry.itemId) >= entry.amount);

    if (!hasRequirements) {
      this.craftingPanel.setFeedback("Malzemeler eksik", true);
      this.showStatusToast("Malzemeler eksik");
      return;
    }

    this.craftingPanel.setFeedback(`${recipe.title} uretiliyor...`, false);
    this.multiplayerClient?.requestCraft(recipe.id);
  }

  handlePurchaseResult(payload) {
    if (!payload) {
      return;
    }

    if (!payload.ok) {
      const message = this.getPurchaseFeedbackText(payload.code);
      this.shopPanel.setFeedback(message, true);
      this.notify({ type: "error", message });
      return;
    }

    const message = payload.kind === "cosmetic" ? `${payload.label} kozmetigi alindi` : `${payload.label} satin alindi`;
    this.shopPanel.setFeedback(message, false);
    this.notify({ type: "success", message });
    if (this.activeShop?.id === "moon-cafe-counter") {
      this.completeTutorialStep("shop-interaction");
    }

    if (this.activeShop) {
      this.shopPanel.update(this.activeShop, this.gameplayState.inventory, this.gameplayState.cosmetics, this.shopSessionState.buybackItems);
    }
  }

  handleSellResult(payload) {
    if (!payload) {
      return;
    }

    if (!payload.ok) {
      const message = this.getShopTransactionFeedbackText(payload.code);
      this.shopPanel.setFeedback(message, true);
      this.notify({ type: "error", message });
      return;
    }

    const message = `${payload.label} satildi (+${payload.price} coin)`;
    this.shopPanel.setFeedback(message, false);
    this.notify({ type: "success", message });

    if (this.activeShop) {
      this.shopPanel.update(this.activeShop, this.gameplayState.inventory, this.gameplayState.cosmetics, this.shopSessionState.buybackItems);
    }
  }

  handleBuybackResult(payload) {
    if (!payload) {
      return;
    }

    if (!payload.ok) {
      const message = this.getShopTransactionFeedbackText(payload.code);
      this.shopPanel.setFeedback(message, true);
      this.notify({ type: "error", message });
      return;
    }

    const message = `${payload.label} geri alindi`;
    this.shopPanel.setFeedback(message, false);
    this.notify({ type: "success", message });

    if (this.activeShop) {
      this.shopPanel.update(this.activeShop, this.gameplayState.inventory, this.gameplayState.cosmetics, this.shopSessionState.buybackItems);
    }
  }

  handleCraftResult(payload) {
    if (!payload) {
      return;
    }

    if (!payload.ok) {
      const message = this.getCraftFeedbackText(payload.code);
      this.craftingPanel.setFeedback(message, true);
      this.notify({ type: "error", message });
      return;
    }

    const fallbackRecipe = CRAFTING_RECIPES.find((entry) => entry.id === payload.recipeId) ?? null;
    const title = payload.title ?? fallbackRecipe?.title ?? "Craft";
    const craftedItems = (payload.outputs ?? []).map((entry) => `${entry.amount}x ${entry.label}`).join(", ");
    const message = craftedItems ? `${title} hazir: ${craftedItems}` : `${title} hazir`;
    this.craftingPanel.setFeedback(message, false);
    this.notify({ type: "success", message });
  }

  showSpeechBubbleForMessage(message) {
    if (!message || message.kind === "system") {
      return;
    }

    if (message.playerId === this.multiplayerSelfId) {
      this.player.showSpeechBubble(message.text);
      return;
    }

    const remotePlayer = this.remotePlayers.get(message.playerId);
    remotePlayer?.showSpeechBubble(message.text);
  }

  getTutorialSteps() {
    return {
      movement: {
        title: "Hareket Et",
        body: "WASD ile biraz yuru. Karakterini hareket ettirince rehber bir sonraki adima gececek.",
      },
      "npc-interaction": {
        title: "Bir NPC ile Konus",
        body: "Mira'ya yaklas ve E ile konus. Uzerindeki mavi isaret seni yonlendiriyor.",
      },
      "first-quest": {
        title: "Ilk Gorevini Bitir",
        body: this.gameplayState.quest.activeQuest
          ? "Aktif gorevi takip et. Marker ve mini harita seni cesmeye goturecek, odul de hemen gelecek."
          : "Mira ile tekrar konusup ilk gorevini al. Gorev tamamlaninca coin ve XP kazanacaksin.",
      },
      "collect-item": {
        title: "Yerdeki Bir Esyayi Topla",
        body: "Kasabada parlak pickup'lar var. Yakinina gidince otomatik toplanir ve odul popup'i gorursun.",
      },
      "room-transition": {
        title: "Moon Cafe'ye Ugra",
        body: "Town'daki Cafe kapisina git ve E ile gec. Yeni bir oda gormek sosyal akisi daha hizli ogretir.",
      },
      "shop-interaction": {
        title: "Baris'tan Bir Kahve Al",
        body: "Cafe icinde Baris ile konus ve tezgahindan bir kahve al. Bu ilk shop anini hizlica gosterecek.",
      },
      inventory: {
        title: "Envanteri Ac",
        body: "I tusuna basip envanter panelini ac. Coin ve itemlerini burada goreceksin.",
      },
      chat: {
        title: "Sohbete Katil",
        body: "Enter ile chat'i ac ve kisa bir mesaj gonder. Tam mesaj chat panelinde kalir.",
      },
    };
  }

  isTutorialActive() {
    return !this.tutorialState?.isCompleted && !this.tutorialState?.isSkipped;
  }

  getCurrentTutorialStepId() {
    return getNextTutorialStepId(this.tutorialState);
  }

  refreshTutorialUi() {
    if (!this.isTutorialActive() || this.photoMode?.isHudHidden) {
      this.tutorialOverlay?.hide();
      this.tutorialMarker?.setVisible(false);
      return;
    }

    const stepId = this.getCurrentTutorialStepId();
    const step = stepId ? this.getTutorialSteps()[stepId] : null;
    const completedCount = this.tutorialState?.completedStepIds?.length ?? 0;

    const totalSteps = Object.keys(this.getTutorialSteps()).length;
    this.tutorialOverlay?.show(step, `Adim ${Math.min(completedCount + 1, totalSteps)}/${totalSteps}`);
    this.updateTutorialMarker(stepId);
  }

  updateTutorialMarker(stepId = this.getCurrentTutorialStepId()) {
    if (!stepId || !this.tutorialMarker) {
      this.tutorialMarker?.setVisible(false);
      return;
    }

    if (stepId === "npc-interaction" || (stepId === "first-quest" && !this.gameplayState.quest.activeQuest)) {
      const miraNpc = this.npcs?.find((entry) => entry.npcId === "mira") ?? null;
      if (miraNpc) {
        this.tutorialMarker.setPosition(miraNpc.x, miraNpc.y - 54).setDepth(miraNpc.y + 30).setVisible(true);
        return;
      }
    }

    if (stepId === "collect-item") {
      const pickup = this.pickups?.find((entry) => !isPickupCollected(this.gameplayState.world, entry.id)) ?? null;
      if (pickup) {
        this.tutorialMarker.setPosition(pickup.x, pickup.y - 28).setDepth(pickup.y + 20).setVisible(true);
        return;
      }
    }

    if (stepId === "room-transition") {
      const cafePortal = this.portals?.find((entry) => entry.targetRoomId === "cafe") ?? null;
      if (cafePortal) {
        this.tutorialMarker.setPosition(cafePortal.x, cafePortal.y - 36).setDepth(cafePortal.y + 20).setVisible(true);
        return;
      }
    }

    if (stepId === "shop-interaction") {
      const barisNpc = this.npcs?.find((entry) => entry.npcId === "baris") ?? null;
      if (barisNpc) {
        this.tutorialMarker.setPosition(barisNpc.x, barisNpc.y - 54).setDepth(barisNpc.y + 30).setVisible(true);
        return;
      }
    }

    this.tutorialMarker.setVisible(false);
  }

  updateTutorialMovementProgress() {
    if (!this.isTutorialActive() || isTutorialStepComplete(this.tutorialState, "movement")) {
      this.lastTutorialPosition = { x: this.player.x, y: this.player.y };
      return;
    }

    if (!this.lastTutorialPosition) {
      this.lastTutorialPosition = { x: this.player.x, y: this.player.y };
      return;
    }

    this.tutorialMovementDistance += Phaser.Math.Distance.Between(
      this.lastTutorialPosition.x,
      this.lastTutorialPosition.y,
      this.player.x,
      this.player.y,
    );
    this.lastTutorialPosition = { x: this.player.x, y: this.player.y };

    if (this.tutorialMovementDistance >= 96) {
      this.completeTutorialStep("movement");
    }
  }

  completeTutorialStep(stepId) {
    if (!this.isTutorialActive() || isTutorialStepComplete(this.tutorialState, stepId)) {
      return;
    }

    const completedStepIds = [...new Set([...(this.tutorialState?.completedStepIds ?? []), stepId])];
    this.tutorialState = normalizeTutorialState({
      ...this.tutorialState,
      completedStepIds,
      isCompleted: completedStepIds.length >= Object.keys(this.getTutorialSteps()).length,
      completedAt:
        completedStepIds.length >= Object.keys(this.getTutorialSteps()).length ? Date.now() : this.tutorialState?.completedAt ?? null,
    });
    this.multiplayerClient?.requestTutorialUpdate({ completedStepId: stepId });

    const messages = {
      movement: "Hareket tamam. Simdi Mira ile konus.",
      "npc-interaction": "Guzel. Simdi ilk gorevini tamamla.",
      "first-quest": "Harika. Simdi yerdeki bir esyayi topla.",
      "collect-item": "Toplama tamam. Simdi Moon Cafe'ye ugrayip oda gecisi yap.",
      "room-transition": "Yeni oda gordun. Simdi Baris'tan bir kahve al.",
      "shop-interaction": "Guzel. Simdi envanteri acip yeni esyani gor.",
      inventory: "Envanter tamam. Simdi chat'e bir mesaj gonder.",
      chat: "Onboarding tamamlandi. Artik kasabayi ozgurce kesfedebilirsin.",
    };
    this.notify({ type: "success", message: messages[stepId] ?? "Tutorial ilerledi." });
    this.refreshTutorialUi();
  }

  skipTutorial() {
    if (!this.isTutorialActive()) {
      return;
    }

    this.tutorialState = normalizeTutorialState({
      ...this.tutorialState,
      isSkipped: true,
      skippedAt: Date.now(),
    });
    this.multiplayerClient?.requestTutorialUpdate({ skipped: true });
    this.notify({ type: "info", message: "Rehber atlandi. Istedigin zaman NPC'lerle ilerleyebilirsin." });
    this.refreshTutorialUi();
  }

  showRewardDeltaPopup(rawGameplayState, { previousLevel = 1, previousXp = 0, latestCompletedQuestId = null, previousInventory } = {}) {
    if (!this.hasReceivedGameplayState) {
      return;
    }

    const nextInventory = normalizeInventoryState(rawGameplayState?.inventory);
    const coinDelta = getItemCount(nextInventory, "coin") - getItemCount(previousInventory, "coin");
    const xpDelta = Math.max(0, Number(rawGameplayState?.progression?.xp ?? 0) - previousXp);
    const rewardParts = [];

    if (coinDelta > 0) {
      rewardParts.push(`+${coinDelta} coin`);
    }

    if (xpDelta > 0) {
      rewardParts.push(`+${xpDelta} XP`);
    }

    const inventoryEntries = getInventoryEntries(nextInventory);
    const gainedItems = inventoryEntries
      .map((entry) => {
        const previousCount = getItemCount(previousInventory, entry.itemId);
        const delta = entry.amount - previousCount;
        return delta > 0 && entry.itemId !== "coin" ? `${entry.label} x${delta}` : null;
      })
      .filter(Boolean)
      .slice(0, 2);

    if (gainedItems.length) {
      rewardParts.push(...gainedItems);
    }

    if (!rewardParts.length && Number(rawGameplayState?.progression?.level ?? previousLevel) <= previousLevel) {
      return;
    }

    const prefix = latestCompletedQuestId
      ? `${getQuestDefinition(latestCompletedQuestId)?.title ?? "Gorev"} odulu`
      : coinDelta > 0 || gainedItems.length
        ? "Yeni kazanc"
        : "Ilerleme";

    this.rewardPopup?.show(`${prefix}\n${rewardParts.join(" | ") || `Level ${rawGameplayState?.progression?.level ?? previousLevel}`}`);
  }

  collectNearbyPickups() {
    const worldState = this.gameplayState.world;

    this.pickups.forEach((pickup) => {
      if (this.pendingPickupIds.has(pickup.id) || isPickupCollected(worldState, pickup.id)) {
        return;
      }

      const isNear = Phaser.Math.Distance.Between(this.player.x, this.player.y, pickup.x, pickup.y) <= PICKUP_RANGE;

      if (!isNear) {
        return;
      }

      this.multiplayerClient?.requestCollectPickup(pickup.id);
      this.markPending(this.pendingPickupIds, pickup.id);
    });
  }

  tryOpenChest(chest) {
    if (this.pendingChestIds.has(chest.id) || chest.isOpened) {
      return;
    }

    if (!hasEnoughItems(this.gameplayState.inventory, "key") && chest.id === "chest-workshop") {
      this.showStatusToast("Sandik icin bir anahtar gerekiyor");
      return;
    }

    this.multiplayerClient?.requestOpenChest(chest.id);
    this.markPending(this.pendingChestIds, chest.id);
  }

  requestRoomChange(targetRoomId) {
    if (!this.multiplayerClient || this.pendingRoomChange || targetRoomId === this.currentRoomId) {
      return;
    }

    this.closeShop();
    this.closeCosmeticsShop();
    this.pendingRoomChange = true;
    this.multiplayerClient.requestRoomChange(targetRoomId);
    this.time.delayedCall(800, () => {
      this.pendingRoomChange = false;
    });
  }

  visitPlayerHome(ownerUserId) {
    if (!this.multiplayerClient || !ownerUserId || this.pendingRoomChange) {
      return;
    }

    this.closeShop();
    this.closeCosmeticsShop();
    this.playerProfilePanel.close();
    this.pendingRoomChange = true;
    this.multiplayerClient.requestVisitHome(ownerUserId);
    this.showStatusToast("Ev ziyareti baslatiliyor...");
    this.time.delayedCall(800, () => {
      this.pendingRoomChange = false;
    });
  }

  refreshQuestHud() {
    const inventoryState = this.gameplayState.inventory;
    const questState = this.gameplayState.quest;
    const progressionState = this.gameplayState.progression;

    this.coinText.setText(`Coin: ${getItemCount(inventoryState, "coin")}`);
    this.levelHudText.setText(`Level ${progressionState.level}`);
    this.xpBarFill.width = Math.round(264 * Number(progressionState.progressRatio ?? 0));
    this.xpBarText.setText(getXpProgressText(progressionState));
    this.progressHintText.setText(
      this.isTutorialActive()
        ? {
            movement: "Ilk adim: biraz yuru ve kasabayi hisset.",
            "npc-interaction": "Mira ile konus. Ilk gorev oradan basliyor.",
            "first-quest": "Meydan gorevi erken coin ve XP verir.",
            "collect-item": "Parlak pickup'lar erken envanter hissi verir.",
            "room-transition": "Cafe'ye ugrarsan oda gecisini hizlica gorursun.",
            "shop-interaction": "Baris'in tezgahi ilk satin alma anini gosterir.",
            inventory: "Envanterde coin, anahtar ve kutulari takip et.",
            chat: "Kisa bir mesaj sosyal hissi hemen gosterir.",
          }[this.getCurrentTutorialStepId()] ??
          "Adim adim ilerle; kasaba seni yonlendiriyor."
        : progressionState.nextLevelXp === null
          ? "Tum seviyeler acildi."
          : progressionState.nextUnlockLevel
            ? `Sonraki acilim Lv.${progressionState.nextUnlockLevel}: ${progressionState.nextUnlockLabel}`
            : "XP gorev, pickup ve sandiklardan gelir.",
    );

    if (questState.activeQuest) {
      const progressText = this.getQuestProgressText(questState.activeQuest);
      const objectiveLabels = (questState.activeQuest.objectives ?? [questState.activeQuest.objective])
        .map((objective) => objective?.targetLabel ?? "-")
        .join(" | ");
      this.questBodyText.setText(
        `${questState.activeQuest.title}\n${questState.activeQuest.description}\nHedef: ${objectiveLabels}\nIlerleme: ${progressText}\nOdul: ${this.getQuestRewardText(questState.activeQuest)}`,
      );
      return;
    }

    this.questBodyText.setText("Aktif gorev yok.\nHaritadaki NPC'lerle konusup yeni gorevler al.");
  }

  isQuestObjectiveComplete(objective, activeQuest) {
    if (!objective) {
      return true;
    }

    if (objective.type === "collect-item") {
      return getItemCount(this.gameplayState.inventory, objective.itemId) >= objective.targetAmount;
    }

    if (objective.type === "open-chest") {
      return isChestOpened(this.gameplayState.world, objective.chestId);
    }

    if (objective.type === "talk-to-npc") {
      return (activeQuest?.talkedNpcIds ?? []).includes(objective.npcId);
    }

    if (objective.type === "go-to-location") {
      if (this.currentRoomBaseId !== objective.roomId || !objective.position) {
        return false;
      }
      return Phaser.Math.Distance.Between(this.player.x, this.player.y, objective.position.x, objective.position.y) <= QUEST_TARGET_RANGE;
    }

    return false;
  }

  getObjectiveRoomId(objective) {
    if (!objective) {
      return null;
    }

    if (objective.roomId) {
      return objective.roomId;
    }

    if (objective.type === "talk-to-npc") {
      return findRoomByNpcId(objective.npcId)?.id ?? null;
    }

    if (objective.type === "open-chest") {
      return findRoomByChestId(objective.chestId)?.id ?? null;
    }

    if (objective.type === "collect-item") {
      return findRoomByPickupItemId(objective.itemId, (pickup) => !isPickupCollected(this.gameplayState.world, pickup.id))?.id ?? null;
    }

    return null;
  }

  getGuidancePortal(targetRoomId) {
    if (!targetRoomId || !Array.isArray(this.portals)) {
      return null;
    }

    const directPortal = this.portals.find((portal) => portal.targetRoomId === targetRoomId);
    if (directPortal) {
      return directPortal;
    }

    if (this.currentRoomBaseId !== "town") {
      return this.portals.find((portal) => portal.targetRoomId === "town") ?? null;
    }

    return null;
  }

  getPrimaryQuestGuidance() {
    const activeQuest = this.gameplayState.quest.activeQuest;
    if (!activeQuest) {
      return null;
    }

    const objective = (activeQuest.objectives ?? [activeQuest.objective]).find((entry) => !this.isQuestObjectiveComplete(entry, activeQuest)) ?? null;
    if (!objective) {
      return null;
    }

    const targetRoomId = this.getObjectiveRoomId(objective);
    if (targetRoomId && targetRoomId !== this.currentRoomBaseId) {
      const portal = this.getGuidancePortal(targetRoomId);
      return {
        label: objective.targetLabel ?? "Hedef",
        description: `${getRoomDefinition(targetRoomId).name} odasina git`,
        markerPosition: portal ? { x: portal.x, y: portal.y - 40, depth: portal.y + 40 } : null,
        minimapTarget: portal ? { x: portal.x, y: portal.y } : null,
      };
    }

    if (objective.type === "talk-to-npc") {
      const npc = this.npcs.find((entry) => entry.npcId === objective.npcId);
      return npc
        ? {
            label: objective.targetLabel ?? npc.name,
            description: `${npc.name} ile konus`,
            markerPosition: { x: npc.x, y: npc.y - 52, depth: npc.y + 50 },
            minimapTarget: { x: npc.x, y: npc.y },
          }
        : null;
    }

    if (objective.type === "open-chest") {
      const chest = this.chests.find((entry) => entry.id === objective.chestId && !entry.isOpened);
      return chest
        ? {
            label: objective.targetLabel ?? "Sandik",
            description: "Sandigi ac",
            markerPosition: { x: chest.x, y: chest.y - 34, depth: chest.y + 30 },
            minimapTarget: { x: chest.x, y: chest.y },
          }
        : null;
    }

    if (objective.type === "collect-item") {
      const candidates = this.pickups.filter(
        (entry) => entry.itemId === objective.itemId && !isPickupCollected(this.gameplayState.world, entry.id),
      );
      const nearest = candidates.sort(
        (left, right) =>
          Phaser.Math.Distance.Between(this.player.x, this.player.y, left.x, left.y) -
          Phaser.Math.Distance.Between(this.player.x, this.player.y, right.x, right.y),
      )[0];

      return nearest
        ? {
            label: objective.targetLabel ?? nearest.label,
            description: `${objective.targetAmount} adet topla`,
            markerPosition: { x: nearest.x, y: nearest.y - 34, depth: nearest.y + 30 },
            minimapTarget: { x: nearest.x, y: nearest.y },
          }
        : null;
    }

    if (objective.type === "go-to-location" && objective.position) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, objective.position.x, objective.position.y);
      return {
        label: objective.targetLabel ?? "Konum",
        description: distance <= QUEST_TARGET_RANGE ? "Hedefe ulastin" : `${Math.round(distance)} birim uzakta`,
        markerPosition: { x: objective.position.x, y: objective.position.y, depth: objective.position.y + 2 },
        minimapTarget: { x: objective.position.x, y: objective.position.y },
      };
    }

    return null;
  }

  updateQuestGuidanceMinimap(guidance) {
    this.questGuideMinimap.clear();

    const mapX = 212;
    const mapY = 260;
    const mapWidth = 116;
    const mapHeight = 92;
    this.questGuideMinimap.fillStyle(0x0f2030, 0.92);
    this.questGuideMinimap.fillRoundedRect(mapX, mapY, mapWidth, mapHeight, 12);
    this.questGuideMinimap.lineStyle(2, 0x9bd3ff, 0.24);
    this.questGuideMinimap.strokeRoundedRect(mapX, mapY, mapWidth, mapHeight, 12);

    if (!this.roomMap) {
      return;
    }

    const playerDotX = mapX + Phaser.Math.Clamp((this.player.x / this.roomMap.worldWidth) * mapWidth, 8, mapWidth - 8);
    const playerDotY = mapY + Phaser.Math.Clamp((this.player.y / this.roomMap.worldHeight) * mapHeight, 8, mapHeight - 8);
    this.questGuideMinimap.fillStyle(0xfff4db, 0.95);
    this.questGuideMinimap.fillCircle(playerDotX, playerDotY, 4);

    if (!guidance?.minimapTarget) {
      return;
    }

    const targetDotX = mapX + Phaser.Math.Clamp((guidance.minimapTarget.x / this.roomMap.worldWidth) * mapWidth, 8, mapWidth - 8);
    const targetDotY = mapY + Phaser.Math.Clamp((guidance.minimapTarget.y / this.roomMap.worldHeight) * mapHeight, 8, mapHeight - 8);
    this.questGuideMinimap.lineStyle(2, 0xffd166, 0.42);
    this.questGuideMinimap.strokeCircle(targetDotX, targetDotY, 7);
    this.questGuideMinimap.fillStyle(0xffd166, 0.95);
    this.questGuideMinimap.fillCircle(targetDotX, targetDotY, 3);
  }

  updateQuestMarker() {
    const guidance = this.getPrimaryQuestGuidance();

    if (!guidance?.markerPosition) {
      this.questMarker.setVisible(false);
      this.questGuideHintText.setText(this.gameplayState.quest.activeQuest ? "Bu hedef icin yonlendirme bulunamadi." : "Aktif gorev hedefi burada gorunecek.");
      this.updateQuestGuidanceMinimap(null);
      return;
    }

    this.questMarker.setPosition(guidance.markerPosition.x, guidance.markerPosition.y);
    this.questMarker.setVisible(true);
    this.questMarker.setDepth(guidance.markerPosition.depth);
    this.questGuideHintText.setText(`${guidance.label}\n${guidance.description}`);
    this.updateQuestGuidanceMinimap(guidance);
  }

  notify({ type = "info", message, duration } = {}) {
    this.notificationCenter?.push({
      type,
      message,
      duration,
    });
    this.audioManager?.playUiTone(type === "error" ? "soft" : "confirm");
  }

  showStatusToast(message, type = "info") {
    this.notify({ type, message });
  }

  refreshInventoryUi() {
    this.inventoryPanel.update(getInventoryEntries(this.gameplayState.inventory));
    this.achievementsPanel.update(this.gameplayState.achievements);
    this.badgesPanel.update(this.gameplayState.badges);
    this.dailyQuestsPanel.update(this.gameplayState.dailyQuests);
    this.weeklyTasksPanel.update(this.gameplayState.weeklyTasks);
    this.craftingPanel.update(this.gameplayState.inventory);
    this.coinText.setText(`Coin: ${getItemCount(this.gameplayState.inventory, "coin")}`);

    if (this.activeShop) {
      this.shopPanel.update(this.activeShop, this.gameplayState.inventory, this.gameplayState.cosmetics, this.shopSessionState.buybackItems);
    }

      this.wardrobePanel.update(this.gameplayState.cosmetics);
      this.friendsPanel.update(this.gameplayState.friends, this.homeState);
      this.friendsPanel.updateDirectMessages(this.directMessagesState);
      this.friendsPanel.setHomeAccess(this.homeState?.access?.isPublic);
      this.friendsPanel.setStatusValue(this.player.statusText ?? "");
    this.mailboxPanel.update(this.gameplayState.mailbox, this.gameplayState.friends, getInventoryEntries(this.gameplayState.inventory));
    if (this.tradeState && this.tradePanel?.isVisible()) {
      this.tradePanel.update(this.tradeState, getInventoryEntries(this.gameplayState.inventory), this.multiplayerSelfId);
    }
    if (this.partyPanel?.isVisible()) {
      this.partyPanel.update(this.partyState, this.multiplayerSelfId);
    }
    this.audioPanel.update(this.audioSettings);
    this.refreshHomeEditorUi();
  }

  toggleInventory() {
    this.isInventoryOpen = !this.isInventoryOpen;
    if (this.isInventoryOpen) {
      this.achievementsPanel.close();
      this.badgesPanel.close();
      this.dailyQuestsPanel.close();
      this.weeklyTasksPanel.close();
      this.craftingPanel.close();
      this.audioPanel.close();
      this.friendsPanel.close();
      this.playerProfilePanel.close();
      this.wardrobePanel.setVisible(false);
      this.completeTutorialStep("inventory");
    }
    this.inventoryPanel.setVisible(this.isInventoryOpen);
    this.refreshInventoryUi();
  }

  toggleFriendsPanel() {
    const nextVisible = !this.friendsPanel.isVisible();

    if (nextVisible) {
      this.isInventoryOpen = false;
      this.inventoryPanel.setVisible(false);
      this.achievementsPanel.close();
      this.badgesPanel.close();
      this.dailyQuestsPanel.close();
      this.weeklyTasksPanel.close();
      this.craftingPanel.close();
      this.audioPanel.close();
      this.wardrobePanel.setVisible(false);
      this.playerProfilePanel.close();
      this.friendsPanel.open();
    } else {
      this.friendsPanel.close();
    }

    this.friendsPanel.update(this.gameplayState.friends, this.homeState);
  }

  toggleMailboxPanel() {
    const nextVisible = !this.mailboxPanel.isVisible();

    if (nextVisible) {
      this.isInventoryOpen = false;
      this.inventoryPanel.setVisible(false);
      this.achievementsPanel.close();
      this.badgesPanel.close();
      this.dailyQuestsPanel.close();
      this.weeklyTasksPanel.close();
      this.craftingPanel.close();
      this.audioPanel.close();
      this.friendsPanel.close();
      this.playerProfilePanel.close();
      this.wardrobePanel.setVisible(false);
      this.mailboxPanel.open();
    } else {
      this.mailboxPanel.close();
    }

    this.mailboxPanel.update(this.gameplayState.mailbox, this.gameplayState.friends, getInventoryEntries(this.gameplayState.inventory));
  }

  togglePartyPanel() {
    const nextVisible = !this.partyPanel.isVisible();

    if (nextVisible) {
      this.partyPanel.open();
    } else {
      this.partyPanel.close();
    }

    this.partyPanel.update(this.partyState, this.multiplayerSelfId);
  }

  refreshPartyPresentation() {
    const partyMemberIds = new Set((this.partyState?.members ?? []).map((entry) => entry.playerId));
    this.nameLabel.setPartyMember(partyMemberIds.has(this.multiplayerSelfId));
    this.remotePlayers.forEach((remotePlayer, playerId) => {
      remotePlayer.setPartyMember(partyMemberIds.has(playerId));
    });
  }

  toggleAchievementsPanel() {
    const nextVisible = !this.achievementsPanel.isVisible();

    if (nextVisible) {
      this.isInventoryOpen = false;
      this.inventoryPanel.setVisible(false);
      this.friendsPanel.close();
      this.badgesPanel.close();
      this.dailyQuestsPanel.close();
      this.weeklyTasksPanel.close();
      this.craftingPanel.close();
      this.audioPanel.close();
      this.playerProfilePanel.close();
      this.wardrobePanel.setVisible(false);
      this.achievementsPanel.open();
    } else {
      this.achievementsPanel.close();
    }

    this.achievementsPanel.update(this.gameplayState.achievements);
  }

  toggleBadgesPanel() {
    const nextVisible = !this.badgesPanel.isVisible();

    if (nextVisible) {
      this.isInventoryOpen = false;
      this.inventoryPanel.setVisible(false);
      this.achievementsPanel.close();
      this.dailyQuestsPanel.close();
      this.weeklyTasksPanel.close();
      this.craftingPanel.close();
      this.audioPanel.close();
      this.friendsPanel.close();
      this.playerProfilePanel.close();
      this.wardrobePanel.setVisible(false);
      this.badgesPanel.open();
    } else {
      this.badgesPanel.close();
    }

    this.badgesPanel.update(this.gameplayState.badges);
  }

  toggleDailyQuestsPanel() {
    const nextVisible = !this.dailyQuestsPanel.isVisible();

    if (nextVisible) {
      this.isInventoryOpen = false;
      this.inventoryPanel.setVisible(false);
      this.achievementsPanel.close();
      this.badgesPanel.close();
      this.weeklyTasksPanel.close();
      this.craftingPanel.close();
      this.audioPanel.close();
      this.friendsPanel.close();
      this.playerProfilePanel.close();
      this.wardrobePanel.setVisible(false);
      this.dailyQuestsPanel.open();
    } else {
      this.dailyQuestsPanel.close();
    }

    this.dailyQuestsPanel.update(this.gameplayState.dailyQuests);
  }

  toggleWeeklyTasksPanel() {
    const nextVisible = !this.weeklyTasksPanel.isVisible();

    if (nextVisible) {
      this.isInventoryOpen = false;
      this.inventoryPanel.setVisible(false);
      this.achievementsPanel.close();
      this.badgesPanel.close();
      this.dailyQuestsPanel.close();
      this.craftingPanel.close();
      this.audioPanel.close();
      this.friendsPanel.close();
      this.playerProfilePanel.close();
      this.wardrobePanel.setVisible(false);
      this.weeklyTasksPanel.open();
    } else {
      this.weeklyTasksPanel.close();
    }

    this.weeklyTasksPanel.update(this.gameplayState.weeklyTasks);
  }

  toggleWardrobe() {
    const nextVisible = !this.wardrobePanel.isVisible();
    if (nextVisible) {
      this.isInventoryOpen = false;
      this.inventoryPanel.setVisible(false);
      this.achievementsPanel.close();
      this.badgesPanel.close();
      this.dailyQuestsPanel.close();
      this.weeklyTasksPanel.close();
      this.craftingPanel.close();
      this.audioPanel.close();
      this.friendsPanel.close();
      this.playerProfilePanel.close();
    }
    this.wardrobePanel.setVisible(nextVisible);
    this.wardrobePanel.update(this.gameplayState.cosmetics);
  }

  toggleCraftingPanel() {
    const nextVisible = !this.craftingPanel.isVisible();

    if (nextVisible) {
      this.isInventoryOpen = false;
      this.inventoryPanel.setVisible(false);
      this.achievementsPanel.close();
      this.badgesPanel.close();
      this.dailyQuestsPanel.close();
      this.weeklyTasksPanel.close();
      this.friendsPanel.close();
      this.playerProfilePanel.close();
      this.wardrobePanel.setVisible(false);
      this.audioPanel.close();
      this.craftingPanel.open();
    } else {
      this.craftingPanel.close();
    }

    this.craftingPanel.update(this.gameplayState.inventory);
  }

  toggleAudioPanel() {
    const nextVisible = !this.audioPanel.isVisible();

    if (nextVisible) {
      this.isInventoryOpen = false;
      this.inventoryPanel.setVisible(false);
      this.achievementsPanel.close();
      this.badgesPanel.close();
      this.dailyQuestsPanel.close();
      this.weeklyTasksPanel.close();
      this.friendsPanel.close();
      this.playerProfilePanel.close();
      this.wardrobePanel.setVisible(false);
      this.craftingPanel.close();
      this.audioPanel.open();
    } else {
      this.audioPanel.close();
    }

    this.audioPanel.update(this.audioSettings);
    this.audioManager?.playUiTone("soft");
  }

  togglePhotoModePanel() {
    const nextVisible = !this.photoModePanel.isVisible();

    if (nextVisible) {
      this.isInventoryOpen = false;
      this.inventoryPanel.setVisible(false);
      this.achievementsPanel.close();
      this.badgesPanel.close();
      this.dailyQuestsPanel.close();
      this.weeklyTasksPanel.close();
      this.craftingPanel.close();
      this.audioPanel.close();
      this.friendsPanel.close();
      this.playerProfilePanel.close();
      this.wardrobePanel.setVisible(false);
      this.photoModePanel.open();
      this.applyPhotoMode();
    } else {
      this.photoModePanel.close();
    }
  }

  getQuestProgressText(activeQuest) {
    const objectives = activeQuest.objectives ?? [activeQuest.objective];

    return objectives
      .map((objective) => {
        if (objective?.type === "collect-item") {
          const currentAmount = Math.min(getItemCount(this.gameplayState.inventory, objective.itemId), objective.targetAmount);
          return `${objective.targetLabel}: ${currentAmount}/${objective.targetAmount}`;
        }

        if (objective?.type === "open-chest") {
          return `${objective.targetLabel}: ${isChestOpened(this.gameplayState.world, objective.chestId) ? "Tamam" : "Bekleniyor"}`;
        }

        if (objective?.type === "talk-to-npc") {
          const talkedNpcIds = activeQuest.talkedNpcIds ?? [];
          return `${objective.targetLabel}: ${talkedNpcIds.includes(objective.npcId) ? "Tamam" : "Konusulacak"}`;
        }

        if (!objective?.position || this.currentRoomBaseId !== objective.roomId) {
          return `${objective?.targetLabel ?? "-"}: Yanlis oda`;
        }

        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, objective.position.x, objective.position.y);
        return `${objective.targetLabel}: ${distance <= QUEST_TARGET_RANGE ? "Tamam" : "Yolda"}`;
      })
      .join(" | ");
  }

  getQuestRewardText(activeQuest) {
    const questDefinition = getQuestDefinition(activeQuest.id) ?? activeQuest;
    const itemRewards =
      questDefinition.rewards?.items?.map((item) => {
        const itemMeta = INVENTORY_ITEMS[item.itemId];
        const rarityLabel = getItemRarityMeta(itemMeta?.rarity).label;
        return `${item.amount} ${itemMeta?.label ?? item.itemId} (${rarityLabel})`;
      }) ?? [];
    const coinReward = questDefinition.rewards?.coins ? [`${questDefinition.rewards.coins} coin`] : [];
    const xpReward = questDefinition.rewards?.xp ? [`${questDefinition.rewards.xp} XP`] : [];
    return [...coinReward, ...xpReward, ...itemRewards].join(", ");
  }

  getPurchaseFeedbackText(code) {
    if (code === "insufficient-coins") {
      return "Yetersiz coin";
    }

    if (code === "not-in-range") {
      return "Tezgaha yeterince yakin degilsin";
    }

    if (code === "already-owned") {
      return "Bu kozmetige zaten sahipsin";
    }

    return "Satin alma basarisiz";
  }

  getShopTransactionFeedbackText(code) {
    if (code === "insufficient-coins") {
      return "Yetersiz coin";
    }

    if (code === "not-in-range") {
      return "Tezgaha yeterince yakin degilsin";
    }

    if (code === "insufficient-quantity") {
      return "Yeterli esya yok";
    }

    if (code === "not-sellable") {
      return "Bu esya satilamaz";
    }

    if (code === "invalid-item") {
      return "Islem basarisiz";
    }

    return "Islem basarisiz";
  }

  getCraftFeedbackText(code) {
    if (code === "insufficient-coins") {
      return "Yetersiz coin";
    }

    if (code === "insufficient-items") {
      return "Malzemeler eksik";
    }

    return "Uretim basarisiz";
  }

  cycleWardrobeSlot(slot) {
    const nextCosmeticId = getNextOwnedCosmeticId(this.gameplayState.cosmetics, slot, 1);

    if (!nextCosmeticId || this.gameplayState.cosmetics.equipped[slot] === nextCosmeticId) {
      return;
    }

    this.multiplayerClient?.requestEquipCosmetic(slot, nextCosmeticId);
    this.showStatusToast(`${slot} degistiriliyor`);
  }

  markPending(collection, id) {
    collection.add(id);
    this.time.delayedCall(600, () => {
      collection.delete(id);
    });
  }

  upsertRemotePlayer(playerState) {
    if (!playerState?.id || playerState.id === this.multiplayerSelfId) {
      return;
    }

    const existingPlayer = this.remotePlayers.get(playerState.id);

    if (existingPlayer) {
      existingPlayer.updateState(playerState);
      existingPlayer.setSelected(playerState.id === this.selectedRemotePlayerId);
      return;
    }

    const remotePlayer = new RemotePlayer(this, playerState);
    remotePlayer.setSpeechBubblesEnabled(this.audioSettings.speechBubblesEnabled);
    remotePlayer.setPerformanceMode?.(this.audioSettings.performanceMode);
    remotePlayer.onSelect((selectedPlayer) => {
      this.handleRemotePlayerSelected(selectedPlayer);
    });
    remotePlayer.setSelected(playerState.id === this.selectedRemotePlayerId);
    this.remotePlayers.set(playerState.id, remotePlayer);
    this.entityRegistry.register("remotePlayers", playerState.id, remotePlayer);
    this.refreshPartyPresentation();
    this.refreshOnlineCount();
  }

  handleRemotePlayerSelected(remotePlayer) {
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, remotePlayer.x, remotePlayer.y);

    if (distance > NPC_INTERACTION_RANGE + 20) {
      this.showStatusToast("Oyuncu profilini acmak icin biraz daha yakinlas");
      return;
    }

    this.setSelectedRemotePlayer(remotePlayer.id);
    this.multiplayerClient?.requestProfileView(remotePlayer.id);
  }

  setSelectedRemotePlayer(playerId = null) {
    this.selectedRemotePlayerId = playerId ?? null;
    this.remotePlayers.forEach((remotePlayer, remotePlayerId) => {
      remotePlayer.setSelected(remotePlayerId === this.selectedRemotePlayerId);
    });
  }

  clearRemotePlayers() {
    this.remotePlayers.forEach((remotePlayer) => remotePlayer.destroy());
    this.remotePlayers.clear();
    this.selectedRemotePlayerId = null;
    this.entityRegistry.clearGroup("remotePlayers");
    this.refreshPartyPresentation();
  }

  removeRemotePlayer(playerId) {
    const remotePlayer = this.remotePlayers.get(playerId);

    if (!remotePlayer) {
      return;
    }

    remotePlayer.destroy();
    this.remotePlayers.delete(playerId);
    if (playerId === this.selectedRemotePlayerId) {
      this.setSelectedRemotePlayer(null);
    }
    this.entityRegistry.unregister("remotePlayers", playerId);
    this.refreshPartyPresentation();
    this.refreshOnlineCount();
  }

  refreshOnlineCount() {
    this.onlineCountText.setText(`Oyuncular: ${this.remotePlayers.size + 1}`);
  }

  updateRoomEventHud() {
    const roomEvents = getRoomWorldEvents(this.activeWorldEvents, this.currentRoomId);

    if (!roomEvents.length) {
      this.roomEventText.setText("");
      return;
    }

    this.roomEventText.setText(`Etkinlik: ${roomEvents.map((entry) => entry.title).join(" | ")}`);
  }

  updateSeasonalEventHud() {
    const seasonalBanner = getSeasonalBannerForRoom(this.currentRoomBaseId);
    this.seasonalBannerText
      .setVisible(Boolean(seasonalBanner))
      .setText(seasonalBanner ? `${seasonalBanner.bannerLabel}` : "");
  }

  updateWeatherHud() {
    const weather = getRoomWeather(this.weatherState, this.currentRoomBaseId);
    const labels = {
      clear: "Hava: Acik",
      cloudy: "Hava: Bulutlu",
      rain: "Hava: Yagmur",
    };

    this.weatherText.setText(labels[weather] ?? "Hava: Acik");
  }

  updateAudioEnvironment() {
    this.audioManager?.setEnvironment({
      roomId: this.currentRoomId,
      weather: getRoomWeather(this.weatherState, this.currentRoomBaseId),
    });
  }

  updateTimeOfDayHud() {
    const state = this.dayNightController?.update();

    if (!state) {
      this.timeOfDayText.setText("");
      return;
    }

    this.timeOfDayText.setText(state.isEnabled ? `Saat: ${state.label}` : "Saat: Sabit");
  }

  queueAchievementPopup(entry) {
    if (!entry?.id) {
      return;
    }

    this.achievementPopupQueue.push(entry);
    this.processAchievementPopupQueue();
  }

  processAchievementPopupQueue() {
    if (this.isAchievementPopupActive || !this.achievementPopupQueue.length) {
      return;
    }

    const entry = this.achievementPopupQueue.shift();
    this.isAchievementPopupActive = true;
    this.achievementPopup.setVisible(true);
    this.achievementPopup.setAlpha(0);
    this.achievementPopup.setY(334);
    this.achievementPopupTitle.setText(
      entry.kind === "badge"
        ? "Badge Unlocked"
        : entry.kind === "daily-quest"
          ? "Daily Quest Complete"
          : entry.kind === "weekly-task"
            ? "Weekly Task Complete"
            : "Achievement Unlocked",
    );
    this.achievementPopupBody.setText(`${entry.title}\n${entry.description}`);

    if (this.audioSettings?.performanceMode) {
      this.achievementPopup.setAlpha(1);
      this.time.delayedCall(2200, () => {
        this.achievementPopup.setVisible(false);
        this.isAchievementPopupActive = false;
        this.processAchievementPopupQueue();
      });
      return;
    }

    this.tweens.add({
      targets: this.achievementPopup,
      alpha: 1,
      y: 318,
      duration: 180,
      onComplete: () => {
        this.time.delayedCall(2200, () => {
          this.tweens.add({
            targets: this.achievementPopup,
            alpha: 0,
            y: 300,
            duration: 220,
            onComplete: () => {
              this.achievementPopup.setVisible(false);
              this.isAchievementPopupActive = false;
              this.processAchievementPopupQueue();
            },
          });
        });
      },
    });
  }

  updateLocalNameLabel() {
    const badgeLabel = getEquippedBadgeLabel(this.gameplayState.badges);
    this.nameLabel.update(
      this.session.playerName,
      this.gameplayState.progression.level ?? 1,
      badgeLabel
    );
  }
}
