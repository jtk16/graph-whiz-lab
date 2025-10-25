export interface Viewport {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export function createViewport(overrides?: Partial<Viewport>): Viewport {
  return {
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10,
    ...overrides,
  };
}

export function mapX(value: number, width: number, viewport: Viewport): number {
  const { xMin, xMax } = viewport;
  return ((value - xMin) / (xMax - xMin)) * width;
}

export function mapY(value: number, height: number, viewport: Viewport): number {
  const { yMin, yMax } = viewport;
  return height - ((value - yMin) / (yMax - yMin)) * height;
}

export function canvasToCartesian(
  canvasX: number,
  canvasY: number,
  width: number,
  height: number,
  viewport: Viewport
): { x: number; y: number } {
  const x = viewport.xMin + (canvasX / width) * (viewport.xMax - viewport.xMin);
  const y = viewport.yMax - (canvasY / height) * (viewport.yMax - viewport.yMin);
  return { x, y };
}

export function panViewport(viewport: Viewport, deltaX: number, deltaY: number): Viewport {
  return {
    xMin: viewport.xMin + deltaX,
    xMax: viewport.xMax + deltaX,
    yMin: viewport.yMin + deltaY,
    yMax: viewport.yMax + deltaY,
  };
}

export function zoomViewport(viewport: Viewport, factor: number, anchor?: { x: number; y: number }): Viewport {
  const rangeX = viewport.xMax - viewport.xMin;
  const rangeY = viewport.yMax - viewport.yMin;
  const centerX = anchor?.x ?? (viewport.xMin + viewport.xMax) / 2;
  const centerY = anchor?.y ?? (viewport.yMin + viewport.yMax) / 2;

  const newRangeX = rangeX * factor;
  const newRangeY = rangeY * factor;

  return {
    xMin: centerX - newRangeX / 2,
    xMax: centerX + newRangeX / 2,
    yMin: centerY - newRangeY / 2,
    yMax: centerY + newRangeY / 2,
  };
}

export function clampViewport(viewport: Viewport, bounds: Viewport): Viewport {
  return {
    xMin: Math.max(bounds.xMin, viewport.xMin),
    xMax: Math.min(bounds.xMax, viewport.xMax),
    yMin: Math.max(bounds.yMin, viewport.yMin),
    yMax: Math.min(bounds.yMax, viewport.yMax),
  };
}

export function calculateGridSpacing(range: number): number {
  if (range <= 0) {
    return 1;
  }

  const magnitude = Math.pow(10, Math.floor(Math.log10(range)) - 1);
  const normalizedRange = range / magnitude;

  if (normalizedRange >= 50) return magnitude * 10;
  if (normalizedRange >= 20) return magnitude * 5;
  if (normalizedRange >= 10) return magnitude * 2;
  if (normalizedRange >= 5) return magnitude;
  if (normalizedRange >= 2) return magnitude / 2;
  return magnitude / 5;
}
