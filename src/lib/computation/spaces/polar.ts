import { MathSpace } from './types';

/**
 * Cylindrical/Polar coordinates: (r, θ, z)
 */
export const polarSpace: MathSpace = {
  id: 'polar',
  name: 'Polar/Cylindrical',
  description: 'Polar coordinates (r, θ, z)',
  
  dimensions: [
    { name: 'r', symbol: 'r' },
    { name: 'theta', symbol: 'θ', unit: 'rad', periodic: true },
    { name: 'z', symbol: 'z' }
  ],
  
  toCartesian: (coords) => {
    const r = coords.r ?? 0;
    const theta = coords.theta ?? 0;
    const z = coords.z ?? 0;
    
    return {
      x: r * Math.cos(theta),
      y: r * Math.sin(theta),
      z: z
    };
  },
  
  fromCartesian: (point) => ({
    r: Math.sqrt(point.x ** 2 + point.y ** 2),
    theta: Math.atan2(point.y, point.x),
    z: point.z
  }),
  
  defaultBounds: {
    r: { min: 0, max: 5 },
    theta: { min: 0, max: 2 * Math.PI },
    z: { min: -5, max: 5 }
  }
};
