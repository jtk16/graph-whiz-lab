import { Toolkit } from './types';

/**
 * 3D Geometry Toolkit
 * Pre-defined 3D curves, surfaces, and points
 */
export const geometry3dToolkit: Toolkit = {
  id: 'geometry3d',
  name: '3D Geometry',
  description: 'Common 3D shapes, curves, and surfaces',
  icon: 'Box',
  expressions: [
    {
      latex: 'helix(t) = (\\cos(t), \\sin(t), t/5)',
      normalized: 'helix(t) = (cos(t), sin(t), t/5)',
      description: 'Parametric helix curve',
      category: 'function',
      dependencies: []
    },
    {
      latex: 'z = x^2 + y^2',
      normalized: 'z = x^2 + y^2',
      description: 'Paraboloid surface',
      category: 'definition',
      dependencies: []
    },
    {
      latex: 'z = \\sqrt{4 - x^2 - y^2}',
      normalized: 'z = sqrt(4 - x^2 - y^2)',
      description: 'Upper hemisphere (radius 2)',
      category: 'definition',
      dependencies: []
    },
    {
      latex: 'z = x^2 - y^2',
      normalized: 'z = x^2 - y^2',
      description: 'Hyperbolic paraboloid (saddle)',
      category: 'definition',
      dependencies: []
    },
    {
      latex: 'z = \\sin(\\sqrt{x^2 + y^2})',
      normalized: 'z = sin(sqrt(x^2 + y^2))',
      description: 'Ripple wave surface',
      category: 'definition',
      dependencies: []
    },
    {
      latex: 'lissajous(t) = (\\sin(2t), \\sin(3t), \\cos(5t))',
      normalized: 'lissajous(t) = (sin(2*t), sin(3*t), cos(5*t))',
      description: 'Lissajous 3D curve',
      category: 'function',
      dependencies: []
    },
    {
      latex: 'origin = (0, 0, 0)',
      normalized: 'origin = (0, 0, 0)',
      description: '3D point at origin',
      category: 'definition',
      dependencies: []
    },
    {
      latex: 'trefoil(t) = (\\sin(t) + 2\\sin(2t), \\cos(t) - 2\\cos(2t), -\\sin(3t))',
      normalized: 'trefoil(t) = (sin(t) + 2*sin(2*t), cos(t) - 2*cos(2*t), -sin(3*t))',
      description: 'Trefoil knot',
      category: 'function',
      dependencies: []
    }
  ]
};
