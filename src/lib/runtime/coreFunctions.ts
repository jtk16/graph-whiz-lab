// Core mathematical functions using unified registry
import { MathType } from '../types';
import { RuntimeValue, createNumber, isNumber, isFunction, createFunction } from './value';
import { KeyboardCategory } from '../keyboard/categories';
import { registerFunction } from './registry';
import { ASTNode } from '../parser';
import { FunctionDefinition } from '../definitionContext';



// ============= TRIGONOMETRIC FUNCTIONS =============

registerFunction({
  name: 'sin',
  signatures: [{
    paramType: MathType.Number,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isNumber(arg)) throw new Error('sin expects Number');
      return createNumber(Math.sin(arg.value));
    }
  }],
  metadata: {
    latex: '\\sin(#?)',
    description: 'Sine function',
    category: KeyboardCategory.Trigonometric,
    example: 'sin(x)',
    insertTemplate: '\\sin(#0)'
  }
});

registerFunction({
  name: 'cos',
  signatures: [{
    paramType: MathType.Number,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isNumber(arg)) throw new Error('cos expects Number');
      return createNumber(Math.cos(arg.value));
    }
  }],
  metadata: {
    latex: '\\cos(#?)',
    description: 'Cosine function',
    category: KeyboardCategory.Trigonometric,
    example: 'cos(x)',
    insertTemplate: '\\cos(#0)'
  }
});

registerFunction({
  name: 'tan',
  signatures: [{
    paramType: MathType.Number,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isNumber(arg)) throw new Error('tan expects Number');
      return createNumber(Math.tan(arg.value));
    }
  }],
  metadata: {
    latex: '\\tan(#?)',
    description: 'Tangent function',
    category: KeyboardCategory.Trigonometric,
    example: 'tan(x)',
    insertTemplate: '\\tan(#0)'
  }
});

// ============= MATHEMATICAL FUNCTIONS =============

registerFunction({
  name: 'sqrt',
  signatures: [{
    paramType: MathType.Number,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isNumber(arg)) throw new Error('sqrt expects Number');
      return createNumber(Math.sqrt(arg.value));
    }
  }],
  metadata: {
    latex: '\\sqrt{#?}',
    description: 'Square root',
    category: KeyboardCategory.Mathematical,
    example: 'sqrt(x)',
    insertTemplate: '\\sqrt{#0}'
  }
});

registerFunction({
  name: 'abs',
  signatures: [
    {
      paramType: MathType.Number,
      returnType: MathType.Number,
      execute: (arg) => {
        if (!isNumber(arg)) throw new Error('abs expects Number');
        return createNumber(Math.abs(arg.value));
      }
    },
    {
      paramType: MathType.Function,
      returnType: MathType.Function,
      execute: (arg) => {
        if (!isFunction(arg)) throw new Error('abs expects Function');
        // Return wrapped function: abs(f(x)) stays symbolic
        return arg;
      }
    }
  ],
  metadata: {
    latex: '\\left|#?\\right|',
    description: 'Absolute value',
    category: KeyboardCategory.Mathematical,
    example: 'abs(x)',
    insertTemplate: '\\left|#0\\right|'
  }
});

registerFunction({
  name: 'exp',
  signatures: [{
    paramType: MathType.Number,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isNumber(arg)) throw new Error('exp expects Number');
      return createNumber(Math.exp(arg.value));
    }
  }],
  metadata: {
    latex: 'e^{#?}',
    description: 'Exponential (e^x)',
    category: KeyboardCategory.Mathematical,
    example: 'exp(x)',
    insertTemplate: 'e^{#0}'
  }
});

registerFunction({
  name: 'ln',
  signatures: [{
    paramType: MathType.Number,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isNumber(arg)) throw new Error('ln expects Number');
      return createNumber(Math.log(arg.value));
    }
  }],
  metadata: {
    latex: '\\ln(#?)',
    description: 'Natural logarithm',
    category: KeyboardCategory.Mathematical,
    example: 'ln(x)',
    insertTemplate: '\\ln(#0)'
  }
});

registerFunction({
  name: 'log',
  signatures: [{
    paramType: MathType.Number,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isNumber(arg)) throw new Error('log expects Number');
      return createNumber(Math.log10(arg.value));
    }
  }],
  metadata: {
    latex: '\\log(#?)',
    description: 'Logarithm base 10',
    category: KeyboardCategory.Mathematical,
    example: 'log(x)',
    insertTemplate: '\\log(#0)'
  }
});

registerFunction({
  name: 'floor',
  signatures: [{
    paramType: MathType.Number,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isNumber(arg)) throw new Error('floor expects Number');
      return createNumber(Math.floor(arg.value));
    }
  }],
  metadata: {
    latex: '\\lfloor#?\\rfloor',
    description: 'Floor function',
    category: KeyboardCategory.Mathematical,
    example: 'floor(x)',
    insertTemplate: '\\lfloor#0\\rfloor'
  }
});

registerFunction({
  name: 'ceil',
  signatures: [{
    paramType: MathType.Number,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isNumber(arg)) throw new Error('ceil expects Number');
      return createNumber(Math.ceil(arg.value));
    }
  }],
  metadata: {
    latex: '\\lceil#?\\rceil',
    description: 'Ceiling function',
    category: KeyboardCategory.Mathematical,
    example: 'ceil(x)',
    insertTemplate: '\\lceil#0\\rceil'
  }
});

registerFunction({
  name: 'round',
  signatures: [
    {
      paramType: MathType.Number,
      returnType: MathType.Number,
      execute: (arg) => {
        if (!isNumber(arg)) throw new Error('round expects Number');
        return createNumber(Math.round(arg.value));
      }
    },
    {
      paramType: MathType.Function,
      returnType: MathType.Function,
      execute: (arg) => {
        if (!isFunction(arg)) throw new Error('round expects Function');
        // Return wrapped function: round(f(x)) stays symbolic
        return arg;
      }
    }
  ],
  metadata: {
    latex: 'round(#?)',
    description: 'Round to nearest integer',
    category: KeyboardCategory.Mathematical,
    example: 'round(x)',
    insertTemplate: 'round(#0)'
  }
});
