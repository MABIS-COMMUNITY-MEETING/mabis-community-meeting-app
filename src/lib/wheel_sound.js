/*
 * Wheel audio — a short tactile knock for each segment, a low launch
 * transient, and a restrained plucked landing phrase. It shares the app-wide
 * AudioContext so the first spin cannot race a second browser audio unlock.
 */
import { isSoundEnabled, withSoundContext } from "@/lib/sound";

function knock(audioContext, time, frequency, volume, output) {
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  filter.type = "bandpass";
  filter.frequency.value = frequency;
  filter.Q.value = 6;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);
  filter.connect(gain).connect(output);

  let ended = 0;
  [1, 2.41].forEach((multiplier, index) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = index ? "square" : "triangle";
    oscillator.frequency.setValueAtTime(frequency * multiplier, time);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * multiplier * 0.88, time + 0.07);
    oscillator.connect(filter);
    oscillator.onended = () => {
      try { oscillator.disconnect(); } catch {}
      ended += 1;
      if (ended === 2) {
        try { filter.disconnect(); gain.disconnect(); } catch {}
      }
    };
    oscillator.start(time);
    oscillator.stop(time + 0.1);
  });
}

function pluck(audioContext, time, frequency, volume, output) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(frequency, time);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(frequency * 7, time);
  filter.frequency.exponentialRampToValueAtTime(frequency * 1.6, time + 0.5);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.9);
  oscillator.connect(filter).connect(gain).connect(output);
  oscillator.onended = () => {
    try { oscillator.disconnect(); filter.disconnect(); gain.disconnect(); } catch {}
  };
  oscillator.start(time);
  oscillator.stop(time + 0.95);
}

function shimmer(audioContext, time, output) {
  for (let index = 0; index < 9; index += 1) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = time + Math.random() * 0.22;
    oscillator.type = "sine";
    oscillator.frequency.value = 3200 + Math.random() * 2600;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.016, start + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
    oscillator.connect(gain).connect(output);
    oscillator.onended = () => {
      try { oscillator.disconnect(); gain.disconnect(); } catch {}
    };
    oscillator.start(start);
    oscillator.stop(start + 0.45);
  }
}

/** One segment passing the pointer. Pitch rises slightly as the wheel slows. */
export function playWheelTick(progress = 0) {
  if (!isSoundEnabled()) return;
  withSoundContext((audioContext) => {
    knock(audioContext, audioContext.currentTime, 620 + progress * 260, 0.045, audioContext.destination);
  });
}

/** Launch feedback. */
export function playWheelStart() {
  if (!isSoundEnabled()) return;
  withSoundContext((audioContext) => {
    const time = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(180, time);
    oscillator.frequency.exponentialRampToValueAtTime(52, time + 0.3);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.15, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.onended = () => {
      try { oscillator.disconnect(); gain.disconnect(); } catch {}
    };
    oscillator.start(time);
    oscillator.stop(time + 0.5);
    knock(audioContext, time, 900, 0.035, audioContext.destination);
  }, { unlock: true });
}

/** Landing feedback. */
export function playWheelWin() {
  if (!isSoundEnabled()) return;
  withSoundContext((audioContext) => {
    const time = audioContext.currentTime;
    [293.66, 311.13, 392, 440, 587.33].forEach((frequency, index) => {
      pluck(audioContext, time + index * 0.085, frequency, 0.065, audioContext.destination);
    });
    shimmer(audioContext, time + 0.2, audioContext.destination);
  });
}