import { getDialogueTreeByNpcId } from "./dialogueContent.js";
import { areQuestPrerequisitesMet, getNpcQuestStatus, hasCompletedQuest } from "./questRuntime.js";
import { hasSeenDialogueChoice, hasSeenDialogueEntry } from "../state/dialogueState.js";

function areDialogueConditionsMet(conditions, context) {
  if (!conditions) {
    return true;
  }

  if (conditions.questStatus && context.questStatus?.state !== conditions.questStatus) {
    return false;
  }

  if (conditions.questId && context.questStatus?.quest?.id !== conditions.questId && context.questState.activeQuest?.id !== conditions.questId) {
    return false;
  }

  if (conditions.activeQuestId && context.questState.activeQuest?.id !== conditions.activeQuestId) {
    return false;
  }

  if (!areQuestPrerequisitesMet(context.questState, conditions.requiredCompletedQuestIds ?? [])) {
    return false;
  }

  if ((conditions.missingCompletedQuestIds ?? []).some((questId) => hasCompletedQuest(context.questState, questId))) {
    return false;
  }

  return true;
}

function buildDialogueContext(npc, questState) {
  return {
    npc,
    questState,
    questStatus: getNpcQuestStatus(npc.npcId, questState),
  };
}

export function resolveNpcDialogueStart(npc, questState, dialogueState) {
  const tree = getDialogueTreeByNpcId(npc.npcId);

  if (!tree) {
    return {
      tree: {
        id: `${npc.npcId}-fallback`,
        npcId: npc.npcId,
        speaker: npc.name,
        nodes: [
          {
            id: "root",
            text: npc.dialog,
            choices: [{ id: "close", text: "Ayril", close: true, repeatable: true, conditions: null, action: null }],
          },
        ],
      },
      entryId: "fallback",
      nodeId: "root",
      speaker: npc.name,
      npcId: npc.npcId,
    };
  }

  const context = buildDialogueContext(npc, questState);
  const entryPoint =
    tree.entryPoints.find((entry) => {
      if (!entry.repeatable && hasSeenDialogueEntry(dialogueState, entry.id)) {
        return false;
      }

      return areDialogueConditionsMet(entry.conditions, context);
    }) ?? tree.entryPoints[0];

  return {
    tree,
    entryId: entryPoint?.id ?? "default",
    nodeId: entryPoint?.nodeId ?? tree.rootNodeId,
    speaker: tree.speaker || npc.name,
    npcId: npc.npcId,
  };
}

export function getDialogueNode(tree, nodeId, npc, questState, dialogueState) {
  const node = tree?.nodes?.find((entry) => entry.id === nodeId) ?? null;

  if (!node) {
    return null;
  }

  const context = buildDialogueContext(npc, questState);
  const availableChoices = node.choices.filter((choice) => {
    if (!choice.repeatable && hasSeenDialogueChoice(dialogueState, choice.id)) {
      return false;
    }

    return areDialogueConditionsMet(choice.conditions, context);
  });

  return {
    ...node,
    choices:
      availableChoices.length > 0
        ? availableChoices
        : [{ id: `${node.id}-close`, text: "Ayril", close: true, repeatable: true, conditions: null, action: null }],
  };
}
