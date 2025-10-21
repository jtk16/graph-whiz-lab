// Manages cross-expression definitions and reserved variables

import { ASTNode, parseExpression } from './parser';
import { MathType, TypeInfo, inferType } from './types';

export const RESERVED_NAMES = ['x', 'y', 'pi', 'e'];

export const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

export interface FunctionDefinition {
  name: string;
  params: string[]; // Support multiple parameters
  body: ASTNode;
}

export interface DefinitionContext {
  variables: Record<string, number>;
  functions: Record<string, FunctionDefinition>;
  types: Record<string, import('./types').TypeInfo>; // Track type of each identifier
}

export function getIdentifierType(
  name: string,
  context?: DefinitionContext
): import('./types').TypeInfo | undefined {
  return context?.types?.[name];
}

export function buildDefinitionContext(expressions: Array<{ normalized: string }>): DefinitionContext {
  const context: DefinitionContext = {
    variables: { ...CONSTANTS },
    functions: {},
    types: {
      pi: { type: MathType.Number },
      e: { type: MathType.Number },
      x: { type: MathType.Number },
      y: { type: MathType.Number },
    },
  };

  expressions.forEach(expr => {
    const normalized = expr.normalized.trim();
    console.log('buildDefinitionContext: checking expression:', normalized);
    if (!normalized || !normalized.includes('=')) return;

    const parts = normalized.split('=');
    if (parts.length !== 2) return;

    const lhs = parts[0].trim();
    const rhs = parts[1].trim();
    console.log('buildDefinitionContext: lhs=', lhs, 'rhs=', rhs);

    // Function definition: f(x) = ... or f_1(x,y) = ... (multi-parameter)
    const funcMatch = lhs.match(/^([a-zA-Z][a-zA-Z0-9_]*)\(([^)]+)\)$/);
    console.log('buildDefinitionContext: funcMatch=', funcMatch);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const paramsStr = funcMatch[2];
      const params = paramsStr.split(',').map(p => p.trim());
      
      if (RESERVED_NAMES.includes(funcName)) {
        console.warn(`Cannot define function with reserved name: ${funcName}`);
        return;
      }

      try {
        const body = parseExpression(rhs, context);
        context.functions[funcName] = { name: funcName, params, body };
        
        // Infer function type
        const typeInfo = inferType(normalized, normalized);
        context.types[funcName] = typeInfo;
        
        console.log('buildDefinitionContext: added function', funcName, 'with params', params);
      } catch (e) {
        console.error('buildDefinitionContext: failed to parse function body:', e);
      }
      return;
    }

    // Variable definition: a = ... or a_1 = ...
    const varMatch = lhs.match(/^([a-zA-Z][a-zA-Z0-9_]*)$/);
    if (varMatch) {
      const varName = varMatch[1];
      
      if (RESERVED_NAMES.includes(varName)) {
        console.warn(`Cannot define variable with reserved name: ${varName}`);
        return;
      }

      // Only allow constant definitions (no variables in RHS)
      try {
        const ast = parseExpression(rhs, context);
        // Try to evaluate as constant (no variables except constants)
        const value = evaluateConstant(ast, { ...CONSTANTS });
        if (isFinite(value)) {
          context.variables[varName] = value;
          context.types[varName] = { type: MathType.Number };
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
