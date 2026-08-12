/**
 * Segmental swimming musculature.
 *
 * Motor output is not force. Each side of each segment runs a two-stage
 * (bi-exponential) activation cascade whose impulse response peaks ~20 ms after
 * a motor spike, matching the hatchling reference. Force then follows a
 * simplified Hill model: F = a·Fmax·f_l(l)·f_v(l̇) + F_passive(l), so muscles
 * are activation-limited, shortening-limited and can never produce
 * unbounded force.
 */

const TAU_RISE = 0.010;   // s — cascade stage 1
const TAU_FALL = 0.010;   // s — cascade stage 2 (peak ≈ τ1 + τ2 ≈ 20 ms)

export default class Muscles {
  constructor(S) {
    this.S = S;
    const n = S * 2;
    this.x = new Float32Array(n);  // cascade intermediate
    this.a = new Float32Array(n);  // activation 0..1
    this.F = new Float32Array(n);  // Hill force
    this.strain = new Float32Array(n);      // l/l0 - 1, from actual body curvature
    this.strainRate = new Float32Array(n);
  }

  /** @param {Float32Array} u motor drive (CPG firing rate) length 2S */
  step(dt, u, Fmax = 1) {
    const { x, a, F, strain, strainRate } = this;
    for (let k = 0; k < x.length; k++) {
      x[k] += ((u[k] - x[k]) / TAU_RISE) * dt;
      a[k] += ((x[k] - a[k]) / TAU_FALL) * dt;

      // force–length: gaussian around optimum, force–velocity: Hill hyperbola
      const l = 1 + strain[k];
      const fl = Math.exp(-Math.pow((l - 1) / 0.45, 2));
      const v = strainRate[k];
      const fv = v < 0 ? (1 - v / 4.5) / (1 - v / 1.2) : 1.4 - 0.4 / (1 + 6 * v);
      const passive = strain[k] > 0 ? 0.35 * strain[k] * strain[k] : 0;
      F[k] = Math.max(0, a[k] * Fmax * fl * Math.min(fv, 1.6)) + passive;
    }
  }

  /** Net bending demand of segment i: positive bends toward the left side. */
  net(i) { return this.F[i] - this.F[this.S + i]; }
}