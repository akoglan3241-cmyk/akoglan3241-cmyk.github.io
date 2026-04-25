import { isSeasonalContentActive } from "./seasonalEventContent.js";
import { normalizeDialogueTree, reportContentValidationWarnings, validateDialogueTree } from "./tooling/contentValidation.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const dialogueModules = import.meta.glob("./dialogues/*.json", {
  eager: true,
  import: "default",
});

const dialogueTrees = Object.entries(dialogueModules)
  .map(([source, entry]) => {
    const errors = validateDialogueTree(entry, source);
    reportContentValidationWarnings("dialogues", source, errors);
    return normalizeDialogueTree(entry);
  })
  .filter((tree) => isSeasonalContentActive(tree.eventTags));
const dialogueTreesByNpcId = new Map(dialogueTrees.map((tree) => [tree.npcId, tree]));

export function getDialogueTreeByNpcId(npcId) {
  const tree = dialogueTreesByNpcId.get(npcId);
  return tree ? clone(tree) : null;
}
