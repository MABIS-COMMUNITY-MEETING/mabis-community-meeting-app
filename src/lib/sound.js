const KEY = "mabis_sound_enabled";

let enabled = (() => {
  try { return localStorage.getItem(KEY) !== "false"; } catch { return true; }
})();

let ctx = null;
let resumePromise = null;
let noiseBuffer = null;

export function isSoundEnabled() {
  return enabled;
}

export function setSoundEnabled(value) {
  enabled = !!value;
  try { localStorage.setItem(KEY, enabled ? "true" : "false"); } catch {}
  try { window.dispatchEvent(new CustomEvent("mabis-sound-changed", { detail: enabled })); } catch {}

  // The toggle click is a valid user gesture. When sound is being switched on,
  // use that exact gesture to unlock Web Audio and provide quiet confirmation.
  if (enabled) {
    void unlockSound().then((audioContext) => {
      if (enabled && audioContext) tick(audioContext, audioContext.currentTime + 0.004, 1050, 0.022, 0.045);
    });
  }
}

function getCtx(create = true) {
  if (typeof window === "undefined") return null;
  if (!ctx && create) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      try { ctx = new AudioContextClass({ latencyHint: "interactive" }); }
      catch { ctx = new AudioContextClass(); }
    }
  }
  return ctx;
}

/**
 * Resume the shared context from a real tap/click/key event. The promise is
 * shared so pointerdown + click cannot race or create duplicate contexts.
 */
export function unlockSound() {
  if (!enabled) return Promise.resolve(null);
  const audioContext = getCtx(true);
  if (!audioContext) return Promise.resolve(null);
  if (audioContext.state === "running") return Promise.resolve(audioContext);
  if (resumePromise) return resumePromise;

  const pending = audioContext.resume()
    .then(() => audioContext.state === "running" ? audioContext : null)
    .catch(() => null);
  resumePromise = pending;
  void pending.finally(() => {
    if (resumePromise === pending) resumePromise = null;
  });
  return pending;
}

/**
 * Schedule a sound only after the one shared context is actually running.
 * Hover/ambient sounds never create a context; direct controls may opt into
 * unlock so the first real interaction produces its own feedback.
 */
export function withSoundContext(render, { unlock = false } = {}) {
  if (!enabled) return;
  const audioContext = getCtx(false);
  if (audioContext?.state === "running") {
    try { render(audioContext); } catch {}
    return;
  }
  if (!unlock) return;
  void unlockSound().then((runningContext) => {
    if (!enabled || !runningContext) return;
    try { render(runningContext); } catch {}
  });
}

function getNoiseBuffer(audioContext) {
  if (noiseBuffer && noiseBuffer.sampleRate === audioContext.sampleRate) return noiseBuffer;
  const length = Math.ceil(audioContext.sampleRate * 0.5);
  noiseBuffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const samples = noiseBuffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    samples[index] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

function noiseBurst(audioContext, time, duration, volume, filterType, frequency, q = 1) {
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  const buffer = getNoiseBuffer(audioContext);
  const maxOffset = Math.max(0, buffer.duration - duration);

  source.buffer = buffer;
  filter.type = filterType;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  gain.gain.setValueAtTime(Math.max(0.0001, volume), time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  source.connect(filter).connect(gain).connect(audioContext.destination);
  source.onended = () => {
    try { source.disconnect(); filter.disconnect(); gain.disconnect(); } catch {}
  };
  source.start(time, Math.random() * maxOffset, duration);
}

function tick(audioContext, time, frequency, volume, duration = 0.05) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, time);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.82, time + duration);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.onended = () => {
    try { oscillator.disconnect(); gain.disconnect(); } catch {}
  };
  oscillator.start(time);
  oscillator.stop(time + duration + 0.01);
}

function clickGesture(audioContext) {
  const time = audioContext.currentTime + 0.003;
  noiseBurst(audioContext, time, 0.012, 0.045, "highpass", 3200, 0.7);
  tick(audioContext, time, 1450, 0.035, 0.028);
  tick(audioContext, time + 0.012, 620, 0.022, 0.038);
}

// Local synthesis removes a first-click network race and works offline.
export function playClick() {
  withSoundContext(clickGesture, { unlock: true });
}

// Mechanical keypress: a short high click plus a soft body transient.
export function playType() {
  withSoundContext((audioContext) => {
    const now = audioContext.currentTime;
    const body = 200 + Math.random() * 90;

    noiseBurst(audioContext, now, 0.006, 0.055, "highpass", 7000, 0.6);

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(body, now);
    oscillator.frequency.exponentialRampToValueAtTime(body * 0.7, now + 0.03);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.onended = () => {
      try { oscillator.disconnect(); gain.disconnect(); } catch {}
    };
    oscillator.start(now);
    oscillator.stop(now + 0.045);

    noiseBurst(audioContext, now + 0.003, 0.012, 0.022, "bandpass", 1200, 1.4);
  }, { unlock: true });
}

/* One quiet sonic family: tiny sine ticks and filtered-noise gestures.
   Hover is throttled and never creates or unlocks the audio context. */

let lastHover = 0;
export function playHover() {
  if (!enabled) return;
  const now = performance.now();
  if (now - lastHover < 90) return;
  lastHover = now;
  withSoundContext((audioContext) => {
    tick(audioContext, audioContext.currentTime, 2400 + Math.random() * 240, 0.022, 0.045);
  });
}

let lastSection = 0;
export function playSectionEnter() {
  if (!enabled) return;
  const now = performance.now();
  if (now - lastSection < 260) return;
  lastSection = now;
  withSoundContext((audioContext) => {
    const time = audioContext.currentTime;
    tick(audioContext, time, 520, 0.03, 0.09);
    tick(audioContext, time + 0.05, 780, 0.018, 0.07);
  });
}

export function playMenuOpen() {
  withSoundContext((audioContext) => {
    const time = audioContext.currentTime;
    tick(audioContext, time, 140, 0.05, 0.14);
    tick(audioContext, time + 0.05, 2900, 0.018, 0.04);
    noiseBurst(audioContext, time, 0.12, 0.015, "lowpass", 600, 0.8);
  }, { unlock: true });
}

export function playMenuClose() {
  withSoundContext((audioContext) => {
    const time = audioContext.currentTime;
    tick(audioContext, time, 2900, 0.016, 0.04);
    tick(audioContext, time + 0.04, 110, 0.045, 0.12);
  }, { unlock: true });
}

export function playTransition() {
  withSoundContext((audioContext) => {
    const time = audioContext.currentTime;
    const length = Math.ceil(audioContext.sampleRate * 0.28);
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) {
      const progress = index / length;
      samples[index] = (Math.random() * 2 - 1) * Math.sin(progress * Math.PI) * 0.6;
    }

    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.Q.value = 1.1;
    filter.frequency.setValueAtTime(400, time);
    filter.frequency.exponentialRampToValueAtTime(2200, time + 0.28);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.03, time + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.28);
    source.connect(filter).connect(gain).connect(audioContext.destination);
    source.onended = () => {
      try { source.disconnect(); filter.disconnect(); gain.disconnect(); } catch {}
    };
    source.start(time);
  });
}