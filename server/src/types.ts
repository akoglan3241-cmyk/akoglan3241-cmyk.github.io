export interface Position {
  x: number;
  y: number;
}

export interface Appearance {
  hair: string;
  top: string;
  bottom: string;
  accessory: string;
}

export type CosmeticSlot = keyof Appearance;

export interface CosmeticsState {
  owned: Record<CosmeticSlot, string[]>;
  equipped: Appearance;
}

export interface RewardItem {
  itemId: string;
  amount: number;
}

export interface DailyLoginRewardDefinition {
  day: number;
  coins: number;
  xp: number;
  items: RewardItem[];
}

export interface DailyLoginState {
  lastClaimDateKey: string;
  streakCount: number;
  lastClaimAt: number;
}

export interface DailyLoginClaimResult {
  dateKey: string;
  streakCount: number;
  rewardDay: number;
  subject?: string;
  rewards: {
    coins: number;
    xp: number;
    items: RewardItem[];
  };
}

export interface MailReward {
  coins: number;
  xp: number;
  items: RewardItem[];
}

export interface MailEntry {
  id: string;
  kind: "system" | "gift";
  subject: string;
  message: string;
  senderUserId: string | null;
  senderName: string | null;
  rewards: MailReward;
  isClaimed: boolean;
  claimedAt: number | null;
  createdAt: number;
}

export interface MailboxState {
  entries: MailEntry[];
}

export interface DirectMessageEntry {
  id: string;
  senderUserId: string;
  senderName: string;
  targetUserId: string;
  text: string;
  createdAt: number;
}

export interface DirectMessagesState {
  conversations: Record<string, DirectMessageEntry[]>;
}

export interface TradeOfferItem {
  itemId: string;
  amount: number;
}

export interface TradeOffer {
  coins: number;
  items: TradeOfferItem[];
}

export interface TradeParticipantState {
  playerId: string;
  playerName: string;
  confirmed: boolean;
  offer: TradeOffer;
}

export interface TradeSessionState {
  id: string;
  requesterId: string;
  responderId: string;
  roomId: string;
  status: "pending" | "active";
  createdAt: number;
  participants: Record<string, TradeParticipantState>;
}

export interface PartyInviteState {
  inviterPlayerId: string;
  inviterName: string;
  targetPlayerId: string;
  createdAt: number;
}

export interface PartyMemberState {
  playerId: string;
  playerName: string;
  roomId: string;
  isLeader: boolean;
}

export interface PartyState {
  id: string;
  leaderId: string;
  members: PartyMemberState[];
  pendingInvite: PartyInviteState | null;
}

export interface CraftingRecipeItem {
  itemId: string;
  amount: number;
}

export interface CraftingRecipeDefinition {
  id: string;
  title: string;
  description: string;
  coinCost: number;
  requirements: CraftingRecipeItem[];
  outputs: CraftingRecipeItem[];
}

export interface InventoryState {
  items: Record<string, number>;
}

export interface LocationObjective {
  type: "go-to-location";
  targetLabel: string;
  roomId: string;
  position: Position | null;
}

export interface CollectItemObjective {
  type: "collect-item";
  targetLabel: string;
  itemId: string;
  targetAmount: number;
}

export interface OpenChestObjective {
  type: "open-chest";
  targetLabel: string;
  chestId: string;
}

export interface TalkToNpcObjective {
  type: "talk-to-npc";
  targetLabel: string;
  npcId: string;
}

export type QuestObjective = LocationObjective | CollectItemObjective | OpenChestObjective | TalkToNpcObjective;

export interface QuestRewards {
  coins: number;
  xp: number;
  items: RewardItem[];
}

export interface ActiveQuestState {
  id: string;
  questLineId: string;
  npcId: string;
  roomId: string;
  title: string;
  description: string;
  type: QuestObjective["type"];
  objective: QuestObjective;
  objectives: QuestObjective[];
  rewards: QuestRewards;
  prerequisites: string[];
  status: "active";
  talkedNpcIds: string[];
}

export interface QuestState {
  activeQuest: ActiveQuestState | null;
  completedQuestIds: string[];
}

export interface WorldState {
  openedChestIds: string[];
  collectedPickupIds: string[];
}

export interface ProgressionState {
  xp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number | null;
  progressRatio: number;
  unlockedContentIds: string[];
  nextUnlockLevel: number | null;
  nextUnlockLabel: string;
}

