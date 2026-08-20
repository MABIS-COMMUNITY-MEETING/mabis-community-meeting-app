/**
 * Wallpaper → Material You seed colors.
 *
 * This follows Material's own two stages rather than approximating them:
 *
 *  1. QUANTIZE — the image is reduced to a population map of colors.
 *  2. SCORE — candidates are judged in HCT (see lib/color/hct.js): anything
 *     under chroma 15 is not a usable seed, hue populations are accumulated
 *     with Material's excited-proportion weighting, and the survivors are
 *     de-duplicated so two seeds are never within 15° of hue of each other.
 *
 * The winning seed then generates the whole scheme — surfaces included — in
 * lib/color/material-scheme.js.
 */

import { hctFromRgb } from "@/lib/color/hct";

const CUTOFF_CHROMA = 15;
const CUTOFF_EXCITED_PROPORTION = 0.01;
const TARGET_CHROMA = 48;
const WEIGHT_PROPORTION = 0.7;
const WEIGHT_CHROMA_ABOVE = 0.3;
const WEIGHT_CHROMA_BELOW = 0.1;
const MIN_HUE_DISTANCE = 15;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const toHex = (n) => Math.round(n).toString(16).padStart(2, "0");

function hueDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Population map of the image, quantized to 5 bits per channel. */
function quantize(data) {
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const bucket = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    bucket.n += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }
  return [...buckets.values()].map(({ n, r, g, b }) => ({
    n,
    rgb: [r / n, g / n, b / n],
  }));
}

/** Material's Score: the seed-worthy colors of a population map, best first. */
function score(population, count) {
  const total = population.reduce((sum, c) => sum + c.n, 0) || 1;

  const usable = [];
  const hueProportions = new Array(361).fill(0);
  for (const { n, rgb } of population) {
    const { hue, chroma, tone } = hctFromRgb(rgb);
    const proportion = n / total;
    // Near-black and near-white carry no hue anyone would call a theme color.
    if (chroma < CUTOFF_CHROMA || tone < 8 || tone > 94) continue;
    usable.push({ hue, chroma, tone, proportion, rgb });
    hueProportions[Math.round(hue) % 360] += proportion;
  }

  // A hue's weight includes its neighbours within 15°, so a gradient of one
  // color counts as that one color rather than as fifteen weak candidates.
  const scored = usable
    .map((c) => {
      let excitedProportion = 0;
      for (let h = Math.round(c.hue) - 15; h <= Math.round(c.hue) + 15; h += 1) {
        excitedProportion += hueProportions[((h % 360) + 360) % 360];
      }
      const chromaWeight = c.chroma > TARGET_CHROMA ? WEIGHT_CHROMA_ABOVE : WEIGHT_CHROMA_BELOW;
      return {
        ...c,
        excitedProportion,
        score:
          excitedProportion * 100 * WEIGHT_PROPORTION +
          (c.chroma - TARGET_CHROMA) * chromaWeight,
      };
    })
    .filter((c) => c.excitedProportion >= CUTOFF_EXCITED_PROPORTION)
    .sort((a, b) => b.score - a.score);

  const picked = [];
  for (const c of scored) {
    if (picked.some((p) => hueDistance(p.hue, c.hue) < MIN_HUE_DISTANCE)) continue;
    picked.push(c);
    if (picked.length >= count) break;
  }
  return picked;
}

/**
 * @param {File|Blob} file an image the user picked
 * @param {number} count how many seed colors to return
 * @returns {Promise<string[]>} hex colors, best seed first
 */
export async function extractWallpaperPalette(file, count = 6) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const size = 96; // color statistics, not fidelity — small is plenty
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    const population = quantize(data);
    let seeds = score(population, count);

    // A photo can be genuinely desaturated (snow, fog, a grey building). Rather
    // than refusing it, fall back to its most populous colors so it still
    // themes — Material does the same with its fallback blue, but the image's
    // own grey reads as the wallpaper where a stock blue would not.
    if (seeds.length === 0) {
      seeds = population
        .sort((a, b) => b.n - a.n)
        .slice(0, count)
        .map(({ rgb }) => ({ rgb }));
    }

    return seeds.map(({ rgb }) => `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`);
  } finally {
    URL.revokeObjectURL(url);
  }
}