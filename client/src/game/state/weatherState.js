export function normalizeWeatherState(rawState) {
  return Array.isArray(rawState)
    ? rawState
        .map((entry) => ({
          roomId: String(entry?.roomId ?? ""),
          weather: ["clear", "cloudy", "rain"].includes(String(entry?.weather)) ? String(entry.weather) : "clear",
          updatedAt: Number(entry?.updatedAt ?? 0),
        }))
        .filter((entry) => entry.roomId)
    : [];
}

export function getRoomWeather(weatherState, roomId) {
  return normalizeWeatherState(weatherState).find((entry) => entry.roomId === roomId)?.weather ?? "clear";
}
