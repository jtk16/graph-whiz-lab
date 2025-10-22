/**
 * Complex number operations: arg, real, imag, conj
 */

import { registry } from '../registry';
import { MathType } from '../../types';
import { isComplex, createNumber, createComplex } from '../../runtime/value';
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
      { input: [MathType.Complex], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isComplex(arg)) {
        return createNumber(Math.atan2(arg.imag, arg.real));
      }
      throw new Error('arg expects Complex');
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
      { input: [MathType.Complex], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isComplex(arg)) {
        return createNumber(arg.real);
      }
      throw new Error('real expects Complex');
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
      { input: [MathType.Complex], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isComplex(arg)) {
        return createNumber(arg.imag);
      }
      throw new Error('imag expects Complex');
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
      { input: [MathType.Complex], output: MathType.Complex }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isComplex(arg)) {
        return createComplex(arg.real, -arg.imag);
      }
      throw new Error('conj expects Complex');
    }
  },
  ui: {
    description: 'Complex conjugate',
    category: KeyboardCategory.Complex,
    example: 'conj(3+4i) = 3-4i'
  }
});
