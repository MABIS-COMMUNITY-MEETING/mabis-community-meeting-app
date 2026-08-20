/**
 * Wallpaper → Material You seed colors.
 *
 * This is the same pipeline used by materialyoucolor 3.0.4 and Google's
 * Material Color Utilities: full-image pixels → Celebi (Wu + Wsmeans)
 * quantization at 128 colors → Material Score ranking.
 */

import {
  QuantizerCelebi,
  Score,
  argbFromRgb,
  hexFromArgb,
} from "@material/material-color-utilities";

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function pixelsFromImage(img) {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Could not get canvas context");

  context.drawImage(img, 0, 0, width, height);
  const imageBytes = context.getImageData(0, 0, width, height).data;
  const pixels = [];

  for (let index = 0; index < imageBytes.length; index += 4) {
    if (imageBytes[index + 3] < 255) continue;
    pixels.push(argbFromRgb(
      imageBytes[index],
      imageBytes[index + 1],
      imageBytes[index + 2],
    ));
  }

  return pixels;
}

export function quantizeMaterialPixels(pixels, maxColors = 128) {
  return QuantizerCelebi.quantize(pixels, maxColors);
}

export function scoreMaterialPopulation(population, count = 6) {
  return Score.score(population, {
    desired: Math.max(1, Math.floor(count)),
    filter: true,
  });
}

/**
 * @param {File|Blob} file an image the user picked
 * @param {number} count how many ranked seed colors to return
 * @returns {Promise<string[]>} Material-ranked seed colors, best first
 */
export async function extractWallpaperPalette(file, count = 6) {
  const url = URL.createObjectURL(file);

  try {
    const image = await loadImage(url);
    const pixels = pixelsFromImage(image);
    const quantized = quantizeMaterialPixels(pixels);
    return scoreMaterialPopulation(quantized, count).map(hexFromArgb);
  } finally {
    URL.revokeObjectURL(url);
  }
}
