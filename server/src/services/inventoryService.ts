import { DEFAULT_INVENTORY_ITEMS } from "../config/gameplayData.ts";
import type { GameplayState, InventoryState } from "../types.ts";

export function createInventoryState(rawState?: Partial<InventoryState>): InventoryState {
  return {
    items: {
      ...DEFAULT_INVENTORY_ITEMS,
      ...rawState?.items,
    },
  };
}

export function getItemCount(gameplayState: GameplayState, itemId: string): number {
  return Number(gameplayState.inventory.items[itemId] ?? 0);
}

export function hasEnoughItems(gameplayState: GameplayState, itemId: string, amount: number): boolean {
  return getItemCount(gameplayState, itemId) >= amount;
}

export function addItem(gameplayState: GameplayState, itemId: string, amount: number): void {
  gameplayState.inventory.items[itemId] = Math.max(0, getItemCount(gameplayState, itemId) + amount);
}

export function removeItem(gameplayState: GameplayState, itemId: string, amount: number): void {
  gameplayState.inventory.items[itemId] = Math.max(0, getItemCount(gameplayState, itemId) - amount);
}
