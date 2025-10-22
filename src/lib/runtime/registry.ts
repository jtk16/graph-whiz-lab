/**
 * @deprecated Legacy registry - use '../operations/registry' instead
 * This file is kept for backwards compatibility only.
 * All new code should use the unified operations registry.
 */

import { registry, KeyboardItem } from '../operations/registry';
import { MathType } from '../types';
import { RuntimeValue } from './value';

// Re-export KeyboardItem for backwards compatibility
export type { KeyboardItem };

// Re-export for backwards compatibility
export const BUILTIN_FUNCTIONS = registry.getBuiltinFunctions();

// Legacy function signature (single-arg only)
interface FunctionSignature {
  paramType: MathType;
  returnType: MathType;
  execute: (arg: RuntimeValue) => RuntimeValue;
}

/**
 * @deprecated Use registry.findSignature() instead
 */
export function getFunctionSignature(
  name: string,
  paramType: MathType
): FunctionSignature | undefined {
  const match = registry.findSignature(name, [paramType]);
  if (!match) return undefined;
  
  const sig = match.operation.types.signatures[match.signatureIndex];
  return {
    paramType,
    returnType: sig.output,
    execute: (arg: RuntimeValue) => registry.execute(name, [arg])
  };
}

/**
 * @deprecated Use registry.get() instead
 */
export function isRegisteredFunction(name: string): boolean {
  return registry.getBuiltinFunctions().has(name);
}

/**
 * @deprecated Use registry.getKeyboardItems() instead
 */
export function getRegisteredKeyboardItems() {
  return registry.getKeyboardItems();
}

/**
 * @deprecated Use registry.getKeyboardItems() instead
 */
export function getKeyboardItems() {
  return registry.getKeyboardItems();
}

/**
 * @deprecated No longer used - operations auto-register
 */
export function registerFunction(): void {
  console.warn('registerFunction is deprecated - operations auto-register on import');
}
