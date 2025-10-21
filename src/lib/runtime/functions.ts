// Function call registry for built-in functions
// Now using unified registry system

import { MathType } from '../types';
import { RuntimeValue, createNumber, createBoolean, createComplex, isList, isNumber, isPoint, isBoolean, isComplex } from './value';
import { getFunctionSignature } from './registry';

type CallSignature = `${string}(${MathType})`;

interface CallableDefinition {
  name: string;
  paramType: MathType;
  returnType: MathType;
  execute: (arg: RuntimeValue) => RuntimeValue;
}

const CALLABLES = new Map<CallSignature, CallableDefinition>();

// Register a callable function (legacy - kept for compatibility)
export function registerCallable(
  name: string,
  paramType: MathType,
  returnType: MathType,
  execute: (arg: RuntimeValue) => RuntimeValue
): void {
  const sig: CallSignature = `${name}(${paramType})`;
  CALLABLES.set(sig, { name, paramType, returnType, execute });
}

// Lookup a callable - check registry first, then fallback to legacy
export function getCallable(name: string, paramType: MathType): CallableDefinition | undefined {
  // Try new registry first
  const registrySignature = getFunctionSignature(name, paramType);
  if (registrySignature) {
    return {
      name,
      paramType: registrySignature.paramType,
      returnType: registrySignature.returnType,
      execute: registrySignature.execute,
    };
  }
  
  // Fallback to legacy CALLABLES
  const sig: CallSignature = `${name}(${paramType})`;
  return CALLABLES.get(sig);
}

// All built-in functions now registered via unified registry system
// Legacy registerCallable() calls removed - functions defined in:
// - coreFunctions.ts
// - listFunctions.ts
// - complexFunctions.ts
// - pointFunctions.ts
// - signalFunctions.ts
// - calculusFunctions.ts

// Export a helper for conditional evaluation
export function evaluateConditional(
  condition: RuntimeValue,
  trueValue: RuntimeValue,
  falseValue: RuntimeValue
): RuntimeValue {
  if (isBoolean(condition)) {
    return condition.value ? trueValue : falseValue;
  } else if (isNumber(condition)) {
    // Treat non-zero as true, zero as false
    return condition.value !== 0 ? trueValue : falseValue;
  } else {
    throw new Error('Condition must be Boolean or Number');
  }
}
