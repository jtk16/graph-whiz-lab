// Manages cross-expression definitions and reserved variables

import { ASTNode, parseExpression } from './parser';

export const RESERVED_NAMES = ['x', 'y', 'pi', 'e'];

export const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

export interface FunctionDefinition {
  name: string;
  paramName: string;
  body: ASTNode;
}

export interface DefinitionContext {
  variables: Record<string, number>;
  functions: Record<string, FunctionDefinition>;
}

export function buildDefinitionContext(expressions: Array<{ normalized: string }>): DefinitionContext {
  const context: DefinitionContext = {
    variables: { ...CONSTANTS },
    functions: {},
  };

  expressions.forEach(expr => {
    const normalized = expr.normalized.trim();
    if (!normalized || !normalized.includes('=')) return;

    const parts = normalized.split('=');
    if (parts.length !== 2) return;

    const lhs = parts[0].trim();
    const rhs = parts[1].trim();

    // Function definition: f(x) = ...
    const funcMatch = lhs.match(/^([a-zA-Z][a-zA-Z0-9]*)\(([a-zA-Z][a-zA-Z0-9]*)\)$/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const paramName = funcMatch[2];
      
      if (RESERVED_NAMES.includes(funcName)) {
        console.warn(`Cannot define function with reserved name: ${funcName}`);
        return;
      }

      try {
        const body = parseExpression(rhs);
        context.functions[funcName] = { name: funcName, paramName, body };
      } catch (e) {
        // Skip invalid function definitions
      }
      return;
    }

    // Variable definition: a = ...
    const varMatch = lhs.match(/^([a-zA-Z][a-zA-Z0-9]*)$/);
    if (varMatch) {
      const varName = varMatch[1];
      
      if (RESERVED_NAMES.includes(varName)) {
        console.warn(`Cannot define variable with reserved name: ${varName}`);
        return;
      }

      // Only allow constant definitions (no variables in RHS)
      try {
        const ast = parseExpression(rhs);
        // Try to evaluate as constant (no variables except constants)
        const value = evaluateConstant(ast, { ...CONSTANTS });
        if (isFinite(value)) {
          context.variables[varName] = value;
        }
      } catch (e) {
        // Skip invalid variable definitions
      }
    }
  });

  return context;
}

function evaluateConstant(node: ASTNode, constants: Record<string, number>): number {
  switch (node.type) {
    case 'number':
      return node.value as number;

    case 'variable':
      const varName = node.value as string;
      if (varName in constants) {
        return constants[varName];
      }
      throw new Error(`Non-constant variable: ${varName}`);

    case 'binary':
      const left = evaluateConstant(node.left!, constants);
      const right = evaluateConstant(node.right!, constants);
      
      switch (node.operator) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return left / right;
        case '^': return Math.pow(left, right);
        default: throw new Error(`Unknown operator: ${node.operator}`);
      }

    case 'unary':
      const operand = evaluateConstant(node.right!, constants);
      return node.operator === '-' ? -operand : operand;

    case 'call':
      const args = node.args!.map(arg => evaluateConstant(arg, constants));
      
      switch (node.name) {
        case 'sin': return Math.sin(args[0]);
        case 'cos': return Math.cos(args[0]);
        case 'tan': return Math.tan(args[0]);
        case 'sqrt': return Math.sqrt(args[0]);
        case 'abs': return Math.abs(args[0]);
        case 'exp': return Math.exp(args[0]);
        case 'ln': return Math.log(args[0]);
        case 'log': return Math.log10(args[0]);
        default: throw new Error(`Unknown function: ${node.name}`);
      }

    default:
      throw new Error(`Unknown node type: ${(node as any).type}`);
  }
}
