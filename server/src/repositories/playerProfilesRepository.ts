import type { PoolClient } from "pg";
import { isDatabaseConfigured, queryDb } from "../db/client.ts";
import { memoryProfiles } from "../services/devMemoryStore.ts";
import type { AchievementsState, Appearance, BadgesState, CosmeticsState, DailyLoginState, DailyQuestsState, DirectMessagesState, HomeState, MailboxState, TutorialState, WeeklyTasksState } from "../types.ts";

interface PlayerProfileRow {
  room_id: string;
  appearance: Appearance;
  owned_cosmetics: CosmeticsState["owned"];
  status_text: string;
  home_state: HomeState;
  tutorial_state: TutorialState;
  daily_login_state: DailyLoginState;
  mailbox_state: MailboxState;
  direct_messages_state: DirectMessagesState;
  xp: number;
  level: number;
  achievement_state: AchievementsState;
  badge_state: BadgesState;
  daily_quest_state: DailyQuestsState;
  weekly_task_state: WeeklyTasksState;
}

export async function findPlayerProfileByUserId(
  userId: string,
  client?: PoolClient,
): Promise<{ roomId: string; appearance: Appearance; ownedCosmetics: CosmeticsState["owned"]; statusText: string; homeState: HomeState | null; tutorialState: TutorialState | null; dailyLoginState: DailyLoginState | null; mailboxState: MailboxState | null; directMessagesState: DirectMessagesState | null; xp: number; level: number; achievements: AchievementsState | null; badges: BadgesState | null; dailyQuests: DailyQuestsState | null; weeklyTasks: WeeklyTasksState | null } | null> {
  if (!isDatabaseConfigured()) {
    return memoryProfiles.get(userId) ?? null;
  }

  const executor = client ?? { query: queryDb };
  const result = await executor.query<PlayerProfileRow>(
    `
      SELECT room_id, appearance, owned_cosmetics, status_text, home_state, tutorial_state, daily_login_state, mailbox_state, direct_messages_state, xp, level, achievement_state, badge_state, daily_quest_state, weekly_task_state
      FROM player_profiles
      WHERE user_id = $1
    `,
    [userId],
  );

  if (!result.rows[0]) {
    return null;
  }

  return {
    roomId: result.rows[0].room_id,
    appearance: result.rows[0].appearance,
    ownedCosmetics: result.rows[0].owned_cosmetics,
    statusText: result.rows[0].status_text,
    homeState: result.rows[0].home_state ?? null,
    tutorialState: result.rows[0].tutorial_state ?? null,
    dailyLoginState: result.rows[0].daily_login_state ?? null,
    mailboxState: result.rows[0].mailbox_state ?? null,
    directMessagesState: result.rows[0].direct_messages_state ?? null,
    xp: Number(result.rows[0].xp ?? 0),
    level: Number(result.rows[0].level ?? 1),
    achievements: result.rows[0].achievement_state ?? null,
    badges: result.rows[0].badge_state ?? null,
    dailyQuests: result.rows[0].daily_quest_state ?? null,
    weeklyTasks: result.rows[0].weekly_task_state ?? null,
  };
}

export async function savePlayerProfileByUserId(
  userId: string,
  roomId: string,
  appearance: Appearance,
  ownedCosmetics: CosmeticsState["owned"],
  statusText: string,
  homeState: HomeState,
  tutorialState: TutorialState,
  dailyLoginState: DailyLoginState,
  mailboxState: MailboxState,
  directMessagesState: DirectMessagesState,
  xp: number,
  level: number,
  achievements: AchievementsState,
  badges: BadgesState,
  dailyQuests: DailyQuestsState,
  weeklyTasks: WeeklyTasksState,
  client?: PoolClient,
): Promise<void> {
  if (!isDatabaseConfigured()) {
    memoryProfiles.set(userId, {
      roomId,
      appearance,
      ownedCosmetics,
      statusText,
      homeState,
      tutorialState,
      dailyLoginState,
      mailboxState,
      directMessagesState,
      xp,
      level,
      achievements,
      badges,
      dailyQuests,
      weeklyTasks,
    });
    return;
  }

  const executor = client ?? { query: queryDb };
  await executor.query(
    `
      INSERT INTO player_profiles (user_id, room_id, appearance, owned_cosmetics, status_text, home_state, tutorial_state, daily_login_state, mailbox_state, direct_messages_state, xp, level, achievement_state, badge_state, daily_quest_state, weekly_task_state, updated_at)
      VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET room_id = EXCLUDED.room_id, appearance = EXCLUDED.appearance, owned_cosmetics = EXCLUDED.owned_cosmetics, status_text = EXCLUDED.status_text, home_state = EXCLUDED.home_state, tutorial_state = EXCLUDED.tutorial_state, daily_login_state = EXCLUDED.daily_login_state, mailbox_state = EXCLUDED.mailbox_state, direct_messages_state = EXCLUDED.direct_messages_state, xp = EXCLUDED.xp, level = EXCLUDED.level, achievement_state = EXCLUDED.achievement_state, badge_state = EXCLUDED.badge_state, daily_quest_state = EXCLUDED.daily_quest_state, weekly_task_state = EXCLUDED.weekly_task_state, updated_at = NOW()
    `,
    [userId, roomId, JSON.stringify(appearance), JSON.stringify(ownedCosmetics), statusText, JSON.stringify(homeState), JSON.stringify(tutorialState), JSON.stringify(dailyLoginState), JSON.stringify(mailboxState), JSON.stringify(directMessagesState), xp, level, JSON.stringify(achievements), JSON.stringify(badges), JSON.stringify(dailyQuests), JSON.stringify(weeklyTasks)],
  );
}
