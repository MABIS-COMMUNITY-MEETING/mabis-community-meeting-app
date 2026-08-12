/**
 * Constant-acceleration Kalman filter, one instance per axis.
 *
 * State  x = [p, v, a]ᵀ
 * Model  p' = p + v·dt + ½a·dt²,  v' = v + a·dt,  a' = a
 *
 * Why not a frame-difference velocity? Raw pointer deltas are quantised to
 * integer CSS pixels and arrive on an irregular clock, so a naive difference is
 * extremely noisy at low speed — exactly where the cursor must feel most
 * precise. The filter's measurement noise R is tuned LOW (we largely trust the
 * pointer) so this suppresses quantisation jitter without adding lag, while
 * still giving a usable acceleration estimate for prediction and deformation.
 *
 * All matrices are flat Float64Arrays reused every update — zero allocation.
 */

export default class AxisEstimator {
  constructor(q = 5e4, r = 0.9) {
    this.x = new Float64Array(3);          // p, v, a
    this.P = new Float64Array(9);          // covariance, row-major 3x3
    this.P[0] = this.P[4] = this.P[8] = 1e3;
    this.q = q;                             // process noise (jerk variance)
    this.r = r;                             // measurement noise (px²)
    this._F = new Float64Array(9);
    this._T = new Float64Array(9);
    this.initialised = false;
  }

  reset(p) {
    this.x[0] = p; this.x[1] = 0; this.x[2] = 0;
    this.P.fill(0);
    this.P[0] = this.P[4] = this.P[8] = 1e3;
    this.initialised = true;
  }

  /** Predict + correct with a measured position at timestep dt (seconds). */
  update(z, dt) {
    if (!this.initialised) { this.reset(z); return; }
    if (!(dt > 0) || dt > 0.25) dt = 1 / 120;

    const F = this._F, T = this._T, P = this.P, x = this.x;
    const h = 0.5 * dt * dt;

    // ── predict state: x = F x ──────────────────────────────────────────
    const p = x[0] + x[1] * dt + x[2] * h;
    const v = x[1] + x[2] * dt;
    x[0] = p; x[1] = v;

    // F
    F[0] = 1; F[1] = dt; F[2] = h;
    F[3] = 0; F[4] = 1;  F[5] = dt;
    F[6] = 0; F[7] = 0;  F[8] = 1;

    // ── covariance: P = F P Fᵀ + Q ──────────────────────────────────────
    // T = F P
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let s = 0;
        for (let k = 0; k < 3; k++) s += F[i * 3 + k] * P[k * 3 + j];
        T[i * 3 + j] = s;
      }
    }
    // P = T Fᵀ
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let s = 0;
        for (let k = 0; k < 3; k++) s += T[i * 3 + k] * F[j * 3 + k];
        P[i * 3 + j] = s;
      }
    }
    // Q — continuous white-jerk model discretised
    const q = this.q;
    const dt2 = dt * dt, dt3 = dt2 * dt, dt4 = dt3 * dt, dt5 = dt4 * dt;
    P[0] += q * dt5 / 20; P[1] += q * dt4 / 8;  P[2] += q * dt3 / 6;
    P[3] += q * dt4 / 8;  P[4] += q * dt3 / 3;  P[5] += q * dt2 / 2;
    P[6] += q * dt3 / 6;  P[7] += q * dt2 / 2;  P[8] += q * dt;

    // ── correct with H = [1 0 0] (scalar innovation) ────────────────────
    const S = P[0] + this.r;
    if (!(S > 1e-9)) { this.reset(z); return; }
    const k0 = P[0] / S, k1 = P[3] / S, k2 = P[6] / S;
    const y = z - x[0];
    x[0] += k0 * y; x[1] += k1 * y; x[2] += k2 * y;

    // P = (I − K H) P — only the first column of H is non-zero
    const p0 = P[0], p1 = P[1], p2 = P[2];
    P[0] -= k0 * p0; P[1] -= k0 * p1; P[2] -= k0 * p2;
    P[3] -= k1 * p0; P[4] -= k1 * p1; P[5] -= k1 * p2;
    P[6] -= k2 * p0; P[7] -= k2 * p1; P[8] -= k2 * p2;

    if (!Number.isFinite(x[0]) || !Number.isFinite(x[1])) this.reset(z);
  }

  get p() { return this.x[0]; }
  get v() { return this.x[1]; }
  get a() { return this.x[2]; }
}