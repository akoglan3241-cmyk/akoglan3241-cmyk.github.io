import { NPC_INTERACTION_RANGE, QUEST_TARGET_RANGE } from "../config/gameplayData.ts";
import type { AchievementEntry, ActiveQuestState, GameplayState, Position, QuestDefinition, QuestState } from "../types.ts";
import { recordAchievementMetric } from "./achievementService.ts";
import { addItem, hasEnoughItems } from "./inventoryService.ts";
import { grantXp } from "./progressionService.ts";
import { getQuestDefinition } from "./questContentService.ts";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isWithinRange(pointA: Position | null | undefined, pointB: Position | null | undefined, range: number): boolean {
  if (!pointA || !pointB) {
    return false;
  }

  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y) <= range;
}

function hasCompletedQuest(questState: QuestState, questId: string): boolean {
  return questState.completedQuestIds.includes(questId);
}

function arePrerequisitesMet(questState: QuestState, prerequisiteIds: string[]): boolean {
  return prerequisiteIds.every((questId) => hasCompletedQuest(questState, questId));
}

export function buildActiveQuest(questDefinition: QuestDefinition): ActiveQuestState {
  return {
    id: questDefinition.id,
    questLineId: questDefinition.questLineId,
    npcId: questDefinition.npcId,
    roomId: questDefinition.roomId,
    title: questDefinition.title,
    description: questDefinition.description,
    type: questDefinition.type,
    objective: clone(questDefinition.objective),
    objectives: clone(questDefinition.objectives),
    rewards: clone(questDefinition.rewards),
    prerequisites: [...questDefinition.prerequisites],
    status: "active",
    talkedNpcIds: [],
  };
}

export function createQuestState(rawState?: Partial<QuestState>): QuestState {
  const rawActiveQuest = rawState?.activeQuest;
  const activeQuest =
    rawActiveQuest?.objective && rawActiveQuest?.rewards
      ? ({
          ...rawActiveQuest,
          objective: clone(rawActiveQuest.objective),
          objectives: Array.isArray(rawActiveQuest.objectives)
            ? clone(rawActiveQuest.objectives)
            : [clone(rawActiveQuest.objective)],
          rewards: {
            coins: Number(rawActiveQuest.rewards.coins ?? 0),
            xp: Number(rawActiveQuest.rewards.xp ?? 0),
            items: clone(rawActiveQuest.rewards.items ?? []),
          },
          prerequisites: Array.isArray(rawActiveQuest.prerequisites) ? [...rawActiveQuest.prerequisites] : [],
          talkedNpcIds: Array.isArray(rawActiveQuest.talkedNpcIds) ? [...rawActiveQuest.talkedNpcIds] : [],
        } as ActiveQuestState)
      : rawActiveQuest?.id
        ? (() => {
            const questDefinition = getQuestDefinition(rawActiveQuest.id);
            return questDefinition ? buildActiveQuest(questDefinition) : null;
          })()
        : null;

  return {
    activeQuest,
    completedQuestIds: Array.isArray(rawState?.completedQuestIds) ? [...rawState.completedQuestIds] : [],
  };
}

export function startQuest(gameplayState: GameplayState, questId: string, roomId: string, playerPosition: Position): boolean {
  const questDefinition = getQuestDefinition(questId);

  if (!questDefinition || gameplayState.quest.activeQuest || hasCompletedQuest(gameplayState.quest, questId)) {
    return false;
  }

  if (!isWithinRange(playerPosition, questDefinition.giverPosition, NPC_INTERACTION_RANGE) || roomId !== questDefinition.roomId) {
    return false;
  }

  if (!arePrerequisitesMet(gameplayState.quest, questDefinition.prerequisites)) {
    return false;
  }

  gameplayState.quest.activeQuest = buildActiveQuest(questDefinition);
  return true;
}

export function isQuestComplete(gameplayState: GameplayState, roomId: string, playerPosition: Position): boolean {
  const activeQuest = gameplayState.quest.activeQuest;

  if (!activeQuest) {
    return false;
  }

  return activeQuest.objectives.every((objective) => {
    if (objective.type === "collect-item") {
      return hasEnoughItems(gameplayState, objective.itemId, objective.targetAmount);
    }

    if (objective.type === "open-chest") {
      return gameplayState.world.openedChestIds.includes(objective.chestId);
    }

    if (objective.type === "talk-to-npc") {
      return activeQuest.talkedNpcIds.includes(objective.npcId);
    }

    if (!objective.position || objective.roomId !== roomId) {
      return false;
    }

    return isWithinRange(playerPosition, objective.position, QUEST_TARGET_RANGE);
  });
}

export function completeActiveQuest(gameplayState: GameplayState): AchievementEntry[] {
  const activeQuest = gameplayState.quest.activeQuest;

  if (!activeQuest) {
    return [];
  }

  if (activeQuest.rewards.coins > 0) {
    addItem(gameplayState, "coin", activeQuest.rewards.coins);
  }

  if (activeQuest.rewards.xp > 0) {
    grantXp(gameplayState, activeQuest.rewards.xp);
  }

  activeQuest.rewards.items.forEach((rewardItem) => {
    addItem(gameplayState, rewardItem.itemId, rewardItem.amount);
  });

  gameplayState.quest.completedQuestIds = [...gameplayState.quest.completedQuestIds, activeQuest.id];
  gameplayState.quest.activeQuest = null;
  return recordAchievementMetric(gameplayState, "questsCompleted", 1);
}

export function processQuestMovement(gameplayState: GameplayState, roomId: string, playerPosition: Position): AchievementEntry[] {
  if (!isQuestComplete(gameplayState, roomId, playerPosition)) {
    return [];
  }

  return completeActiveQuest(gameplayState);
}

export function processQuestNpcTalk(gameplayState: GameplayState, npcId: string): AchievementEntry[] {
  const activeQuest = gameplayState.quest.activeQuest;

  if (!activeQuest) {
    return [];
  }

  const hasTalkObjective = activeQuest.objectives.some((objective) => objective.type === "talk-to-npc" && objective.npcId === npcId);
  if (!hasTalkObjective) {
    return [];
  }

  if (!activeQuest.talkedNpcIds.includes(npcId)) {
    activeQuest.talkedNpcIds = [...activeQuest.talkedNpcIds, npcId];
  }

  return activeQuest.objectives.every((objective) => {
    if (objective.type === "talk-to-npc") {
      return activeQuest.talkedNpcIds.includes(objective.npcId);
    }
    return true;
  })
    ? completeActiveQuest(gameplayState)
    : [];
}
