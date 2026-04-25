export type WeatherType = "clear" | "cloudy" | "rain";

interface RoomWeatherState {
  roomId: string;
  weather: WeatherType;
  updatedAt: number;
}

const WEATHER_ROTATION_INTERVAL_MS = 120000;
const OUTDOOR_ROOM_IDS = ["town", "beach"];
const WEATHER_OPTIONS: WeatherType[] = ["clear", "cloudy", "rain"];
const roomWeatherState = new Map<string, RoomWeatherState>(
  OUTDOOR_ROOM_IDS.map((roomId) => [
    roomId,
    {
      roomId,
      weather: "clear",
      updatedAt: Date.now(),
    },
  ]),
);

function pickNextWeather(currentWeather: WeatherType): WeatherType {
  const choices = WEATHER_OPTIONS.filter((entry) => entry !== currentWeather);
  return choices[Math.floor(Math.random() * choices.length)] ?? currentWeather;
}

export function getWeatherRotationIntervalMs(): number {
  return WEATHER_ROTATION_INTERVAL_MS;
}

export function getWeatherStateSnapshot() {
  return Array.from(roomWeatherState.values()).map((entry) => ({ ...entry }));
}

export function rotateWeatherStates(now = Date.now()) {
  const changedStates: RoomWeatherState[] = [];

  roomWeatherState.forEach((entry, roomId) => {
    const nextWeather = pickNextWeather(entry.weather);
    const nextState = {
      roomId,
      weather: nextWeather,
      updatedAt: now,
    };
    roomWeatherState.set(roomId, nextState);
    changedStates.push({ ...nextState });
  });

  return changedStates;
}
