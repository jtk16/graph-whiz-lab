// Higher-order function operators (composition, derivative, etc.)

import { MathType } from '../types';
import { RuntimeValue, createNumber, createFunction, isNumber, isFunction } from './value';
import { FunctionDefinition } from '../definitionContext';
import { evaluate } from './evaluator';
import { registerCallable } from './functions';

// ============= FUNCTION COMPOSITION =============
// compose(f, g)(x) = f(g(x))

export function registerHigherOrderFunctions() {
  // Composition operator: compose(f, g) or (f ∘ g)
  registerCallable('compose', MathType.Function, MathType.Function,
    (arg) => {
      if (!isFunction(arg)) {
        throw new Error('compose expects Function argument');
      }
      
      // Return a function that expects another function
      // This is tricky - we'd need multi-argument support for compose(f, g)
      // For now, we'll create a composed function that can be called
      return arg;
    });

  // Derivative operator: D(f) returns f'
  registerCallable('D', MathType.Function, MathType.Function,
    (arg) => {
      if (!isFunction(arg)) {
        throw new Error('D expects Function argument');
      }
      
      const originalDef = arg.def;
      
      // Create a new function that computes the numerical derivative
      const derivativeDef: FunctionDefinition = {
        name: `D(${originalDef.name})`,
        params: originalDef.params,
        body: originalDef.body, // We'll override execution
      };
      
      // For now, return a wrapped function
      // The evaluator would need to handle this specially
      return createFunction(derivativeDef);
    });
}

// Numerical derivative using central difference
export function numericalDerivative(
  f: (x: number) => number,
  x: number,
  h: number = 1e-5
): number {
  return (f(x + h) - f(x - h)) / (2 * h);
}

// Helper to compose two functions
export function composeFunctions(
  f: FunctionDefinition,
  g: FunctionDefinition
): FunctionDefinition {
  // Create composed function: (f ∘ g)(x) = f(g(x))
  return {
    name: `(${f.name}∘${g.name})`,
    params: g.params, // Domain is g's domain
    body: g.body, // We'd need to substitute g into f
  };
}

// Initialize higher-order functions
registerHigherOrderFunctions();
