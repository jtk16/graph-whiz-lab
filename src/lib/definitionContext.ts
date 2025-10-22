// Manages cross-expression definitions and reserved variables

import { ASTNode, parseExpression } from './parser';
import { MathType, TypeInfo, inferType } from './types';

export const RESERVED_NAMES = ['x', 'y', 'z', 'pi', 'e', 'i'];

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
  variables: Record<string, number | ASTNode>; // Support both numbers and AST nodes (for lists)
  functions: Record<string, FunctionDefinition>;
  types: Record<string, import('./types').TypeInfo>; // Track type of each identifier
}

export function getIdentifierType(
  name: string,
  context?: DefinitionContext
): import('./types').TypeInfo | undefined {
  return context?.types?.[name];
}

/**
 * Check if an expression is an implicit relation (not a definition)
 * e.g., x^2 + y^2 = 1 (implicit) vs f(x) = x^2 (definition)
 */
export function isImplicitRelation(normalized: string): boolean {
  if (!normalized.includes('=') || normalized.includes('==')) return false;
  
  const lhs = normalized.split('=')[0].trim();
  // If LHS has operators or is not a simple identifier/function call
  return lhs.match(/[+\-*\/^<>]/) !== null ||
         (lhs.includes('(') && !lhs.match(/^[a-z_][a-z0-9_]*\(/i));
}

export function buildDefinitionContext(expressions: Array<{ normalized: string }>): DefinitionContext {
  console.log('=== buildDefinitionContext START ===');
  console.log('Input expressions:', expressions.map(e => e.normalized));
  
  const context: DefinitionContext = {
    variables: { ...CONSTANTS },
    functions: {},
    types: {
      pi: { type: MathType.Number },
      e: { type: MathType.Number },
      x: { type: MathType.Number },
      y: { type: MathType.Number },
      z: { type: MathType.Number },
    },
  };

  // Track which identifiers are being processed to detect cycles
  const processing = new Set<string>();

  expressions.forEach((expr, idx) => {
    const normalized = expr.normalized.trim();
    console.log(`[${idx}] Processing expression:`, normalized);
    if (!normalized || !normalized.includes('=')) {
      console.log(`[${idx}] Skipped: ${!normalized ? 'empty' : 'no equals sign'}`);
      return;
    }
    
    // Skip implicit relations - they're not definitions
    if (isImplicitRelation(normalized)) {
      console.log(`[${idx}] Skipped: implicit relation (not a definition)`);
      return;
    }

    const parts = normalized.split('=');
    if (parts.length !== 2) return;

    const lhs = parts[0].trim();
    const rhs = parts[1].trim();
    console.log('buildDefinitionContext: lhs=', lhs, 'rhs=', rhs);

    // Function definition: f(x) = ... or f_1(x,y) = ... (multi-parameter)
    const funcMatch = lhs.match(/^([a-zA-Z][a-zA-Z0-9_]*)\(([^)]+)\)$/);
    console.log(`[${idx}] funcMatch result:`, funcMatch);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const paramsStr = funcMatch[2];
      const params = paramsStr.split(',').map(p => p.trim());
      
      console.log(`[${idx}] Function detected: ${funcName}, params:`, params);
      
      if (RESERVED_NAMES.includes(funcName)) {
        console.warn(`[${idx}] ❌ Cannot define function with reserved name: ${funcName}`);
        return;
      }

      // Check for circular dependency
      if (processing.has(funcName)) {
        console.error(`[${idx}] ❌ Circular dependency detected for function: ${funcName}`);
        return;
      }

      processing.add(funcName);

      try {
        console.log(`[${idx}] Parsing function body:`, rhs);
        const body = parseExpression(rhs, context);
        context.functions[funcName] = { name: funcName, params, body };
        
        // Infer function type
        const typeInfo = inferType(normalized, normalized);
        context.types[funcName] = typeInfo;
        
        console.log(`[${idx}] ✅ Successfully added function '${funcName}' with params`, params);
        console.log(`[${idx}] Current functions in context:`, Object.keys(context.functions));
      } catch (e) {
        console.error(`[${idx}] ❌ Failed to parse function body:`, e);
      } finally {
        processing.delete(funcName);
      }
      return;
    }

    // Variable definition: a = ... or a_1 = ...
    const varMatch = lhs.match(/^([a-zA-Z][a-zA-Z0-9_]*)$/);
    console.log(`[${idx}] varMatch result:`, varMatch);
    if (varMatch) {
      const varName = varMatch[1];
      
      console.log(`[${idx}] Variable detected: ${varName}`);
      
      if (RESERVED_NAMES.includes(varName)) {
        console.warn(`[${idx}] ❌ Cannot define variable with reserved name: ${varName}`);
        return;
      }

      // Check for circular dependency
      if (processing.has(varName)) {
        console.error(`[${idx}] ❌ Circular dependency detected for variable: ${varName}`);
        return;
      }

      processing.add(varName);

      // Check if RHS is a list literal
      const listMatch = rhs.match(/^\[.*\]$/);
      if (listMatch) {
        try {
          const ast = parseExpression(rhs, context);
          if (ast.type === 'list') {
            // Store list as AST node for runtime evaluation
            context.variables[varName] = ast;
            context.types[varName] = { type: MathType.List };
            console.log(`[${idx}] ✅ Added list variable ${varName} with ${ast.elements?.length} elements`);
            processing.delete(varName);
            return;
          }
        } catch (e) {
          console.log(`[${idx}] ⚠️  Failed to parse list ${varName}: ${e}`);
          processing.delete(varName);
          return;
        }
      }

      // Only allow constant definitions (no variables in RHS)
      try {
        const ast = parseExpression(rhs, context);
        // Try to evaluate as constant (no variables except constants)
        const numericConstants: Record<string, number> = {};
        for (const [key, val] of Object.entries(context.variables)) {
          if (typeof val === 'number') {
            numericConstants[key] = val;
          }
        }
        const value = evaluateConstant(ast, { ...CONSTANTS, ...numericConstants });
        if (isFinite(value)) {
          context.variables[varName] = value;
          context.types[varName] = { type: MathType.Number };
          console.log(`[${idx}] ✅ Added variable ${varName} = ${value}`);
        }
      } catch (e) {
        console.log(`[${idx}] ⚠️  Skipped variable ${varName}: ${e}`);
      } finally {
        processing.delete(varName);
      }
    } else {
      console.log(`[${idx}] ⚠️  No match for function or variable pattern`);
    }
  });

  console.log('=== buildDefinitionContext RESULT ===');
  console.log('Functions:', Object.keys(context.functions));
  console.log('Variables:', Object.keys(context.variables));
  console.log('=====================================');

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
