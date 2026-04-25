import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "player-profiles.json");

let profilesCache = null;

async function ensureLoaded() {
  if (profilesCache) {
    return profilesCache;
  }

  await mkdir(DATA_DIR, { recursive: true });

  try {
    const rawData = await readFile(DATA_FILE, "utf8");
    profilesCache = JSON.parse(rawData);
  } catch {
    profilesCache = {};
    await writeFile(DATA_FILE, JSON.stringify(profilesCache, null, 2));
  }

  return profilesCache;
}

async function persist() {
  await writeFile(DATA_FILE, JSON.stringify(profilesCache, null, 2));
}

export async function loadPlayerProfile(profileKey) {
  const profiles = await ensureLoaded();
  return profiles[profileKey] ?? null;
}

export async function savePlayerProfile(profileKey, profile) {
  const profiles = await ensureLoaded();
  profiles[profileKey] = profile;
  await persist();
}
