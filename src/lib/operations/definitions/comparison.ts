/**
 * Comparison operations: <, >, <=, >=, ==, !=
 */

import { registry } from '../registry';
import { MathType } from '../../types';
import { isNumber, createBoolean } from '../../runtime/value';
import { KeyboardCategory } from '../../keyboard/categories';

registry.register({
  id: 'less_than',
  name: '<',
  syntax: {
    latex: '#0 < #1',
    normalized: '#0 < #1',
  },
  parse: {
    type: 'binary',
    precedence: 0,
    associativity: 'left'
  },
  types: {
    signatures: [
      { input: [MathType.Number, MathType.Number], output: MathType.Boolean },
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a, b] = args;
      if (isNumber(a) && isNumber(b)) {
        return createBoolean(a.value < b.value);
      }
      throw new Error('Invalid types for comparison');
    }
  },
  ui: {
    description: 'Less than',
    category: KeyboardCategory.Operators,
    example: '2 < 5',
    hidden: true
  }
});

registry.register({
  id: 'greater_than',
  name: '>',
  syntax: {
    latex: '#0 > #1',
    normalized: '#0 > #1',
  },
  parse: {
    type: 'binary',
    precedence: 0,
    associativity: 'left'
  },
  types: {
    signatures: [
      { input: [MathType.Number, MathType.Number], output: MathType.Boolean },
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a, b] = args;
      if (isNumber(a) && isNumber(b)) {
        return createBoolean(a.value > b.value);
      }
      throw new Error('Invalid types for comparison');
    }
  },
  ui: {
    description: 'Greater than',
    category: KeyboardCategory.Operators,
    example: '5 > 2',
    hidden: true
  }
});

registry.register({
  id: 'less_equal',
  name: '<=',
  syntax: {
    latex: '#0 \\le #1',
    normalized: '#0 <= #1',
    aliases: [
      { pattern: /\\le\b/g, replacement: '<=', priority: 10 },
      { pattern: /\\leq\b/g, replacement: '<=', priority: 10 }
    ]
  },
  parse: {
    type: 'binary',
    precedence: 0,
    associativity: 'left'
  },
  types: {
    signatures: [
      { input: [MathType.Number, MathType.Number], output: MathType.Boolean },
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a, b] = args;
      if (isNumber(a) && isNumber(b)) {
        return createBoolean(a.value <= b.value);
      }
      throw new Error('Invalid types for comparison');
    }
  },
  ui: {
    description: 'Less than or equal',
    category: KeyboardCategory.Operators,
    example: '2 <= 5'
  }
});

registry.register({
  id: 'greater_equal',
  name: '>=',
  syntax: {
    latex: '#0 \\ge #1',
    normalized: '#0 >= #1',
    aliases: [
      { pattern: /\\ge\b/g, replacement: '>=', priority: 10 },
      { pattern: /\\geq\b/g, replacement: '>=', priority: 10 }
    ]
  },
  parse: {
    type: 'binary',
    precedence: 0,
    associativity: 'left'
  },
  types: {
    signatures: [
      { input: [MathType.Number, MathType.Number], output: MathType.Boolean },
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a, b] = args;
      if (isNumber(a) && isNumber(b)) {
        return createBoolean(a.value >= b.value);
      }
      throw new Error('Invalid types for comparison');
    }
  },
  ui: {
    description: 'Greater than or equal',
    category: KeyboardCategory.Operators,
    example: '5 >= 2'
  }
});

registry.register({
  id: 'equal',
  name: '==',
  syntax: {
    latex: '#0 = #1',
    normalized: '#0 == #1',
  },
  parse: {
    type: 'binary',
    precedence: 0,
    associativity: 'left'
  },
  types: {
    signatures: [
      { input: [MathType.Number, MathType.Number], output: MathType.Boolean },
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a, b] = args;
      if (isNumber(a) && isNumber(b)) {
        return createBoolean(Math.abs(a.value - b.value) < 1e-10);
      }
      throw new Error('Invalid types for comparison');
    }
  },
  ui: {
    description: 'Equal to',
    category: KeyboardCategory.Operators,
    example: '2 + 3 = 5',
    hidden: true
  }
});

registry.register({
  id: 'not_equal',
  name: '!=',
  syntax: {
    latex: '#0 \\ne #1',
    normalized: '#0 != #1',
    aliases: [
      { pattern: /\\ne\b/g, replacement: '!=', priority: 10 },
      { pattern: /\\neq\b/g, replacement: '!=', priority: 10 }
    ]
  },
  parse: {
    type: 'binary',
    precedence: 0,
    associativity: 'left'
  },
  types: {
    signatures: [
      { input: [MathType.Number, MathType.Number], output: MathType.Boolean },
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a, b] = args;
      if (isNumber(a) && isNumber(b)) {
        return createBoolean(Math.abs(a.value - b.value) >= 1e-10);
      }
      throw new Error('Invalid types for comparison');
    }
  },
  ui: {
    description: 'Not equal to',
    category: KeyboardCategory.Operators,
    example: '2 != 3'
  }
});
