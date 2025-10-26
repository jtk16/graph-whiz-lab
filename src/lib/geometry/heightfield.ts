import { SurfaceData } from "@/lib/computation/evaluators/SurfaceEvaluator";

interface HeightFieldOptions {
  resolution: number;
  xRange: { min: number; max: number };
  yRange: { min: number; max: number };
  values: Float32Array;
  mask?: Uint8Array;
}

const DEFAULT_MASK_VALUE = 1;

export function createSurfaceFromHeightField({
  resolution,
  xRange,
  yRange,
  values,
  mask,
}: HeightFieldOptions): SurfaceData {
  const count = resolution * resolution;
  const positions = new Float32Array(count * 3);
  const indices: number[] = [];
  const normals = new Float32Array(count * 3);

  const xStep = resolution > 1 ? (xRange.max - xRange.min) / (resolution - 1) : 1;
  const yStep = resolution > 1 ? (yRange.max - yRange.min) / (resolution - 1) : 1;

  const isValid = (idx: number) => {
    if (!mask) return true;
    return mask[idx] !== 0;
  };

  for (let row = 0; row < resolution; row++) {
    for (let col = 0; col < resolution; col++) {
      const idx = row * resolution + col;
      const x = xRange.min + col * xStep;
      const y = yRange.max - row * yStep;
      const rawValue = values[idx];
      const valid = isValid(idx) && Number.isFinite(rawValue);
      const value = valid ? rawValue : 0;

      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = valid ? value : 0;

      const left = col > 0 ? values[idx - 1] : rawValue;
      const right = col < resolution - 1 ? values[idx + 1] : rawValue;
      const down = row < resolution - 1 ? values[idx + resolution] : rawValue;
      const up = row > 0 ? values[idx - resolution] : rawValue;

      const safeLeft = Number.isFinite(left) ? left : value;
      const safeRight = Number.isFinite(right) ? right : value;
      const safeDown = Number.isFinite(down) ? down : value;
      const safeUp = Number.isFinite(up) ? up : value;

      const dx = (safeRight - safeLeft) / (2 * xStep || 1);
      const dy = (safeUp - safeDown) / (2 * yStep || 1);

      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      const length = Math.hypot(nx, ny, nz) || 1;

      normals[idx * 3] = nx / length;
      normals[idx * 3 + 1] = ny / length;
      normals[idx * 3 + 2] = nz / length;
    }
  }

  for (let row = 0; row < resolution - 1; row++) {
    for (let col = 0; col < resolution - 1; col++) {
      const idx = row * resolution + col;
      const idxRight = idx + 1;
      const idxDown = idx + resolution;
      const idxDiag = idxDown + 1;

      if (
        (mask ? mask[idx] : DEFAULT_MASK_VALUE) &&
        (mask ? mask[idxRight] : DEFAULT_MASK_VALUE) &&
        (mask ? mask[idxDown] : DEFAULT_MASK_VALUE) &&
        (mask ? mask[idxDiag] : DEFAULT_MASK_VALUE)
      ) {
        indices.push(idx, idxDown, idxRight);
        indices.push(idxRight, idxDown, idxDiag);
      }
    }
  }

  return {
    vertices: positions,
    normals,
    indices: new Uint32Array(indices),
  };
}
