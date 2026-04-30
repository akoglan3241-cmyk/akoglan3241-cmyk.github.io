import type { TutorialState, TutorialStepId } from "../types.ts";

export const TUTORIAL_STEP_IDS: TutorialStepId[] = ["movement", "npc-interaction", "first-quest", "collect-item", "room-transition", "shop-interaction", "inventory", "chat"];

function uniqueStepIds(stepIds: unknown): TutorialStepId[] {
  const valid = new Set(TUTORIAL_STEP_IDS);
  return Array.isArray(stepIds)
    ? [...new Set(stepIds.map((entry) => String(entry)).filter((entry): entry is TutorialStepId => valid.has(entry as TutorialStepId)))]
    : [];
}

export function createTutorialState(rawState?: Partial<TutorialState> | null): TutorialState {
  const completedStepIds = uniqueStepIds(rawState?.completedStepIds);
  const isCompleted = Boolean(rawState?.isCompleted) || completedStepIds.length >= TUTORIAL_STEP_IDS.length;
  const isSkipped = Boolean(rawState?.isSkipped);
  const startedAt = Math.max(0, Number(rawState?.startedAt ?? Date.now()));
  const completedAt = isCompleted ? Math.max(0, Number(rawState?.completedAt ?? Date.now())) : null;
  const skippedAt = isSkipped ? Math.max(0, Number(rawState?.skippedAt ?? Date.now())) : null;

  return {
    completedStepIds,
    isCompleted,
    isSkipped,
    startedAt,
    completedAt,
    skippedAt,
  };
}

export function markTutorialStep(state: TutorialState, stepId: TutorialStepId): boolean {
  if (state.isCompleted || state.isSkipped || !TUTORIAL_STEP_IDS.includes(stepId)) {
    return false;
  }

  if (!state.completedStepIds.includes(stepId)) {
    state.completedStepIds = [...state.completedStepIds, stepId];
  }

  if (state.completedStepIds.length >= TUTORIAL_STEP_IDS.length) {
    state.isCompleted = true;
    state.completedAt = Date.now();
  }

  return true;
}

export function skipTutorial(state: TutorialState): void {
  if (state.isCompleted) {
    return;
  }

  state.isSkipped = true;
  state.skippedAt = Date.now();
}

export function completeTutorial(state: TutorialState): void {
  state.completedStepIds = [...TUTORIAL_STEP_IDS];
  state.isCompleted = true;
  state.isSkipped = false;
  state.completedAt = Date.now();
}
