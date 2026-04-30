import { getQuestDefinition, getQuestDialogueText, getQuestLineByNpcId } from "./questContent.js";

export function hasCompletedQuest(questState, questId) {
  return questState.completedQuestIds.includes(questId);
}

export function areQuestPrerequisitesMet(questState, prerequisiteIds = []) {
  return prerequisiteIds.every((questId) => hasCompletedQuest(questState, questId));
}

export function getNpcQuestStatus(npcId, questState) {
  const questLine = getQuestLineByNpcId(npcId);

  if (!questLine) {
    return null;
  }

  const activeQuestId = questState.activeQuest?.id ?? null;

  for (const quest of questLine.quests) {
    if (activeQuestId === quest.id) {
      return {
        state: "active",
        quest,
        questLine,
      };
    }

    if (hasCompletedQuest(questState, quest.id)) {
      continue;
    }

    if (!areQuestPrerequisitesMet(questState, quest.prerequisites)) {
      return {
        state: "locked",
        quest,
        questLine,
      };
    }

    return {
      state: "available",
      quest,
      questLine,
    };
  }

  const lastQuest = questLine.quests.at(-1) ?? null;

  return {
    state: "completed",
    quest: lastQuest,
    questLine,
  };
}

export function getNpcDialoguePayload(npc, questState) {
  const questStatus = getNpcQuestStatus(npc.npcId, questState);

  if (!questStatus) {
    return {
      speaker: npc.name,
      text: npc.dialog,
      quest: null,
      canStartQuest: false,
    };
  }

  const { questLine, quest, state } = questStatus;
  const defaultText = getQuestDialogueText(questLine.id, quest?.dialogueLinks?.default) || npc.dialog;

  if (!quest) {
    return {
      speaker: npc.name,
      text: defaultText,
      quest: null,
      canStartQuest: false,
    };
  }

  if (state === "locked") {
    return {
      speaker: npc.name,
      text: getQuestDialogueText(questLine.id, quest.dialogueLinks?.locked) || defaultText,
      quest,
      canStartQuest: false,
    };
  }

  if (state === "available") {
    return {
      speaker: npc.name,
      text: getQuestDialogueText(questLine.id, quest.dialogueLinks?.offer) || quest.description,
      quest,
      canStartQuest: true,
    };
  }

  if (state === "active") {
    const activeQuestDefinition = getQuestDefinition(questState.activeQuest?.id) ?? quest;
    return {
      speaker: npc.name,
      text: getQuestDialogueText(questLine.id, activeQuestDefinition.dialogueLinks?.inProgress) || activeQuestDefinition.description,
      quest: activeQuestDefinition,
      canStartQuest: false,
    };
  }

  return {
    speaker: npc.name,
    text: getQuestDialogueText(questLine.id, quest.dialogueLinks?.completed) || defaultText,
    quest,
    canStartQuest: false,
  };
}
