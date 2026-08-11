/*
 * Wheel audio — Japanese-inspired: a hollow bamboo/wood knock (shishi-odoshi)
 * for each segment that passes the pointer, a taiko thud on launch, and a koto
 * pluck with suzu bell shimmer when the wheel lands.
 *
 * Same house style as src/lib/sound.js: synthesized, short, quiet, and silent
 * whenever the user has sound switched off.
 */
import { isSoundEnabled } from "@/lib/sound";

let ctx = null;
function ac() {
	if (typeof window === "undefined") return null;
	if (!ctx) {
		const AC = window.AudioContext || window.webkitAudioContext;
		if (AC) ctx = new AC();
	}
	if (ctx && ctx.state === "suspended") ctx.resume();
	return ctx;
}

function bus(c, vol) {
	const g = c.createGain();
	g.gain.value = vol;
	g.connect(c.destination);
	return g;
}

/* woody resonant knock — two detuned square partials through a narrow bandpass */
function knock(c, t, freq, vol, out) {
	const f = c.createBiquadFilter();
	f.type = "bandpass";
	f.frequency.value = freq;
	f.Q.value = 6;
	const g = c.createGain();
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(vol, t + 0.003);
	g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
	f.connect(g).connect(out);

	[1, 2.41].forEach((mult, i) => {
		const o = c.createOscillator();
		o.type = i ? "square" : "triangle";
		o.frequency.setValueAtTime(freq * mult, t);
		o.frequency.exponentialRampToValueAtTime(freq * mult * 0.88, t + 0.07);
		o.connect(f);
		o.start(t);
		o.stop(t + 0.1);
	});
}

/* plucked string — koto-ish: bright attack, long-ish decay */
function pluck(c, t, freq, vol, out) {
	const o = c.createOscillator();
	const g = c.createGain();
	const f = c.createBiquadFilter();
	o.type = "sawtooth";
	o.frequency.setValueAtTime(freq, t);
	f.type = "lowpass";
	f.frequency.setValueAtTime(freq * 7, t);
	f.frequency.exponentialRampToValueAtTime(freq * 1.6, t + 0.5);
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
	g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
	o.connect(f).connect(g).connect(out);
	o.start(t);
	o.stop(t + 0.95);
}

/* suzu bells — a cluster of tiny inharmonic sine partials */
function bells(c, t, out) {
	for (let i = 0; i < 9; i++) {
		const o = c.createOscillator();
		const g = c.createGain();
		const st = t + Math.random() * 0.22;
		o.type = "sine";
		o.frequency.value = 3200 + Math.random() * 2600;
		g.gain.setValueAtTime(0.0001, st);
		g.gain.exponentialRampToValueAtTime(0.02, st + 0.004);
		g.gain.exponentialRampToValueAtTime(0.0001, st + 0.4);
		o.connect(g).connect(out);
		o.start(st);
		o.stop(st + 0.45);
	}
}

/** One segment passing the pointer. Pitch rises slightly as the wheel slows. */
export function playWheelTick(progress = 0) {
	if (!isSoundEnabled()) return;
	const c = ac();
	if (!c) return;
	const t = c.currentTime;
	knock(c, t, 620 + progress * 260, 0.05, bus(c, 1));
}

/** Launch — taiko-style low thud with a hard rim edge. */
export function playWheelStart() {
	if (!isSoundEnabled()) return;
	const c = ac();
	if (!c) return;
	const t = c.currentTime;
	const out = bus(c, 1);
	const o = c.createOscillator();
	const g = c.createGain();
	o.type = "sine";
	o.frequency.setValueAtTime(180, t);
	o.frequency.exponentialRampToValueAtTime(52, t + 0.3);
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(0.18, t + 0.008);
	g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
	o.connect(g).connect(out);
	o.start(t);
	o.stop(t + 0.5);
	knock(c, t, 900, 0.04, out);
}

/** Landing — rising koto phrase (pentatonic) plus a bell shimmer. */
export function playWheelWin() {
	if (!isSoundEnabled()) return;
	const c = ac();
	if (!c) return;
	const t = c.currentTime;
	const out = bus(c, 1);
	/* in-sen scale fragment — unmistakably Japanese */
	[293.66, 311.13, 392.0, 440.0, 587.33].forEach((f, i) => {
		pluck(c, t + i * 0.085, f, 0.075, out);
	});
	bells(c, t + 0.2, out);
}