/**
 * Wallpaper → theme colors, in the spirit of Material You.
 *
 * The reference implementation the request pointed at
 * (materialyoucolor-python) is a Python library, which cannot run in this
 * app — so this is a small in-browser equivalent of its first stage:
 * quantize the image, score candidate colors by population × chroma, and
 * return the most "seed-worthy" swatches. The resulting hexes feed the
 * existing custom-color pipeline (applyCustomColors), which already derives
 * readable foregrounds and editor inks from any pair.
 */

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

const toHex = (n) => Math.round(n).toString(16).padStart(2, "0");

/**
 * @param {File|Blob} file an image the user picked
 * @param {number} count how many swatches to return
 * @returns {Promise<string[]>} hex colors, best seed first
 */
export async function extractWallpaperPalette(file, count = 6) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const size = 64; // color statistics, not fidelity — tiny is plenty
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    // Quantize to 4 bits per channel and average each bucket's members.
    const buckets = new Map();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const bucket = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      bucket.n += 1; bucket.r += r; bucket.g += g; bucket.b += b;
      buckets.set(key, bucket);
    }

    // Score: population × chroma, with near-white/near-black damped —
    // the same intent as Material You's seed scoring.
    const candidates = [];
    for (const { n, r, g, b } of buckets.values()) {
      const R = r / n, G = g / n, B = b / n;
      const { h, s, l } = rgbToHsl(R, G, B);
      const lightnessWeight = l < 10 || l > 92 ? 0.05 : 1;
      candidates.push({
        hex: `#${toHex(R)}${toHex(G)}${toHex(B)}`,
        h, s, l,
        score: n * (0.12 + s / 100) * lightnessWeight,
      });
    }
    candidates.sort((a, b) => b.score - a.score);

    // Dedupe by hue so the palette is distinct colors, not one color's shades.
    const picked = [];
    for (const c of candidates) {
      const clashes = picked.some((p) => {
        const dh = Math.min(Math.abs(p.h - c.h), 360 - Math.abs(p.h - c.h));
        return dh < 24 && Math.abs(p.s - c.s) < 35;
      });
      if (!clashes) picked.push(c);
      if (picked.length >= count) break;
    }
    return picked.map((c) => c.hex);
  } finally {
    URL.revokeObjectURL(url);
  }
}