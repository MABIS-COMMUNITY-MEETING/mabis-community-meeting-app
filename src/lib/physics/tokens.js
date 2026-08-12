/**
 * Centralised motion material tokens.
 *
 * Every physical constant in the app lives here, expressed as (ω, ζ):
 *   ω — natural frequency in rad/s (how urgently it reaches the target)
 *   ζ — damping ratio (1 = critical, <1 overshoots, >1 sluggish)
 *
 * Expressing materials this way — rather than as ad-hoc lerp factors — means
 * settling time and overshoot are predictable and comparable across the UI.
 */

export const MATERIAL = {
  /** cursor centre, tiny controls — essentially no overshoot */
  precision: { omega: 26, zeta: 1.0 },
  /** outer cursor ring — a whisper of inertial tail */
  glass: { omega: 10, zeta: 0.62 },
  /** contextual label — settles last, softest */
  paper: { omega: 12, zeta: 0.95 },
  /** large typography / panels — apparent mass */
  heavy: { omega: 8, zeta: 1.0 },
};

export const CURSOR = {
  /** anisotropy: the ring is looser along travel, stiffer across it */
  tangentScale: 0.55,
  normalScale: 1.15,
  /** prediction horizon bounds, seconds */
  tauMin: 0,
  tauMax: 0.018,
  /** deformation */
  shearMax: 0.44,      // max |s| in the area-preserving matrix
  shearAlpha: 0.00042, // speed → shear gain, fed through tanh
  /** how far the body may lag behind the core, px */
  maxLag: 14,
  /** tail chain */
  trailNodes: 12,
  trailLink: 7,
  trailRetain: 0.90,
  bendStiffness: 0.28,
  /** undulation: amplitude px/frame at full effort, and phase per link */
  waveAmp: 0.55,
  waveLength: 0.85,
};

export const MAGNET = {
  /** Gaussian well σ is derived from element size, then clamped to this band */
  sigmaMin: 26,
  sigmaMax: 90,
  /** maximum displacement the field may impose on the pointer target, px */
  maxPull: 9,
  /** a new candidate must beat the incumbent by this factor to take over */
  hysteresis: 1.35,
  /** per-role well depth — CTAs pull harder than metadata */
  depth: { primary: 1.0, control: 0.75, link: 0.5, field: 0.35, meta: 0.2 },
};

/** Below these thresholds a subsystem is considered settled and may sleep. */
export const SLEEP = { pos: 0.15, vel: 1.2 };