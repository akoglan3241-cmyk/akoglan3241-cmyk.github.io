export function createNameTag(scene, x, y, options = {}) {
  const {
    isLocal = false,
    initialName = "",
    initialLevel = null,
    initialBadge = "",
    type = "player", // "player", "npc", "pickup"
  } = options;

  let backgroundColor = isLocal ? 0x1a3a5c : 0x21445c;
  let borderColor = isLocal ? 0x4a9eff : 0x3d6e8f;

  if (type === "npc") {
    backgroundColor = 0x41295d; // Purple for NPCs
    borderColor = 0x7d63c7;
  } else if (type === "pickup") {
    backgroundColor = 0x173449;
    borderColor = 0x2d5c7c;
  }
  
  const partyColor = 0x2f5a45;
  let currentBackgroundColor = backgroundColor;
  
  const container = scene.add.container(x, y);
  
  const background = scene.add.graphics();
  const text = scene.add.text(0, 0, "", {
    fontFamily: "'Nunito', 'Trebuchet MS', sans-serif",
    fontSize: "13px",
    fontWeight: "800",
    color: "#f6fbff",
    padding: { left: 10, right: 10, top: 4, bottom: 4 },
  }).setOrigin(0.5);

  container.add([background, text]);

  function formatName(name, level, badge) {
    const levelPrefix = level ? `Lv.${level} ` : "";
    return badge ? `${levelPrefix}[${badge}] ${name}` : `${levelPrefix}${name}`;
  }

  function relayout() {
    const width = text.width + 4;
    const height = text.height;
    
    background.clear();
    
    // Shadow
    background.fillStyle(0x000000, 0.24);
    background.fillRoundedRect(-width / 2 + 1, -height / 2 + 1, width, height, 6);
    
    // Main background
    background.fillStyle(currentBackgroundColor, 0.92);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    
    // Border
    background.lineStyle(1.5, borderColor, 0.65);
    background.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
  }

  function update(name, level, badge) {
    text.setText(formatName(name, level, badge));
    relayout();
  }

  update(initialName, initialLevel, initialBadge);

  return {
    container,
    update,
    setPartyMember(isPartyMember) {
      currentBackgroundColor = isPartyMember ? partyColor : backgroundColor;
      relayout();
    },
    setVisible(visible) {
      container.setVisible(visible);
    },
    setPosition(nextX, nextY) {
      container.setPosition(nextX, nextY);
    },
    setDepth(depth) {
      container.setDepth(depth);
    },
    destroy() {
      container.destroy();
    }
  };
}
