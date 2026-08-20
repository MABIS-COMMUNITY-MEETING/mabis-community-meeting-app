/**
 * HCT — Google's Material You color space, ported to JavaScript.
 *
 * This is the real thing, not an approximation: CAM16 hue and chroma over
 * CIE L* tone, with Material's default viewing conditions, exactly as
 * material-color-utilities / materialyoucolor define them. Everything the
 * wallpaper theming does (seed scoring, tonal palettes, the scheme itself)
 * is computed here so it matches Material You's own output.
 *
 * The inverse direction (hue + chroma + tone → sRGB) is Google's actual
 * closed-form HctSolver, ported 1:1 from materialyoucolor/hct/hct_solver.py
 * — not an approximation of it. An earlier version of this file bisected J
 * against the target Y and walked chroma down by integer steps until the
 * color fell in gamut; that converges to something visually indistinguishable
 * but is not guaranteed to land on the exact byte Google's own solver
 * produces, and "matches Material You one to one" means exact bytes, not
 * close enough. The real solver works in two stages: `findResultByJ` is a
 * 5-round Newton-style refinement that hits the target luminance directly
 * for the (extremely common) case where the requested chroma is in gamut;
 * when it isn't, `bisectToLimit` walks the exact geometry of the RGB cube's
 * faces to find precisely where the requested hue leaves the sRGB gamut,
 * using the same 255-entry critical-plane table Google's solver uses to
 * locate exact 8-bit channel boundaries.
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

/** Delinearized channel as a raw float (0–255, not yet rounded or clamped) —
 *  named to match hct_solver.py's `true_delinearized`, which is this exact
 *  formula kept deliberately un-rounded for use mid-calculation. */
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

/* ────────────────────────────────────────────────────────────────────────
 * Exact HCT → sRGB inverse (HctSolver), ported 1:1 from
 * materialyoucolor/hct/hct_solver.py. Every constant, function name and the
 * order of operations below matches that file line for line; only the
 * argb-as-32-bit-int packing is dropped in favor of plain [r,g,b] arrays,
 * since JS has no reason to pack channels the way the Python/Java/Kotlin
 * ports do.
 * ──────────────────────────────────────────────────────────────────────── */

const SCALED_DISCOUNT_FROM_LINRGB = [
  [0.001200833568784504, 0.002389694492170889, 0.0002795742885861124],
  [0.0005891086651375999, 0.0029785502573438758, 0.0003270666104008398],
  [0.00010146692491640572, 0.0005364214359186694, 0.0032979401770712076],
];

const LINRGB_FROM_SCALED_DISCOUNT = [
  [1373.2198709594231, -1100.4251190754821, -7.278681089101213],
  [-271.815969077903, 559.6580465940733, -32.46047482791194],
  [1.9622899599665666, -57.173814538844006, 308.7233197812385],
];

const Y_FROM_LINRGB = [0.2126, 0.7152, 0.0722];

