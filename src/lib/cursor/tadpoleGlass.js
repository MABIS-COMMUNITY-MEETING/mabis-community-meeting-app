/**
 * TADPOLE LIQUID GLASS — shape-derived optics.
 *
 * The liquid-glass technique bakes a shape's lens geometry into a displacement
 * map (R = dx, G = dy) and refracts the live backdrop through it with
 * feDisplacementMap, one pass per colour channel for dispersion.
 *
 * Here the lens is not a rounded rectangle: it is the tadpole itself. The same
 * spine the physics bends generates
 *
 *      spine + local half-thickness  →  signed distance field
 *                                    →  outward normals + optical depth
 *                                    →  displacement map D(x, y)
 *
 * so the fat head refracts the page far more than the hairline tail, and when
 * the body curves the distortion curves with it. Maps are baked per quantised
 * bend and cached, so movement costs a transform, never a re-bake.
 */

export const TAD = { L: 44, R: 8.6, FIN: 4.6, PAD: 7 };

/** Optical constants — how the glass is ground, not how it animates. */
const OPT = {
  depth: 17,      // feDisplacementMap scale, px
  curvature: 0.8, // edge falloff — high = flat centre, strongly bent rim
  splay: 1.0,     // lateral spread of the refracted region
};

export function tadpoleBox() {
  const W = TAD.L + TAD.R + TAD.PAD * 2;
  const H = (TAD.R + TAD.FIN + TAD.PAD) * 2;
  return { W, H, hx: W - TAD.R - TAD.PAD, hy: H / 2 };
}

/* head leads at +x, tail trails behind, bend curls the tail */
function spineAt(t, bend, box) {
  return [box.hx - t * TAD.L, box.hy + bend * 21 * t * t];
}

/** local half-thickness: round head, tapering body, fin swelling over the tail */
function halfAt(t) {
  const body = Math.max(0.85, TAD.R * Math.pow(1 - t, 0.62));
  const w = t < 0.3 ? 0 : Math.sin(Math.PI * Math.min(1, (t - 0.3) / 0.7));
  return body + TAD.FIN * w * w;
}

const SAMPLES = 40;

function sampleSpine(bend, box) {
  const pts = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const [x, y] = spineAt(t, bend, box);
    pts.push({ t, x, y, h: halfAt(t) });
  }
  return pts;
}

/** silhouette path — built from the same curve as the SDF, so they never drift */
export function tadpolePath(bend) {
  const box = tadpoleBox();
  const pts = sampleSpine(bend, box);
  const up = [], lo = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[Math.min(i + 1, pts.length - 1)];
    const r = pts[Math.max(i - 1, 0)];
    let tx = q.x - r.x, ty = q.y - r.y;
    const l = Math.hypot(tx, ty) || 1;
    tx /= l; ty /= l;
    const nx = -ty, ny = tx;
    up.push([p.x + nx * p.h, p.y + ny * p.h]);
    lo.push([p.x - nx * p.h, p.y - ny * p.h]);
  }
  const f = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  const tail = pts[pts.length - 1];
  let d = `M ${f(up[0])}`;
  for (let i = 1; i < up.length; i++) d += ` L ${f(up[i])}`;
  d += ` L ${tail.x.toFixed(2)},${tail.y.toFixed(2)}`;
  for (let i = lo.length - 1; i >= 0; i--) d += ` L ${f(lo[i])}`;
  d += ` A ${TAD.R} ${TAD.R} 0 0 0 ${f(up[0])} Z`;
  return d;
}

/**
 * Bake D(x, y). Each pixel inside the silhouette stores the outward surface
 * normal scaled by (edge proximity ^ curvature) × (local thickness) — the
 * refraction a real body of that thickness would produce.
 */
export function tadpoleMap(bend) {
  const box = tadpoleBox();
  const pts = sampleSpine(bend, box);
  const cv = document.createElement("canvas");
  cv.width = box.W; cv.height = box.H;
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(box.W, box.H);
  const data = img.data;
  const maxH = TAD.R + TAD.FIN;

  for (let py = 0; py < box.H; py++) {
    for (let px = 0; px < box.W; px++) {
      const x = px + 0.5, y = py + 0.5;
      let best = Infinity, bx = 0, by = 0, bh = 1;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const dx = x - p.x, dy = y - p.y;
        const dist = Math.hypot(dx, dy);
        const sd = dist - p.h;
        if (sd < best) { best = sd; bx = dx / (dist || 1); by = dy / (dist || 1); bh = p.h; }
      }
      const o = (py * box.W + px) * 4;
      let r = 128, g = 128;
      if (best < 0) {
        const inside = Math.min(1, -best / bh);        // 0 at rim, 1 at core
        const edge = Math.pow(1 - inside, 1 / Math.max(0.2, OPT.curvature));
        const thickness = bh / maxH;                   // head lenses, tail whispers
        const mag = Math.min(1, edge * thickness * OPT.splay);
        r = Math.round(128 + bx * mag * 127);
        g = Math.round(128 + by * mag * 127);
      }
      data[o] = r; data[o + 1] = g; data[o + 2] = 128; data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL();
}

export const LENS_DEPTH = OPT.depth;

/* bends are quantised, so a whole swim cycle reuses ~20 baked lenses */
const cache = new Map();
export function tadpoleLens(bendRaw) {
  const q = Math.max(-1, Math.min(1, Math.round(bendRaw * 10) / 10));
  let hit = cache.get(q);
  if (!hit) {
    hit = { d: tadpolePath(q), map: tadpoleMap(q) };
    cache.set(q, hit);
  }
  return { key: q, ...hit };
}