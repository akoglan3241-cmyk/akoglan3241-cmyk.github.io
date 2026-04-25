import type {
  AchievementsState,
  ActiveQuestState,
  Appearance,
  BadgesState,
  CosmeticsState,
  DailyLoginState,
  DailyQuestsState,
  DirectMessagesState,
  HomeState,
  MailboxState,
  PlayerReportEntry,
  TutorialState,
  UserRecord,
  WeeklyTasksState,
} from "../types.ts";

interface MemoryPlayerProfileRecord {
  roomId: string;
  appearance: Appearance;
  ownedCosmetics: CosmeticsState["owned"];
  statusText: string;
  homeState: HomeState | null;
  tutorialState: TutorialState | null;
  dailyLoginState: DailyLoginState | null;
  mailboxState: MailboxState | null;
  directMessagesState: DirectMessagesState | null;
  xp: number;
  level: number;
  achievements: AchievementsState | null;
  badges: BadgesState | null;
  dailyQuests: DailyQuestsState | null;
  weeklyTasks: WeeklyTasksState | null;
}

interface MemoryQuestProgressRecord {
  activeQuest: ActiveQuestState | null;
  completedQuestIds: string[];
}

interface MemoryWorldStateRecord {
  collectedPickupIds: string[];
  openedChestIds: string[];
}

interface MemoryFriendshipRecord {
  user_a_id: string;
  user_b_id: string;
  requested_by_user_id: string;
  status: "pending" | "accepted" | "rejected";
}

let nextUserId = 1;

export const memoryUsersById = new Map<string, UserRecord>();
export const memoryUsersByUsername = new Map<string, UserRecord>();
export const memoryProfiles = new Map<string, MemoryPlayerProfileRecord>();
export const memoryInventory = new Map<string, Record<string, number>>();
export const memoryQuestProgress = new Map<string, MemoryQuestProgressRecord>();
export const memoryWorldState = new Map<string, MemoryWorldStateRecord>();
export const memoryFriendships = new Map<string, MemoryFriendshipRecord>();
export const memoryReports: PlayerReportEntry[] = [];

export function createMemoryUser(username: string, displayName: string, passwordHash: string | null): UserRecord {
  const user: UserRecord = {
    id: String(nextUserId++),
    username,
    displayName,
    passwordHash,
  };

  memoryUsersById.set(user.id, user);
  memoryUsersByUsername.set(user.username, user);
  return user;
}

export function saveMemoryUser(user: UserRecord): UserRecord {
  memoryUsersById.set(user.id, user);
  memoryUsersByUsername.set(user.username, user);
  return user;
}

export function getMemoryFriendshipKey(userIdA: string, userIdB: string): string {
  return Number(userIdA) <= Number(userIdB) ? `${userIdA}:${userIdB}` : `${userIdB}:${userIdA}`;
}