// Exact luminance (Y, 0–1 scale) at each of the 255 sRGB 8-bit channel
// boundaries — where a channel crosses from one integer value to the next.
// bisectToLimit walks these to land exactly on a gamut edge instead of
// approaching it asymptotically.
const CRITICAL_PLANES = [
  0.015176349177441876, 0.045529047532325624, 0.07588174588720938, 0.10623444424209313, 0.13658714259697685, 0.16693984095186062,
  0.19729253930674434, 0.2276452376616281, 0.2579979360165119, 0.28835063437139563, 0.3188300904430532, 0.350925934958123,
  0.3848314933096426, 0.42057480301049466, 0.458183274052838, 0.4976837250274023, 0.5391024159806381, 0.5824650784040898,
  0.6277969426914107, 0.6751227633498623, 0.7244668422128921, 0.775853049866786, 0.829304845476233, 0.8848452951698498,
  0.942497089126609, 1.0022825574869039, 1.0642236851973577, 1.1283421258858297, 1.1946592148522128, 1.2631959812511864,
  1.3339731595349034, 1.407011200216447, 1.4823302800086415, 1.5599503113873272, 1.6398909516233677, 1.7221716113234105,
  1.8068114625156377, 1.8938294463134073, 1.9832442801866852, 2.075074464868551, 2.1693382909216234, 2.2660538449872063,
  2.36523901573795, 2.4669114995532007, 2.5710888059345764, 2.6777882626779785, 2.7870270208169257, 2.898822059350997,
  3.0131901897720907, 3.1301480604002863, 3.2497121605402226, 3.3718988244681087, 3.4967242352587946, 3.624204428461639,
  3.754355295633311, 3.887192587735158, 4.022731918402185, 4.160988767090289, 4.301978482107941, 4.445716283538092,
  4.592217266055746, 4.741496401646282, 4.893568542229298, 5.048448422192488, 5.20615066083972, 5.3666897647573375,
  5.5300801301023865, 5.696336044816294, 5.865471690767354, 6.037501145825082, 6.212438385869475, 6.390297286737924,
  6.571091626112461, 6.7548350853498045, 6.941541251256611, 7.131223617812143, 7.323895587840543, 7.5195704746346665,
  7.7182615035334345, 7.919981813454504, 8.124744458384042, 8.332562408825165, 8.543448553206703, 8.757415699253682,
  8.974476575321063, 9.194643831691977, 9.417930041841839, 9.644347703669503, 9.873909240696694, 10.106627003236781,
  10.342513269534024, 10.58158024687427, 10.8238400726681, 11.069304815507364, 11.317986476196008, 11.569896988756009,
  11.825048221409341, 12.083451977536606, 12.345119996613247, 12.610063955123938, 12.878295467455942, 13.149826086772048,
  13.42466730586372, 13.702830557985108, 13.984327217668513, 14.269168601521828, 14.55736596900856, 14.848930523210871,
  15.143873411576273, 15.44220572664832, 15.743938506781891, 16.04908273684337, 16.35764934889634, 16.66964922287304,
  16.985093187232053, 17.30399201960269, 17.62635644741625, 17.95219714852476, 18.281524751807332, 18.614349837764564,
  18.95068293910138, 19.290534541298456, 19.633915083172692, 19.98083495742689, 20.331304511189067, 20.685334046541502,
  21.042933821039977, 21.404114048223256, 21.76888489811322, 22.137256497705877, 22.50923893145328, 22.884842241736916,
  23.264076429332462, 23.6469514538663, 24.033477234264016, 24.42366364919083, 24.817520537484558, 25.21505769858089,
  25.61628489293138, 26.021211842414342, 26.429848230738664, 26.842203703840827, 27.258287870275353, 27.678110301598522,
  28.10168053274597, 28.529008062403893, 28.96010235337422, 29.39497283293396, 29.83362889318845, 30.276079891419332,
  30.722335150426627, 31.172403958865512, 31.62629557157785, 32.08401920991837, 32.54558406207592, 33.010999283389665,
  33.4802739966603, 33.953417292456834, 34.430438229418264, 34.911345834551085, 35.39614910352207, 35.88485700094671,
  36.37747846067349, 36.87402238606382, 37.37449765026789, 37.87891309649659, 38.38727753828926, 38.89959975977785,
  39.41588851594697, 39.93615253289054, 40.460400508064545, 40.98864111053629, 41.520882981230194, 42.05713473317016,
  42.597404951718396, 43.141702194811224, 43.6900349931913, 44.24241185063697, 44.798841244188324, 45.35933162437017,
  45.92389141541209, 46.49252901546552, 47.065252796817916, 47.64207110610409, 48.22299226451468, 48.808024568002054,
  49.3971762874833, 49.9904556690408, 50.587870934119984, 51.189430279724725, 51.79514187861014, 52.40501387947288,
  53.0190544071392, 53.637271562750364, 54.259673423945976, 54.88626804504493, 55.517063457223934, 56.15206766869424,
  56.79128866487574, 57.43473440856916, 58.08241284012621, 58.734331877617365, 59.39049941699807, 60.05092333227251,
  60.715611475655585, 61.38457167773311, 62.057811747619894, 62.7353394731159, 63.417162620860914, 64.10328893648692,
  64.79372614476921, 65.48848194977529, 66.18756403501224, 66.89098006357258, 67.59873767827808, 68.31084450182222,
  69.02730813691093, 69.74813616640164, 70.47333615344107, 71.20291564160104, 71.93688215501312, 72.67524319850172,
  73.41800625771542, 74.16517879925733, 74.9167682708136, 75.67278210128072, 76.43322770089146, 77.1981124613393,
  77.96744375590167, 78.74122893956174, 79.51947534912904, 80.30219030335869, 81.08938110306934, 81.88105503125999,
  82.67721935322541, 83.4778813166706, 84.28304815182372, 85.09272707154808, 85.90692527145302, 86.72564993000343,
  87.54890820862819, 88.3767072518277, 89.2090541872801, 90.04595612594655, 90.88742016217518, 91.73345337380438,
  92.58406282226491, 93.43925555268066, 94.29903859396902, 95.16341895893969, 96.03240364439274, 96.9059996312159,
  97.78421388448044, 98.6670533535366, 99.55452497210776,
];

