/**
 * Trigonometric functions: sin, cos, tan, asin, acos, atan
 */

import { registry } from '../registry';
import { MathType } from '../../types';
import { isNumber, createNumber } from '../../runtime/value';
import { KeyboardCategory } from '../../keyboard/categories';

const trigFunctions = [
  { id: 'sin', fn: Math.sin, desc: 'Sine function', example: 'sin(π/2) = 1' },
  { id: 'cos', fn: Math.cos, desc: 'Cosine function', example: 'cos(0) = 1' },
  { id: 'tan', fn: Math.tan, desc: 'Tangent function', example: 'tan(π/4) ≈ 1' },
  { id: 'asin', fn: Math.asin, desc: 'Inverse sine (arcsin)', example: 'asin(1) = π/2' },
  { id: 'acos', fn: Math.acos, desc: 'Inverse cosine (arccos)', example: 'acos(0) = π/2' },
  { id: 'atan', fn: Math.atan, desc: 'Inverse tangent (arctan)', example: 'atan(1) = π/4' }
];

for (const { id, fn, desc, example } of trigFunctions) {
  registry.register({
    id,
    name: id,
    syntax: {
      latex: `\\${id}(#0)`,
      normalized: `${id}(#0)`,
      aliases: [
        // Handle \sin{x} → sin(x)
        { pattern: new RegExp(`\\\\${id}\\{([^}]+)\\}`, 'g'), replacement: `${id}($1)`, priority: 20 },
        // Handle \sin x → sin(x) (implicit parentheses)
        { pattern: new RegExp(`\\\\${id}\\s+([a-z0-9]+)`, 'gi'), replacement: `${id}($1)`, priority: 30 },
        // Handle \sin → sin
        { pattern: new RegExp(`\\\\${id}\\b`, 'g'), replacement: id, priority: 40 }
      ]
    },
    parse: {
      type: 'function'
    },
    types: {
      signatures: [
        { input: [MathType.Number], output: MathType.Number, symbolic: true }
      ]
    },
    runtime: {
      evaluate: (args) => {
        const [arg] = args;
        if (isNumber(arg)) {
          return createNumber(fn(arg.value));
        }
        throw new Error(`${id} expects Number`);
      }
    },
    ui: {
      description: desc,
      category: KeyboardCategory.Trigonometric,
      example
    }
  });
}
