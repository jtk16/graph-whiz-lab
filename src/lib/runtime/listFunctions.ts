// List and aggregate functions using unified registry
import { MathType } from '../types';
import { RuntimeValue, createNumber, isList, isNumber } from './value';
import { KeyboardCategory } from '../keyboard/categories';
import { registerFunction } from './registry';

registerFunction({
  name: 'length',
  signatures: [{
    paramType: MathType.List,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isList(arg)) throw new Error('length expects List');
      return createNumber(arg.elements.length);
    }
  }],
  metadata: {
    latex: 'length(#?)',
    description: 'Length of list',
    category: KeyboardCategory.Lists,
    example: 'length([1,2,3])',
    insertTemplate: 'length(#0)'
  }
});

registerFunction({
  name: 'sum',
  signatures: [{
    paramType: MathType.List,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isList(arg)) throw new Error('sum expects List');
      const total = arg.elements.reduce((sum, el) => {
        if (!isNumber(el)) throw new Error('sum requires list of numbers');
        return sum + el.value;
      }, 0);
      return createNumber(total);
    }
  }],
  metadata: {
    latex: 'sum(#?)',
    description: 'Sum of list elements',
    category: KeyboardCategory.Lists,
    example: 'sum([1,2,3])',
    insertTemplate: 'sum(#0)'
  }
});

registerFunction({
  name: 'mean',
  signatures: [{
    paramType: MathType.List,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isList(arg)) throw new Error('mean expects List');
      if (arg.elements.length === 0) throw new Error('Cannot compute mean of empty list');
      const total = arg.elements.reduce((sum, el) => {
        if (!isNumber(el)) throw new Error('mean requires list of numbers');
        return sum + el.value;
      }, 0);
      return createNumber(total / arg.elements.length);
    }
  }],
  metadata: {
    latex: 'mean(#?)',
    description: 'Mean of list',
    category: KeyboardCategory.Lists,
    example: 'mean([1,2,3])',
    insertTemplate: 'mean(#0)'
  }
});

registerFunction({
  name: 'min',
  signatures: [{
    paramType: MathType.List,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isList(arg)) throw new Error('min expects List');
      if (arg.elements.length === 0) throw new Error('Cannot compute min of empty list');
      const values = arg.elements.map(el => {
        if (!isNumber(el)) throw new Error('min requires list of numbers');
        return el.value;
      });
      return createNumber(Math.min(...values));
    }
  }],
  metadata: {
    latex: 'min(#?)',
    description: 'Minimum value',
    category: KeyboardCategory.Lists,
    example: 'min([1,2,3])',
    insertTemplate: 'min(#0)'
  }
});

registerFunction({
  name: 'max',
  signatures: [{
    paramType: MathType.List,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isList(arg)) throw new Error('max expects List');
      if (arg.elements.length === 0) throw new Error('Cannot compute max of empty list');
      const values = arg.elements.map(el => {
        if (!isNumber(el)) throw new Error('max requires list of numbers');
        return el.value;
      });
      return createNumber(Math.max(...values));
    }
  }],
  metadata: {
    latex: 'max(#?)',
    description: 'Maximum value',
    category: KeyboardCategory.Lists,
    example: 'max([1,2,3])',
    insertTemplate: 'max(#0)'
  }
});

registerFunction({
  name: 'variance',
  signatures: [{
    paramType: MathType.List,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isList(arg)) throw new Error('variance expects List');
      const values = arg.elements.map(el => {
        if (!isNumber(el)) throw new Error('variance expects List of Numbers');
        return el.value;
      });
      
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      return createNumber(variance);
    }
  }],
  metadata: {
    latex: 'variance(#?)',
    description: 'Variance of list',
    category: KeyboardCategory.Lists,
    example: 'variance([1,2,3])',
    insertTemplate: 'variance(#0)'
  }
});

registerFunction({
  name: 'stdev',
  signatures: [{
    paramType: MathType.List,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isList(arg)) throw new Error('stdev expects List');
      const values = arg.elements.map(el => {
        if (!isNumber(el)) throw new Error('stdev expects List of Numbers');
        return el.value;
      });
      
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      return createNumber(Math.sqrt(variance));
    }
  }],
  metadata: {
    latex: 'stdev(#?)',
    description: 'Standard deviation',
    category: KeyboardCategory.Lists,
    example: 'stdev([1,2,3])',
    insertTemplate: 'stdev(#0)'
  }
});