export interface HomeAccessState {
  isPublic: boolean;
}

export interface FurniturePlacement {
  id: string;
  itemId: string;
  x: number;
  y: number;
  rotation: number;
  width?: number;
  height?: number;
  interactionState?: {
    isOn?: boolean;
  };
}

export interface HomeState {
  ownerProfileId: string;
  access: HomeAccessState;
  placedFurniture: FurniturePlacement[];
  layoutVersion: number;
  lastUpdatedAt: number;
}

export type TutorialStepId = "movement" | "npc-interaction" | "first-quest" | "collect-item" | "room-transition" | "shop-interaction" | "inventory" | "chat";

export interface TutorialState {
  completedStepIds: TutorialStepId[];
  isCompleted: boolean;
  isSkipped: boolean;
  startedAt: number;
  completedAt: number | null;
  skippedAt: number | null;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: string;
  metric: "questsCompleted" | "itemsCollected" | "chestsOpened" | "chatMessagesSent";
  target: number;
}

export interface BadgeDefinition {
  id: string;
  title: string;
  shortLabel: string;
  description: string;
  category: string;
  achievementIds: string[];
  adminAssignable: boolean;
  seasonal: boolean;
}

export interface DailyQuestDefinition {
  id: string;
  title: string;
  description: string;
  type: "collect-pickups" | "talk-to-npcs" | "open-chests" | "visit-room";
  targetCount: number;
  targetRoomId: string | null;
  rewards: {
    coins: number;
    xp: number;
  };
}

export interface CosmeticReward {
  slot: CosmeticSlot;
  cosmeticId: string;
}

export interface WeeklyTaskDefinition {
  id: string;
  title: string;
  description: string;
  type: "collect-pickups" | "talk-to-npcs" | "open-chests" | "visit-room";
  targetCount: number;
  targetRoomId: string | null;
  rewards: {
    coins: number;
    xp: number;
    cosmetics: CosmeticReward[];
  };
}

export interface AchievementCounterState {
  questsCompleted: number;
  itemsCollected: number;
  chestsOpened: number;
  chatMessagesSent: number;
}

export interface AchievementEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  metric: AchievementDefinition["metric"];
  target: number;
  progress: number;
  isUnlocked: boolean;
  unlockedAt: number | null;
}

export interface AchievementsState {
  counters: AchievementCounterState;
  entries: AchievementEntry[];
}

export interface BadgeEntry {
  id: string;
  title: string;
  shortLabel: string;
  description: string;
  category: string;
  seasonal: boolean;
  isUnlocked: boolean;
  isEquipped: boolean;
  unlockedAt: number | null;
}

export interface BadgesState {
  adminGrantedBadgeIds: string[];
  unlockedBadgeIds: string[];
  equippedBadgeId: string | null;
  entries: BadgeEntry[];
}

export interface DailyQuestEntry {
  id: string;
  title: string;
  description: string;
  type: DailyQuestDefinition["type"];
  targetCount: number;
  targetRoomId: string | null;
  progress: number;
  isCompleted: boolean;
  rewards: {
    coins: number;
    xp: number;
  };
  seenNpcIds: string[];
}

export interface DailyQuestsState {
  dateKey: string;
  lastResetAt: number;
  nextResetAt: number;
  entries: DailyQuestEntry[];
}

export interface WeeklyTaskEntry {
  id: string;
  title: string;
  description: string;
  type: WeeklyTaskDefinition["type"];
  targetCount: number;
  targetRoomId: string | null;
  progress: number;
  isCompleted: boolean;
  rewards: {
    coins: number;
    xp: number;
    cosmetics: CosmeticReward[];
  };
  seenNpcIds: string[];
}

export interface WeeklyTasksState {
  weekKey: string;
  lastResetAt: number;
  nextResetAt: number;
  entries: WeeklyTaskEntry[];
}

export interface UnlockNotification {
  id: string;
  title: string;
  description: string;
  kind: "achievement" | "badge" | "daily-quest" | "weekly-task";
}

export interface GameplayState {
  inventory: InventoryState;
  quest: QuestState;
  world: WorldState;
  cosmetics: CosmeticsState;
  progression: ProgressionState;
  achievements: AchievementsState;
  badges: BadgesState;
  dailyQuests: DailyQuestsState;
  weeklyTasks: WeeklyTasksState;
}

