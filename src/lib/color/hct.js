/**
 * HCT — Google's Material You color space, ported to JavaScript.
 *
 * This is the real thing, not an approximation: CAM16 hue and chroma over
 * CIE L* tone, with Material's default viewing conditions, exactly as
 * material-color-utilities / materialyoucolor define them. Everything the
 * wallpaper theming does (seed scoring, tonal palettes, the scheme itself)
 * is computed here so it matches Material You's own output.
 *
 * The inverse direction (hue + chroma + tone → sRGB) uses the standard
 * strategy: solve lightness J for the requested tone, then walk chroma down
 * until the color is inside the sRGB gamut. Material's own solver does the
 * same thing with a closed-form fast path; the search is a few dozen
 * iterations of arithmetic and runs once per generated tone, which is
 * imperceptible next to decoding the image itself.
 */

const D65 = [95.047, 100.0, 108.883];

const XYZ_TO_SRGB = [
  [3.2413774792388685, -1.5376652402851851, -0.49885366846268053],
  [-0.9691452513005321, 1.8758853451067872, 0.04156585616912061],
  [0.05562093689691305, -0.20395524564742123, 1.0571799111220335],
];

const clamp = (min, max, v) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;
const signum = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);

function yFromLstar(lstar) {
  return 100 * (lstar > 8 ? Math.pow((lstar + 16) / 116, 3) : lstar / 903.2962962962963);
}

function lstarFromY(y) {
  const ft = y / 100;
  return ft <= 216 / 24389 ? 903.2962962962963 * ft : 116 * Math.cbrt(ft) - 16;
}

function linearized(channel8) {
  const normalized = channel8 / 255;
  return normalized <= 0.040449936
    ? (normalized / 12.92) * 100
    : Math.pow((normalized + 0.055) / 1.055, 2.4) * 100;
}

function delinearized(rgbComponent) {
  const normalized = rgbComponent / 100;
  const v = normalized <= 0.0031308
    ? normalized * 12.92
    : 1.055 * Math.pow(normalized, 1 / 2.4) - 0.055;
  return v * 255;
}

function makeViewingConditions() {
  const adaptingLuminance = (200 / Math.PI) * yFromLstar(50) / 100;
  const backgroundLstar = 50;
  const surround = 2;

  const rW = D65[0] * 0.401288 + D65[1] * 0.650173 + D65[2] * -0.051461;
  const gW = D65[0] * -0.250268 + D65[1] * 1.204414 + D65[2] * 0.045854;
  const bW = D65[0] * -0.002079 + D65[1] * 0.048952 + D65[2] * 0.953127;

  const f = 0.8 + surround / 10;
  const c = f >= 0.9 ? lerp(0.59, 0.69, (f - 0.9) * 10) : lerp(0.525, 0.59, (f - 0.8) * 10);
  const d = clamp(0, 1, f * (1 - (1 / 3.6) * Math.exp((-adaptingLuminance - 42) / 92)));

  const rgbD = [d * (100 / rW) + 1 - d, d * (100 / gW) + 1 - d, d * (100 / bW) + 1 - d];
  const k = 1 / (5 * adaptingLuminance + 1);
  const k4 = k * k * k * k;
  const k4F = 1 - k4;
  const fl = k4 * adaptingLuminance + 0.1 * k4F * k4F * Math.cbrt(5 * adaptingLuminance);
  const n = yFromLstar(backgroundLstar) / D65[1];
  const z = 1.48 + Math.sqrt(n);
  const nbb = 0.725 / Math.pow(n, 0.2);

  const rgbAFactors = [rW, gW, bW].map((w, i) => Math.pow((fl * rgbD[i] * w) / 100, 0.42));
  const rgbA = rgbAFactors.map((v) => (400 * v) / (v + 27.13));
  const aw = ((40 * rgbA[0] + 20 * rgbA[1] + rgbA[2]) / 20) * nbb;

  return { n, aw, nbb, ncb: nbb, c, nc: f, fl, rgbD, z };
}

const VC = makeViewingConditions();

function cam16FromXyz(x, y, z) {
  const rC = 0.401288 * x + 0.650173 * y - 0.051461 * z;
  const gC = -0.250268 * x + 1.204414 * y + 0.045854 * z;
  const bC = -0.002079 * x + 0.048952 * y + 0.953127 * z;

  const rD = VC.rgbD[0] * rC;
  const gD = VC.rgbD[1] * gC;
  const bD = VC.rgbD[2] * bC;

  const adapt = (v) => {
    const af = Math.pow((VC.fl * Math.abs(v)) / 100, 0.42);
    return (signum(v) * 400 * af) / (af + 27.13);
  };
  const rA = adapt(rD);
  const gA = adapt(gD);
  const bA = adapt(bD);

  const a = (11 * rA - 12 * gA + bA) / 11;
  const b = (rA + gA - 2 * bA) / 9;
  const u = (20 * rA + 20 * gA + 21 * bA) / 20;
  const p2 = (40 * rA + 20 * gA + bA) / 20;

  let hue = (Math.atan2(b, a) * 180) / Math.PI;
  if (hue < 0) hue += 360;
  else if (hue >= 360) hue -= 360;

  const ac = p2 * VC.nbb;
  const j = 100 * Math.pow(ac / VC.aw, VC.c * VC.z);
  const huePrime = hue < 20.14 ? hue + 360 : hue;
  const eHue = 0.25 * (Math.cos((huePrime * Math.PI) / 180 + 2) + 3.8);
  const p1 = ((50000 / 13) * eHue * VC.nc * VC.ncb);
  const t = (p1 * Math.hypot(a, b)) / (u + 0.305);
  const alpha = Math.pow(t, 0.9) * Math.pow(1.64 - Math.pow(0.29, VC.n), 0.73);

  return { hue, chroma: alpha * Math.sqrt(j / 100), j };
}

