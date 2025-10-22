import { MathSpace } from './types';

/**
 * Complex plane visualization: (re, im) → |f(z)|
 * Domain coloring, magnitude surface, etc.
 */
export const complexPlaneSpace: MathSpace = {
  id: 'complex-plane',
  name: 'Complex Plane',
  description: 'Visualize complex functions with domain coloring',
  
  dimensions: [
    { name: 're', symbol: 'Re(z)' },
    { name: 'im', symbol: 'Im(z)' },
    { name: 'mag', symbol: '|f(z)|' }
  ],
  
  toCartesian: (coords) => ({
    x: coords.re ?? 0,
    y: coords.im ?? 0,
    z: coords.mag ?? 0
  }),
  
  fromCartesian: (point) => ({
    re: point.x,
    im: point.y,
    mag: point.z
  }),
  
  defaultBounds: {
    re: { min: -2, max: 2 },
    im: { min: -2, max: 2 },
    mag: { min: 0, max: 5 }
  }
};