export interface PlayerProfile {
  name: string;
  roomId: string;
  appearance: Appearance;
  statusText: string;
  homeState: HomeState;
  tutorialState: TutorialState;
  dailyLoginState: DailyLoginState;
  mailboxState: MailboxState;
  directMessagesState: DirectMessagesState;
  gameplayState: GameplayState;
}

export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string | null;
}

export interface FriendRecord {
  playerId: string;
  playerName: string;
  status: "accepted" | "pending-incoming" | "pending-outgoing";
  isOnline: boolean;
  roomId: string | null;
  roomName: string | null;
  homeAccess: "public" | "friends";
}

export interface FriendsStatePayload {
  friends: FriendRecord[];
  incomingRequests: FriendRecord[];
  outgoingRequests: FriendRecord[];
}

export interface PlayerProfileSummary {
  playerId: string;
  accountId: string;
  displayName: string;
  appearance: Appearance;
  level: number;
  coins: number;
  badges: string[];
  equippedBadgeLabel: string;
  statusText: string;
  homeAccess: "public" | "friends";
}

export interface AuthTokenPayload {
  sub: string;
  username: string;
  displayName: string;
  guest: boolean;
  exp: number;
}

export interface AuthContext {
  subjectId: string;
  username: string;
  displayName: string;
  isGuest: boolean;
}

export interface PlayerConnection {
  id: string;
  auth: AuthContext;
  profileKey: string;
  name: string;
  roomId: string;
  x: number;
  y: number;
  flipX: boolean;
  appearance: Appearance;
  statusText: string;
  homeState: HomeState;
  tutorialState: TutorialState;
  dailyLoginState: DailyLoginState;
  mailboxState: MailboxState;
  directMessagesState: DirectMessagesState;
  seatedFurnitureId: string | null;
  activeEmoteId: string | null;
  emoteEndsAt: number | null;
  gameplayState: GameplayState;
  chatTimestamps: number[];
  shopSessionState: ShopSessionState;
  miniGameSessionState: MiniGameSessionState;
  lastProcessedInputSequence?: number | null;
}

export interface PublicPlayerState {
  id: string;
  name: string;
  roomId: string;
  appearance: Appearance;
  statusText: string;
  level?: number;
  equippedBadgeLabel: string;
  partyId?: string | null;
  activeEmoteId?: string | null;
  emoteEndsAt?: number | null;
  lastProcessedInputSequence?: number | null;
  x: number;
  y: number;
  flipX: boolean;
}

export interface ChatMessage {
  id: string;
  name: string;
  text: string;
  kind: "player" | "system";
  playerId: string | null;
  roomId: string | null;
  channel?: "room" | "party";
  timestamp: number;
}

export interface ChatBlockedPayload {
  code: "empty-message" | "max-length" | "rate-limit" | "repeated-message" | "banned-word";
  message: string;
}

export interface RoomDefinition {
  id: string;
  baseRoomId?: string;
  name: string;
  spawn: Position;
  ownerProfileId?: string | null;
  ownerName?: string | null;
  isPersonalHome?: boolean;
  portals: Array<{
    id: string;
    position: Position;
    targetRoomId: string;
  }>;
}

export interface PickupDefinition {
  id: string;
  itemId: string;
  amount: number;
  roomId: string;
  position: Position;
}

export interface ChestDefinition {
  id: string;
  roomId: string;
  position: Position;
  costs: RewardItem[];
  lootTableId: string;
}

export interface LootTableEntryDefinition {
  id: string;
  kind: "inventory" | "cosmetic";
  itemId: string;
  cosmeticSlot?: CosmeticSlot | null;
  weight: number;
  minAmount: number;
  maxAmount: number;
  eventTags?: string[];
}

export interface LootTableDefinition {
  id: string;
  rolls: number;
  entries: LootTableEntryDefinition[];
  eventTags?: string[];
}

export interface LootReward {
  kind: "inventory" | "cosmetic";
  itemId: string;
  label: string;
  amount: number;
  rarity: "common" | "uncommon" | "rare" | "epic";
  cosmeticSlot?: CosmeticSlot | null;
}

export interface ChestOpenResult {
  ok: boolean;
  code: "ok" | "invalid-chest" | "not-in-range" | "missing-cost";
  rewards: LootReward[];
}

