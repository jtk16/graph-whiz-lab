/**
 * Trigonometric functions: sin, cos, tan, asin, acos, atan
 */

import { registry } from '../registry';
import { MathType } from '../../types';
import { isNumber, createNumber, isComplex, createComplex } from '../../runtime/value';
import { KeyboardCategory } from '../../keyboard/categories';

const complexSin = (real: number, imag: number) => ({
  real: Math.sin(real) * Math.cosh(imag),
  imag: Math.cos(real) * Math.sinh(imag)
});

const complexCos = (real: number, imag: number) => ({
  real: Math.cos(real) * Math.cosh(imag),
  imag: -Math.sin(real) * Math.sinh(imag)
});

const complexTan = (real: number, imag: number) => {
  const sinVal = complexSin(real, imag);
  const cosVal = complexCos(real, imag);
  const denom = cosVal.real * cosVal.real + cosVal.imag * cosVal.imag;
  if (denom === 0) {
    throw new Error('tan undefined for this complex input');
  }
  return {
    real: (sinVal.real * cosVal.real + sinVal.imag * cosVal.imag) / denom,
    imag: (sinVal.imag * cosVal.real - sinVal.real * cosVal.imag) / denom
  };
};

const trigFunctions = [
  {
    id: 'sin',
    fn: Math.sin,
    desc: 'Sine function',
    example: 'sin(π/2) = 1',
    complexEval: complexSin
  },
  {
    id: 'cos',
    fn: Math.cos,
    desc: 'Cosine function',
    example: 'cos(0) = 1',
    complexEval: complexCos
  },
  {
    id: 'tan',
    fn: Math.tan,
    desc: 'Tangent function',
    example: 'tan(π/4) ≈ 1',
    complexEval: complexTan
  },
  { id: 'asin', fn: Math.asin, desc: 'Inverse sine (arcsin)', example: 'asin(1) = π/2' },
  { id: 'acos', fn: Math.acos, desc: 'Inverse cosine (arccos)', example: 'acos(0) = π/2' },
  { id: 'atan', fn: Math.atan, desc: 'Inverse tangent (arctan)', example: 'atan(1) = π/4' }
];

for (const { id, fn, desc, example, complexEval } of trigFunctions) {
  const signatures = [
    { input: [MathType.Number], output: MathType.Number, symbolic: true }
  ];
  if (complexEval) {
    signatures.push({ input: [MathType.Complex], output: MathType.Complex, symbolic: true });
  }

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
      signatures
    },
    runtime: {
      evaluate: (args) => {
        const [arg] = args;
        if (isNumber(arg)) {
          return createNumber(fn(arg.value));
        }
        if (complexEval && isComplex(arg)) {
          const value = complexEval(arg.real, arg.imag);
          return createComplex(value.real, value.imag);
        }
        throw new Error(`${id} expects ${complexEval ? 'Number or Complex' : 'Number'}`);
      }
    },
    ui: {
      description: desc,
      category: KeyboardCategory.Trigonometric,
      example
    }
  });
}
