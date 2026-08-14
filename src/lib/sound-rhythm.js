// Rhythm envelope for the SND level bars.
//
// This module contains loudness-over-time only: three levels per frame saying
// how hard the low, mid and high bands are struck. It is not audio. Nothing is
// decoded, nothing is played, no recording ships with the app, and there is no
// AudioContext anywhere in this path — the bars simply move on a timer.
//
// Derivation: a 140.6 BPM source, per-band onset strength (positive spectral
// flux) at 93.75 fps, phase-aligned to the strongest downbeat grid, then
// averaged over the 35 whole repetitions of a two-bar window so the loop seams
// without a click. Levels are percentile-clipped to the real dynamic range and
// quantised 0-9.
//
// 96 frames over 3.4139s is ~28fps, which is plenty for three 2px bars.

export const RHYTHM_LOOP_SECONDS = 3.4139;
export const RHYTHM_FRAMES = 96;

// 3 chars per frame: low, mid, high.
const PACKED =
  "977556573654336435928765542445233470978521694033433144639420545637854446475204" +
  "79207665055340734553012242417835310343535562525453259722467664334895533155272650" +
  "0327846634712656121243569556431000004365656730242603443003177015464426410302264" +
  "923350450021009499475334333566301875628064675345347";

// Bars never collapse to nothing — a level of 0 still shows the resting stub,
// so the control keeps its shape between hits.
const REST = 0.22;
const PEAK = 1;

/** Decoded once at module load: Float32Array of 96*3 scale factors. */
export const RHYTHM = (() => {
  const out = new Float32Array(RHYTHM_FRAMES * 3);
  for (let i = 0; i < RHYTHM_FRAMES * 3; i += 1) {
    const level = PACKED.charCodeAt(i) - 48;
    out[i] = REST + (PEAK - REST) * (level > 0 ? level / 9 : 0);
  }
  return out;
})();

/**
 * Scale factor for one bar at a point in time.
 * @param {number} elapsedSeconds time since the loop started
 * @param {number} bar 0 = low, 1 = mid, 2 = high
 */
export function rhythmScale(elapsedSeconds, bar) {
  const phase = ((elapsedSeconds % RHYTHM_LOOP_SECONDS) + RHYTHM_LOOP_SECONDS) % RHYTHM_LOOP_SECONDS;
  const frame = Math.floor((phase / RHYTHM_LOOP_SECONDS) * RHYTHM_FRAMES) % RHYTHM_FRAMES;
  return RHYTHM[frame * 3 + bar];
}
