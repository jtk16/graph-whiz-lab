import { ASTNode } from '../parser';
import { DefinitionContext } from '../definitionContext';
import { BUILTIN_FUNCTIONS } from './registry';

const BUILTIN_CONSTANTS = new Set(['pi', 'e', 'i']);

/**
 * Recursively checks if an AST contains any unbound variables
 * (variables that aren't constants, function names, or defined in context)
 */
export function hasUnboundVariables(
  node: ASTNode,
  context?: DefinitionContext
): boolean {
  switch (node.type) {
    case 'number':
      return false;

    case 'variable':
      // Check if it's a built-in constant
      if (BUILTIN_CONSTANTS.has(node.name)) return false;
      
      // Check if it's a function name
      if (BUILTIN_FUNCTIONS.has(node.name)) return false;
      
      // Check if it's defined in context
      if (context?.variables?.[node.name] !== undefined) return false;
      if (context?.functions?.[node.name] !== undefined) return false;
      
      // It's an unbound variable
      return true;

    case 'binary':
      return hasUnboundVariables(node.left, context) || 
             hasUnboundVariables(node.right, context);

    case 'unary':
      return hasUnboundVariables(node.left || node.right!, context);

    case 'call':
      // Check all arguments
      return node.args.some(arg => hasUnboundVariables(arg, context));

    case 'list':
      // Check all elements
      return node.elements.some(elem => hasUnboundVariables(elem, context));

    default:
      return false;
  }
}
