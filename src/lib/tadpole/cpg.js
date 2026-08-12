/**
 * Bilateral central pattern generator, reduced from the Xenopus dIN/cIN
 * half-centre circuit.
 *
 * Per body segment there is a left and a right excitatory population. Each has
 *   V  — reduced membrane potential (dimensionless, ~[0,1])
 *   w  — slow adaptation / rebound variable
 *   sA — fast AMPA-like ipsilateral synaptic output
 *   sN — slow NMDA-like output that sustains depolarisation across cycles
 *   sI — commissural inhibitory output onto the contralateral side
 *
 * Alternation is NOT imposed: it emerges from commissural inhibition plus
 * post-inhibitory rebound (w decays while a side is inhibited, so that side
 * becomes excitable exactly as inhibition lifts). The rostrocaudal travelling
 * wave emerges from delayed ipsilateral projections from segment i-1 to i.
 *
 * State is stored structure-of-arrays in Float32Arrays; nothing is allocated
 * per step.
 */

const EL = 0.0;     // leak reversal
const EK = -0.35;   // adaptation reversal
const EI = -0.45;   // inhibitory reversal
const VTH = 0.42;   // half-activation of the population firing curve
const KS = 0.055;   // firing-curve slope

const TAU_M = 0.008;   // membrane
const TAU_W = 0.055;   // adaptation / rebound
const TAU_A = 0.004;   // AMPA-like
const TAU_N = 0.048;   // NMDA-like
const TAU_I = 0.006;   // commissural inhibition

const G_AD = 1.35;
const G_INH = 2.4;
const G_A = 0.30;
const G_N = 0.42;
const G_SELF = 0.22;

const firing = (V) => 1 / (1 + Math.exp(-(V - VTH) / KS));

export default class CPG {
  /** @param {number} S number of segments @param {number} delaySteps rostrocaudal conduction delay */
  constructor(S, delaySteps = 6) {
    this.S = S;
    const n = S * 2; // [left..., right...]
    this.V = new Float32Array(n);
    this.w = new Float32Array(n);
    this.sA = new Float32Array(n);
    this.sN = new Float32Array(n);
    this.sI = new Float32Array(n);
    this.out = new Float32Array(n); // firing rate, read by the muscles

    // ring buffer of past ipsilateral output for the conduction delay
    this.D = delaySteps;
    this.buf = new Float32Array(n * this.D);
    this.head = 0;

    // tiny asymmetric seed so the antiphase limit cycle has something to grow from
    for (let i = 0; i < S; i++) {
      this.V[i] = 0.30 + 0.02 * Math.sin(i);
      this.V[S + i] = 0.22;
    }
  }

  /**
   * @param {number} dt seconds (neural substep, ~1 ms)
   * @param {Float32Array} driveL descending drive per segment, left
   * @param {Float32Array} driveR descending drive per segment, right
   */
  step(dt, driveL, driveR) {
    const { S, V, w, sA, sN, sI, out, buf, D } = this;
    const prev = (this.head + D - 1) % D;

    for (let side = 0; side < 2; side++) {
      const o = side * S;
      const co = (1 - side) * S;
      const drive = side === 0 ? driveL : driveR;

      for (let i = 0; i < S; i++) {
        const k = o + i;
        // delayed ipsilateral excitation from the next-rostral segment
        const rost = i > 0 ? buf[prev * S * 2 + o + (i - 1)] : 0;
        const exc = G_A * (sA[k] * G_SELF + rost) + G_N * sN[k];
        const inh = G_INH * sI[co + i] * (V[k] - EI);
        const adapt = G_AD * w[k] * (V[k] - EK);

        const dV = (-(V[k] - EL) + drive[i] + exc - adapt - inh) / TAU_M;
        V[k] += dV * dt;
        if (V[k] > 1.6) V[k] = 1.6; else if (V[k] < -0.8) V[k] = -0.8;

        const f = firing(V[k]);
        out[k] = f;
        w[k] += ((f - w[k]) / TAU_W) * dt;
        sA[k] += ((f - sA[k]) / TAU_A) * dt;
        sN[k] += ((f - sN[k]) / TAU_N) * dt;
        sI[k] += ((f - sI[k]) / TAU_I) * dt;
      }
    }

    // push this step's output into the delay line
    const base = this.head * S * 2;
    for (let k = 0; k < S * 2; k++) buf[base + k] = out[k];
    this.head = (this.head + 1) % D;
  }

  /** Left/right phase difference of segment i, via the Hilbert-free proxy (V, w). */
  phaseDiff(i = 0) {
    const S = this.S;
    const pl = Math.atan2(this.w[i] - 0.35, this.V[i] - 0.35);
    const pr = Math.atan2(this.w[S + i] - 0.35, this.V[S + i] - 0.35);
    return Math.abs(((pl - pr + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  }
}