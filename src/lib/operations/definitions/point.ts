/**
 * Point/Vector operations: dot, cross, distance
 */

import { registry } from '../registry';
import { MathType } from '../../types';
import { isPoint, createNumber, createPoint } from '../../runtime/value';
import { KeyboardCategory } from '../../keyboard/categories';

// Dot product
registry.register({
  id: 'dot',
  name: 'dot',
  syntax: {
    latex: 'dot(#0, #1)',
    normalized: 'dot(#0, #1)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.Point, MathType.Point], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a, b] = args;
      if (isPoint(a) && isPoint(b)) {
        // 2D dot product
        const result = a.x * b.x + a.y * b.y;
        return createNumber(result);
      }
      throw new Error('dot expects two Points');
    }
  },
  ui: {
    description: 'Dot product of two vectors',
    category: KeyboardCategory.Points,
    example: 'dot((1,2), (3,4)) = 11'
  }
});

// Cross product (3D only)
registry.register({
  id: 'cross',
  name: 'cross',
  syntax: {
    latex: 'cross(#0, #1)',
    normalized: 'cross(#0, #1)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.Point, MathType.Point], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a, b] = args;
      if (isPoint(a) && isPoint(b)) {
        // 2D cross product: returns z-component (scalar) treating as 3D with z=0
        const result = a.x * b.y - a.y * b.x;
        return createNumber(result);
      }
      throw new Error('cross expects two Points');
    }
  },
  ui: {
    description: 'Cross product of two 2D vectors (returns scalar)',
    category: KeyboardCategory.Points,
    example: 'cross((1,0), (0,1)) = 1'
  }
});

// Distance
registry.register({
  id: 'distance',
  name: 'distance',
  syntax: {
    latex: 'distance(#0, #1)',
    normalized: 'distance(#0, #1)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.Point, MathType.Point], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a, b] = args;
      if (isPoint(a) && isPoint(b)) {
        // 2D distance
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return createNumber(Math.sqrt(dx * dx + dy * dy));
      }
      throw new Error('distance expects two Points');
    }
  },
  ui: {
    description: 'Euclidean distance between two points',
    category: KeyboardCategory.Points,
    example: 'distance((0,0), (3,4)) = 5'
  }
});
