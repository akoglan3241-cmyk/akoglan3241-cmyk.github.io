export function getDefaultQuestState() {
  return {
    activeQuest: null,
    completedQuestIds: [],
  };
}

function normalizeObjective(rawObjective = {}) {
  if (!rawObjective || typeof rawObjective !== "object") {
    return null;
  }

  const type = String(rawObjective.type ?? "");

  if (type === "go-to-location") {
    return {
      type,
      targetLabel: String(rawObjective.targetLabel ?? ""),
      roomId: rawObjective.roomId ?? null,
      position: rawObjective.position
        ? {
            x: Number(rawObjective.position.x ?? 0),
            y: Number(rawObjective.position.y ?? 0),
          }
        : null,
    };
  }

  if (type === "collect-item") {
    return {
      type,
      targetLabel: String(rawObjective.targetLabel ?? rawObjective.itemId ?? ""),
      itemId: String(rawObjective.itemId ?? ""),
      targetAmount: Number(rawObjective.targetAmount ?? 1),
    };
  }

  if (type === "open-chest") {
    return {
      type,
      targetLabel: String(rawObjective.targetLabel ?? rawObjective.chestId ?? ""),
      chestId: String(rawObjective.chestId ?? ""),
    };
  }

  if (type === "talk-to-npc") {
    return {
      type,
      targetLabel: String(rawObjective.targetLabel ?? rawObjective.npcId ?? ""),
      npcId: String(rawObjective.npcId ?? ""),
    };
  }

  return {
    type,
  };
}

function normalizeObjectives(rawObjectives, fallbackObjective) {
  if (Array.isArray(rawObjectives) && rawObjectives.length > 0) {
    return rawObjectives.map((objective) => normalizeObjective(objective)).filter(Boolean);
  }

  const objective = normalizeObjective(fallbackObjective);
  return objective ? [objective] : [];
}

function normalizeActiveQuest(rawActiveQuest) {
  if (!rawActiveQuest) {
    return null;
  }

  const objectives = normalizeObjectives(rawActiveQuest.objectives, rawActiveQuest.objective);

  return {
    ...rawActiveQuest,
    type: String(rawActiveQuest.type ?? objectives[0]?.type ?? ""),
    objective: objectives[0] ?? null,
    objectives,
    talkedNpcIds: Array.isArray(rawActiveQuest.talkedNpcIds) ? rawActiveQuest.talkedNpcIds.map(String) : [],
  };
}

export function normalizeQuestState(rawState) {
  return {
    activeQuest: normalizeActiveQuest(rawState?.activeQuest),
    completedQuestIds: Array.isArray(rawState?.completedQuestIds) ? rawState.completedQuestIds : [],
  };
}

export function hasCompletedQuest(questState, questId) {
  return questState.completedQuestIds.includes(questId);
}

export function areQuestPrerequisitesMet(questState, prerequisiteIds = []) {
  return prerequisiteIds.every((questId) => hasCompletedQuest(questState, questId));
}