/** CAM16 J + hue + chroma back to XYZ under the same viewing conditions. */
function xyzFromCam16(j, chroma, hueDegrees) {
  const alpha = chroma === 0 || j === 0 ? 0 : chroma / Math.sqrt(j / 100);
  const t = Math.pow(alpha / Math.pow(1.64 - Math.pow(0.29, VC.n), 0.73), 1 / 0.9);
  const hRad = (hueDegrees * Math.PI) / 180;
  const eHue = 0.25 * (Math.cos(hRad + 2) + 3.8);
  const ac = VC.aw * Math.pow(j / 100, 1 / (VC.c * VC.z));
  const p1 = eHue * (50000 / 13) * VC.nc * VC.ncb;
  const p2 = ac / VC.nbb;

  const hSin = Math.sin(hRad);
  const hCos = Math.cos(hRad);
  const gamma = (23 * (p2 + 0.305) * t) / (23 * p1 + 11 * t * hCos + 108 * t * hSin);
  const a = gamma * hCos;
  const b = gamma * hSin;

  const rA = (460 * p2 + 451 * a + 288 * b) / 1403;
  const gA = (460 * p2 - 891 * a - 261 * b) / 1403;
  const bA = (460 * p2 - 220 * a - 6300 * b) / 1403;

  const unadapt = (v, dIndex) => {
    const base = Math.max(0, (27.13 * Math.abs(v)) / (400 - Math.abs(v)));
    const c = signum(v) * (100 / VC.fl) * Math.pow(base, 1 / 0.42);
    return c / VC.rgbD[dIndex];
  };
  const rF = unadapt(rA, 0);
  const gF = unadapt(gA, 1);
  const bF = unadapt(bA, 2);

  return [
    1.86206786 * rF - 1.01125463 * gF + 0.14918677 * bF,
    0.38752654 * rF + 0.62144744 * gF - 0.00897398 * bF,
    -0.0158415 * rF - 0.03412294 * gF + 1.04996444 * bF,
  ];
}

function srgbFromXyz(xyz) {
  return XYZ_TO_SRGB.map((row) =>
    delinearized(row[0] * xyz[0] + row[1] * xyz[1] + row[2] * xyz[2]));
}

const inGamut = (rgb) => rgb.every((v) => v >= -0.6 && v <= 255.6);

function hexFromRgb(rgb) {
  return `#${rgb
    .map((v) => clamp(0, 255, Math.round(v)).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function rgbFromHex(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function xyzFromRgb([r, g, b]) {
  const lr = linearized(r);
  const lg = linearized(g);
  const lb = linearized(b);
  return [
    0.41233895 * lr + 0.35762064 * lg + 0.18051042 * lb,
    0.2126 * lr + 0.7152 * lg + 0.0722 * lb,
    0.01932141 * lr + 0.11916382 * lg + 0.95034478 * lb,
  ];
}

/** @returns {{hue:number, chroma:number, tone:number}} */
export function hctFromRgb(rgb) {
  const xyz = xyzFromRgb(rgb);
  const { hue, chroma } = cam16FromXyz(xyz[0], xyz[1], xyz[2]);
  return { hue, chroma, tone: lstarFromY(xyz[1]) };
}

export const hctFromHex = (hex) => hctFromRgb(rgbFromHex(hex));

/**
 * The requested tone is honoured exactly; chroma is the most the sRGB gamut
 * allows at that hue and tone, never more than asked for. This is what makes
 * a tonal palette usable: tone drives contrast, so it must not drift.
 */
export function hexFromHct(hue, chroma, tone) {
  const t = clamp(0, 100, tone);
  if (t <= 0) return "#000000";
  if (t >= 100) return "#ffffff";

  const targetY = yFromLstar(t);

  const solveForChroma = (c) => {
    // J is monotonic in luminance at fixed hue/chroma, so bisect it against
    // the tone's target Y rather than trusting an analytic shortcut.
    let low = 0;
    let high = 100;
    let rgb = null;
    for (let i = 0; i < 24; i += 1) {
      const j = (low + high) / 2;
      const xyz = xyzFromCam16(j, c, hue);
      if (!Number.isFinite(xyz[1])) return null;
      if (xyz[1] < targetY) low = j;
      else high = j;
      rgb = srgbFromXyz(xyz);
    }
    return rgb;
  };

  for (let c = Math.max(0, chroma); c >= 0; c -= 1) {
    const rgb = solveForChroma(c);
    if (rgb && inGamut(rgb)) return hexFromRgb(rgb);
  }
  // Neutral of the right tone always exists.
  const grey = delinearized(targetY);
  return hexFromRgb([grey, grey, grey]);
}

/** "H S% L%" for the app's CSS custom properties. */
export function hslStringFromHex(hex) {
  const [r8, g8, b8] = rgbFromHex(hex);
  const r = r8 / 255;
  const g = g8 / 255;
  const b = b8 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}