function matrixMultiply(row, matrix) {
  return [
    row[0] * matrix[0][0] + row[1] * matrix[0][1] + row[2] * matrix[0][2],
    row[0] * matrix[1][0] + row[1] * matrix[1][1] + row[2] * matrix[1][2],
    row[0] * matrix[2][0] + row[1] * matrix[2][1] + row[2] * matrix[2][2],
  ];
}

function chromaticAdaptation(component) {
  const af = Math.pow(Math.abs(component), 0.42);
  return (signum(component) * 400 * af) / (af + 27.13);
}

/** Hue (radians) of a linear-RGB point, via the same scaled-discount
 *  chromatic adaptation the rest of the solver uses — deliberately not the
 *  full CAM16 hue calculation, since this only needs to compare hues to
 *  each other to know which side of a cube edge the target hue falls on. */
function hueOf(linrgb) {
  const scaledDiscount = matrixMultiply(linrgb, SCALED_DISCOUNT_FROM_LINRGB);
  const rA = chromaticAdaptation(scaledDiscount[0]);
  const gA = chromaticAdaptation(scaledDiscount[1]);
  const bA = chromaticAdaptation(scaledDiscount[2]);
  const a = (11 * rA - 12 * gA + bA) / 11;
  const b = (rA + gA - 2 * bA) / 9;
  return Math.atan2(b, a);
}

function sanitizeRadians(angle) {
  return (angle + Math.PI * 8) % (Math.PI * 2);
}

function areInCyclicOrder(a, b, c) {
  const deltaAB = sanitizeRadians(b - a);
  const deltaAC = sanitizeRadians(c - a);
  return deltaAB < deltaAC;
}

function interceptT(source, mid, target) {
  return (mid - source) / (target - source);
}

function lerpPoint(source, t, target) {
  return [
    source[0] + (target[0] - source[0]) * t,
    source[1] + (target[1] - source[1]) * t,
    source[2] + (target[2] - source[2]) * t,
  ];
}

function setCoordinate(source, coordinate, target, axis) {
  const t = interceptT(source[axis], coordinate, target[axis]);
  return lerpPoint(source, t, target);
}

const isBounded = (x) => x >= 0 && x <= 100;

/** One of the 12 vertices of the sRGB cube at luminance y — three per face,
 *  four faces (R fixed, G fixed, B fixed x2 orientation). Returns [-1,-1,-1]
 *  for a vertex the plane y doesn't actually pass through. */
