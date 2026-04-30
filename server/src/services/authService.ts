import { randomUUID } from "node:crypto";
import { findUserByUsername, insertUser } from "../repositories/usersRepository.ts";
import type { AuthContext, AuthTokenPayload, UserRecord } from "../types.ts";
import { hashPassword, verifyPassword } from "./passwordService.ts";
import { signAuthToken, verifyAuthToken } from "./jwtService.ts";
import { sanitizePlayerName, sanitizeUsername } from "./userContentValidation.ts";

const ACCOUNT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const GUEST_TOKEN_TTL_SECONDS = 60 * 60 * 12;

function createAuthPayload(user: { id: string; username: string; displayName: string }, guest: boolean, ttlSeconds: number): AuthTokenPayload {
  return {
    sub: user.id,
    username: user.username,
    displayName: user.displayName,
    guest,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
}

function toAuthContext(payload: AuthTokenPayload): AuthContext {
  return {
    subjectId: payload.sub,
    username: payload.username,
    displayName: payload.displayName,
    isGuest: payload.guest,
  };
}

export async function registerAccount(username: unknown, password: unknown, displayName: unknown): Promise<{
  token: string;
  auth: AuthContext;
}> {
  const normalizedUsername = sanitizeUsername(username);
  const normalizedDisplayName = sanitizePlayerName(displayName, normalizedUsername || "Traveler");
  const normalizedPassword = String(password ?? "");

  if (!normalizedUsername || normalizedPassword.length < 6) {
    throw new Error("Gecersiz kayit bilgileri.");
  }

  const existingUser = await findUserByUsername(normalizedUsername);

  if (existingUser) {
    throw new Error("Bu kullanici adi zaten kayitli.");
  }

  const passwordHash = await hashPassword(normalizedPassword);
  const user = await insertUser(normalizedUsername, normalizedDisplayName, passwordHash);
  const token = signAuthToken(createAuthPayload(user, false, ACCOUNT_TOKEN_TTL_SECONDS));

  return {
    token,
    auth: {
      subjectId: user.id,
      username: user.username,
      displayName: user.displayName,
      isGuest: false,
    },
  };
}

export async function loginAccount(username: unknown, password: unknown): Promise<{
  token: string;
  auth: AuthContext;
}> {
  const normalizedUsername = sanitizeUsername(username);
  const normalizedPassword = String(password ?? "");
  const user = await findUserByUsername(normalizedUsername);

  if (!user?.passwordHash) {
    throw new Error("Kullanici adi veya sifre hatali.");
  }

  const passwordMatches = await verifyPassword(normalizedPassword, user.passwordHash);

  if (!passwordMatches) {
    throw new Error("Kullanici adi veya sifre hatali.");
  }

  const token = signAuthToken(createAuthPayload(user, false, ACCOUNT_TOKEN_TTL_SECONDS));

  return {
    token,
    auth: {
      subjectId: user.id,
      username: user.username,
      displayName: user.displayName,
      isGuest: false,
    },
  };
}

export function createGuestLogin(displayName: unknown): { token: string; auth: AuthContext } {
  const normalizedDisplayName = sanitizePlayerName(displayName, "Traveler");
  const guestRecord: UserRecord = {
    id: `guest:${randomUUID()}`,
    username: `guest_${randomUUID().slice(0, 8)}`,
    displayName: normalizedDisplayName,
    passwordHash: null,
  };

  const token = signAuthToken(createAuthPayload(guestRecord, true, GUEST_TOKEN_TTL_SECONDS));
  return {
    token,
    auth: {
      subjectId: guestRecord.id,
      username: guestRecord.username,
      displayName: guestRecord.displayName,
      isGuest: true,
    },
  };
}

export function authenticateToken(token: unknown): AuthContext | null {
  const payload = verifyAuthToken(String(token ?? ""));
  return payload ? toAuthContext(payload) : null;
}
