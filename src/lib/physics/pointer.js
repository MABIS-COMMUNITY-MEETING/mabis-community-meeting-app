import AxisEstimator from "@/lib/physics/estimator";
import { MAGNET, CURSOR } from "@/lib/physics/tokens";
import { clamp, smoothstep, tanhSat } from "@/lib/physics/math";
import { wake } from "@/lib/physics/scheduler";

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
function score(el) {
  const b = el.getBoundingClientRect();
  if (b.width === 0 || b.height === 0) return 0;
  const cx = b.left + b.width / 2;
  const cy = b.top + b.height / 2;
  const sigma = clamp(Math.max(b.width, b.height) * 0.45, MAGNET.sigmaMin, MAGNET.sigmaMax);
  const dx = cx - pointer.x, dy = cy - pointer.y;
  const d2 = dx * dx + dy * dy;
  const gauss = Math.exp(-d2 / (2 * sigma * sigma));
  let aim = 1;
  if (pointer.speed > 40) {
    const d = Math.sqrt(d2) || 1;
    const dot = (dx / d) * (pointer.vx / pointer.speed) + (dy / d) * (pointer.vy / pointer.speed);
    aim = 1 + 0.35 * clamp(dot, 0, 1);
  }
  box.cx = cx; box.cy = cy; box.sigma = sigma; box.depth = depthFor(el);
  return gauss * box.depth * aim;
}

function selectTarget(el) {
  // candidate = element under the pointer; incumbent keeps its well until a
  // rival is clearly stronger, which prevents flicker between neighbours
  const candScore = el ? score(el) : 0;
  const candCx = box.cx, candCy = box.cy, candSigma = box.sigma, candDepth = box.depth;

  if (heldEl && heldEl !== el && heldEl.isConnected) {
    const incumbent = score(heldEl);
    if (incumbent > 0.02 && candScore < incumbent * MAGNET.hysteresis) {
      heldScore = incumbent;
      return; // box already holds the incumbent's geometry
    }
  }
  heldEl = el;
  heldScore = candScore;
  box.cx = candCx; box.cy = candCy; box.sigma = candSigma; box.depth = candDepth;
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

  const onMove = (e) => {
    // coalesced samples give us the full high-rate pointer trace on displays
    // that deliver more input events than frames — better derivative estimates
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    if (events && events.length > 1) {
      for (const c of events) sample(c.clientX, c.clientY, c.timeStamp / 1000);
    } else {
      sample(e.clientX, e.clientY, e.timeStamp / 1000);
    }

    if (!pointer.seen) {
      pointer.seen = true;
      ex.reset(e.clientX); ey.reset(e.clientY);
      pointer.x = e.clientX; pointer.y = e.clientY;
    }
    pointer.inside = true;

    const el = e.target.closest?.(SELECTOR) || null;
    selectTarget(el);
    pointer.target = heldEl;
    pointer.label = heldEl?.getAttribute?.("data-cursor") || null;
    computeTarget();
    wake();
  };

  const onDown = () => { pointer.down = true; wake(); };
  const onUp = () => { pointer.down = false; wake(); };
  const onLeave = () => { pointer.inside = false; heldEl = null; pointer.target = null; pointer.label = null; wake(); };
  const onEnter = () => { pointer.inside = true; wake(); };
  const onReset = () => { lastT = 0; heldEl = null; pointer.target = null; ex.initialised = false; ey.initialised = false; };

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  document.addEventListener("pointerleave", onLeave, { passive: true });
  document.addEventListener("pointerenter", onEnter, { passive: true });
  window.addEventListener("resize", onReset, { passive: true });
  window.addEventListener("blur", onReset);

  return () => {
    started = false;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointerleave", onLeave);
    document.removeEventListener("pointerenter", onEnter);
    window.removeEventListener("resize", onReset);
    window.removeEventListener("blur", onReset);
  };
}

/** Kinetic-energy-derived intensity in [0,1], compressed — for trail/audio. */
export const kinetic = () => tanhSat(pointer.speed / 2600);