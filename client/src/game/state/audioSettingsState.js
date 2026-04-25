const AUDIO_SETTINGS_STORAGE_KEY = "social-rpg-audio-settings";

export function getDefaultAudioSettings() {
  return {
    musicVolume: 0.32,
    ambientVolume: 0.48,
    effectsVolume: 0.4,
    chatVisible: true,
    speechBubblesEnabled: true,
    performanceMode: false,
  };
}

export function normalizeAudioSettings(rawSettings) {
  const defaults = getDefaultAudioSettings();
  return {
    musicVolume: clampVolume(rawSettings?.musicVolume ?? defaults.musicVolume),
    ambientVolume: clampVolume(rawSettings?.ambientVolume ?? defaults.ambientVolume),
    effectsVolume: clampVolume(rawSettings?.effectsVolume ?? rawSettings?.uiVolume ?? defaults.effectsVolume),
    chatVisible: Boolean(rawSettings?.chatVisible ?? defaults.chatVisible),
    speechBubblesEnabled: Boolean(rawSettings?.speechBubblesEnabled ?? defaults.speechBubblesEnabled),
    performanceMode: Boolean(rawSettings?.performanceMode ?? defaults.performanceMode),
  };
}

export function loadAudioSettings() {
  try {
    const rawValue = window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
    return normalizeAudioSettings(rawValue ? JSON.parse(rawValue) : null);
  } catch {
    return getDefaultAudioSettings();
  }
}

export function saveAudioSettings(settings) {
  const normalized = normalizeAudioSettings(settings);
  window.localStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function clampVolume(value) {
  return Math.max(0, Math.min(1, Number(value ?? 0)));
}
