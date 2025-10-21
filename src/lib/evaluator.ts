// Expression evaluator
import { ASTNode } from './parser';
import { DefinitionContext } from './definitionContext';

export function evaluate(
  node: ASTNode, 
  variables: Record<string, number>,
  context?: DefinitionContext
): number {
  switch (node.type) {
    case 'number':
      return node.value as number;

    case 'variable':
      const varName = node.value as string;
      
      // Check local variables first (e.g., x, y)
      if (varName in variables) {
        return variables[varName];
      }
      
      // Check context variables (defined constants)
      if (context?.variables && varName in context.variables) {
        return context.variables[varName];
      }
      
      throw new Error(`Unknown variable: ${varName}`);

    case 'binary':
      const left = evaluate(node.left!, variables, context);
      const right = evaluate(node.right!, variables, context);
      
      switch (node.operator) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return left / right;
        case '^': return Math.pow(left, right);
        default: throw new Error(`Unknown operator: ${node.operator}`);
      }

    case 'unary':
      const operand = evaluate(node.right!, variables, context);
      return node.operator === '-' ? -operand : operand;

    case 'call':
      // Check if it's a user-defined function
      if (context?.functions && node.name && node.name in context.functions) {
        const funcDef = context.functions[node.name];
        if (node.args && node.args.length === 1) {
          const argValue = evaluate(node.args[0], variables, context);
          return evaluate(funcDef.body, { [funcDef.paramName]: argValue }, context);
        }
        throw new Error(`Function ${node.name} expects 1 argument`);
      }
      
      const args = node.args!.map(arg => evaluate(arg, variables, context));
      
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
  return evaluate(ast, { x }, context);
}
