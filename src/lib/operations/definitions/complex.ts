/**
 * Complex number operations: arg, real, imag, conj
 */

import { registry } from '../registry';
import { MathType } from '../../types';
import { isComplex, isNumber, createNumber, createComplex } from '../../runtime/value';
import { KeyboardCategory } from '../../keyboard/categories';

// Argument (phase angle)
registry.register({
  id: 'arg',
  name: 'arg',
  syntax: {
    latex: 'arg(#0)',
    normalized: 'arg(#0)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.Complex], output: MathType.Number },
      { input: [MathType.Number], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isComplex(arg)) {
        return createNumber(Math.atan2(arg.imag, arg.real));
      }
      if (isNumber(arg)) {
        // Phase angle of real number: 0 for positive, π for negative
        return createNumber(arg.value >= 0 ? 0 : Math.PI);
      }
      throw new Error('arg expects Complex or Number');
    }
  },
  ui: {
    description: 'Argument (phase) of complex number',
    category: KeyboardCategory.Complex,
    example: 'arg(1+i)'
  }
});

// Real part
registry.register({
  id: 'real',
  name: 'real',
  syntax: {
    latex: 'real(#0)',
    normalized: 'real(#0)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.Complex], output: MathType.Number },
      { input: [MathType.Number], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isComplex(arg)) {
        return createNumber(arg.real);
      }
      if (isNumber(arg)) {
        // Real part of a real number is itself
        return arg;
      }
      throw new Error('real expects Complex or Number');
    }
  },
  ui: {
    description: 'Real part of complex number',
    category: KeyboardCategory.Complex,
    example: 'real(3+4i) = 3'
  }
});

// Imaginary part
registry.register({
  id: 'imag',
  name: 'imag',
  syntax: {
    latex: 'imag(#0)',
    normalized: 'imag(#0)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.Complex], output: MathType.Number },
      { input: [MathType.Number], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isComplex(arg)) {
        return createNumber(arg.imag);
      }
      if (isNumber(arg)) {
        // Imaginary part of a real number is zero
        return createNumber(0);
      }
      throw new Error('imag expects Complex or Number');
    }
  },
  ui: {
    description: 'Imaginary part of complex number',
    category: KeyboardCategory.Complex,
    example: 'imag(3+4i) = 4'
  }
});

// Conjugate
registry.register({
  id: 'conj',
  name: 'conj',
  syntax: {
    latex: 'conj(#0)',
    normalized: 'conj(#0)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.Complex], output: MathType.Complex },
      { input: [MathType.Number], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isComplex(arg)) {
        return createComplex(arg.real, -arg.imag);
      }
      if (isNumber(arg)) {
        // Conjugate of a real number is itself
        return arg;
      }
      throw new Error('conj expects Complex or Number');
    }
  },
  ui: {
    description: 'Complex conjugate',
    category: KeyboardCategory.Complex,
    example: 'conj(3+4i) = 3-4i'
  }
});
