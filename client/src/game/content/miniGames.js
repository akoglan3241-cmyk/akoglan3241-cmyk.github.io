import { SCENE_KEYS } from "../constants.js";

export const MINI_GAMES = {
  reaction: {
    id: "reaction",
    title: "Reflex Ring",
    description: "Hareket eden isaret hedef alana girdiginde tusla. Zamanlama ne kadar iyiyse skor o kadar yuksek.",
    rewardsText: "Odul: performansa gore 2-12 coin ve 4-24 XP.",
    sceneKey: SCENE_KEYS.MINIGAME_REACTION,
  },
  collection: {
    id: "collection",
    title: "Pocket Cleanup",
    description: "Kucuk arenada sure dolmadan parlayan objeleri topla. Daha fazla toplarsan daha yuksek skor cikiyor.",
    rewardsText: "Odul: performansa gore 3-14 coin ve 5-28 XP.",
    sceneKey: SCENE_KEYS.MINIGAME_COLLECTION,
  },
};

export function getMiniGameDefinition(miniGameId) {
  return MINI_GAMES[miniGameId] ?? null;
}
