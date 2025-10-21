// Legacy evaluator - delegates to new runtime evaluator
import { ASTNode } from './parser';
import { DefinitionContext } from './definitionContext';
import { evaluateToNumber } from './runtime/evaluator';

export function evaluate(
  node: ASTNode, 
  variables: Record<string, number>,
  context?: DefinitionContext
): number {
  // Delegate to new runtime evaluator
  const result = evaluateToNumber(node, variables.x ?? 0, context);
  return result;
}

export function evaluateExpression(expr: string, x: number): number {
  // For MVP, simple extraction of RHS
  const parts = expr.split('=');
  const rhs = parts.length > 1 ? parts[1].trim() : parts[0].trim();
  
  // Dynamic import is async, so we need to import at the top level
  // This will be handled by importing parseExpression in the component
  throw new Error('Use parseAndEvaluate instead');
}

export function parseAndEvaluate(
  rhs: string, 
  x: number, 
  ast: ASTNode,
  context?: DefinitionContext
): number {
  return evaluateToNumber(ast, x, context);
}
