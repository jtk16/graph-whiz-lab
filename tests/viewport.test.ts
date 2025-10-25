import { describe, expect, it } from 'vitest';
import {
  createViewport,
  mapX,
  mapY,
  canvasToCartesian,
  zoomViewport,
  panViewport,
  calculateGridSpacing,
} from '@/lib/viewports/viewport';

describe('viewport utilities', () => {
  const viewport = createViewport({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 });

  it('maps math coordinates to canvas space', () => {
    expect(mapX(0, 200, viewport)).toBeCloseTo(100);
    expect(mapY(0, 200, viewport)).toBeCloseTo(100);
  });

  it('converts canvas coordinates back to math space', () => {
    const point = canvasToCartesian(100, 100, 200, 200, viewport);
    expect(point.x).toBeCloseTo(0);
    expect(point.y).toBeCloseTo(0);
  });

  it('zooms toward an anchor point', () => {
    const zoomed = zoomViewport(viewport, 0.5, { x: 5, y: 0 });
    expect(zoomed.xMax - zoomed.xMin).toBeCloseTo((viewport.xMax - viewport.xMin) * 0.5);
  });

  it('pans the viewport', () => {
    const panned = panViewport(viewport, 2, -3);
    expect(panned.xMin).toBeCloseTo(viewport.xMin + 2);
    expect(panned.yMax).toBeCloseTo(viewport.yMax - 3);
  });

  it('calculates grid spacing based on range', () => {
    expect(calculateGridSpacing(100)).toBeGreaterThan(0);
    expect(calculateGridSpacing(1)).toBeLessThan(1);
  });
});