export interface QuestDefinition {
  id: string;
  questLineId: string;
  npcId: string;
  roomId: string;
  giverPosition: Position | null;
  type: QuestObjective["type"];
  title: string;
  description: string;
  objective: QuestObjective;
  objectives: QuestObjective[];
  prerequisites: string[];
  rewards: QuestRewards;
  dialogueLinks: Record<string, string>;
}

export interface ShopItemDefinition {
  id: string;
  itemId: string;
  label: string;
  price: number;
  amount: number;
  rarity?: "common" | "uncommon" | "rare" | "epic";
  category?: "consumables" | "quest-items" | "cosmetics" | "chair" | "table" | "lamp" | "plant" | "decoration";
  kind?: "inventory" | "cosmetic";
  cosmeticSlot?: CosmeticSlot | null;
}

export interface ShopDefinition {
  id: string;
  npcId: string;
  roomId: string;
  position: Position | null;
  title: string;
  greeting: string;
  items: ShopItemDefinition[];
}

export interface PurchaseResult {
  ok: boolean;
  code: "ok" | "invalid-item" | "insufficient-coins" | "not-in-range" | "already-owned";
  itemId?: string;
  amount?: number;
  price?: number;
  label?: string;
  kind?: "inventory" | "cosmetic";
  cosmeticSlot?: CosmeticSlot | null;
}

export interface SellResult {
  ok: boolean;
  code: "ok" | "invalid-item" | "not-in-range" | "insufficient-quantity" | "not-sellable";
  itemId?: string;
  amount?: number;
  price?: number;
  label?: string;
}

export interface BuybackEntry {
  id: string;
  itemId: string;
  label: string;
  quantity: number;
  unitPrice: number;
}

export interface BuybackResult {
  ok: boolean;
  code: "ok" | "invalid-item" | "not-in-range" | "insufficient-coins";
  buybackEntryId?: string;
  itemId?: string;
  amount?: number;
  price?: number;
  label?: string;
}

export interface ShopSessionState {
  buybackItems: BuybackEntry[];
}

export interface MiniGameSessionState {
  lastRewardClaimAtByGame: Record<string, number>;
}

export interface CraftResult {
  ok: boolean;
  code: "ok" | "invalid-recipe" | "insufficient-items" | "insufficient-coins";
  recipeId?: string;
  title?: string;
  coinCost?: number;
  outputs?: LootReward[];
}

export interface MiniGameRewardResult {
  ok: boolean;
  code: "ok" | "invalid-minigame" | "invalid-score" | "not-allowed" | "cooldown";
  miniGameId?: string;
  score?: number;
  coins?: number;
  xp?: number;
  rankLabel?: string;
  message?: string;
}

export interface WorldEventPickupDefinition {
  id: string;
  itemId: string;
  amount: number;
  label: string;
  texture: string;
  roomId: string;
  tileX: number;
  tileY: number;
  position: Position;
}

export interface WorldEventChestDefinition {
  id: string;
  label: string;
  roomId: string;
  tileX: number;
  tileY: number;
  position: Position;
  costs: RewardItem[];
  lootTableId: string;
}

export interface WorldEventFestivalDefinition {
  label: string;
  tileX: number;
  tileY: number;
}

export interface WorldEventDefinition {
  id: string;
  type: "bonus-chest" | "rare-collectible" | "npc-festival";
  roomId: string;
  title: string;
  announcement: string;
  durationMs: number;
  weight: number;
  eventTags?: string[];
  pickup?: {
    itemId: string;
    amount: number;
    label: string;
    texture: string;
    tileX: number;
    tileY: number;
  } | null;
  chest?: {
    label: string;
    tileX: number;
    tileY: number;
    costs: RewardItem[];
    lootTableId: string;
  } | null;
  festival?: WorldEventFestivalDefinition | null;
}

export interface ActiveWorldEvent {
  instanceId: string;
  definitionId: string;
  roomId: string;
  type: WorldEventDefinition["type"];
  title: string;
  announcement: string;
  startedAt: number;
  expiresAt: number;
  pickup: WorldEventPickupDefinition | null;
  chest: WorldEventChestDefinition | null;
  festival: WorldEventFestivalDefinition | null;
}

export interface AdminActionResult {
  ok: boolean;
  message: string;
}

export interface PlayerReportEntry {
  id: string;
  reporterSubjectId: string;
  reporterName: string;
  targetPlayerId: string;
  targetAccountId: string;
  targetDisplayName: string;
  reason: string;
  createdAt: number;
}
