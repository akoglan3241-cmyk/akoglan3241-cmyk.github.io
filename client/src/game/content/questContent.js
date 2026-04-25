import { isSeasonalContentActive } from "./seasonalEventContent.js";
import { normalizeQuestLineDefinition, reportContentValidationWarnings, validateQuestLineDefinition } from "./tooling/contentValidation.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const questModules = import.meta.glob("./quests/*.json", {
  eager: true,
  import: "default",
});

const questLines = Object.entries(questModules)
  .map(([source, entry]) => {
    const errors = validateQuestLineDefinition(entry, source);
    reportContentValidationWarnings("quests", source, errors);
    return normalizeQuestLineDefinition(entry);
  })
  .filter((line) => isSeasonalContentActive(line.eventTags));
const questLinesById = new Map(questLines.map((line) => [line.id, line]));
const questLinesByNpcId = new Map(questLines.map((line) => [line.npcId, line]));
const questsById = new Map(
  questLines.flatMap((line) => line.quests.map((quest) => [quest.id, quest])),
);

export function getQuestDefinition(questId) {
  return questsById.get(questId) ?? null;
}

export function getQuestLineById(questLineId) {
  return questLinesById.get(questLineId) ?? null;
}

export function getQuestLineByNpcId(npcId) {
  return questLinesByNpcId.get(npcId) ?? null;
}

export function getQuestDialogueText(questLineId, linkName) {
  const questLine = getQuestLineById(questLineId);

  if (!questLine || !linkName) {
    return "";
  }

  return String(questLine.dialogueEntries?.[linkName] ?? "");
}

export function listQuestLines() {
  return questLines.map((line) => clone(line));
}
