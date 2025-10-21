// Convert AST nodes to string expressions for math.js
import { ASTNode } from './parser';

export function astToString(node: ASTNode): string {
  switch (node.type) {
    case 'number':
      return String(node.value);
    
    case 'variable':
      return String(node.value);
    
    case 'binary': {
      const left = astToString(node.left!);
      const right = astToString(node.right!);
      const op = node.operator;
      
      // Handle special operators for math.js compatibility
      if (op === '^') return `(${left})^(${right})`;
      if (op === '*') return `(${left}) * (${right})`;
      if (op === '/') return `(${left}) / (${right})`;
      if (op === '+') return `(${left}) + (${right})`;
      if (op === '-') return `(${left}) - (${right})`;
      if (op === '%') return `mod(${left}, ${right})`;
      
      // Comparison operators
      return `(${left}) ${op} (${right})`;
    }
    
    case 'unary': {
      const operand = astToString(node.right!);
      return `${node.operator}(${operand})`;
    }
    
    case 'call': {
      const args = node.args!.map(astToString).join(', ');
      return `${node.name}(${args})`;
    }
    
    case 'list': {
      const elements = node.elements!.map(astToString).join(', ');
      return `[${elements}]`;
    }
    
    case 'derivative':
    case 'partial': {
      // These should have been evaluated already
      throw new Error(`Cannot convert ${node.type} node to string - should be evaluated first`);
    }
    
    default:
      throw new Error(`Cannot convert AST node type: ${(node as any).type}`);
  }
}
