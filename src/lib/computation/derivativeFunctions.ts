// Derivative functions using unified registry
import { MathType } from '../types';
import { RuntimeValue, createList, createFunction, isFunction } from '../runtime/value';
import { KeyboardCategory } from '../keyboard/categories';
import { registerFunction } from '../runtime/registry';

// Gradient: Returns list of partial derivatives
registerFunction({
  name: 'gradient',
  signatures: [{
    paramType: MathType.Function,
    returnType: MathType.List,
    execute: (arg) => {
      if (!isFunction(arg)) throw new Error('gradient expects Function');
      
      // For multi-variable functions, return vector of partial derivatives
      // For now, return empty list - needs multi-variable support
      return createList([]);
    }
  }],
  metadata: {
    latex: '\\nabla(#?)',
    description: 'Gradient of function',
    category: KeyboardCategory.Calculus,
    example: 'gradient(f)',
    insertTemplate: 'gradient(#0)'
  }
});

// Partial derivative operator
registerFunction({
  name: 'partial',
  signatures: [{
    paramType: MathType.Function,
    returnType: MathType.Function,
    execute: (arg) => {
      if (!isFunction(arg)) throw new Error('partial expects Function');
      
      // Return a function representing the partial derivative
      return arg; // Placeholder
    }
  }],
  metadata: {
    latex: '\\frac{\\partial}{\\partial x}(#?)',
    description: 'Partial derivative',
    category: KeyboardCategory.Calculus,
    example: 'partial(f)',
    insertTemplate: 'partial(#0)'
  }
});
