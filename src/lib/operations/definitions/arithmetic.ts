/**
 * Arithmetic operations: +, -, *, /, ^, %
 */

import { registry } from '../registry';
import { MathType } from '../../types';
import { isNumber, createNumber, isPoint, createPoint, isList, createList } from '../../runtime/value';
import { KeyboardCategory } from '../../keyboard/categories';

// Addition
registry.register({
  id: 'add',
  name: '+',
  syntax: {
    latex: '#0 + #1',
    normalized: '#0 + #1',
  },
  parse: {
    type: 'binary',
    precedence: 1,
    associativity: 'left'
  },
  types: {
    signatures: [
      { input: [MathType.Number, MathType.Number], output: MathType.Number, symbolic: true },
      { input: [MathType.Point, MathType.Point], output: MathType.Point },
      { input: [MathType.Complex, MathType.Complex], output: MathType.Complex },
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a, b] = args;
      
      if (isNumber(a) && isNumber(b)) {
        return createNumber(a.value + b.value);
      }
      
      if (isPoint(a) && isPoint(b)) {
        return createPoint(a.x + b.x, a.y + b.y);
      }
      
      throw new Error('Invalid types for addition');
    }
  },
  ui: {
    description: 'Addition',
    category: KeyboardCategory.Operators,
    example: '2 + 3 = 5',
    hidden: true // Already on physical keyboard
  }
});

// Subtraction
registry.register({
  id: 'subtract',
  name: '-',
  syntax: {
    latex: '#0 - #1',
    normalized: '#0 - #1',
  },
  parse: {
    type: 'binary',
    precedence: 1,
    associativity: 'left'
  },
  types: {
    signatures: [
      { input: [MathType.Number, MathType.Number], output: MathType.Number, symbolic: true },
      { input: [MathType.Point, MathType.Point], output: MathType.Point },
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a, b] = args;
      
      if (isNumber(a) && isNumber(b)) {
        return createNumber(a.value - b.value);
      }
      
      if (isPoint(a) && isPoint(b)) {
        return createPoint(a.x - b.x, a.y - b.y);
      }
      
      throw new Error('Invalid types for subtraction');
    }
  },
  ui: {
    description: 'Subtraction',
    category: KeyboardCategory.Operators,
    example: '5 - 2 = 3',
    hidden: true
  }
});

// Multiplication
registry.register({
  id: 'multiply',
  name: '*',
  syntax: {
    latex: '#0 \\cdot #1',
    normalized: '#0 * #1',
    aliases: [
      { pattern: /\\cdot/g, replacement: '*', priority: 10 },
      { pattern: /\\times/g, replacement: '*', priority: 10 }
    ]
  },
  parse: {
    type: 'binary',
    precedence: 2,
    associativity: 'left'
  },
  types: {
    signatures: [
      { input: [MathType.Number, MathType.Number], output: MathType.Number, symbolic: true },
      { input: [MathType.Number, MathType.Point], output: MathType.Point },
      { input: [MathType.Point, MathType.Number], output: MathType.Point },
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a, b] = args;
      
      if (isNumber(a) && isNumber(b)) {
        return createNumber(a.value * b.value);
      }
      
      if (isNumber(a) && isPoint(b)) {
        return createPoint(a.value * b.x, a.value * b.y);
      }
      
      if (isPoint(a) && isNumber(b)) {
        return createPoint(a.x * b.value, a.y * b.value);
      }
      
      throw new Error('Invalid types for multiplication');
    }
  },
  ui: {
    description: 'Multiplication',
    category: KeyboardCategory.Operators,
    example: '2 * 3 = 6',
    hidden: true
  }
});

// Division
registry.register({
  id: 'divide',
  name: '/',
  syntax: {
    latex: '\\frac{#0}{#1}',
    normalized: '(#0) / (#1)',
    aliases: [
      { pattern: /\\frac\{([^}]+)\}\{([^}]+)\}/g, replacement: '($1)/($2)', priority: 5 }
    ]
  },
  parse: {
    type: 'binary',
    precedence: 2,
    associativity: 'left'
  },
  types: {
    signatures: [
      { input: [MathType.Number, MathType.Number], output: MathType.Number, symbolic: true },
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a, b] = args;
      
      if (isNumber(a) && isNumber(b)) {
        if (b.value === 0) throw new Error('Division by zero');
        return createNumber(a.value / b.value);
      }
      
      throw new Error('Invalid types for division');
    }
  },
  ui: {
    description: 'Division',
    category: KeyboardCategory.Operators,
    example: '6 / 2 = 3',
    hidden: true
  }
});

// Exponentiation
registry.register({
  id: 'power',
  name: '^',
  syntax: {
    latex: '#0^{#1}',
    normalized: '#0 ^ #1',
  },
  parse: {
    type: 'binary',
    precedence: 3,
    associativity: 'right'
  },
  types: {
    signatures: [
      { input: [MathType.Number, MathType.Number], output: MathType.Number, symbolic: true },
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a, b] = args;
      
      if (isNumber(a) && isNumber(b)) {
        return createNumber(Math.pow(a.value, b.value));
      }
      
      throw new Error('Invalid types for exponentiation');
    }
  },
  ui: {
    description: 'Exponentiation',
    category: KeyboardCategory.Operators,
    example: '2^3 = 8',
    hidden: true
  }
});

// Modulo
registry.register({
  id: 'modulo',
  name: '%',
  syntax: {
    latex: '#0 \\bmod #1',
    normalized: '#0 % #1',
    aliases: [
      { pattern: /\\bmod/g, replacement: '%', priority: 10 },
      { pattern: /\\mod/g, replacement: '%', priority: 10 }
    ]
  },
  parse: {
    type: 'binary',
    precedence: 2,
    associativity: 'left'
  },
  types: {
    signatures: [
      { input: [MathType.Number, MathType.Number], output: MathType.Number, symbolic: true },
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a, b] = args;
      
      if (isNumber(a) && isNumber(b)) {
        return createNumber(a.value % b.value);
      }
      
      throw new Error('Invalid types for modulo');
    }
  },
  ui: {
    description: 'Modulo (remainder)',
    category: KeyboardCategory.Operators,
    example: '7 % 3 = 1'
  }
});

// Unary negation
registry.register({
  id: 'negate',
  name: '-',
  syntax: {
    latex: '-#0',
    normalized: '-#0',
  },
  parse: {
    type: 'unary',
    precedence: 4
  },
  types: {
    signatures: [
      { input: [MathType.Number], output: MathType.Number, symbolic: true },
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a] = args;
      
      if (isNumber(a)) {
        return createNumber(-a.value);
      }
      
      throw new Error('Invalid type for negation');
    }
  },
  ui: {
    description: 'Negation',
    category: KeyboardCategory.Operators,
    hidden: true
  }
});
