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
  /** cursor centre, tiny controls — immediate without snapping */
  precision: { omega: 32, zeta: 1.0 },
  /** outer cursor ring — close, fluid follow-through */
  glass: { omega: 23, zeta: 0.92 },
  /** ring centre — visible elastic follow with a quick, quiet recapture */
  follow: { omega: 15, zeta: 0.68 },
  /** travel-energy envelope — slow inhale, softly underdamped release */
  flow: { omega: 6, zeta: 0.88 },
  /** directional membrane stretch — one quiet wave, then stillness */
  liquid: { omega: 10, zeta: 0.72 },
  /** press/release shape response — tactile, bounded rebound */
  bounce: { omega: 18, zeta: 0.68 },
  /** contextual label — settles last, softest */
  paper: { omega: 12, zeta: 0.95 },
  /** large typography / panels — apparent mass */
  heavy: { omega: 8, zeta: 1.0 },
};

export const CURSOR = {
  /** anisotropy: the ring is looser along travel, stiffer across it */
  tangentScale: 0.9,
  normalScale: 1.1,
  /** prediction horizon bounds, seconds */
  tauMin: 0.004,
  tauMax: 0.012,
  /** deformation */
  shearMax: 0.16,       // max |s| in the area-preserving matrix
  shearAlpha: 0.0006,     // speed → visible membrane stretch, fed through tanh
  motionExpansion: 0.065, // max whole-ring growth at full travel effort
  pressScale: 0.82,        // tactile squash around the ring centre
  idleReleaseDelay: 0.05,  // seconds before stale velocity begins releasing
  /** maximum dot-to-ring-centre separation in CSS px; large enough to escape */
  ringMaxLag: 46,
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