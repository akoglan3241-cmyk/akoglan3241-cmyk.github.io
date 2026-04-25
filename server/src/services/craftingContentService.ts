import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CraftingRecipeDefinition, CraftingRecipeItem } from "../types.ts";

function normalizeRecipeItem(rawItem: unknown): CraftingRecipeItem {
  const record = (rawItem ?? {}) as Record<string, unknown>;
  return {
    itemId: String(record.itemId ?? ""),
    amount: Math.max(1, Number(record.amount ?? 1)),
  };
}

function normalizeRecipe(rawRecipe: unknown): CraftingRecipeDefinition {
  const record = (rawRecipe ?? {}) as Record<string, unknown>;
  return {
    id: String(record.id ?? ""),
    title: String(record.title ?? record.id ?? ""),
    description: String(record.description ?? ""),
    coinCost: Math.max(0, Number(record.coinCost ?? 0)),
    requirements: Array.isArray(record.requirements) ? record.requirements.map(normalizeRecipeItem).filter((entry) => entry.itemId) : [],
    outputs: Array.isArray(record.outputs) ? record.outputs.map(normalizeRecipeItem).filter((entry) => entry.itemId) : [],
  };
}

function loadRecipes(): CraftingRecipeDefinition[] {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  const contentDir = path.resolve(serviceDir, "../../../client/src/game/content/crafting");
  const fileNames = readdirSync(contentDir).filter((fileName) => fileName.endsWith(".json"));

  return fileNames.flatMap((fileName) => {
    const rawContent = JSON.parse(readFileSync(path.join(contentDir, fileName), "utf8")) as unknown;
    return Array.isArray(rawContent) ? rawContent.map(normalizeRecipe) : [];
  });
}

const recipes = loadRecipes();
const recipesById = new Map<string, CraftingRecipeDefinition>(recipes.map((recipe) => [recipe.id, recipe]));

export function getCraftingRecipe(recipeId: string): CraftingRecipeDefinition | null {
  return recipesById.get(recipeId) ?? null;
}

export function listCraftingRecipes(): CraftingRecipeDefinition[] {
  return recipes.map((recipe) => ({
    ...recipe,
    requirements: recipe.requirements.map((entry) => ({ ...entry })),
    outputs: recipe.outputs.map((entry) => ({ ...entry })),
  }));
}
