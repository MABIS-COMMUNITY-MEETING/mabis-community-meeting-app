import AxisEstimator from "@/lib/physics/estimator";
import { MAGNET, CURSOR } from "@/lib/physics/tokens";
import { clamp, smoothstep, tanhSat } from "@/lib/physics/math";
import { subscribe, wake } from "@/lib/physics/scheduler";

/**
 * Global pointer state: sampling → estimation → prediction → potential field.
 *
 * Exposes a single mutable `pointer` object that is updated in place, so
 * consumers read fresh values every frame without allocating anything.
 */

export const pointer = {
  rawX: 0, rawY: 0,        // last measured sample
  x: 0, y: 0,              // filtered position
  vx: 0, vy: 0,            // filtered velocity (px/s)
  ax: 0, ay: 0,            // filtered acceleration (px/s²)
  speed: 0,
  curvature: 0,            // 1/px, magnitude only
  tx: 0, ty: 0,            // predicted + field-bent target the followers chase
  target: null,            // dominant magnetic element
  label: null,             // data-cursor label of that element
  down: false,
  seen: false,
  inside: true,
};

const ex = new AxisEstimator();
const ey = new AxisEstimator();
let lastT = 0;

// hysteresis bookkeeping for magnetic target selection
let heldEl = null;
let heldScore = 0;
const box = { cx: 0, cy: 0, sigma: 0, depth: 0 };
const candBox = { cx: 0, cy: 0, sigma: 0, depth: 0 };

const SELECTOR = "a, button, [role='button'], [data-cursor], [data-magnet], input, textarea, select, label";

/** Well depth by element role — a CTA should out-pull a metadata link. */
function depthFor(el) {
  const explicit = el.getAttribute("data-magnet");
  if (explicit && MAGNET.depth[explicit] != null) return MAGNET.depth[explicit];
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return MAGNET.depth.field;
  if (tag === "BUTTON" || el.getAttribute("role") === "button") return MAGNET.depth.control;
  if (tag === "A") return MAGNET.depth.link;
  return MAGNET.depth.meta;
}

/**
 * Score a candidate well. Distance dominates, but a target the pointer is
 * actively heading toward scores higher — so sweeping toward a button engages
 * it slightly early, which is what makes magnetism feel intentional.
 */
function measure(el, out) {
  const b = el.getBoundingClientRect();
  if (b.width === 0 || b.height === 0) return false;
  out.cx = b.left + b.width / 2;
  out.cy = b.top + b.height / 2;
  out.sigma = clamp(Math.max(b.width, b.height) * 0.45, MAGNET.sigmaMin, MAGNET.sigmaMax);
  out.depth = depthFor(el);
  return true;
}

function scoreGeometry(g) {
  const dx = g.cx - pointer.x, dy = g.cy - pointer.y;
  const d2 = dx * dx + dy * dy;
  const gauss = Math.exp(-d2 / (2 * g.sigma * g.sigma));
  let aim = 1;
  if (pointer.speed > 40) {
    const d = Math.sqrt(d2) || 1;
    const dot = (dx / d) * (pointer.vx / pointer.speed) + (dy / d) * (pointer.vy / pointer.speed);
    aim = 1 + 0.35 * clamp(dot, 0, 1);
  }
  return gauss * g.depth * aim;
}

function selectTarget(el) {
  // Stable targets reuse their measured geometry. This avoids a synchronous
  // layout read on every pointer frame while preserving the potential field.
  if (el && el === heldEl && heldEl.isConnected) {
    heldScore = scoreGeometry(box);
    return;
  }
  const hasCandidate = !!el && measure(el, candBox);
  const candScore = hasCandidate ? scoreGeometry(candBox) : 0;

  if (heldEl && heldEl !== el && heldEl.isConnected) {
    const incumbent = scoreGeometry(box);
    if (incumbent > 0.02 && candScore < incumbent * MAGNET.hysteresis) {
      heldScore = incumbent;
      return;
    }
  }
  heldEl = hasCandidate ? el : null;
  heldScore = candScore;
  if (hasCandidate) {
    box.cx = candBox.cx; box.cy = candBox.cy; box.sigma = candBox.sigma; box.depth = candBox.depth;
  }
}

/**
 * Adaptive prediction horizon τ. Slow precision movement gets ~none; a fast
 * smooth sweep gets a few milliseconds to offset follower lag; a reversal
 * (high curvature, or acceleration opposing velocity) collapses it to zero so
 * the cursor never overshoots into a turn.
 */
function horizon() {
  const s = pointer.speed;
  const sweep = smoothstep((s - 220) / 1400);
  const align = s > 1 ? (pointer.vx * pointer.ax + pointer.vy * pointer.ay) / (s * Math.hypot(pointer.ax, pointer.ay) + 1e-6) : 0;
  const reversal = clamp(-align, 0, 1);
  const turn = smoothstep(pointer.curvature * 900);
  const damp = (1 - reversal) * (1 - 0.85 * turn);
  return CURSOR.tauMax * sweep * damp;
}

