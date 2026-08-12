/**
 * Morphology and rendering geometry.
 *
 * w(s) is a C¹ piecewise-smooth half-width: globose head/body, an abrupt but
 * smoothed peduncle, a tapering muscular tail, then a thin distal tip — the
 * characteristic anuran silhouette, deliberately not a streamlined fish.
 * The visible fin is a separate, larger envelope w_f(s) > w_m(s) carried by a
 * lightly damped viscoelastic offset, so it lags and trails the muscular core
 * instead of rigidly following the centreline.
 */

const smoothstep = (t) => { const u = t < 0 ? 0 : t > 1 ? 1 : t; return u * u * (3 - 2 * u); };

/** muscular core half-width, normalised body length s ∈ [0,1] */
export function coreWidth(s) {
  const head = Math.sqrt(Math.max(0, 1 - Math.pow((s - 0.16) / 0.20, 2))) * 1.0; // globose lobe
  const peduncle = 0.30 * (1 - smoothstep((s - 0.30) / 0.14));
  const tail = 0.26 * Math.pow(1 - smoothstep((s - 0.34) / 0.66), 0.85);
  return Math.max(0.055, head * 0.98 + peduncle * 0.25 + tail);
}

/** visible fin envelope — laterally compressed membrane around the tail core */
export function finWidth(s) {
  if (s < 0.30) return coreWidth(s);
  const u = (s - 0.30) / 0.70;
  const bulge = Math.sin(Math.PI * Math.pow(u, 0.72)) * 0.62;
  return coreWidth(s) + bulge * (1 - 0.25 * u);
}

/**
 * Build a closed outline through r(s) ± w(s)·n̂(s) as a Catmull-Rom→Bézier
 * spline, so the silhouette is a smooth curve rather than a chain of circles.
 */
export function outlinePath(x, y, widths, offsets) {
  const N = x.length;
  const top = [], bot = [];
  for (let i = 0; i < N; i++) {
    const a = i > 0 ? i - 1 : 0, b = i < N - 1 ? i + 1 : N - 1;
    let tx = x[b] - x[a], ty = y[b] - y[a];
    const tl = Math.hypot(tx, ty) || 1e-6;
    tx /= tl; ty /= tl;
    const nx = -ty, ny = tx;
    const w = widths[i];
    const o = offsets ? offsets[i] : 0;
    top.push([x[i] + nx * (w + o), y[i] + ny * (w + o)]);
    bot.push([x[i] - nx * (w - o), y[i] - ny * (w - o)]);
  }
  const ring = top.concat(bot.reverse());
  return spline(ring);
}

function spline(pts) {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d + "Z";
}