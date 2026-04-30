import Phaser from "phaser";
import { GAME_SIZE } from "../constants.js";
import { getRoomWeather } from "../state/weatherState.js";

const WEATHER_META = {
  clear: {
    label: "Acik",
    tintColor: 0xffffff,
    tintAlpha: 0,
    cloudAlpha: 0.62,
    rainVisible: false,
  },
  cloudy: {
    label: "Bulutlu",
    tintColor: 0xb7c8d9,
    tintAlpha: 0.12,
    cloudAlpha: 0.9,
    rainVisible: false,
  },
  rain: {
    label: "Yagmur",
    tintColor: 0x7b93aa,
    tintAlpha: 0.18,
    cloudAlpha: 1,
    rainVisible: true,
  },
};

export function createWeatherController(scene) {
  const rainGraphics = scene.add.graphics().setScrollFactor(0).setDepth(2105);
  let room = null;
  let roomMap = null;
  let weatherState = [];
  let performanceMode = false;

  function isOutdoorRoom() {
    return Boolean(room?.ambiance?.weather?.enabled);
  }

  function applyWeather() {
    if (!roomMap?.skyVisuals || !room) {
      rainGraphics.clear();
      return null;
    }

    const weather = isOutdoorRoom() ? getRoomWeather(weatherState, room.id) : "clear";
    const weatherMeta = WEATHER_META[weather] ?? WEATHER_META.clear;
    const tintAlpha = performanceMode ? Math.min(weatherMeta.tintAlpha, 0.08) : weatherMeta.tintAlpha;
    const cloudAlpha = performanceMode ? Math.min(weatherMeta.cloudAlpha, 0.35) : weatherMeta.cloudAlpha;

    roomMap.skyVisuals.weatherTint.setFillStyle(weatherMeta.tintColor, tintAlpha);
    roomMap.skyVisuals.clouds.setAlpha(cloudAlpha);
    roomMap.skyVisuals.glow.setAlpha(performanceMode ? Math.min(roomMap.skyVisuals.glow.alpha, 0.1) : roomMap.skyVisuals.glow.alpha);
    roomMap.skyVisuals.skyline.setAlpha(performanceMode ? 0.12 : 0.24);

    rainGraphics.clear();

    if (weatherMeta.rainVisible && !performanceMode) {
      rainGraphics.lineStyle(2, 0xbfe8ff, 0.34);
      const offset = (scene.time.now * 0.22) % 32;

      for (let index = 0; index < 24; index += 1) {
        const x = (index * 56 + offset) % (GAME_SIZE.width + 40);
        const y = (index * 27 + offset * 1.8) % (GAME_SIZE.height + 30);
        rainGraphics.lineBetween(x, y, x - 8, y + 22);
      }
    }

    return {
      weather,
      label: weatherMeta.label,
    };
  }

  return {
    setRoom(nextRoom, nextRoomMap) {
      room = nextRoom;
      roomMap = nextRoomMap;
      return applyWeather();
    },
    setWeatherState(nextWeatherState) {
      weatherState = nextWeatherState;
      return applyWeather();
    },
    setPerformanceMode(nextPerformanceMode) {
      performanceMode = Boolean(nextPerformanceMode);
      return applyWeather();
    },
    update() {
      return applyWeather();
    },
  };
}
