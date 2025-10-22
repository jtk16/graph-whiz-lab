/**
 * Logical operations: and, or, not
 */

import { registry } from '../registry';
import { MathType } from '../../types';
import { isBoolean, createBoolean } from '../../runtime/value';
import { KeyboardCategory } from '../../keyboard/categories';

registry.register({
  id: 'and',
  name: 'and',
  syntax: {
    latex: '#0 \\land #1',
    normalized: '#0 and #1',
    aliases: [
      { pattern: /\\land\b/g, replacement: 'and', priority: 10 },
      { pattern: /&&/g, replacement: 'and', priority: 10 }
    ]
  },
  parse: {
    type: 'binary',
    precedence: 0,
    associativity: 'left'
  },
  types: {
    signatures: [
      { input: [MathType.Boolean, MathType.Boolean], output: MathType.Boolean },
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a, b] = args;
      if (isBoolean(a) && isBoolean(b)) {
        return createBoolean(a.value && b.value);
      }
      throw new Error('Invalid types for logical AND');
    }
  },
  ui: {
    description: 'Logical AND',
    category: KeyboardCategory.Conditional,
    example: 'x > 0 and x < 10'
  }
});

registry.register({
  id: 'or',
  name: 'or',
  syntax: {
    latex: '#0 \\lor #1',
    normalized: '#0 or #1',
    aliases: [
      { pattern: /\\lor\b/g, replacement: 'or', priority: 10 },
      { pattern: /\|\|/g, replacement: 'or', priority: 10 }
    ]
  },
  parse: {
    type: 'binary',
    precedence: 0,
    associativity: 'left'
  },
  types: {
    signatures: [
      { input: [MathType.Boolean, MathType.Boolean], output: MathType.Boolean },
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a, b] = args;
      if (isBoolean(a) && isBoolean(b)) {
        return createBoolean(a.value || b.value);
      }
      throw new Error('Invalid types for logical OR');
    }
  },
  ui: {
    description: 'Logical OR',
    category: KeyboardCategory.Conditional,
    example: 'x < 0 or x > 10'
  }
});

registry.register({
  id: 'not',
  name: 'not',
  syntax: {
    latex: '\\neg #0',
    normalized: 'not #0',
    aliases: [
      { pattern: /\\neg\b/g, replacement: 'not', priority: 10 },
      { pattern: /!/g, replacement: 'not', priority: 10 }
    ]
  },
  parse: {
    type: 'unary',
    precedence: 4
  },
  types: {
    signatures: [
      { input: [MathType.Boolean], output: MathType.Boolean },
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a] = args;
      if (isBoolean(a)) {
        return createBoolean(!a.value);
      }
      throw new Error('Invalid type for logical NOT');
    }
  },
  ui: {
    description: 'Logical NOT',
    category: KeyboardCategory.Conditional,
    example: 'not(x > 5)'
  }
});
