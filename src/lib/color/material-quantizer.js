/**
 * C++-compatible Celebi quantization for materialyoucolor 3.0.4.
 *
 * The Python reference uses Google's C++ Wu + Wsmeans implementation rather
 * than the TypeScript quantizer. This port preserves the observable C++
 * choices that differ in JavaScript: integer-truncated Wu centroids, glibc's
 * fixed srand(42688) sequence, 100 Wsmeans rounds, C++ Lab conversion
 * constants, duplicate-cluster population merging, and ordered output.
 *
 * The underlying Material Color Utilities algorithms are Copyright Google LLC
 * and licensed under Apache-2.0.
 */

import {
  QuantizerWu,
  argbFromRgb,
  labFromArgb,
} from "@material/material-color-utilities";

const MAX_ITERATIONS = 100;
const MIN_DELTA_E = 3;
const MAX_COLORS = 256;
const RANDOM_SEED = 42688;

class CppQuantizerWu extends QuantizerWu {
  createResult(colorCount) {
    const colors = [];

    for (let index = 0; index < colorCount; index += 1) {
      const cube = this.cubes[index];
      const weight = this.volume(cube, this.weights);
      if (weight <= 0) continue;

      const red = Math.trunc(this.volume(cube, this.momentsR) / weight);
      const green = Math.trunc(this.volume(cube, this.momentsG) / weight);
      const blue = Math.trunc(this.volume(cube, this.momentsB) / weight);
      colors.push(argbFromRgb(red, green, blue) >>> 0);
    }

    return colors;
  }
}

/**
 * glibc random()/rand() TYPE_3 sequence. The attached Linux C++ reference
 * calls srand(42688) immediately before assigning every point to a cluster.
 */
function glibcRandom(seed) {
  const state = new Uint32Array(31);
  state[0] = seed >>> 0;

  for (let index = 1; index < state.length; index += 1) {
    const previous = state[index - 1];
    const high = Math.floor(previous / 127773);
    const low = previous % 127773;
    let word = 16807 * low - 2836 * high;
    if (word < 0) word += 2147483647;
    state[index] = word >>> 0;
  }

  let front = 3;
  let rear = 0;
  const next = () => {
    const sum = (state[front] + state[rear]) >>> 0;
    state[front] = sum;
    const value = sum >>> 1;
    front = (front + 1) % state.length;
    rear = (rear + 1) % state.length;
    return value;
  };

  for (let index = 0; index < state.length * 10; index += 1) next();
  return next;
}

function deltaE(left, right) {
  const deltaL = left[0] - right[0];
  const deltaA = left[1] - right[1];
  const deltaB = left[2] - right[2];
  return deltaL * deltaL + deltaA * deltaA + deltaB * deltaB;
}

const clampChannel = (value) => Math.min(255, Math.max(0, Math.round(value)));

function delinearized(rgbComponent) {
  const normalized = rgbComponent / 100;
  const value = normalized <= 0.0031308
    ? normalized * 12.92
    : 1.055 * Math.pow(normalized, 1 / 2.4) - 0.055;
  return clampChannel(value * 255);
}

/** IntFromLab from the supplied C++ source, including its matrix precision. */
function argbFromCppLab([lightness, componentA, componentB]) {
  const epsilon = 216 / 24389;
  const kappa = 24389 / 27;
  const fy = (lightness + 16) / 116;
  const fx = componentA / 500 + fy;
  const fz = fy - componentB / 200;
  const fx3 = fx * fx * fx;
  const fz3 = fz * fz * fz;
  const xNormalized = fx3 > epsilon ? fx3 : (116 * fx - 16) / kappa;
  const yNormalized = lightness > 8 ? fy * fy * fy : lightness / kappa;
  const zNormalized = fz3 > epsilon ? fz3 : (116 * fz - 16) / kappa;
  const x = xNormalized * 95.047;
  const y = yNormalized * 100;
  const z = zNormalized * 108.883;

  const redLinear = 3.2406 * x - 1.5372 * y - 0.4986 * z;
  const greenLinear = -0.9689 * x + 1.8758 * y + 0.0415 * z;
  const blueLinear = 0.0557 * x - 0.2040 * y + 1.0570 * z;

  return argbFromRgb(
    delinearized(redLinear),
    delinearized(greenLinear),
    delinearized(blueLinear),
  ) >>> 0;
}

