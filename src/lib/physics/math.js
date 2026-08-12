/**
 * Small, allocation-free math kernel shared by every physics subsystem.
 * Everything here is pure and operates on scalars or caller-owned objects —
 * no vectors are allocated inside hot loops.
 */

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Hermite smoothstep on [0,1]: C1-continuous, zero slope at both ends. */
export const smoothstep = (u) => {
  const t = clamp(u, 0, 1);
  return t * t * (3 - 2 * t);
};

/** Quintic minimum-jerk profile: 10t³ − 15t⁴ + 6t⁵ (zero v and a at endpoints). */
export const minJerk = (u) => {
  const t = clamp(u, 0, 1);
  const t3 = t * t * t;
  return t3 * (10 - 15 * t + 6 * t * t);
};

/** Saturating response — bounded no matter how large x gets. */
export const tanhSat = (x) => {
  // avoid Math.tanh's edge cases on very large |x|
  if (x > 20) return 1;
  if (x < -20) return -1;
  const e = Math.exp(2 * x);
  return (e - 1) / (e + 1);
};

/**
 * Frame-rate independent exponential decay factor.
 * `retain` is the fraction of a quantity surviving one 60Hz step.
 */
export const decay = (retain, dtSteps) => Math.pow(retain, dtSteps);

/**
 * Exact solution of an unforced damped harmonic oscillator over one step.
 * Integrating analytically (rather than Euler-stepping) means the response is
 * identical at 60Hz and 240Hz and can never go unstable, however large dt is.
 *
 *   x'' + 2ζω x' + ω²x = 0
 *
 * `s` is a mutable {x, v} state, displaced relative to the target.
 * Returns nothing; mutates `s` in place.
 */
export function integrateSpring(s, target, omega, zeta, dt) {
  const x0 = s.x - target;
  const v0 = s.v;

  if (zeta < 1 - 1e-4) {
    // underdamped
    const wd = omega * Math.sqrt(1 - zeta * zeta);
    const e = Math.exp(-zeta * omega * dt);
    const c = Math.cos(wd * dt);
    const sn = Math.sin(wd * dt);
    const A = x0;
    const B = (v0 + zeta * omega * x0) / wd;
    s.x = target + e * (A * c + B * sn);
    s.v = e * (v0 * c - (omega * omega * x0 + zeta * omega * v0) * sn / wd);
  } else if (zeta > 1 + 1e-4) {
    // overdamped
    const r = omega * Math.sqrt(zeta * zeta - 1);
    const r1 = -zeta * omega + r;
    const r2 = -zeta * omega - r;
    const c2 = (v0 - r1 * x0) / (r2 - r1);
    const c1 = x0 - c2;
    const e1 = Math.exp(r1 * dt);
    const e2 = Math.exp(r2 * dt);
    s.x = target + c1 * e1 + c2 * e2;
    s.v = c1 * r1 * e1 + c2 * r2 * e2;
  } else {
    // critically damped
    const e = Math.exp(-omega * dt);
    const c1 = x0;
    const c2 = v0 + omega * x0;
    s.x = target + (c1 + c2 * dt) * e;
    s.v = (v0 - c2 * omega * dt) * e;
  }

  // numerical guard — a NaN here would freeze the cursor permanently
  if (!Number.isFinite(s.x) || !Number.isFinite(s.v)) { s.x = target; s.v = 0; }
}

/** Shortest signed angular difference in degrees, across the ±180° seam. */
export const angleDelta = (to, from) => ((to - from + 540) % 360) - 180;