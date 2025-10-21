// Complex number functions using unified registry
import { MathType } from '../types';
import { RuntimeValue, createNumber, createComplex, isComplex } from './value';
import { KeyboardCategory } from '../keyboard/categories';
import { registerFunction } from './registry';

// Magnitude/absolute value for Complex
registerFunction({
  name: 'abs',
  signatures: [{
    paramType: MathType.Complex,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isComplex(arg)) throw new Error('abs expects Complex');
      return createNumber(Math.sqrt(arg.real * arg.real + arg.imag * arg.imag));
    }
  }],
  metadata: {
    latex: '|z|',
    description: 'Complex magnitude',
    category: KeyboardCategory.Complex,
    example: 'abs(1+2i)'
  }
});

// Argument/phase
registerFunction({
  name: 'arg',
  signatures: [{
    paramType: MathType.Complex,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isComplex(arg)) throw new Error('arg expects Complex');
      return createNumber(Math.atan2(arg.imag, arg.real));
    }
  }],
  metadata: {
    latex: 'arg(#?)',
    description: 'Complex argument',
    category: KeyboardCategory.Complex,
    example: 'arg(1+2i)',
    insertTemplate: 'arg(#0)'
  }
});

// Real part
registerFunction({
  name: 'real',
  signatures: [{
    paramType: MathType.Complex,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isComplex(arg)) throw new Error('real expects Complex');
      return createNumber(arg.real);
    }
  }],
  metadata: {
    latex: 'Re(#?)',
    description: 'Real part',
    category: KeyboardCategory.Complex,
    example: 'real(1+2i)',
    insertTemplate: 'real(#0)'
  }
});

// Imaginary part
registerFunction({
  name: 'imag',
  signatures: [{
    paramType: MathType.Complex,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isComplex(arg)) throw new Error('imag expects Complex');
      return createNumber(arg.imag);
    }
  }],
  metadata: {
    latex: 'Im(#?)',
    description: 'Imaginary part',
    category: KeyboardCategory.Complex,
    example: 'imag(1+2i)',
    insertTemplate: 'imag(#0)'
  }
});

// Complex conjugate
registerFunction({
  name: 'conj',
  signatures: [{
    paramType: MathType.Complex,
    returnType: MathType.Complex,
    execute: (arg) => {
      if (!isComplex(arg)) throw new Error('conj expects Complex');
      return createComplex(arg.real, -arg.imag);
    }
  }],
  metadata: {
    latex: '\\overline{#?}',
    description: 'Complex conjugate',
    category: KeyboardCategory.Complex,
    example: 'conj(1+2i)',
    insertTemplate: '\\overline{#0}'
  }
});
