const OVERLAY_ID = "game-root-overlay";
const DEBUG_PANEL_ID = "game-world-debug";
const STORAGE_KEY = "kasaba:action-logs";
const DEBUG_LIMIT = 150;
let debugEntries = loadPersistentLogs();

function loadPersistentLogs() {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function savePersistentLogs() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(debugEntries.slice(-DEBUG_LIMIT)));
  } catch (e) {
    // Silently fail if storage full
  }
}

function isWorldDebugEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  const urlFlag = new URLSearchParams(window.location.search).get("world_debug");
  if (urlFlag === "1" || urlFlag === "true") {
    return true;
  }

  return window.localStorage?.getItem("kasaba:world-debug") === "1";
}

// Global Interaction Tracker
if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", (e) => {
    const target = e.target;
    if (target.closest("button") || target.closest(".game-root-overlay__card")) {
      const label = target.textContent?.trim().slice(0, 30) || target.className || "unknown-element";
      logWorldFlow("UI Click", { element: label, x: Math.round(e.clientX), y: Math.round(e.clientY) });
    }
  }, true);

  window.addEventListener("error", (e) => {
    logWorldFlow("CRITICAL ERROR", { message: e.message, filename: e.filename, lineno: e.lineno });
  });
}

function getDebugHost() {
  if (typeof document === "undefined") {
    return null;
  }

  return document.getElementById(DEBUG_PANEL_ID);
}

function ensureDebugPanel() {
  if (typeof document === "undefined") {
    return null;
  }

  const gameRoot = getGameRoot();
  if (!gameRoot) {
    return null;
  }

  let panel = getDebugHost();
  if (!panel) {
    panel = document.createElement("div");
    panel.id = DEBUG_PANEL_ID;
    panel.className = "game-world-debug";
    panel.innerHTML = `
      <div class="game-world-debug__title">
        <span>World Debug & Action Logs</span>
        <button onclick="localStorage.removeItem('${STORAGE_KEY}'); location.reload();" style="float:right; font-size:9px; background:rgba(255,0,0,0.2); border:none; color:white; cursor:pointer; border-radius:4px; padding:2px 5px;">Temizle</button>
      </div>
      <div class="game-world-debug__body"></div>
    `;
    gameRoot.appendChild(panel);
  }

  const isEnabled = isWorldDebugEnabled();
  panel.classList.toggle("is-visible", isEnabled);
  
  if (!isEnabled) return panel;

  const body = panel.querySelector(".game-world-debug__body");
  if (!body) {
    return panel;
  }

  body.innerHTML = debugEntries
    .slice(-DEBUG_LIMIT)
    .map((entry) => `<div>${entry}</div>`)
    .join("");
  body.scrollTop = body.scrollHeight;
  return panel;
}

function pushDebugEntry(step, details = null) {
  const time = new Date();
  const hh = String(time.getHours()).padStart(2, "0");
  const mm = String(time.getMinutes()).padStart(2, "0");
  const ss = String(time.getSeconds()).padStart(2, "0");
  const detailText =
    details === null || details === undefined
      ? ""
      : typeof details === "string"
        ? ` | ${details}`
        : ` | ${JSON.stringify(details)}`;
  
  const entry = `[${hh}:${mm}:${ss}] ${step}${detailText}`;
  debugEntries.push(entry);
  
  if (debugEntries.length > DEBUG_LIMIT) {
    debugEntries.splice(0, debugEntries.length - DEBUG_LIMIT);
  }
  
  savePersistentLogs();
  ensureDebugPanel();
}

function getGameRoot() {
  if (typeof document === "undefined") {
    return null;
  }

  return document.getElementById("game-root");
}

function ensureOverlay() {
  const gameRoot = getGameRoot();
  if (!gameRoot) {
    return null;
  }

  ensureDebugPanel();

  let overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    return overlay;
  }

  overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.className = "game-root-overlay";
  overlay.innerHTML = `
    <div class="game-root-overlay__card">
      <div class="game-root-overlay__eyebrow">KASABA ONLINE</div>
      <h2 class="game-root-overlay__title">Yukleniyor</h2>
      <p class="game-root-overlay__message"></p>
      <button type="button" class="game-root-overlay__action"></button>
    </div>
  `;

  gameRoot.appendChild(overlay);
  return overlay;
}

export function ensureGameCanvasVisible(game) {
  const canvas = game?.canvas;
  if (!canvas) {
    return null;
  }

  canvas.style.display = "block";
  canvas.style.visibility = "visible";
  canvas.style.opacity = "1";
  canvas.style.pointerEvents = "auto";

  return {
    clientWidth: canvas.clientWidth,
    clientHeight: canvas.clientHeight,
    width: canvas.width,
    height: canvas.height,
    display: canvas.style.display,
    visibility: canvas.style.visibility,
    opacity: canvas.style.opacity,
  };
}

export function logWorldFlow(step, details = null) {
  pushDebugEntry(step, details);
  if (details === null || details === undefined) {
    // eslint-disable-next-line no-console
    console.log(`[WorldFlow] ${step}`);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[WorldFlow] ${step}`, details);
}

export function validateWorldSession(session) {
  const errors = [];
  const safeSession = session ?? {};
  const playerName = String(safeSession.playerName ?? "").trim();
  const authToken = String(safeSession.authToken ?? "").trim();
  const isGuest = Boolean(safeSession.isGuest);

  if (!playerName) {
    errors.push("Oyuncu adi eksik.");
  }

  if (!authToken) {
    errors.push("Oturum bilgisi eksik.");
  }

  if (!authToken && isGuest) {
    errors.push("Misafir oturumu olusturulamadi.");
  }

  return errors;
}

export function showGameRootOverlay({
  title = "Yukleniyor",
  message = "",
  variant = "loading",
  actionLabel = "",
  onAction = null,
} = {}) {
  const overlay = ensureOverlay();
  if (!overlay) {
    return;
  }

  overlay.dataset.variant = variant;
  overlay.classList.add("is-visible");

  const titleNode = overlay.querySelector(".game-root-overlay__title");
  const messageNode = overlay.querySelector(".game-root-overlay__message");
  const actionButton = overlay.querySelector(".game-root-overlay__action");

  if (titleNode) {
    titleNode.textContent = title;
  }

  if (messageNode) {
    messageNode.textContent = message;
  }

  if (actionButton) {
    actionButton.textContent = actionLabel || "Tekrar Dene";
    actionButton.style.display = onAction ? "inline-flex" : "none";
    actionButton.onclick = onAction;
  }
}

export function hideGameRootOverlay() {
  const overlay = ensureOverlay();
  if (!overlay) {
    return;
  }

  overlay.classList.remove("is-visible");
  overlay.dataset.variant = "hidden";
  const actionButton = overlay.querySelector(".game-root-overlay__action");
  if (actionButton) {
    actionButton.onclick = null;
  }
}
