// Calculus functions using unified registry
import { MathType } from '../types';
import { RuntimeValue, createFunction, isFunction } from './value';
import { KeyboardCategory } from '../keyboard/categories';
import { registerFunction } from './registry';
import { FunctionDefinition } from '../definitionContext';

// Derivative operator: D(f) returns f'
registerFunction({
  name: 'D',
  signatures: [{
    paramType: MathType.Function,
    returnType: MathType.Function,
    execute: (arg) => {
      if (!isFunction(arg)) throw new Error('D expects Function');
      
      const originalDef = arg.def;
      
      // Create a new function that computes the numerical derivative
      const derivativeDef: FunctionDefinition = {
        name: `D(${originalDef.name})`,
        params: originalDef.params,
        body: originalDef.body, // Evaluator handles derivative computation
      };
      
      return createFunction(derivativeDef);
    }
  }],
  metadata: {
    latex: 'D(#?)',
    description: 'Derivative operator',
    category: KeyboardCategory.Calculus,
    example: 'D(f)',
    insertTemplate: 'D(#0)'
  }
});

// Conditional functions (if, piecewise)
registerFunction({
  name: 'if',
  signatures: [{
    paramType: MathType.Number, // Placeholder - needs multi-arg support
    returnType: MathType.Number,
    execute: (arg) => {
      // Handled specially in evaluator
      return arg;
    }
  }],
  metadata: {
    latex: 'if(#?,#?,#?)',
    description: 'If-then-else',
    category: KeyboardCategory.Conditional,
    example: 'if(x>0,1,-1)',
    insertTemplate: 'if(#0,#1,#2)'
  }
});

registerFunction({
  name: 'piecewise',
  signatures: [{
    paramType: MathType.Number, // Placeholder - needs multi-arg support
    returnType: MathType.Number,
    execute: (arg) => {
      // Handled specially in evaluator
      return arg;
    }
  }],
  metadata: {
    latex: 'piecewise(#?,#?,#?)',
    description: 'Piecewise function',
    category: KeyboardCategory.Conditional,
    example: 'piecewise(x>0,1,-1)',
    insertTemplate: 'piecewise(#0,#1,#2)'
  }
});

// Derivative operators for keyboard
registerFunction({
  name: 'd/dx',
  signatures: [{
    paramType: MathType.Function,
    returnType: MathType.Function,
    execute: (arg) => arg // Handled in parser/evaluator
  }],
  metadata: {
    latex: '\\frac{d}{dx}(#?)',
    description: 'Derivative with respect to x',
    category: KeyboardCategory.Calculus,
    example: 'd/dx(x^2) → 2*x',
    insertTemplate: '\\frac{d}{dx}(#0)'
  }
});

registerFunction({
  name: 'd/dy',
  signatures: [{
    paramType: MathType.Function,
    returnType: MathType.Function,
    execute: (arg) => arg
  }],
  metadata: {
    latex: '\\frac{d}{dy}(#?)',
    description: 'Derivative with respect to y',
    category: KeyboardCategory.Calculus,
    example: 'd/dy(y^2) → 2*y',
    insertTemplate: '\\frac{d}{dy}(#0)'
  }
});

registerFunction({
  name: 'd/dt',
  signatures: [{
    paramType: MathType.Function,
    returnType: MathType.Function,
    execute: (arg) => arg
  }],
  metadata: {
    latex: '\\frac{d}{dt}(#?)',
    description: 'Derivative with respect to t',
    category: KeyboardCategory.Calculus,
    example: 'd/dt(t^3) → 3*t^2',
    insertTemplate: '\\frac{d}{dt}(#0)'
  }
});

registerFunction({
  name: '∂/∂x',
  signatures: [{
    paramType: MathType.Function,
    returnType: MathType.Function,
    execute: (arg) => arg
  }],
  metadata: {
    latex: '\\frac{\\partial}{\\partial x}(#?)',
    description: 'Partial derivative with respect to x',
    category: KeyboardCategory.Calculus,
    example: '∂/∂x(x*y) → y',
    insertTemplate: '\\frac{\\partial}{\\partial x}(#0)'
  }
});

registerFunction({
  name: '∂/∂y',
  signatures: [{
    paramType: MathType.Function,
    returnType: MathType.Function,
    execute: (arg) => arg
  }],
  metadata: {
    latex: '\\frac{\\partial}{\\partial y}(#?)',
    description: 'Partial derivative with respect to y',
    category: KeyboardCategory.Calculus,
    example: '∂/∂y(x*y) → x',
    insertTemplate: '\\frac{\\partial}{\\partial y}(#0)'
  }
});