function nthVertex(y, n) {
  const kr = Y_FROM_LINRGB[0];
  const kg = Y_FROM_LINRGB[1];
  const kb = Y_FROM_LINRGB[2];
  const coordA = n % 4 <= 1 ? 0 : 100;
  const coordB = n % 2 === 0 ? 0 : 100;

  if (n < 4) {
    const g = coordA;
    const b = coordB;
    const r = (y - g * kg - b * kb) / kr;
    return isBounded(r) ? [r, g, b] : [-1, -1, -1];
  }
  if (n < 8) {
    const b = coordA;
    const r = coordB;
    const g = (y - r * kr - b * kb) / kg;
    return isBounded(g) ? [r, g, b] : [-1, -1, -1];
  }
  const r = coordA;
  const g = coordB;
  const b = (y - r * kr - g * kg) / kb;
  return isBounded(b) ? [r, g, b] : [-1, -1, -1];
}

/** Narrows the y-plane's intersection with the RGB cube down to the two
 *  vertices (left/right) that bracket the target hue. */
function bisectToSegment(y, targetHue) {
  let left = [-1, -1, -1];
  let right = left;
  let leftHue = 0;
  let rightHue = 0;
  let initialized = false;
  let uncut = true;

  for (let n = 0; n < 12; n += 1) {
    const mid = nthVertex(y, n);
    if (mid[0] < 0) continue;
    const midHue = hueOf(mid);

    if (!initialized) {
      left = mid;
      right = mid;
      leftHue = midHue;
      rightHue = midHue;
      initialized = true;
      continue;
    }

    if (uncut || areInCyclicOrder(leftHue, midHue, rightHue)) {
      uncut = false;
      if (areInCyclicOrder(leftHue, targetHue, midHue)) {
        right = mid;
        rightHue = midHue;
      } else {
        left = mid;
        leftHue = midHue;
      }
    }
  }

  return [left, right];
}

const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const criticalPlaneBelow = (x) => Math.floor(x - 0.5);
const criticalPlaneAbove = (x) => Math.ceil(x - 0.5);

/** Walks the segment from bisectToSegment down to the exact gamut boundary,
 *  one RGB axis at a time, using the critical-plane table to jump straight
 *  to 8-bit channel boundaries instead of converging on them asymptotically. */
function bisectToLimit(y, targetHue) {
  const segment = bisectToSegment(y, targetHue);
  let left = segment[0];
  let leftHue = hueOf(left);
  let right = segment[1];

  for (let axis = 0; axis < 3; axis += 1) {
    if (left[axis] !== right[axis]) {
      let lPlane = -1;
      let rPlane = 255;

      if (left[axis] < right[axis]) {
        lPlane = criticalPlaneBelow(delinearized(left[axis]));
        rPlane = criticalPlaneAbove(delinearized(right[axis]));
      } else {
        lPlane = criticalPlaneAbove(delinearized(left[axis]));
        rPlane = criticalPlaneBelow(delinearized(right[axis]));
      }

      for (let i = 0; i < 8; i += 1) {
        if (Math.abs(rPlane - lPlane) <= 1) break;
        const mPlane = Math.floor((lPlane + rPlane) / 2);
        const midPlaneCoordinate = CRITICAL_PLANES[mPlane];
        const mid = setCoordinate(left, midPlaneCoordinate, right, axis);
        const midHue = hueOf(mid);

        if (areInCyclicOrder(leftHue, targetHue, midHue)) {
          right = mid;
          rPlane = mPlane;
        } else {
          left = mid;
          leftHue = midHue;
          lPlane = mPlane;
        }
      }
    }
  }

  return midpoint(left, right);
}

function inverseChromaticAdaptation(adapted) {
  const adaptedAbs = Math.abs(adapted);
  const base = Math.max(0, (27.13 * adaptedAbs) / (400 - adaptedAbs));
  return signum(adapted) * Math.pow(base, 1 / 0.42);
}

/** [r,g,b] (0–255, rounded and clamped) from linear RGB, or null out of gamut. */
function rgbFromLinrgb(linrgb) {
  if (linrgb[0] < 0 || linrgb[1] < 0 || linrgb[2] < 0) return null;
  if (linrgb[0] > 100.01 || linrgb[1] > 100.01 || linrgb[2] > 100.01) return null;
  return linrgb.map((v) => clamp(0, 255, Math.round(delinearized(v))));
}

