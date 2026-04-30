import { createHmac } from "node:crypto";
import type { AuthTokenPayload } from "../types.ts";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-social-rpg-secret-change-me";

function encodeBase64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signSegment(header: string, payload: string): string {
  return createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
}

export function signAuthToken(payload: AuthTokenPayload): string {
  const headerSegment = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadSegment = encodeBase64Url(JSON.stringify(payload));
  const signature = signSegment(headerSegment, payloadSegment);
  return `${headerSegment}.${payloadSegment}.${signature}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const [headerSegment, payloadSegment, signature] = String(token ?? "").split(".");

  if (!headerSegment || !payloadSegment || !signature) {
    return null;
  }

  const expectedSignature = signSegment(headerSegment, payloadSegment);

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(payloadSegment)) as AuthTokenPayload;

    if (!payload.sub || !payload.username || !payload.displayName || !payload.exp) {
      return null;
    }

    if (Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
