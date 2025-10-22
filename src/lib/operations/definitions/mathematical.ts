/**
 * Mathematical functions: sqrt, abs, exp, ln, log, floor, ceil, round
 */

import { registry } from '../registry';
import { MathType } from '../../types';
import { isNumber, createNumber, isComplex } from '../../runtime/value';
import { KeyboardCategory } from '../../keyboard/categories';

// Square root
registry.register({
  id: 'sqrt',
  name: 'sqrt',
  syntax: {
    latex: '\\sqrt{#0}',
    normalized: 'sqrt(#0)',
    aliases: [
      { pattern: /\\sqrt\{([^}]+)\}/g, replacement: 'sqrt($1)', priority: 20 }
    ],
    insertTemplate: '\\sqrt{#0}'
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
        return createNumber(Math.sqrt(arg.value));
      }
      throw new Error('sqrt expects Number');
    }
  },
  ui: {
    description: 'Square root',
    category: KeyboardCategory.Mathematical,
    example: 'sqrt(16) = 4'
  }
});

// Absolute value
registry.register({
  id: 'abs',
  name: 'abs',
  syntax: {
    latex: '\\abs{#0}',
    normalized: 'abs(#0)',
    aliases: [
      { pattern: /\\abs\{([^}]+)\}/g, replacement: 'abs($1)', priority: 20 },
      { pattern: /\\left\|([^\\]+?)\\right\|/g, replacement: 'abs($1)', priority: 15 },
      { pattern: /\|([^|]+)\|/g, replacement: 'abs($1)', priority: 25 }
    ],
    insertTemplate: '\\abs{#0}'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.Number], output: MathType.Number, symbolic: true },
      { input: [MathType.Complex], output: MathType.Number, symbolic: true }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isNumber(arg)) {
        return createNumber(Math.abs(arg.value));
      }
      if (isComplex(arg)) {
        const magnitude = Math.sqrt(arg.real * arg.real + arg.imag * arg.imag);
        return createNumber(magnitude);
      }
      throw new Error('abs expects Number or Complex');
    }
  },
  ui: {
    description: 'Absolute value',
    category: KeyboardCategory.Mathematical,
    example: 'abs(-5) = 5'
  }
});

// Exponential
registry.register({
  id: 'exp',
  name: 'exp',
  syntax: {
    latex: '\\exp(#0)',
    normalized: 'exp(#0)',
    aliases: [
      { pattern: /\\exp\{([^}]+)\}/g, replacement: 'exp($1)', priority: 20 },
      { pattern: /\\exp\b/g, replacement: 'exp', priority: 40 }
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
        return createNumber(Math.exp(arg.value));
      }
      throw new Error('exp expects Number');
    }
  },
  ui: {
    description: 'Exponential function (e^x)',
    category: KeyboardCategory.Mathematical,
    example: 'exp(1) ≈ 2.718'
  }
});

// Natural logarithm
registry.register({
  id: 'ln',
  name: 'ln',
  syntax: {
    latex: '\\ln(#0)',
    normalized: 'ln(#0)',
    aliases: [
      { pattern: /\\ln\{([^}]+)\}/g, replacement: 'ln($1)', priority: 20 },
      { pattern: /\\ln\b/g, replacement: 'ln', priority: 40 }
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
        if (arg.value <= 0) throw new Error('ln expects positive number');
        return createNumber(Math.log(arg.value));
      }
      throw new Error('ln expects Number');
    }
  },
  ui: {
    description: 'Natural logarithm (base e)',
    category: KeyboardCategory.Mathematical,
    example: 'ln(e) = 1'
  }
});

// Base-10 logarithm
registry.register({
  id: 'log',
  name: 'log',
  syntax: {
    latex: '\\log(#0)',
    normalized: 'log(#0)',
    aliases: [
      { pattern: /\\log\{([^}]+)\}/g, replacement: 'log($1)', priority: 20 },
      { pattern: /\\log\b/g, replacement: 'log', priority: 40 }
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
        if (arg.value <= 0) throw new Error('log expects positive number');
        return createNumber(Math.log10(arg.value));
      }
      throw new Error('log expects Number');
    }
  },
  ui: {
    description: 'Base-10 logarithm',
    category: KeyboardCategory.Mathematical,
    example: 'log(100) = 2'
  }
});

// Floor
registry.register({
  id: 'floor',
  name: 'floor',
  syntax: {
    latex: '\\lfloor #0 \\rfloor',
    normalized: 'floor(#0)',
    aliases: [
      { pattern: /\\lfloor\s*([^\\]+?)\s*\\rfloor/g, replacement: 'floor($1)', priority: 15 }
    ],
    insertTemplate: '\\lfloor #0 \\rfloor'
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
        return createNumber(Math.floor(arg.value));
      }
      throw new Error('floor expects Number');
    }
  },
  ui: {
    description: 'Floor function (round down)',
    category: KeyboardCategory.Mathematical,
    example: 'floor(3.7) = 3'
  }
});

// Ceiling
registry.register({
  id: 'ceil',
  name: 'ceil',
  syntax: {
    latex: '\\lceil #0 \\rceil',
    normalized: 'ceil(#0)',
    aliases: [
      { pattern: /\\lceil\s*([^\\]+?)\s*\\rceil/g, replacement: 'ceil($1)', priority: 15 }
    ],
    insertTemplate: '\\lceil #0 \\rceil'
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
        return createNumber(Math.ceil(arg.value));
      }
      throw new Error('ceil expects Number');
    }
  },
  ui: {
    description: 'Ceiling function (round up)',
    category: KeyboardCategory.Mathematical,
    example: 'ceil(3.2) = 4'
  }
});

// Round
registry.register({
  id: 'round',
  name: 'round',
  syntax: {
    latex: 'round(#0)',
    normalized: 'round(#0)'
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
        return createNumber(Math.round(arg.value));
      }
      throw new Error('round expects Number');
    }
  },
  ui: {
    description: 'Round to nearest integer',
    category: KeyboardCategory.Mathematical,
    example: 'round(3.5) = 4'
  }
});