/**
 * The fast path: a 5-round Newton-style refinement of J (CAM16 lightness)
 * that converges directly on the requested luminance y for a hue/chroma
 * pair that IS in gamut. Returns null (never found, or fell out of gamut
 * mid-refinement) rather than the sentinel int hct_solver.py returns, since
 * JS has no reason to reuse 0 as "not found" the way an ARGB int can.
 */
function findResultByJ(hueRadians, chroma, y) {
  let j = Math.sqrt(y) * 11;
  const tInnerCoeff = 1 / Math.pow(1.64 - Math.pow(0.29, VC.n), 0.73);
  const eHue = 0.25 * (Math.cos(hueRadians + 2) + 3.8);
  const p1 = eHue * (50000 / 13) * VC.nc * VC.ncb;
  const hSin = Math.sin(hueRadians);
  const hCos = Math.cos(hueRadians);

  for (let iterationRound = 0; iterationRound < 5; iterationRound += 1) {
    const jNormalized = j / 100;
    const alpha = chroma !== 0 && j !== 0 ? chroma / Math.sqrt(jNormalized) : 0;
    const t = Math.pow(alpha * tInnerCoeff, 1 / 0.9);
    const ac = VC.aw * Math.pow(jNormalized, 1 / VC.c / VC.z);
    const p2 = ac / VC.nbb;
    const gamma = (23 * (p2 + 0.305) * t) / (23 * p1 + 11 * t * hCos + 108 * t * hSin);
    const a = gamma * hCos;
    const b = gamma * hSin;
    const rA = (460 * p2 + 451 * a + 288 * b) / 1403;
    const gA = (460 * p2 - 891 * a - 261 * b) / 1403;
    const bA = (460 * p2 - 220 * a - 6300 * b) / 1403;
    const rCScaled = inverseChromaticAdaptation(rA);
    const gCScaled = inverseChromaticAdaptation(gA);
    const bCScaled = inverseChromaticAdaptation(bA);
    const linrgb = matrixMultiply([rCScaled, gCScaled, bCScaled], LINRGB_FROM_SCALED_DISCOUNT);

    if (linrgb[0] < 0 || linrgb[1] < 0 || linrgb[2] < 0) return null;

    const fnj = Y_FROM_LINRGB[0] * linrgb[0] + Y_FROM_LINRGB[1] * linrgb[1] + Y_FROM_LINRGB[2] * linrgb[2];
    if (fnj <= 0) return null;

    if (iterationRound === 4 || Math.abs(fnj - y) < 0.002) {
      return rgbFromLinrgb(linrgb);
    }

    j -= ((fnj - y) * j) / (2 * fnj);
  }

  return null;
}

const sanitizeDegreesDouble = (deg) => {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
};

/**
 * The requested tone is honoured exactly; chroma is the most the sRGB gamut
 * allows at that hue and tone, capped to what was asked for — a tonal
 * palette is built on tone driving contrast, so it must never drift, and
 * whatever this returns for a given (hue, chroma, tone) is Google's own
 * Material You solver's answer for the same inputs, not an approximation
 * of it.
 */
export function hexFromHct(hueDegrees, chroma, lstar) {
  const tone = clamp(0, 100, lstar);

  if (chroma < 0.0001 || tone < 0.0001 || tone > 99.9999) {
    const grey = clamp(0, 255, Math.round(delinearized(yFromLstar(tone))));
    return hexFromRgb([grey, grey, grey]);
  }

  const hue = sanitizeDegreesDouble(hueDegrees);
  const hueRadians = (hue / 180) * Math.PI;
  const y = yFromLstar(tone);

  const exact = findResultByJ(hueRadians, chroma, y);
  if (exact) return hexFromRgb(exact);

  const linrgb = bisectToLimit(y, hueRadians);
  const rgb = linrgb.map((v) => clamp(0, 255, Math.round(delinearized(v))));
  return hexFromRgb(rgb);
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
