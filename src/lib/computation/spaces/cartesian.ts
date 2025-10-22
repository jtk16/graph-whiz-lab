import { MathSpace } from './types';

export const cartesianSpace: MathSpace = {
  id: 'cartesian',
  name: 'Cartesian',
  description: 'Standard 3D Cartesian coordinates (x, y, z)',
  
  dimensions: [
    { name: 'x', symbol: 'x' },
    { name: 'y', symbol: 'y' },
    { name: 'z', symbol: 'z' }
  ],
  
  toCartesian: (coords) => ({
    x: coords.x ?? 0,
    y: coords.y ?? 0,
    z: coords.z ?? 0
  }),
  
  fromCartesian: (point) => ({
    x: point.x,
    y: point.y,
    z: point.z
  }),
  
  defaultBounds: {
    x: { min: -5, max: 5 },
    y: { min: -5, max: 5 },
    z: { min: -5, max: 5 }
  },
  
  generateGrid: (resolution) => {
    const lines = [];
    const step = 10 / resolution;
    
    // X-Y plane grid (z=0)
    for (let i = -5; i <= 5; i += step) {
      lines.push({ points: [
        { x: i, y: -5, z: 0 },
        { x: i, y: 5, z: 0 }
      ]});
      lines.push({ points: [
        { x: -5, y: i, z: 0 },
        { x: 5, y: i, z: 0 }
      ]});
    }
    
    return { lines };
  }
};
