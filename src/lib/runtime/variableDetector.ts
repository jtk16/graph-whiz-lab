import { ASTNode } from '../parser';
import { DefinitionContext } from '../definitionContext';
import { registry } from '../operations/registry';
import { getBuiltinFunctions } from './callables';

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
      const varName = node.value as string;
      
      // Check if it's a built-in constant
      if (BUILTIN_CONSTANTS.has(varName)) return false;
      
      // Check if it's a function name (use function to get current set)
      if (getBuiltinFunctions().has(varName)) return false;
      
      // Check if it's defined in context
      if (context?.variables?.[varName] !== undefined) return false;
      if (context?.functions?.[varName] !== undefined) return false;
      
      // It's an unbound variable
      return true;

    case 'binary':
      return hasUnboundVariables(node.left, context) || 
             hasUnboundVariables(node.right, context);

    case 'unary':
      return hasUnboundVariables(node.left || node.right!, context);

    case 'call':
      // Check if operation has custom variable detector
      const descriptor = node.name ? registry.get(node.name) : undefined;
      if (descriptor?.variables?.customDetector) {
        return descriptor.variables.customDetector(node, context);
      }
      
      // Default: check all arguments
      return node.args?.some(arg => hasUnboundVariables(arg, context)) ?? false;

    case 'list':
      // Check all elements
      return node.elements.some(elem => hasUnboundVariables(elem, context));

    case 'derivative':
    case 'partial':
      // The differentiation variable is bound within this operator
      // Only check for unbound variables in the operand
      if (!node.operand) return false;
      return hasUnboundVariables(node.operand, context);

    default:
      return false;
  }
}
