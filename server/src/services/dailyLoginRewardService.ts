import type { DailyLoginClaimResult, DailyLoginRewardDefinition, DailyLoginState, PlayerProfile } from "../types.ts";
import { getDailyLoginRewardContent } from "./dailyLoginRewardContentService.ts";

const DAILY_LOGIN_TIME_ZONE = "Europe/Istanbul";

function getDateKey(timestamp = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DAILY_LOGIN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

function getTimestampForDateKey(dateKey: string): number {
  return Date.parse(`${dateKey}T00:00:00+03:00`);
}

function getYesterdayDateKey(timestamp = Date.now()): string {
  const currentDateKey = getDateKey(timestamp);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DAILY_LOGIN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(getTimestampForDateKey(currentDateKey) - 24 * 60 * 60 * 1000));
}

export function createDailyLoginState(rawState?: Partial<DailyLoginState> | null): DailyLoginState {
  return {
    lastClaimDateKey: String(rawState?.lastClaimDateKey ?? ""),
    streakCount: Math.max(0, Number(rawState?.streakCount ?? 0)),
    lastClaimAt: Math.max(0, Number(rawState?.lastClaimAt ?? 0)),
  };
}

function resolveRewardDefinition(streakCount: number): { rewardDay: number; reward: DailyLoginRewardDefinition | null } {
  const content = getDailyLoginRewardContent();
  const rewards = [...content.rewards].sort((left, right) => left.day - right.day);

  if (!rewards.length) {
    return { rewardDay: 1, reward: null };
  }

  if (!content.cycle) {
    const rewardDay = Math.min(streakCount, rewards[rewards.length - 1].day);
    return {
      rewardDay,
      reward: rewards.find((entry) => entry.day === rewardDay) ?? rewards[rewards.length - 1],
    };
  }

  const rewardDay = ((Math.max(1, streakCount) - 1) % rewards.length) + 1;
  return {
    rewardDay,
    reward: rewards.find((entry) => entry.day === rewardDay) ?? rewards[rewardDay - 1] ?? rewards[0],
  };
}

export function claimDailyLoginReward(profile: PlayerProfile, now = Date.now()): DailyLoginClaimResult | null {
  const state = createDailyLoginState(profile.dailyLoginState);
  const currentDateKey = getDateKey(now);

  if (state.lastClaimDateKey === currentDateKey) {
    profile.dailyLoginState = state;
    return null;
  }

  const yesterdayDateKey = getYesterdayDateKey(now);
  const nextStreakCount = state.lastClaimDateKey === yesterdayDateKey ? state.streakCount + 1 : 1;
  const { rewardDay, reward } = resolveRewardDefinition(nextStreakCount);

  state.lastClaimDateKey = currentDateKey;
  state.streakCount = nextStreakCount;
  state.lastClaimAt = now;
  profile.dailyLoginState = state;

  if (!reward) {
    return {
      dateKey: currentDateKey,
      streakCount: nextStreakCount,
      rewardDay,
      subject: `Gun ${rewardDay} giris odulu`,
      rewards: {
        coins: 0,
        xp: 0,
        items: [],
      },
    };
  }

  return {
    dateKey: currentDateKey,
    streakCount: nextStreakCount,
    rewardDay,
    subject: `Gun ${rewardDay} giris odulu`,
    rewards: {
      coins: reward.coins,
      xp: reward.xp,
      items: reward.items.map((item) => ({ ...item })),
    },
  };
}
