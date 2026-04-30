import { isDatabaseConfigured, queryDb } from "./client.ts";

const SCHEMA_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash TEXT NULL
  `,
  `
    CREATE TABLE IF NOT EXISTS player_profiles (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      room_id TEXT NOT NULL,
      appearance JSONB NOT NULL DEFAULT '{}'::jsonb,
      owned_cosmetics JSONB NOT NULL DEFAULT '{}'::jsonb,
      status_text TEXT NOT NULL DEFAULT '',
      home_state JSONB NOT NULL DEFAULT '{}'::jsonb,
      tutorial_state JSONB NOT NULL DEFAULT '{}'::jsonb,
      daily_login_state JSONB NOT NULL DEFAULT '{}'::jsonb,
      mailbox_state JSONB NOT NULL DEFAULT '{}'::jsonb,
      direct_messages_state JSONB NOT NULL DEFAULT '{}'::jsonb,
      xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      achievement_state JSONB NOT NULL DEFAULT '{}'::jsonb,
      badge_state JSONB NOT NULL DEFAULT '{}'::jsonb,
      daily_quest_state JSONB NOT NULL DEFAULT '{}'::jsonb,
      weekly_task_state JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    ALTER TABLE player_profiles
    ADD COLUMN IF NOT EXISTS owned_cosmetics JSONB NOT NULL DEFAULT '{}'::jsonb
  `,
  `
    ALTER TABLE player_profiles
    ADD COLUMN IF NOT EXISTS status_text TEXT NOT NULL DEFAULT ''
  `,
  `
    ALTER TABLE player_profiles
    ADD COLUMN IF NOT EXISTS home_state JSONB NOT NULL DEFAULT '{}'::jsonb
  `,
  `
    ALTER TABLE player_profiles
    ADD COLUMN IF NOT EXISTS tutorial_state JSONB NOT NULL DEFAULT '{}'::jsonb
  `,
  `
    ALTER TABLE player_profiles
    ADD COLUMN IF NOT EXISTS daily_login_state JSONB NOT NULL DEFAULT '{}'::jsonb
  `,
  `
    ALTER TABLE player_profiles
    ADD COLUMN IF NOT EXISTS mailbox_state JSONB NOT NULL DEFAULT '{}'::jsonb
  `,
  `
    ALTER TABLE player_profiles
    ADD COLUMN IF NOT EXISTS direct_messages_state JSONB NOT NULL DEFAULT '{}'::jsonb
  `,
  `
    ALTER TABLE player_profiles
    ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0
  `,
  `
    ALTER TABLE player_profiles
    ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1
  `,
  `
    ALTER TABLE player_profiles
    ADD COLUMN IF NOT EXISTS achievement_state JSONB NOT NULL DEFAULT '{}'::jsonb
  `,
  `
    ALTER TABLE player_profiles
    ADD COLUMN IF NOT EXISTS badge_state JSONB NOT NULL DEFAULT '{}'::jsonb
  `,
  `
    ALTER TABLE player_profiles
    ADD COLUMN IF NOT EXISTS daily_quest_state JSONB NOT NULL DEFAULT '{}'::jsonb
  `,
  `
    ALTER TABLE player_profiles
    ADD COLUMN IF NOT EXISTS weekly_task_state JSONB NOT NULL DEFAULT '{}'::jsonb
  `,
  `
    CREATE TABLE IF NOT EXISTS inventory_items (
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, item_id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS quest_progress (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      active_quest JSONB NULL,
      completed_quest_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS world_state (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS collected_pickups (
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pickup_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, pickup_id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS opened_chests (
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      chest_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, chest_id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS friendships (
      user_a_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      requested_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_a_id, user_b_id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS player_reports (
      id TEXT PRIMARY KEY,
      reporter_subject_id TEXT NOT NULL,
      reporter_name TEXT NOT NULL,
      target_player_id TEXT NOT NULL,
      target_account_id TEXT NOT NULL,
      target_display_name TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
];

export async function initializeDatabaseSchema(): Promise<void> {
  if (!isDatabaseConfigured()) {
    return;
  }

  for (const statement of SCHEMA_STATEMENTS) {
    await queryDb(statement);
  }
}
