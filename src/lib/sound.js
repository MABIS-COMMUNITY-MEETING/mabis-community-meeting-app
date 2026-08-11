const KEY = "mabis_sound_enabled";

let enabled = (() => {
  try { return localStorage.getItem(KEY) !== "false"; } catch { return true; }
})();

let ctx = null;

const CLICK_SOUND_URL = "https://media.base44.com/files/public/6a2fcc3f4fec7200fed7a889/3db4f74bb_universfield-computer-mouse-click-352734.mp3";
const TYPE_SOUND_URL = "https://media.base44.com/files/public/6a2fcc3f4fec7200fed7a889/011842ec2_dragon-studio-keyboard-typing-sound-effect-335503.mp3";
let clickAudio = null;
let typeAudio = null;
function getClickAudio() {
  if (typeof window === "undefined") return null;
  if (!clickAudio) {
    clickAudio = new Audio(CLICK_SOUND_URL);
    clickAudio.volume = 0.6;
  }
  return clickAudio;
}
function getTypeAudio() {
  if (typeof window === "undefined") return null;
  if (!typeAudio) {
    typeAudio = new Audio(TYPE_SOUND_URL);
    typeAudio.volume = 0.45;
  }
  return typeAudio;
}

export function isSoundEnabled() {
  return enabled;
}

export function setSoundEnabled(v) {
  enabled = !!v;
  try { localStorage.setItem(KEY, enabled ? "true" : "false"); } catch {}
}

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  return ctx;
}

function noiseBurst(c, t, dur, vol, filterType, freq, q = 1) {
  const len = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.8);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = filterType;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

// Realistic mouse click using the attached mp3.
export function playClick() {
  if (!enabled) return;
  const a = getClickAudio();
  if (!a) return;
  try {
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch {}
}

// Mechanical keyboard keypress (Cherry-MX-style): sharp click + plastic thock.
export function playType() {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume();
  const now = c.currentTime;
  const body = 200 + Math.random() * 90;

  // Sharp metallic click (high-passed noise ~7 kHz, ~5 ms)
  noiseBurst(c, now, 0.006, 0.07, "highpass", 7000, 0.6);

  // Plastic thock (triangle pluck, ~200 Hz, short)
  const o = c.createOscillator();
  const og = c.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(body, now);
  o.frequency.exponentialRampToValueAtTime(body * 0.7, now + 0.03);
  og.gain.setValueAtTime(0.0001, now);
  og.gain.exponentialRampToValueAtTime(0.06, now + 0.002);
  og.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
  o.connect(og).connect(c.destination);
  o.start(now);
  o.stop(now + 0.045);

  // Soft clack (band-passed noise ~1.2 kHz)
  noiseBurst(c, now + 0.003, 0.012, 0.03, "bandpass", 1200, 1.4);
}