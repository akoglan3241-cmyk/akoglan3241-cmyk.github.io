import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateCosmeticSetCollection,
  validateDialogueTree,
  validateItemCollection,
  validateFurnitureCollection,
  validateLootTableCollection,
  validateNpcCollection,
  validateQuestLineDefinition,
  validateRoomsCollection,
  validateSeasonalEventCollection,
  validateShopDefinition,
  validateWorldEventCollection,
} from "../src/game/content/tooling/contentValidation.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
  const fullPath = path.resolve(rootDir, relativePath);
  return JSON.parse(readFileSync(fullPath, "utf8"));
}

function validateFolder(relativeDir, validator) {
  const directory = path.resolve(rootDir, relativeDir);
  return readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".json"))
    .flatMap((fileName) => {
      const relativePath = path.join(relativeDir, fileName);
      return validator(readJson(relativePath), relativePath);
    });
}

const errors = [
  ...validateFolder("src/game/content/items", validateItemCollection),
  ...validateFolder("src/game/content/npcs", validateNpcCollection),
  ...validateFolder("src/game/content/furniture", validateFurnitureCollection),
  ...validateFolder("src/game/content/cosmetics", validateCosmeticSetCollection),
  ...validateFolder("src/game/content/quests", validateQuestLineDefinition),
  ...validateFolder("src/game/content/dialogues", validateDialogueTree),
  ...validateFolder("src/game/content/shops", validateShopDefinition),
  ...validateFolder("src/game/content/lootTables", validateLootTableCollection),
  ...validateFolder("src/game/content/worldEvents", validateWorldEventCollection),
  ...validateFolder("src/game/content/seasonalEvents", validateSeasonalEventCollection),
  ...validateRoomsCollection(readJson("src/game/content/rooms/core-rooms.json"), "src/game/content/rooms/core-rooms.json"),
];

if (errors.length > 0) {
  console.error("Content validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Content validation passed.");
