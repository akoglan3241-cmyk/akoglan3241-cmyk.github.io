import {
  COSMETIC_SLOTS,
  DIALOGUE_ACTION_TYPES,
  FURNITURE_CATEGORIES,
  ITEM_CATEGORIES,
  ITEM_RARITIES,
  NPC_ROLES,
  QUEST_OBJECTIVE_TYPES,
  SHOP_CATEGORIES,
  WORLD_EVENT_TYPES,
} from "./contentConstants.js";

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function safeStringArray(value) {
  return Array.isArray(value) ? value.map(String) : [];
}

function pushError(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

export function normalizePosition(rawPosition) {
  if (!isRecord(rawPosition)) {
    return null;
  }

  return {
    x: Number(rawPosition.x ?? 0),
    y: Number(rawPosition.y ?? 0),
  };
}

export function normalizeRewardItems(rawItems) {
  return Array.isArray(rawItems)
    ? rawItems.map((item) => ({
        itemId: String(item?.itemId ?? ""),
        amount: Number(item?.amount ?? 0),
      }))
    : [];
}

export function normalizeQuestRewards(rawRewards = {}) {
  return {
    coins: Number(rawRewards.coins ?? 0),
    xp: Number(rawRewards.xp ?? 0),
    items: normalizeRewardItems(rawRewards.items),
  };
}

export function normalizeQuestObjective(rawObjective = {}, defaultRoomId = null) {
  const type = String(rawObjective.type ?? "");

  if (type === "go-to-location") {
    return {
      type,
      targetLabel: String(rawObjective.targetLabel ?? ""),
      roomId: String(rawObjective.roomId ?? defaultRoomId ?? ""),
      position: normalizePosition(rawObjective.position),
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
    targetLabel: String(rawObjective.targetLabel ?? ""),
  };
}

export function normalizeQuestObjectives(rawObjectives, fallbackObjective, defaultRoomId = null) {
  if (Array.isArray(rawObjectives) && rawObjectives.length > 0) {
    return rawObjectives.map((objective) => normalizeQuestObjective(objective, defaultRoomId));
  }

  return [normalizeQuestObjective(fallbackObjective, defaultRoomId)];
}

export function normalizeItemDefinition(rawItem = {}) {
  return {
    id: String(rawItem.id ?? ""),
    label: String(rawItem.label ?? rawItem.id ?? ""),
    icon: String(rawItem.icon ?? "?"),
    category: hasText(rawItem.category) ? String(rawItem.category) : "misc",
    rarity: ITEM_RARITIES.includes(String(rawItem.rarity)) ? String(rawItem.rarity) : "common",
    sellable: Boolean(rawItem.sellable),
    sellPrice: Number(rawItem.sellPrice ?? 0),
    placeable: Boolean(rawItem.placeable),
    texture: String(rawItem.texture ?? ""),
    furniture: rawItem.furniture
      ? {
          width: Math.max(1, Number(rawItem.furniture.width ?? 1)),
          height: Math.max(1, Number(rawItem.furniture.height ?? 1)),
        }
      : null,
  };
}

export function normalizeShopItem(rawItem = {}) {
  return {
    id: String(rawItem.id ?? ""),
    itemId: String(rawItem.itemId ?? ""),
    label: String(rawItem.label ?? rawItem.itemId ?? ""),
    price: Number(rawItem.price ?? 0),
    amount: Number(rawItem.amount ?? 1),
    rarity: ITEM_RARITIES.includes(String(rawItem.rarity)) ? String(rawItem.rarity) : "common",
    category: SHOP_CATEGORIES.includes(String(rawItem.category))
      ? String(rawItem.category)
      : rawItem.kind === "cosmetic"
        ? "cosmetics"
        : "consumables",
    kind: rawItem.kind === "cosmetic" ? "cosmetic" : "inventory",
    cosmeticSlot: rawItem.cosmeticSlot ? String(rawItem.cosmeticSlot) : null,
  };
}

export function normalizeShopDefinition(rawShop = {}) {
  return {
    id: String(rawShop.id ?? ""),
    npcId: String(rawShop.npcId ?? ""),
    roomId: String(rawShop.roomId ?? ""),
    position: normalizePosition(rawShop.position),
    title: String(rawShop.title ?? "Shop"),
    greeting: String(rawShop.greeting ?? ""),
    items: Array.isArray(rawShop.items) ? rawShop.items.map(normalizeShopItem) : [],
  };
}

export function normalizeDialogueConditions(rawConditions = {}) {
  return {
    questStatus: rawConditions.questStatus ? String(rawConditions.questStatus) : null,
    questId: rawConditions.questId ? String(rawConditions.questId) : null,
    activeQuestId: rawConditions.activeQuestId ? String(rawConditions.activeQuestId) : null,
    requiredCompletedQuestIds: safeStringArray(rawConditions.requiredCompletedQuestIds),
    missingCompletedQuestIds: safeStringArray(rawConditions.missingCompletedQuestIds),
  };
}

export function normalizeDialogueAction(rawAction = null) {
  if (!isRecord(rawAction)) {
    return null;
  }

  return {
    type: String(rawAction.type ?? ""),
    questId: rawAction.questId ? String(rawAction.questId) : null,
    shopId: rawAction.shopId ? String(rawAction.shopId) : null,
    miniGameId: rawAction.miniGameId ? String(rawAction.miniGameId) : null,
  };
}

export function normalizeDialogueTree(rawTree = {}) {
  const nodes = Array.isArray(rawTree.nodes)
    ? rawTree.nodes.map((node, nodeIndex) => {
        const nodeId = String(node?.id ?? `node-${nodeIndex + 1}`);
        return {
          id: nodeId,
          text: String(node?.text ?? ""),
          repeatable: node?.repeatable !== false,
          choices: Array.isArray(node?.choices)
            ? node.choices.map((choice, choiceIndex) => ({
                id: String(choice?.id ?? `${nodeId}-choice-${choiceIndex + 1}`),
                text: String(choice?.text ?? "Devam"),
                nextNodeId: choice?.nextNodeId ? String(choice.nextNodeId) : null,
                close: Boolean(choice?.close),
                repeatable: choice?.repeatable !== false,
                conditions: normalizeDialogueConditions(choice?.conditions),
                action: normalizeDialogueAction(choice?.action),
              }))
            : [],
        };
      })
    : [];
  const rootNodeId = String(rawTree.rootNodeId ?? nodes[0]?.id ?? "");

  return {
    id: String(rawTree.id ?? rawTree.npcId ?? ""),
    npcId: String(rawTree.npcId ?? rawTree.id ?? ""),
    eventTags: safeStringArray(rawTree.eventTags),
    speaker: String(rawTree.speaker ?? "NPC"),
    rootNodeId,
    nodes,
    entryPoints: Array.isArray(rawTree.entryPoints)
      ? rawTree.entryPoints.map((entryPoint, index) => ({
          id: String(entryPoint?.id ?? `entry-${index + 1}`),
          nodeId: String(entryPoint?.nodeId ?? rootNodeId),
          repeatable: entryPoint?.repeatable !== false,
          conditions: normalizeDialogueConditions(entryPoint?.conditions),
        }))
      : [
          {
            id: "default",
            nodeId: rootNodeId,
            repeatable: true,
            conditions: normalizeDialogueConditions(),
          },
        ],
  };
}

export function normalizeQuestLineDefinition(rawLine = {}) {
  const roomId = String(rawLine.roomId ?? "town");
  const npcId = String(rawLine.npcId ?? rawLine.id ?? "");
  const dialogueEntries = isRecord(rawLine.dialogue?.entries) ? rawLine.dialogue.entries : {};
  const defaultLinks = isRecord(rawLine.dialogue?.links) ? rawLine.dialogue.links : {};

  return {
    id: String(rawLine.id ?? ""),
    npcId,
    roomId,
    eventTags: safeStringArray(rawLine.eventTags),
    position: normalizePosition(rawLine.position),
    dialogueEntries,
    quests: Array.isArray(rawLine.quests)
      ? rawLine.quests.map((quest) => {
          const objectives = normalizeQuestObjectives(quest?.objectives, quest?.objective, roomId);
          return {
            id: String(quest?.id ?? ""),
            questLineId: String(rawLine.id ?? ""),
            npcId,
            roomId,
            giverPosition: normalizePosition(rawLine.position),
            title: String(quest?.title ?? ""),
            description: String(quest?.description ?? ""),
            objectives,
            objective: objectives[0],
            type: String(quest?.type ?? objectives[0]?.type ?? ""),
            prerequisites: safeStringArray(quest?.prerequisites),
            rewards: normalizeQuestRewards(quest?.rewards),
            dialogueLinks: {
              ...defaultLinks,
              ...(isRecord(quest?.dialogueLinks) ? quest.dialogueLinks : {}),
            },
          };
        })
      : [],
  };
}

export function normalizeRoomDefinition(roomId, rawRoom = {}) {
  return {
    id: String(rawRoom.id ?? roomId),
    name: String(rawRoom.name ?? roomId),
    width: Number(rawRoom.width ?? 20),
    height: Number(rawRoom.height ?? 14),
    spawn: normalizePosition(rawRoom.spawn) ?? { x: 1, y: 1 },
    baseTexture: String(rawRoom.baseTexture ?? "grass"),
    paths: Array.isArray(rawRoom.paths) ? rawRoom.paths : [],
    fountain: normalizePosition(rawRoom.fountain),
    decorations: Array.isArray(rawRoom.decorations) ? rawRoom.decorations : [],
    labels: Array.isArray(rawRoom.labels) ? rawRoom.labels : [],
    npcs: Array.isArray(rawRoom.npcs) ? rawRoom.npcs : [],
    pickups: Array.isArray(rawRoom.pickups) ? rawRoom.pickups : [],
    chests: Array.isArray(rawRoom.chests) ? rawRoom.chests : [],
    portals: Array.isArray(rawRoom.portals) ? rawRoom.portals : [],
    crosswalks: Array.isArray(rawRoom.crosswalks) ? rawRoom.crosswalks : [],
    waterfront: isRecord(rawRoom.waterfront) ? rawRoom.waterfront : null,
    ambiance: isRecord(rawRoom.ambiance) ? rawRoom.ambiance : {},
  };
}

export function validateItemCollection(rawItems, source = "items.json") {
  const errors = [];

  if (!Array.isArray(rawItems)) {
    pushError(errors, source, "must export an array of item definitions");
    return errors;
  }

  rawItems.forEach((item, index) => {
    const path = `${source}[${index}]`;
    if (!isRecord(item)) {
      pushError(errors, path, "must be an object");
      return;
    }
    if (!hasText(item.id)) {
      pushError(errors, `${path}.id`, "is required");
    }
    if (!hasText(item.label)) {
      pushError(errors, `${path}.label`, "is required");
    }
    if (!hasText(item.category)) {
      pushError(errors, `${path}.category`, "is required");
    } else if (!ITEM_CATEGORIES.includes(String(item.category))) {
      pushError(errors, `${path}.category`, `must be one of ${ITEM_CATEGORIES.join(", ")}`);
    }
    if (item.rarity && !ITEM_RARITIES.includes(String(item.rarity))) {
      pushError(errors, `${path}.rarity`, `must be one of ${ITEM_RARITIES.join(", ")}`);
    }
    if (!isFiniteNumber(item.sellPrice ?? 0)) {
      pushError(errors, `${path}.sellPrice`, "must be numeric");
    }
    if (item.placeable && !hasText(item.texture)) {
      pushError(errors, `${path}.texture`, "is required for placeable items");
    }
  });

  return errors;
}

export function validateQuestLineDefinition(rawLine, source = "quest.json") {
  const errors = [];

  if (!isRecord(rawLine)) {
    pushError(errors, source, "must be an object");
    return errors;
  }

  if (!hasText(rawLine.id)) {
    pushError(errors, `${source}.id`, "is required");
  }
  if (!hasText(rawLine.npcId)) {
    pushError(errors, `${source}.npcId`, "is required");
  }
  if (!hasText(rawLine.roomId)) {
    pushError(errors, `${source}.roomId`, "is required");
  }
  if (!Array.isArray(rawLine.quests) || rawLine.quests.length === 0) {
    pushError(errors, `${source}.quests`, "must contain at least one quest");
    return errors;
  }

  rawLine.quests.forEach((quest, index) => {
    const path = `${source}.quests[${index}]`;
    if (!isRecord(quest)) {
      pushError(errors, path, "must be an object");
      return;
    }
    if (!hasText(quest.id)) {
      pushError(errors, `${path}.id`, "is required");
    }
    if (!hasText(quest.title)) {
      pushError(errors, `${path}.title`, "is required");
    }
    if (!hasText(quest.description)) {
      pushError(errors, `${path}.description`, "is required");
    }
    const objectives = Array.isArray(quest.objectives) && quest.objectives.length > 0 ? quest.objectives : [quest.objective];
    objectives.forEach((objective, objectiveIndex) => {
      const objectivePath = `${path}.objectives[${objectiveIndex}]`;
      if (!isRecord(objective)) {
        pushError(errors, objectivePath, "must be an object");
        return;
      }
      if (!QUEST_OBJECTIVE_TYPES.includes(String(objective.type ?? ""))) {
        pushError(errors, `${objectivePath}.type`, `must be one of ${QUEST_OBJECTIVE_TYPES.join(", ")}`);
      }
    });
  });

  return errors;
}

export function validateDialogueTree(rawTree, source = "dialogue.json") {
  const errors = [];

  if (!isRecord(rawTree)) {
    pushError(errors, source, "must be an object");
    return errors;
  }

  if (!hasText(rawTree.npcId)) {
    pushError(errors, `${source}.npcId`, "is required");
  }
  if (!hasText(rawTree.speaker)) {
    pushError(errors, `${source}.speaker`, "is required");
  }
  if (!Array.isArray(rawTree.nodes) || rawTree.nodes.length === 0) {
    pushError(errors, `${source}.nodes`, "must contain at least one node");
    return errors;
  }

  const nodeIds = new Set();
  rawTree.nodes.forEach((node, index) => {
    const path = `${source}.nodes[${index}]`;
    if (!isRecord(node)) {
      pushError(errors, path, "must be an object");
      return;
    }
    if (!hasText(node.id)) {
      pushError(errors, `${path}.id`, "is required");
    } else {
      nodeIds.add(String(node.id));
    }
    if (!hasText(node.text)) {
      pushError(errors, `${path}.text`, "is required");
    }
    if (node.choices && !Array.isArray(node.choices)) {
      pushError(errors, `${path}.choices`, "must be an array");
    }
    (Array.isArray(node.choices) ? node.choices : []).forEach((choice, choiceIndex) => {
      const choicePath = `${path}.choices[${choiceIndex}]`;
      if (!isRecord(choice)) {
        pushError(errors, choicePath, "must be an object");
        return;
      }
      if (!hasText(choice.text)) {
        pushError(errors, `${choicePath}.text`, "is required");
      }
      if (choice.action?.type && !DIALOGUE_ACTION_TYPES.includes(String(choice.action.type))) {
        pushError(errors, `${choicePath}.action.type`, `must be one of ${DIALOGUE_ACTION_TYPES.join(", ")}`);
      }
    });
  });

  (Array.isArray(rawTree.entryPoints) ? rawTree.entryPoints : []).forEach((entryPoint, index) => {
    const path = `${source}.entryPoints[${index}]`;
    if (!isRecord(entryPoint)) {
      pushError(errors, path, "must be an object");
      return;
    }
    if (!hasText(entryPoint.nodeId)) {
      pushError(errors, `${path}.nodeId`, "is required");
    } else if (!nodeIds.has(String(entryPoint.nodeId))) {
      pushError(errors, `${path}.nodeId`, "must point to an existing node");
    }
  });

  return errors;
}

export function validateRoomsCollection(rawRooms, source = "rooms.json") {
  const errors = [];

  if (!isRecord(rawRooms)) {
    pushError(errors, source, "must be an object map of rooms");
    return errors;
  }

  Object.entries(rawRooms).forEach(([roomId, room]) => {
    const path = `${source}.${roomId}`;
    if (!isRecord(room)) {
      pushError(errors, path, "must be an object");
      return;
    }
    if (!hasText(room.name)) {
      pushError(errors, `${path}.name`, "is required");
    }
    if (!isFiniteNumber(room.width) || !isFiniteNumber(room.height)) {
      pushError(errors, `${path}.width`, "and height must be numeric");
    }
    if (!isRecord(room.spawn) || !isFiniteNumber(room.spawn.x) || !isFiniteNumber(room.spawn.y)) {
      pushError(errors, `${path}.spawn`, "must contain numeric x/y");
    }
    if (!Array.isArray(room.npcs)) {
      pushError(errors, `${path}.npcs`, "must be an array");
    }
    (Array.isArray(room.npcs) ? room.npcs : []).forEach((npc, npcIndex) => {
      if (!isRecord(npc) || !hasText(npc.id)) {
        pushError(errors, `${path}.npcs[${npcIndex}]`, "must include an id");
      }
    });
    (Array.isArray(room.pickups) ? room.pickups : []).forEach((pickup, pickupIndex) => {
      if (!isRecord(pickup) || !hasText(pickup.id) || !hasText(pickup.itemId)) {
        pushError(errors, `${path}.pickups[${pickupIndex}]`, "must include id and itemId");
      }
    });
    (Array.isArray(room.chests) ? room.chests : []).forEach((chest, chestIndex) => {
      if (!isRecord(chest) || !hasText(chest.id) || !hasText(chest.lootTableId)) {
        pushError(errors, `${path}.chests[${chestIndex}]`, "must include id and lootTableId");
      }
    });
    if (!Array.isArray(room.portals)) {
      pushError(errors, `${path}.portals`, "must be an array");
    }
    (Array.isArray(room.portals) ? room.portals : []).forEach((portal, portalIndex) => {
      if (!isRecord(portal) || !hasText(portal.id) || !hasText(portal.targetRoomId)) {
        pushError(errors, `${path}.portals[${portalIndex}]`, "must include id and targetRoomId");
      }
    });
  });

  return errors;
}

export function validateShopDefinition(rawShop, source = "shop.json") {
  const errors = [];

  if (!isRecord(rawShop)) {
    pushError(errors, source, "must be an object");
    return errors;
  }

  if (!hasText(rawShop.id)) {
    pushError(errors, `${source}.id`, "is required");
  }
  if (!hasText(rawShop.npcId)) {
    pushError(errors, `${source}.npcId`, "is required");
  }
  if (!hasText(rawShop.roomId)) {
    pushError(errors, `${source}.roomId`, "is required");
  }
  if (!Array.isArray(rawShop.items) || rawShop.items.length === 0) {
    pushError(errors, `${source}.items`, "must contain at least one item");
    return errors;
  }

  rawShop.items.forEach((item, index) => {
    const path = `${source}.items[${index}]`;
    if (!isRecord(item)) {
      pushError(errors, path, "must be an object");
      return;
    }
    if (!hasText(item.id)) {
      pushError(errors, `${path}.id`, "is required");
    }
    if (!hasText(item.itemId)) {
      pushError(errors, `${path}.itemId`, "is required");
    }
    if (!isFiniteNumber(item.price) || Number(item.price) < 0) {
      pushError(errors, `${path}.price`, "must be a non-negative number");
    }
    if (!isFiniteNumber(item.amount) || Number(item.amount) <= 0) {
      pushError(errors, `${path}.amount`, "must be a positive number");
    }
    if (item.category && !SHOP_CATEGORIES.includes(String(item.category))) {
      pushError(errors, `${path}.category`, `must be one of ${SHOP_CATEGORIES.join(", ")}`);
    }
    if (item.kind === "cosmetic" && item.cosmeticSlot && !COSMETIC_SLOTS.includes(String(item.cosmeticSlot))) {
      pushError(errors, `${path}.cosmeticSlot`, "must be a valid cosmetic slot");
    }
  });

  return errors;
}

export function reportContentValidationWarnings(contentType, source, errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return;
  }

  console.warn(`[content:${contentType}] ${source}\n- ${errors.join("\n- ")}`);
}

export function validateNpcCollection(rawNpcs, source = "npcs.json") {
  const errors = [];

  if (!Array.isArray(rawNpcs)) {
    pushError(errors, source, "must export an array of NPC definitions");
    return errors;
  }

  rawNpcs.forEach((npc, index) => {
    const path = `${source}[${index}]`;
    if (!isRecord(npc)) {
      pushError(errors, path, "must be an object");
      return;
    }
    if (!hasText(npc.id)) {
      pushError(errors, `${path}.id`, "is required");
    }
    if (!hasText(npc.name)) {
      pushError(errors, `${path}.name`, "is required");
    }
    if (npc.role && !NPC_ROLES.includes(String(npc.role))) {
      pushError(errors, `${path}.role`, `must be one of ${NPC_ROLES.join(", ")}`);
    }
    if (!Array.isArray(npc.rooms) || npc.rooms.length === 0) {
      pushError(errors, `${path}.rooms`, "must contain at least one room entry");
    }
    if (npc.dialogueId && !hasText(npc.dialogueId)) {
      pushError(errors, `${path}.dialogueId`, "must be a non-empty string");
    }
  });

  return errors;
}

export function validateFurnitureCollection(rawFurniture, source = "furniture.json") {
  const errors = [];

  if (!Array.isArray(rawFurniture)) {
    pushError(errors, source, "must export an array of furniture definitions");
    return errors;
  }

  rawFurniture.forEach((entry, index) => {
    const path = `${source}[${index}]`;
    if (!isRecord(entry)) {
      pushError(errors, path, "must be an object");
      return;
    }
    if (!hasText(entry.id)) {
      pushError(errors, `${path}.id`, "is required");
    }
    if (!hasText(entry.itemId)) {
      pushError(errors, `${path}.itemId`, "is required");
    }
    if (!FURNITURE_CATEGORIES.includes(String(entry.category ?? ""))) {
      pushError(errors, `${path}.category`, `must be one of ${FURNITURE_CATEGORIES.join(", ")}`);
    }
    if (!isFiniteNumber(entry.width) || Number(entry.width) <= 0) {
      pushError(errors, `${path}.width`, "must be a positive number");
    }
    if (!isFiniteNumber(entry.height) || Number(entry.height) <= 0) {
      pushError(errors, `${path}.height`, "must be a positive number");
    }
  });

  return errors;
}

export function validateLootTableCollection(rawTables, source = "loot.json") {
  const errors = [];

  if (!Array.isArray(rawTables)) {
    pushError(errors, source, "must export an array of loot tables");
    return errors;
  }

  rawTables.forEach((table, index) => {
    const path = `${source}[${index}]`;
    if (!isRecord(table)) {
      pushError(errors, path, "must be an object");
      return;
    }
    if (!hasText(table.id)) {
      pushError(errors, `${path}.id`, "is required");
    }
    if (!isFiniteNumber(table.rolls) || Number(table.rolls) <= 0) {
      pushError(errors, `${path}.rolls`, "must be a positive number");
    }
    if (!Array.isArray(table.entries) || table.entries.length === 0) {
      pushError(errors, `${path}.entries`, "must contain at least one entry");
      return;
    }
    table.entries.forEach((entry, entryIndex) => {
      const entryPath = `${path}.entries[${entryIndex}]`;
      if (!isRecord(entry)) {
        pushError(errors, entryPath, "must be an object");
        return;
      }
      if (!hasText(entry.id)) {
        pushError(errors, `${entryPath}.id`, "is required");
      }
      if (!hasText(entry.itemId)) {
        pushError(errors, `${entryPath}.itemId`, "is required");
      }
      if (!["inventory", "cosmetic"].includes(String(entry.kind ?? ""))) {
        pushError(errors, `${entryPath}.kind`, "must be inventory or cosmetic");
      }
      if (!isFiniteNumber(entry.weight) || Number(entry.weight) <= 0) {
        pushError(errors, `${entryPath}.weight`, "must be a positive number");
      }
      if (!isFiniteNumber(entry.minAmount) || !isFiniteNumber(entry.maxAmount)) {
        pushError(errors, `${entryPath}.minAmount`, "and maxAmount must be numeric");
      }
    });
  });

  return errors;
}

export function validateWorldEventCollection(rawEvents, source = "events.json") {
  const errors = [];

  if (!Array.isArray(rawEvents)) {
    pushError(errors, source, "must export an array of world events");
    return errors;
  }

  rawEvents.forEach((event, index) => {
    const path = `${source}[${index}]`;
    if (!isRecord(event)) {
      pushError(errors, path, "must be an object");
      return;
    }
    if (!hasText(event.id)) {
      pushError(errors, `${path}.id`, "is required");
    }
    if (!WORLD_EVENT_TYPES.includes(String(event.type ?? ""))) {
      pushError(errors, `${path}.type`, `must be one of ${WORLD_EVENT_TYPES.join(", ")}`);
    }
    if (!hasText(event.roomId)) {
      pushError(errors, `${path}.roomId`, "is required");
    }
    if (!hasText(event.title)) {
      pushError(errors, `${path}.title`, "is required");
    }
    if (!isFiniteNumber(event.durationMs) || Number(event.durationMs) <= 0) {
      pushError(errors, `${path}.durationMs`, "must be a positive number");
    }
    if (!isFiniteNumber(event.weight) || Number(event.weight) <= 0) {
      pushError(errors, `${path}.weight`, "must be a positive number");
    }
  });

  return errors;
}

export function validateSeasonalEventCollection(rawEvents, source = "seasonal-events.json") {
  const errors = [];

  if (!Array.isArray(rawEvents)) {
    pushError(errors, source, "must export an array of seasonal events");
    return errors;
  }

  rawEvents.forEach((event, index) => {
    const path = `${source}[${index}]`;
    if (!isRecord(event)) {
      pushError(errors, path, "must be an object");
      return;
    }
    if (!hasText(event.id)) {
      pushError(errors, `${path}.id`, "is required");
    }
    if (!hasText(event.title)) {
      pushError(errors, `${path}.title`, "is required");
    }
    if (!hasText(event.startMonthDay) || !hasText(event.endMonthDay)) {
      pushError(errors, `${path}.startMonthDay`, "and endMonthDay are required");
    }
    if (!Array.isArray(event.roomIds)) {
      pushError(errors, `${path}.roomIds`, "must be an array");
    }
  });

  return errors;
}

export function validateCosmeticSetCollection(rawSets, source = "cosmetic-set.json") {
  const errors = [];

  if (!Array.isArray(rawSets)) {
    pushError(errors, source, "must export an array of cosmetic sets");
    return errors;
  }

  rawSets.forEach((entry, index) => {
    const path = `${source}[${index}]`;
    if (!isRecord(entry)) {
      pushError(errors, path, "must be an object");
      return;
    }
    if (!hasText(entry.id)) {
      pushError(errors, `${path}.id`, "is required");
    }
    if (!hasText(entry.title)) {
      pushError(errors, `${path}.title`, "is required");
    }
    if (!isRecord(entry.slots)) {
      pushError(errors, `${path}.slots`, "must be an object");
      return;
    }
    COSMETIC_SLOTS.forEach((slot) => {
      if (entry.slots[slot] && !Array.isArray(entry.slots[slot])) {
        pushError(errors, `${path}.slots.${slot}`, "must be an array when provided");
      }
    });
  });

  return errors;
}
