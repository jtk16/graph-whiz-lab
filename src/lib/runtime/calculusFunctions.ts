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
