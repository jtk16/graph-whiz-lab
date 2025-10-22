/**
 * List operations: length, sum, mean, min, max, variance, stdev
 */

import { registry } from '../registry';
import { MathType } from '../../types';
import { isList, createNumber, isNumber } from '../../runtime/value';
import { KeyboardCategory } from '../../keyboard/categories';

// Sum
registry.register({
  id: 'sum',
  name: 'sum',
  syntax: {
    latex: 'sum(#0)',
    normalized: 'sum(#0)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.List], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isList(arg)) {
        const sum = arg.elements.reduce((acc, el) => {
          if (isNumber(el)) return acc + el.value;
          throw new Error('List must contain only numbers');
        }, 0);
        return createNumber(sum);
      }
      throw new Error('sum expects List');
    }
  },
  ui: {
    description: 'Sum of list elements',
    category: KeyboardCategory.Lists,
    example: 'sum([1,2,3]) = 6'
  }
});

// Mean
registry.register({
  id: 'mean',
  name: 'mean',
  syntax: {
    latex: 'mean(#0)',
    normalized: 'mean(#0)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.List], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isList(arg)) {
        if (arg.elements.length === 0) throw new Error('Cannot compute mean of empty list');
        const sum = arg.elements.reduce((acc, el) => {
          if (isNumber(el)) return acc + el.value;
          throw new Error('List must contain only numbers');
        }, 0);
        return createNumber(sum / arg.elements.length);
      }
      throw new Error('mean expects List');
    }
  },
  ui: {
    description: 'Average of list elements',
    category: KeyboardCategory.Lists,
    example: 'mean([1,2,3]) = 2'
  }
});

// Min
registry.register({
  id: 'min',
  name: 'min',
  syntax: {
    latex: 'min(#0)',
    normalized: 'min(#0)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.List], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isList(arg)) {
        if (arg.elements.length === 0) throw new Error('Cannot find min of empty list');
        const values = arg.elements.map(el => {
          if (isNumber(el)) return el.value;
          throw new Error('List must contain only numbers');
        });
        return createNumber(Math.min(...values));
      }
      throw new Error('min expects List');
    }
  },
  ui: {
    description: 'Minimum of list elements',
    category: KeyboardCategory.Lists,
    example: 'min([1,5,3]) = 1'
  }
});

// Max
registry.register({
  id: 'max',
  name: 'max',
  syntax: {
    latex: 'max(#0)',
    normalized: 'max(#0)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.List], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isList(arg)) {
        if (arg.elements.length === 0) throw new Error('Cannot find max of empty list');
        const values = arg.elements.map(el => {
          if (isNumber(el)) return el.value;
          throw new Error('List must contain only numbers');
        });
        return createNumber(Math.max(...values));
      }
      throw new Error('max expects List');
    }
  },
  ui: {
    description: 'Maximum of list elements',
    category: KeyboardCategory.Lists,
    example: 'max([1,5,3]) = 5'
  }
});

// Variance
registry.register({
  id: 'variance',
  name: 'variance',
  syntax: {
    latex: 'variance(#0)',
    normalized: 'variance(#0)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.List], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isList(arg)) {
        if (arg.elements.length === 0) throw new Error('Cannot compute variance of empty list');
        const values = arg.elements.map(el => {
          if (isNumber(el)) return el.value;
          throw new Error('List must contain only numbers');
        });
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
        return createNumber(variance);
      }
      throw new Error('variance expects List');
    }
  },
  ui: {
    description: 'Variance of list elements',
    category: KeyboardCategory.Lists,
    example: 'variance([1,2,3])'
  }
});

// Standard deviation
registry.register({
  id: 'stdev',
  name: 'stdev',
  syntax: {
    latex: 'stdev(#0)',
    normalized: 'stdev(#0)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.List], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isList(arg)) {
        if (arg.elements.length === 0) throw new Error('Cannot compute stdev of empty list');
        const values = arg.elements.map(el => {
          if (isNumber(el)) return el.value;
          throw new Error('List must contain only numbers');
        });
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
        return createNumber(Math.sqrt(variance));
      }
      throw new Error('stdev expects List');
    }
  },
  ui: {
    description: 'Standard deviation of list elements',
    category: KeyboardCategory.Lists,
    example: 'stdev([1,2,3])'
  }
});

// Length (for lists)
registry.register({
  id: 'length',
  name: 'length',
  syntax: {
    latex: 'length(#0)',
    normalized: 'length(#0)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.List], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isList(arg)) {
        return createNumber(arg.elements.length);
      }
      throw new Error('length expects List');
    }
  },
  ui: {
    description: 'Number of elements in list',
    category: KeyboardCategory.Lists,
    example: 'length([1,2,3]) = 3'
  }
});
