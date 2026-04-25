import { getDefaultAudioSettings, normalizeAudioSettings } from "../state/audioSettingsState.js";

let audioManagerInstance = null;

function createNoiseBuffer(context) {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const channelData = buffer.getChannelData(0);

  for (let index = 0; index < channelData.length; index += 1) {
    channelData[index] = Math.random() * 2 - 1;
  }

  return buffer;
}

function createLoopingNoise(context, noiseBuffer, destination, { type = "lowpass", frequency = 900, q = 1, gain = 0.04 } = {}) {
  const source = context.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const filter = context.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q;

  const gainNode = context.createGain();
  gainNode.gain.value = gain;

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(destination);
  source.start();

  return {
    stop() {
      try {
        source.stop();
      } catch {}
      source.disconnect();
      filter.disconnect();
      gainNode.disconnect();
    },
  };
}

function createOscillatorLayer(context, destination, { type = "sine", frequency = 220, gain = 0.03 } = {}) {
  const oscillator = context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.value = frequency;

  const gainNode = context.createGain();
  gainNode.gain.value = gain;

  oscillator.connect(gainNode);
  gainNode.connect(destination);
  oscillator.start();

  return {
    stop() {
      try {
        oscillator.stop();
      } catch {}
      oscillator.disconnect();
      gainNode.disconnect();
    },
  };
}

function createAudioManager() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextCtor) {
    return createNoopAudioManager();
  }

  const context = new AudioContextCtor();
  const noiseBuffer = createNoiseBuffer(context);
  const masterGain = context.createGain();
  const musicGain = context.createGain();
  const ambientGain = context.createGain();
  const effectsGain = context.createGain();

  masterGain.gain.value = 1;
  musicGain.gain.value = getDefaultAudioSettings().musicVolume;
  ambientGain.gain.value = getDefaultAudioSettings().ambientVolume;
  effectsGain.gain.value = getDefaultAudioSettings().effectsVolume;

  musicGain.connect(masterGain);
  ambientGain.connect(masterGain);
  effectsGain.connect(masterGain);
  masterGain.connect(context.destination);

  let currentMusicLayers = [];
  let currentAmbientLayers = [];
  let currentWeatherLayers = [];
  let currentEnvironmentKey = "";

  function stopLayers(layerGroup) {
    layerGroup.forEach((layer) => layer.stop?.());
    return [];
  }

  function ensureRunning() {
    if (context.state === "suspended") {
      void context.resume();
    }
  }

  function startMusicLayers() {
    currentMusicLayers = stopLayers(currentMusicLayers);
    currentMusicLayers = [
      createOscillatorLayer(context, musicGain, { type: "sine", frequency: 174.61, gain: 0.018 }),
      createOscillatorLayer(context, musicGain, { type: "triangle", frequency: 261.63, gain: 0.012 }),
    ];
  }

  function startAmbientLayers(roomId) {
    currentAmbientLayers = stopLayers(currentAmbientLayers);

    if (roomId === "beach") {
      currentAmbientLayers = [
        createLoopingNoise(context, noiseBuffer, ambientGain, { type: "lowpass", frequency: 560, q: 0.8, gain: 0.055 }),
        createOscillatorLayer(context, ambientGain, { type: "sine", frequency: 196, gain: 0.007 }),
      ];
      return;
    }

    if (roomId === "cafe") {
      currentAmbientLayers = [
        createLoopingNoise(context, noiseBuffer, ambientGain, { type: "bandpass", frequency: 420, q: 0.7, gain: 0.028 }),
        createOscillatorLayer(context, ambientGain, { type: "triangle", frequency: 246.94, gain: 0.008 }),
      ];
      return;
    }

    if (roomId === "town") {
      currentAmbientLayers = [
        createLoopingNoise(context, noiseBuffer, ambientGain, { type: "bandpass", frequency: 780, q: 0.8, gain: 0.022 }),
        createOscillatorLayer(context, ambientGain, { type: "sine", frequency: 329.63, gain: 0.006 }),
      ];
      return;
    }

    currentAmbientLayers = [
      createLoopingNoise(context, noiseBuffer, ambientGain, { type: "lowpass", frequency: 340, q: 0.6, gain: 0.018 }),
    ];
  }

  function startWeatherLayers(weather) {
    currentWeatherLayers = stopLayers(currentWeatherLayers);

    if (weather !== "rain") {
      return;
    }

    currentWeatherLayers = [
      createLoopingNoise(context, noiseBuffer, ambientGain, { type: "highpass", frequency: 1200, q: 0.7, gain: 0.03 }),
      createLoopingNoise(context, noiseBuffer, ambientGain, { type: "bandpass", frequency: 900, q: 1.1, gain: 0.02 }),
    ];
  }

  return {
    unlock() {
      ensureRunning();
      if (!currentMusicLayers.length) {
        startMusicLayers();
      }
    },
    applySettings(rawSettings) {
      const settings = normalizeAudioSettings(rawSettings);
      musicGain.gain.value = settings.musicVolume;
      ambientGain.gain.value = settings.ambientVolume;
      effectsGain.gain.value = settings.effectsVolume;
      return settings;
    },
    setEnvironment({ roomId, weather }) {
      ensureRunning();
      const nextKey = `${roomId}:${weather}`;

      if (!currentMusicLayers.length) {
        startMusicLayers();
      }

      if (nextKey === currentEnvironmentKey) {
        return;
      }

      currentEnvironmentKey = nextKey;
      startAmbientLayers(roomId);
      startWeatherLayers(weather);
    },
    playUiTone(kind = "soft") {
      ensureRunning();
      const frequency = kind === "error" ? 180 : kind === "confirm" ? 540 : 360;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = kind === "error" ? "sawtooth" : "sine";
      oscillator.frequency.value = frequency;
      gainNode.gain.setValueAtTime(0.0001, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.04, context.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12);

      oscillator.connect(gainNode);
      gainNode.connect(effectsGain);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.14);
    },
    destroy() {
      currentMusicLayers = stopLayers(currentMusicLayers);
      currentAmbientLayers = stopLayers(currentAmbientLayers);
      currentWeatherLayers = stopLayers(currentWeatherLayers);
      masterGain.disconnect();
      void context.close();
    },
  };
}

function createNoopAudioManager() {
  return {
    unlock() {},
    applySettings(rawSettings) {
      return normalizeAudioSettings(rawSettings);
    },
    setEnvironment() {},
    playUiTone() {},
    destroy() {},
  };
}

export function getAudioManager() {
  if (!audioManagerInstance) {
    audioManagerInstance = createAudioManager();
  }

  return audioManagerInstance;
}
