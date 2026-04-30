export function getDefaultDialogueState() {
  return {
    seenEntryIds: [],
    seenChoiceIds: [],
  };
}

export function hasSeenDialogueEntry(dialogueState, entryId) {
  return dialogueState.seenEntryIds.includes(entryId);
}

export function hasSeenDialogueChoice(dialogueState, choiceId) {
  return dialogueState.seenChoiceIds.includes(choiceId);
}

export function rememberDialogueEntry(dialogueState, entryId) {
  if (!entryId || hasSeenDialogueEntry(dialogueState, entryId)) {
    return;
  }

  dialogueState.seenEntryIds = [...dialogueState.seenEntryIds, entryId];
}

export function rememberDialogueChoice(dialogueState, choiceId) {
  if (!choiceId || hasSeenDialogueChoice(dialogueState, choiceId)) {
    return;
  }

  dialogueState.seenChoiceIds = [...dialogueState.seenChoiceIds, choiceId];
}
