// Expression evaluator
import { ASTNode } from './parser';

export function evaluate(node: ASTNode, variables: Record<string, number>): number {
  switch (node.type) {
    case 'number':
      return node.value as number;

    case 'variable':
      const varName = node.value as string;
      if (varName in variables) {
        return variables[varName];
      }
      throw new Error(`Unknown variable: ${varName}`);

    case 'binary':
      const left = evaluate(node.left!, variables);
      const right = evaluate(node.right!, variables);
      
      switch (node.operator) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return left / right;
        case '^': return Math.pow(left, right);
        default: throw new Error(`Unknown operator: ${node.operator}`);
      }

    case 'unary':
      const operand = evaluate(node.right!, variables);
      return node.operator === '-' ? -operand : operand;

    case 'call':
      const args = node.args!.map(arg => evaluate(arg, variables));
      
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
  
  const { parseExpression } = require('./parser');
  const ast = parseExpression(rhs);
  return evaluate(ast, { x });
}
