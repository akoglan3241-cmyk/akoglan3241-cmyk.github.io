const TUTORIAL_STEP_IDS = ["movement", "npc-interaction", "first-quest", "collect-item", "room-transition", "shop-interaction", "inventory", "chat"];

function uniqueStepIds(stepIds) {
  return Array.isArray(stepIds)
    ? [...new Set(stepIds.map((entry) => String(entry)).filter((entry) => TUTORIAL_STEP_IDS.includes(entry)))]
    : [];
}

export function getDefaultTutorialState() {
  return {
    completedStepIds: [],
    isCompleted: false,
    isSkipped: false,
    startedAt: 0,
    completedAt: null,
    skippedAt: null,
  };
}

export function normalizeTutorialState(rawState) {
  const completedStepIds = uniqueStepIds(rawState?.completedStepIds);
  return {
    completedStepIds,
    isCompleted: Boolean(rawState?.isCompleted) || completedStepIds.length >= TUTORIAL_STEP_IDS.length,
    isSkipped: Boolean(rawState?.isSkipped),
    startedAt: Math.max(0, Number(rawState?.startedAt ?? Date.now())),
    completedAt: rawState?.completedAt ? Math.max(0, Number(rawState.completedAt)) : null,
    skippedAt: rawState?.skippedAt ? Math.max(0, Number(rawState.skippedAt)) : null,
  };
}

export function isTutorialStepComplete(tutorialState, stepId) {
  return normalizeTutorialState(tutorialState).completedStepIds.includes(stepId);
}

export function getNextTutorialStepId(tutorialState) {
  const normalizedState = normalizeTutorialState(tutorialState);
  if (normalizedState.isCompleted || normalizedState.isSkipped) {
    return null;
  }

  return TUTORIAL_STEP_IDS.find((stepId) => !normalizedState.completedStepIds.includes(stepId)) ?? null;
}

export { TUTORIAL_STEP_IDS };
