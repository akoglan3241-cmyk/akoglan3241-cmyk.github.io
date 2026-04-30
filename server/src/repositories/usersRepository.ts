import type { PoolClient } from "pg";
import { isDatabaseConfigured, queryDb } from "../db/client.ts";
import { createMemoryUser, memoryUsersById, memoryUsersByUsername, saveMemoryUser } from "../services/devMemoryStore.ts";
import type { UserRecord } from "../types.ts";
import { sanitizePlayerName, sanitizeUsername } from "../services/userContentValidation.ts";

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  password_hash: string | null;
}

function mapUserRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    passwordHash: row.password_hash,
  };
}

export async function findUserByUsername(username: string, client?: PoolClient): Promise<UserRecord | null> {
  const normalizedUsername = sanitizeUsername(username);
  if (!isDatabaseConfigured()) {
    return memoryUsersByUsername.get(normalizedUsername) ?? null;
  }

  const executor = client ?? { query: queryDb };
  const result = await executor.query<UserRow>(
    `
      SELECT id, username, display_name, password_hash
      FROM users
      WHERE username = $1
    `,
    [normalizedUsername],
  );

  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
}

export async function findUserByDisplayName(displayName: string, client?: PoolClient): Promise<UserRecord | null> {
  const normalizedDisplayName = sanitizePlayerName(displayName).toLowerCase();
  if (!isDatabaseConfigured()) {
    return Array.from(memoryUsersById.values()).find((user) => user.displayName.toLowerCase() === normalizedDisplayName) ?? null;
  }

  const executor = client ?? { query: queryDb };
  const result = await executor.query<UserRow>(
    `
      SELECT id, username, display_name, password_hash
      FROM users
      WHERE LOWER(display_name) = $1
      LIMIT 1
    `,
    [normalizedDisplayName],
  );

  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
}

export async function findUserById(userId: string, client?: PoolClient): Promise<UserRecord | null> {
  if (!isDatabaseConfigured()) {
    return memoryUsersById.get(userId) ?? null;
  }

  const executor = client ?? { query: queryDb };
  const result = await executor.query<UserRow>(
    `
      SELECT id, username, display_name, password_hash
      FROM users
      WHERE id = $1
    `,
    [userId],
  );

  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
}

export async function upsertUser(username: string, displayName: string, client?: PoolClient): Promise<UserRecord> {
  const normalizedUsername = sanitizeUsername(username);
  const normalizedDisplayName = sanitizePlayerName(displayName, normalizedUsername || "Traveler");
  if (!isDatabaseConfigured()) {
    const existingUser = memoryUsersByUsername.get(normalizedUsername);

    if (existingUser) {
      return saveMemoryUser({
        ...existingUser,
        username: normalizedUsername,
        displayName: normalizedDisplayName,
      });
    }

    return createMemoryUser(normalizedUsername, normalizedDisplayName, null);
  }

  const executor = client ?? { query: queryDb };
  const result = await executor.query<UserRow>(
    `
      INSERT INTO users (username, display_name, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (username)
      DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = NOW()
      RETURNING id, username, display_name, password_hash
    `,
    [normalizedUsername, normalizedDisplayName],
  );

  return mapUserRow(result.rows[0]);
}

export async function insertUser(
  username: string,
  displayName: string,
  passwordHash: string,
  client?: PoolClient,
): Promise<UserRecord> {
  const normalizedUsername = sanitizeUsername(username);
  const normalizedDisplayName = sanitizePlayerName(displayName, normalizedUsername || "Traveler");
  if (!isDatabaseConfigured()) {
    return createMemoryUser(normalizedUsername, normalizedDisplayName, passwordHash);
  }

  const executor = client ?? { query: queryDb };
  const result = await executor.query<UserRow>(
    `
      INSERT INTO users (username, display_name, password_hash, updated_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, username, display_name, password_hash
    `,
    [normalizedUsername, normalizedDisplayName, passwordHash],
  );

  return mapUserRow(result.rows[0]);
}
