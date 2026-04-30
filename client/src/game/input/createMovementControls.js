export function createMovementControls(scene) {
  const cursors = scene.input.keyboard.createCursorKeys();
  const wasd = scene.input.keyboard.addKeys("W,A,S,D,SHIFT");

  return {
    up: wasd.W,
    left: wasd.A,
    down: wasd.S,
    right: wasd.D,
    sprint: wasd.SHIFT,
    cursors,
  };
}
