// Defines which types can be called with parentheses
// Now using unified operation registry for BUILTIN_FUNCTIONS

import { MathType } from '../types';
import { DefinitionContext } from '../definitionContext';
import { registry } from '../operations/registry';

// Get builtin functions from unified registry
export const BUILTIN_FUNCTIONS = registry.getBuiltinFunctions();

// Types that can be "called" with parentheses
export const CALLABLE_TYPES = new Set<MathType>([
  MathType.Function,
  MathType.Distribution,
  MathType.Action,
]);

export function isCallable(type: MathType | undefined): boolean {
  if (!type) return false;
  return CALLABLE_TYPES.has(type);
}


// Check if an identifier can be called (either built-in or user-defined function)
export function canCall(name: string, context?: DefinitionContext): boolean {
  // Built-in function
  if (BUILTIN_FUNCTIONS.has(name)) return true;
  
  // User-defined function
  if (context?.functions && name in context.functions) return true;
  
  // Check if it's a callable type in context
  if (context?.types && name in context.types) {
    return isCallable(context.types[name].type);
  }
  
  return false;
}
