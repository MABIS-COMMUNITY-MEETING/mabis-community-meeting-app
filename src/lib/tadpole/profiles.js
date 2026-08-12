/**
 * Biological profiles for the cursor organism.
 *
 * Numbers are calibration targets drawn from the Xenopus laevis literature and
 * are kept internally coherent per profile — hatchling geometry is never mixed
 * with late-larval frequency. Everything is nondimensionalised on
 *   L (body length), U (preferred swimming speed), T = L/U
 * before it is mapped into CSS pixels; one pixel is never one millimetre.
 */

export const PROFILES = {
  /** stage 37/38 hatchling — the whole-body virtual-tadpole reference regime */
  hatchling: {
    name: "hatchling",
    L_mm: 5.0,
    U_mm_s: 20.0,          // preferred free-swimming speed (~19–21 mm/s)
    cycle_ms: 100,         // same-side muscle cycle → 10 Hz
    spikeToPeakForce_ms: 20,
    ampMax_L: 0.20,        // one-sided lateral amplitude at high speed, /L
    lambdaFast_L: 0.80,    // propulsive wavelength at high speed, /L
    lambdaSlow_L: 1.15,
    speedTransition_Ls: 5.5, // the 5–6 L/s gait transition
    headYawMax: 0.11,      // rad of rostral recruitment allowed at top gait
  },
  /** older larva — same relationships, slower rhythm, longer body */
  larval: {
    name: "larval",
    L_mm: 30.0,
    U_mm_s: 90.0,
    cycle_ms: 160,
    spikeToPeakForce_ms: 25,
    ampMax_L: 0.20,
    lambdaFast_L: 0.80,
    lambdaSlow_L: 1.2,
    speedTransition_Ls: 5.5,
    headYawMax: 0.13,
  },
};

export const ACTIVE_PROFILE = PROFILES.hatchling;

/** Water at 20 °C. */
export const WATER = { rho: 998.2, mu: 1.002e-3 };

/**
 * Screen mapping. L_px is the visual body length; the simulation runs in
 * pixels and seconds, with all force coefficients scaled so that the
 * dimensionless groups (Re regime, St, L/s) match the profile.
 */
export const SCALE = {
  L_px: 30,
  /** px per body length per second at the profile's preferred speed */
  U_px_s() { return this.L_px * (ACTIVE_PROFILE.U_mm_s / ACTIVE_PROFILE.L_mm); },
};

/** Re = ρUL/µ, recomputed from the *actual* instantaneous speed, never fixed. */
export function reynolds(speed_px_s, p = ACTIVE_PROFILE) {
  const U = (speed_px_s / SCALE.L_px) * (p.L_mm * 1e-3); // m/s
  const L = p.L_mm * 1e-3;
  return (WATER.rho * U * L) / WATER.mu;
}

/** St = f·A/U with A defined here as PEAK-TO-PEAK tail-tip excursion. */
export function strouhal(f_hz, A_pp_px, speed_px_s) {
  return speed_px_s > 1 ? (f_hz * A_pp_px) / speed_px_s : 0;
}