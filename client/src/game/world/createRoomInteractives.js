import { TreasureChest } from "../entities/TreasureChest.js";
import { WorldPickup } from "../entities/WorldPickup.js";
import { tileToWorld, logicalToScreen } from "./roomUtils.js";

export function createRoomInteractives(scene, room, activeWorldEvents = []) {
  const eventPickups = activeWorldEvents
    .map((event) => event?.pickup)
    .filter(Boolean)
    .map((pickup) => ({
      id: pickup.id,
      itemId: pickup.itemId,
      amount: pickup.amount,
      label: pickup.label,
      texture: pickup.texture,
      x: pickup.tileX,
      y: pickup.tileY,
    }));

  const eventChests = activeWorldEvents
    .map((event) => event?.chest)
    .filter(Boolean)
    .map((chest) => ({
      id: chest.id,
      label: chest.label,
      x: chest.tileX,
      y: chest.tileY,
    }));

  const eventObjects = activeWorldEvents
    .filter((event) => event?.festival)
    .flatMap((event) => {
      const position = tileToWorld(event.festival.tileX, event.festival.tileY);
      const screenPos = logicalToScreen(position.x, position.y);
      const glow = scene.add.circle(screenPos.x, screenPos.y + 16, 28, 0xffd99d, 0.22).setDepth(position.y - 4);
      const label = scene.add
        .text(screenPos.x, screenPos.y - 26, event.festival.label, {
          fontFamily: "Trebuchet MS",
          fontSize: "12px",
          color: "#173449",
          backgroundColor: "#fff4cf",
          padding: { left: 6, right: 6, top: 3, bottom: 3 },
        })
        .setOrigin(0.5)
        .setDepth(position.y + 2);
      return [glow, label];
    });

  const pickups = [...room.pickups, ...eventPickups].map((pickupData) => {
    const position = tileToWorld(pickupData.x, pickupData.y);
    return new WorldPickup(scene, {
      ...pickupData,
      x: position.x,
      y: position.y,
    });
  });

  const chests = [...room.chests, ...eventChests].map((chestData) => {
    const position = tileToWorld(chestData.x, chestData.y);
    return new TreasureChest(scene, {
      ...chestData,
      x: position.x,
      y: position.y,
    });
  });

  return { pickups, chests, eventObjects };
}
