export const SPAWN_POINT = { x: 312, y: 744 };

export const DEFAULT_INVENTORY_ITEMS = {
  coin: 0,
  key: 0,
  giftBox: 0,
};

export const QUEST_TARGET_RANGE = 44;
export const NPC_INTERACTION_RANGE = 84;
export const PICKUP_RANGE = 34;
export const CHEST_INTERACTION_RANGE = 52;

function tileToWorld(tileX, tileY) {
  return {
    x: tileX * 48 + 24,
    y: tileY * 48 + 24,
  };
}

export const ROOMS = {
  town: {
    id: "town",
    name: "Town Square",
    spawn: tileToWorld(6, 15),
    portals: [
      { id: "portal-town-cafe", position: tileToWorld(5, 4), targetRoomId: "cafe" },
      { id: "portal-town-home", position: tileToWorld(24, 18), targetRoomId: "home" },
    ],
  },
  cafe: {
    id: "cafe",
    name: "Moon Cafe",
    spawn: tileToWorld(10, 10),
    portals: [
      { id: "portal-cafe-town", position: tileToWorld(10, 12), targetRoomId: "town" },
      { id: "portal-cafe-home", position: tileToWorld(17, 10), targetRoomId: "home" },
    ],
  },
  home: {
    id: "home",
    name: "Quiet Home",
    spawn: tileToWorld(9, 9),
    portals: [
      { id: "portal-home-town", position: tileToWorld(9, 10), targetRoomId: "town" },
      { id: "portal-home-cafe", position: tileToWorld(15, 8), targetRoomId: "cafe" },
    ],
  },
};

export const PICKUPS = {
  "pickup-coin-east": { id: "pickup-coin-east", itemId: "coin", amount: 8, roomId: "town", position: tileToWorld(17, 11) },
  "pickup-coin-south": { id: "pickup-coin-south", itemId: "coin", amount: 5, roomId: "town", position: tileToWorld(9, 18) },
  "pickup-key-west": { id: "pickup-key-west", itemId: "key", amount: 1, roomId: "town", position: tileToWorld(4, 13) },
  "pickup-gift-north": { id: "pickup-gift-north", itemId: "giftBox", amount: 1, roomId: "town", position: tileToWorld(20, 8) },
  "pickup-cafe-coin": { id: "pickup-cafe-coin", itemId: "coin", amount: 4, roomId: "cafe", position: tileToWorld(13, 9) },
  "pickup-home-gift": { id: "pickup-home-gift", itemId: "giftBox", amount: 1, roomId: "home", position: tileToWorld(12, 8) },
};

export const CHESTS = {
  "chest-workshop": {
    id: "chest-workshop",
    roomId: "town",
    position: tileToWorld(26, 16),
    costs: [{ itemId: "key", amount: 1 }],
    rewards: [
      { itemId: "coin", amount: 20 },
      { itemId: "giftBox", amount: 1 },
    ],
  },
  "chest-home": {
    id: "chest-home",
    roomId: "home",
    position: tileToWorld(6, 8),
    costs: [],
    rewards: [{ itemId: "coin", amount: 12 }],
  },
};
