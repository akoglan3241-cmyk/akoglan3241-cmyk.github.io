import { getItemDefinition, getItemRarityMeta } from "./itemContent.js";

function normalizeRecipeItem(rawItem = {}) {
  return {
    itemId: String(rawItem.itemId ?? ""),
    amount: Math.max(1, Number(rawItem.amount ?? 1)),
  };
}

function normalizeRecipe(rawRecipe = {}) {
  return {
    id: String(rawRecipe.id ?? ""),
    title: String(rawRecipe.title ?? rawRecipe.id ?? ""),
    description: String(rawRecipe.description ?? ""),
    coinCost: Math.max(0, Number(rawRecipe.coinCost ?? 0)),
    requirements: Array.isArray(rawRecipe.requirements) ? rawRecipe.requirements.map(normalizeRecipeItem).filter((entry) => entry.itemId) : [],
    outputs: Array.isArray(rawRecipe.outputs) ? rawRecipe.outputs.map(normalizeRecipeItem).filter((entry) => entry.itemId) : [],
  };
}

const recipeModules = import.meta.glob("./crafting/*.json", {
  eager: true,
  import: "default",
});

const recipeDefinitions = Object.values(recipeModules)
  .flatMap((entry) => (Array.isArray(entry) ? entry : []))
  .map(normalizeRecipe)
  .filter((recipe) => recipe.id);

const recipesById = new Map(recipeDefinitions.map((recipe) => [recipe.id, recipe]));

function enrichRecipeItem(entry) {
  const itemDefinition = getItemDefinition(entry.itemId);
  return {
    ...entry,
    label: itemDefinition?.label ?? entry.itemId,
    icon: itemDefinition?.icon ?? "?",
    rarity: itemDefinition?.rarity ?? "common",
    rarityMeta: getItemRarityMeta(itemDefinition?.rarity ?? "common"),
  };
}

export function listCraftingRecipes() {
  return recipeDefinitions.map((recipe) => ({
    ...recipe,
    requirements: recipe.requirements.map(enrichRecipeItem),
    outputs: recipe.outputs.map(enrichRecipeItem),
  }));
}

export function getCraftingRecipe(recipeId) {
  const recipe = recipesById.get(recipeId);

  if (!recipe) {
    return null;
  }

  return {
    ...recipe,
    requirements: recipe.requirements.map(enrichRecipeItem),
    outputs: recipe.outputs.map(enrichRecipeItem),
  };
}