function sample(x, y, t) {
  const dt = lastT ? t - lastT : 1 / 120;
  lastT = t;
  pointer.rawX = x; pointer.rawY = y;
  ex.update(x, dt);
  ey.update(y, dt);

  pointer.x = ex.p; pointer.y = ey.p;
  pointer.vx = ex.v; pointer.vy = ey.v;
  pointer.ax = ex.a; pointer.ay = ey.a;
  pointer.speed = Math.hypot(pointer.vx, pointer.vy);

  // κ = |v × a| / |v|³ — path curvature from the estimated derivatives
  const cross = Math.abs(pointer.vx * pointer.ay - pointer.vy * pointer.ax);
  const s3 = Math.pow(pointer.speed, 3);
  pointer.curvature = s3 > 1e3 ? clamp(cross / s3, 0, 0.05) : 0;
}

function computeTarget() {
  const tau = horizon();
  // p_future = p + τv + ½τ²a, then clamped so extrapolation can never be visible
  let px = pointer.x + pointer.vx * tau + 0.5 * tau * tau * pointer.ax;
  let py = pointer.y + pointer.vy * tau + 0.5 * tau * tau * pointer.ay;
  const lead = Math.hypot(px - pointer.x, py - pointer.y);
  if (lead > 26) {
    const k = 26 / lead;
    px = pointer.x + (px - pointer.x) * k;
    py = pointer.y + (py - pointer.y) * k;
  }

  // ── potential field: U = −A exp(−r²/2σ²), force = −∇U ──────────────
  if (heldEl && heldEl.isConnected && heldScore > 0.02) {
    const dx = box.cx - px, dy = box.cy - py;
    const d = Math.hypot(dx, dy);
    if (d > 0.01) {
      const s2 = box.sigma * box.sigma;
      // |∇U| ∝ r·exp(−r²/2σ²); normalise so the peak pull is MAGNET.maxPull
      const g = (d / box.sigma) * Math.exp(0.5 - (d * d) / (2 * s2));
      const pull = Math.min(MAGNET.maxPull * box.depth * g, d * 0.5);
      px += (dx / d) * pull;
      py += (dy / d) * pull;
    }
  }
  pointer.tx = px;
  pointer.ty = py;
}

let started = false;

/** Idempotent global install. Returns a teardown function. */
export function startPointerEngine() {
  if (started) return () => {};
  started = true;

  let latestX = 0, latestY = 0, latestT = 0, latestEl = null;
  let inputDirty = false, geometryDirty = false, retarget = false;

  // Pointer events only publish the newest sample. Filtering, magnetic geometry
  // reads and prediction run once in the scheduler's read phase, not at USB rate.
  const onMove = (e) => {
    const events = e.getCoalescedEvents?.();
    const latest = events?.length ? events[events.length - 1] : e;
    latestX = latest.clientX;
    latestY = latest.clientY;
    latestT = latest.timeStamp / 1000;
    latestEl = e.target.closest?.(SELECTOR) || null;
    inputDirty = true;
    pointer.inside = true;
    wake();
  };

  const processInput = () => {
    if (!inputDirty) return;
    inputDirty = false;
    if (!pointer.seen) {
      pointer.seen = true;
      ex.reset(latestX); ey.reset(latestY);
      pointer.x = latestX; pointer.y = latestY;
    }
    sample(latestX, latestY, latestT);
    if (retarget) {
      latestEl = document.elementFromPoint(latestX, latestY)?.closest?.(SELECTOR) || null;
      retarget = false;
    }
    if (geometryDirty && heldEl?.isConnected && measure(heldEl, box)) geometryDirty = false;
    selectTarget(latestEl);
    pointer.target = heldEl;
    pointer.label = heldEl?.getAttribute?.("data-cursor") || null;
    computeTarget();
  };

  const unsubscribeInput = subscribe({
    sample: processInput,
    step: () => {},
    render: () => {},
    settled: () => !inputDirty,
  });

  const onDown = () => { pointer.down = true; wake(); };
  const onUp = () => { pointer.down = false; wake(); };
  const onLeave = () => { pointer.inside = false; heldEl = null; pointer.target = null; pointer.label = null; wake(); };
  const onEnter = () => { pointer.inside = true; wake(); };
  const onReset = () => { lastT = 0; heldEl = null; pointer.target = null; ex.initialised = false; ey.initialised = false; geometryDirty = true; };
  const onScroll = () => { geometryDirty = true; retarget = true; inputDirty = pointer.seen; wake(); };

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  document.addEventListener("pointerleave", onLeave, { passive: true });
  document.addEventListener("pointerenter", onEnter, { passive: true });
  window.addEventListener("resize", onReset, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true, capture: true });
  window.addEventListener("blur", onReset);

  return () => {
    started = false;
    unsubscribeInput();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointerleave", onLeave);
    document.removeEventListener("pointerenter", onEnter);
    window.removeEventListener("resize", onReset);
    window.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("blur", onReset);
  };
}

/** Kinetic-energy-derived intensity in [0,1], compressed — for trail/audio. */
export const kinetic = () => tanhSat(pointer.speed / 2600);