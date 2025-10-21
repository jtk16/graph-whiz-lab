// Type-aware expression evaluator using operator overloading

import { ASTNode } from '../parser';
import { DefinitionContext } from '../definitionContext';
import { RuntimeValue, createNumber, createFunction, kindToMathType, isNumber } from './value';
import { getOperator } from './operators';
import { getCallable } from './functions';

export function evaluate(
  node: ASTNode,
  variables: Record<string, number>,
  context?: DefinitionContext
): RuntimeValue {
  switch (node.type) {
    case 'number':
      return createNumber(node.value as number);

    case 'variable':
      const varName = node.value as string;
      
      // Check local variables first (e.g., x, y in function evaluation)
      if (varName in variables) {
        return createNumber(variables[varName]);
      }
      
      // Check context variables (defined constants)
      if (context?.variables && varName in context.variables) {
        return createNumber(context.variables[varName]);
      }
      
      // Check if it's a function definition
      if (context?.functions && varName in context.functions) {
        return createFunction(context.functions[varName]);
      }
      
      throw new Error(`Unknown variable: ${varName}`);

    case 'binary':
      const left = evaluate(node.left!, variables, context);
      const right = evaluate(node.right!, variables, context);
      
      // Lookup operator based on runtime types
      const leftType = kindToMathType(left.kind);
      const rightType = kindToMathType(right.kind);
      const op = getOperator(leftType, node.operator!, rightType);
      
      if (!op) {
        throw new Error(
          `No operator '${node.operator}' for ${leftType} and ${rightType}`
        );
      }
      
      return op.execute(left, right);

    case 'unary':
      const operand = evaluate(node.right!, variables, context);
      
      if (node.operator === '-') {
        if (operand.kind === 'number') {
          return createNumber(-operand.value);
        }
        throw new Error(`Unary minus not supported for ${operand.kind}`);
      }
      
      return operand; // Unary plus

    case 'call':
      // Check if it's a user-defined function
      if (context?.functions && node.name && node.name in context.functions) {
        const funcDef = context.functions[node.name];
        if (node.args && node.args.length === 1) {
          const argValue = evaluate(node.args[0], variables, context);
          if (!isNumber(argValue)) {
            throw new Error(`Function ${node.name} expects Number argument`);
          }
          // Evaluate function body with parameter bound to argument
          return evaluate(funcDef.body, { [funcDef.paramName]: argValue.value }, context);
        }
        throw new Error(`Function ${node.name} expects 1 argument`);
      }
      
      // Built-in function
      if (!node.args || node.args.length === 0) {
        throw new Error(`Function ${node.name} requires arguments`);
      }
      
      const arg = evaluate(node.args[0], variables, context);
      const argType = kindToMathType(arg.kind);
      const callable = getCallable(node.name!, argType);
      
      if (!callable) {
        throw new Error(`No function '${node.name}' for ${argType}`);
      }
      
      return callable.execute(arg);

    default:
      throw new Error(`Unknown node type: ${(node as any).type}`);
  }
}

// Helper to evaluate and extract number (for backward compatibility with graphing)
export function evaluateToNumber(
  node: ASTNode,
  x: number,
  context?: DefinitionContext
): number {
  const result = evaluate(node, { x }, context);
  
  if (!isNumber(result)) {
    throw new Error(`Expression must return a number, got ${result.kind}`);
  }
  
  return result.value;
}
