// Symbolic computation using math.js
import * as math from 'mathjs';
import { MathType } from '../types';
import { RuntimeValue, createNumber, createFunction } from '../runtime/value';
import { registerCallable } from '../runtime/functions';
import { FunctionDefinition } from '../definitionContext';
import { ASTNode, parseExpression } from '../parser';
import { astToString } from '../astToString';

// Initialize symbolic computation capabilities
export function registerSymbolicFunctions() {
  // Symbolic derivative: D_symbolic(expression_string) → derivative_string
  // This is for symbolic computation, distinct from numerical D
  registerCallable('simplify', MathType.Number, MathType.Number, (arg) => {
    // For now, pass through - will enhance with expression strings
    return arg;
  });

  registerCallable('expand', MathType.Number, MathType.Number, (arg) => {
    return arg;
  });
}

// Symbolic derivative using math.js
export function symbolicDerivative(expr: string, variable: string): string {
  try {
    const parsed = math.parse(expr);
    const derivative = math.derivative(parsed, variable);
    return derivative.toString();
  } catch (error) {
    console.error('Symbolic derivative error:', error);
    throw new Error(`Cannot compute symbolic derivative of ${expr}`);
  }
}

// Symbolic simplification
export function simplifyExpression(expr: string): string {
  try {
    const parsed = math.parse(expr);
    const simplified = math.simplify(parsed);
    return simplified.toString();
  } catch (error) {
    console.error('Simplification error:', error);
    return expr;
  }
}

// Partial derivative for multi-variable functions
export function partialDerivative(
  expr: string,
  variable: string,
  variables: string[]
): string {
  // Use math.js derivative with specific variable
  return symbolicDerivative(expr, variable);
}

// Symbolic derivative that works with AST nodes
export function symbolicDerivativeAST(
  bodyAST: ASTNode,
  variable: string
): ASTNode {
  try {
    // 1. Convert our AST to string
    const expr = astToString(bodyAST);
    
    // 2. Use math.js symbolic derivative
    const parsed = math.parse(expr);
    const derivative = math.derivative(parsed, variable);
    const derivativeStr = derivative.toString();
    
    // 3. Parse back to our AST format
    const derivativeAST = parseExpression(derivativeStr);
    
    return derivativeAST;
  } catch (error) {
    console.error('Symbolic derivative error:', error);
    throw new Error(`Cannot compute symbolic derivative with respect to ${variable}`);
  }
}

// Partial derivative (same as regular derivative for single-variable differentiation)
export function symbolicPartialAST(
  bodyAST: ASTNode,
  variable: string
): ASTNode {
  return symbolicDerivativeAST(bodyAST, variable);
}

// Initialize on module load
registerSymbolicFunctions();
