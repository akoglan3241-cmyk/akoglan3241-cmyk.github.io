export const DAY_NIGHT_CONFIG = {
  enabled: true,
  cycleDurationMs: 180000,
  phases: [
    {
      id: "morning",
      label: "Sabah",
      progress: 0,
      skyColor: 0x9edcff,
      glowAlpha: 0.22,
      cloudAlpha: 0.78,
      darknessAlpha: 0.02,
    },
    {
      id: "day",
      label: "Gunduz",
      progress: 0.25,
      skyColor: 0x84d5ff,
      glowAlpha: 0.12,
      cloudAlpha: 0.72,
      darknessAlpha: 0,
    },
    {
      id: "sunset",
      label: "Aksamustu",
      progress: 0.58,
      skyColor: 0xf1b07b,
      glowAlpha: 0.28,
      cloudAlpha: 0.66,
      darknessAlpha: 0.08,
    },
    {
      id: "night",
      label: "Gece",
      progress: 0.8,
      skyColor: 0x10233f,
      glowAlpha: 0.05,
      cloudAlpha: 0.4,
      darknessAlpha: 0.2,
    },
    {
      id: "morning-wrap",
      label: "Sabah",
      progress: 1,
      skyColor: 0x9edcff,
      glowAlpha: 0.22,
      cloudAlpha: 0.78,
      darknessAlpha: 0.02,
    },
  ],
};

export function getRoomDayNightConfig(room) {
  return {
    enabled: room?.ambiance?.dayNight?.enabled ?? DAY_NIGHT_CONFIG.enabled,
    cycleDurationMs: Math.max(30000, Number(room?.ambiance?.dayNight?.cycleDurationMs ?? DAY_NIGHT_CONFIG.cycleDurationMs)),
  };
}
