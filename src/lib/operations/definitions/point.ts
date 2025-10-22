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
        if (a.coordinates.length !== b.coordinates.length) {
          throw new Error('Points must have same dimension for dot product');
        }
        const result = a.coordinates.reduce((sum, val, i) => sum + val * b.coordinates[i], 0);
        return createNumber(result);
      }
      throw new Error('dot expects two Points');
    }
  },
  ui: {
    description: 'Dot product of two vectors',
    category: KeyboardCategory.Vector,
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
      { input: [MathType.Point, MathType.Point], output: MathType.Point }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a, b] = args;
      if (isPoint(a) && isPoint(b)) {
        if (a.coordinates.length !== 3 || b.coordinates.length !== 3) {
          throw new Error('Cross product requires 3D vectors');
        }
        const [ax, ay, az] = a.coordinates;
        const [bx, by, bz] = b.coordinates;
        return createPoint([
          ay * bz - az * by,
          az * bx - ax * bz,
          ax * by - ay * bx
        ]);
      }
      throw new Error('cross expects two 3D Points');
    }
  },
  ui: {
    description: 'Cross product of two 3D vectors',
    category: KeyboardCategory.Vector,
    example: 'cross((1,0,0), (0,1,0)) = (0,0,1)'
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
        if (a.coordinates.length !== b.coordinates.length) {
          throw new Error('Points must have same dimension');
        }
        const sumSquares = a.coordinates.reduce(
          (sum, val, i) => sum + Math.pow(val - b.coordinates[i], 2),
          0
        );
        return createNumber(Math.sqrt(sumSquares));
      }
      throw new Error('distance expects two Points');
    }
  },
  ui: {
    description: 'Euclidean distance between two points',
    category: KeyboardCategory.Vector,
    example: 'distance((0,0), (3,4)) = 5'
  }
});
