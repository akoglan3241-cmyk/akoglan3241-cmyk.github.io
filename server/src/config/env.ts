function readString(name: string, fallback = ""): string {
  return String(process.env[name] ?? fallback).trim();
}

function readNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name] ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getServerEnv() {
  const nodeEnv = readString("NODE_ENV", "development");
  const port = readNumber("PORT", 3001);
  const adminBadgeSecret = readString("ADMIN_BADGE_SECRET", "");
  const jwtSecret = readString("JWT_SECRET", "");
  const databaseUrl = readString("DATABASE_URL", "");

  if (nodeEnv === "production" && !jwtSecret) {
    throw new Error("JWT_SECRET is required in production.");
  }

  if (nodeEnv === "production" && !databaseUrl) {
    throw new Error("DATABASE_URL is required in production.");
  }

  return {
    nodeEnv,
    isProduction: nodeEnv === "production",
    port,
    adminBadgeSecret,
    jwtSecret,
    databaseUrl,
  };
}