function wsmeans(inputPixels, startingClusters, requestedMaxColors) {
  if (requestedMaxColors <= 0 || inputPixels.length === 0) return new Map();

  const maxColors = Math.min(MAX_COLORS, requestedMaxColors);
  const pixelToCount = new Map();
  const pixels = [];
  const points = [];

  for (const inputPixel of inputPixels) {
    const pixel = inputPixel >>> 0;
    const count = pixelToCount.get(pixel);
    if (count === undefined) {
      pixels.push(pixel);
      points.push(labFromArgb(pixel));
      pixelToCount.set(pixel, 1);
    } else {
      pixelToCount.set(pixel, count + 1);
    }
  }

  let clusterCount = Math.min(maxColors, points.length);
  if (startingClusters.length > 0) {
    clusterCount = Math.min(clusterCount, startingClusters.length);
  }
  if (clusterCount === 0) return new Map();

  const clusters = startingClusters
    .slice(0, clusterCount)
    .map((argb) => labFromArgb(argb >>> 0));
  const random = glibcRandom(RANDOM_SEED);
  const clusterIndices = points.map(() => random() % clusterCount);
  const distances = Array.from(
    { length: clusterCount },
    () => new Array(clusterCount).fill(0),
  );
  const populationSums = new Array(clusterCount).fill(0);

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    for (let left = 0; left < clusterCount; left += 1) {
      for (let right = left + 1; right < clusterCount; right += 1) {
        const distance = deltaE(clusters[left], clusters[right]);
        distances[left][right] = distance;
        distances[right][left] = distance;
      }
    }

    let colorMoved = false;
    for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
      const point = points[pointIndex];
      const previousIndex = clusterIndices[pointIndex];
      const previousDistance = deltaE(point, clusters[previousIndex]);
      let minimumDistance = previousDistance;
      let newIndex = -1;

      for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex += 1) {
        if (distances[previousIndex][clusterIndex] >= 4 * previousDistance) continue;
        const distance = deltaE(point, clusters[clusterIndex]);
        if (distance < minimumDistance) {
          minimumDistance = distance;
          newIndex = clusterIndex;
        }
      }

      if (newIndex !== -1) {
        const movement = Math.abs(
          Math.sqrt(minimumDistance) - Math.sqrt(previousDistance),
        );
        if (movement > MIN_DELTA_E) {
          colorMoved = true;
          clusterIndices[pointIndex] = newIndex;
        }
      }
    }

    if (!colorMoved && iteration !== 0) break;

    const lightnessSums = new Array(clusterCount).fill(0);
    const componentASums = new Array(clusterCount).fill(0);
    const componentBSums = new Array(clusterCount).fill(0);
    populationSums.fill(0);

    for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
      const clusterIndex = clusterIndices[pointIndex];
      const point = points[pointIndex];
      const count = pixelToCount.get(pixels[pointIndex]);
      populationSums[clusterIndex] += count;
      lightnessSums[clusterIndex] += point[0] * count;
      componentASums[clusterIndex] += point[1] * count;
      componentBSums[clusterIndex] += point[2] * count;
    }

    for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex += 1) {
      const count = populationSums[clusterIndex];
      clusters[clusterIndex] = count === 0
        ? [0, 0, 0]
        : [
            lightnessSums[clusterIndex] / count,
            componentASums[clusterIndex] / count,
            componentBSums[clusterIndex] / count,
          ];
    }
  }

  const merged = new Map();
  for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex += 1) {
    const count = populationSums[clusterIndex];
    if (count === 0) continue;
    const argb = argbFromCppLab(clusters[clusterIndex]);
    merged.set(argb, (merged.get(argb) || 0) + count);
  }

  return new Map([...merged].sort(([left], [right]) => left - right));
}

/**
 * Celebi = Wu starting clusters followed by the C++-compatible Wsmeans pass.
 */
export function quantizeCelebiCpp(pixels, maxColors = 128) {
  const capped = Math.min(MAX_COLORS, Math.max(0, Math.floor(maxColors)));
  if (capped === 0 || pixels.length === 0) return new Map();

  const normalizedPixels = Array.from(pixels, (pixel) => pixel >>> 0);
  const startingClusters = new CppQuantizerWu().quantize(
    normalizedPixels,
    capped,
  );
  return wsmeans(normalizedPixels, startingClusters, capped);
}
