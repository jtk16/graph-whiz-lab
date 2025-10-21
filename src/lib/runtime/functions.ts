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

// ============= TRIGONOMETRIC FUNCTIONS =============

registerCallable('sin', MathType.Number, MathType.Number,
  (arg) => {
    if (!isNumber(arg)) throw new Error('sin expects Number');
    return createNumber(Math.sin(arg.value));
  });

registerCallable('cos', MathType.Number, MathType.Number,
  (arg) => {
    if (!isNumber(arg)) throw new Error('cos expects Number');
    return createNumber(Math.cos(arg.value));
  });

registerCallable('tan', MathType.Number, MathType.Number,
  (arg) => {
    if (!isNumber(arg)) throw new Error('tan expects Number');
    return createNumber(Math.tan(arg.value));
  });

// ============= MATHEMATICAL FUNCTIONS =============

registerCallable('sqrt', MathType.Number, MathType.Number,
  (arg) => {
    if (!isNumber(arg)) throw new Error('sqrt expects Number');
    return createNumber(Math.sqrt(arg.value));
  });

registerCallable('abs', MathType.Number, MathType.Number,
  (arg) => {
    if (!isNumber(arg)) throw new Error('abs expects Number');
    return createNumber(Math.abs(arg.value));
  });

registerCallable('exp', MathType.Number, MathType.Number,
  (arg) => {
    if (!isNumber(arg)) throw new Error('exp expects Number');
    return createNumber(Math.exp(arg.value));
  });

registerCallable('ln', MathType.Number, MathType.Number,
  (arg) => {
    if (!isNumber(arg)) throw new Error('ln expects Number');
    return createNumber(Math.log(arg.value));
  });

registerCallable('log', MathType.Number, MathType.Number,
  (arg) => {
    if (!isNumber(arg)) throw new Error('log expects Number');
    return createNumber(Math.log10(arg.value));
  });

registerCallable('floor', MathType.Number, MathType.Number,
  (arg) => {
    if (!isNumber(arg)) throw new Error('floor expects Number');
    return createNumber(Math.floor(arg.value));
  });

registerCallable('ceil', MathType.Number, MathType.Number,
  (arg) => {
    if (!isNumber(arg)) throw new Error('ceil expects Number');
    return createNumber(Math.ceil(arg.value));
  });

registerCallable('round', MathType.Number, MathType.Number,
  (arg) => {
    if (!isNumber(arg)) throw new Error('round expects Number');
    return createNumber(Math.round(arg.value));
  });

// ============= LIST FUNCTIONS =============

registerCallable('length', MathType.List, MathType.Number,
  (arg) => {
    if (!isList(arg)) throw new Error('length expects List');
    return createNumber(arg.elements.length);
  });

registerCallable('sum', MathType.List, MathType.Number,
  (arg) => {
    if (!isList(arg)) throw new Error('sum expects List');
    const total = arg.elements.reduce((sum, el) => {
      if (!isNumber(el)) throw new Error('sum requires list of numbers');
      return sum + el.value;
    }, 0);
    return createNumber(total);
  });

registerCallable('mean', MathType.List, MathType.Number,
  (arg) => {
    if (!isList(arg)) throw new Error('mean expects List');
    if (arg.elements.length === 0) throw new Error('Cannot compute mean of empty list');
    const total = arg.elements.reduce((sum, el) => {
      if (!isNumber(el)) throw new Error('mean requires list of numbers');
      return sum + el.value;
    }, 0);
    return createNumber(total / arg.elements.length);
  });

registerCallable('min', MathType.List, MathType.Number,
  (arg) => {
    if (!isList(arg)) throw new Error('min expects List');
    if (arg.elements.length === 0) throw new Error('Cannot compute min of empty list');
    const values = arg.elements.map(el => {
      if (!isNumber(el)) throw new Error('min requires list of numbers');
      return el.value;
    });
    return createNumber(Math.min(...values));
  });

registerCallable('max', MathType.List, MathType.Number,
  (arg) => {
    if (!isList(arg)) throw new Error('max expects List');
    if (arg.elements.length === 0) throw new Error('Cannot compute max of empty list');
    const values = arg.elements.map(el => {
      if (!isNumber(el)) throw new Error('max requires list of numbers');
      return el.value;
    });
    return createNumber(Math.max(...values));
  });

// ============= POINT FUNCTIONS =============

registerCallable('length', MathType.Point, MathType.Number,
  (arg) => {
    if (!isPoint(arg)) throw new Error('length expects Point');
    return createNumber(Math.sqrt(arg.x * arg.x + arg.y * arg.y));
  });

// ============= CONDITIONAL/PIECEWISE FUNCTIONS =============
// Note: These are special functions that need multi-argument support
// They will be handled specially in the evaluator

// ============= COMPLEX NUMBER FUNCTIONS =============

// magnitude (absolute value) for Complex
registerCallable('abs', MathType.Complex, MathType.Number, (arg) => {
  if (!isComplex(arg)) throw new Error('abs expects Complex');
  return createNumber(Math.sqrt(arg.real * arg.real + arg.imag * arg.imag));
});

// arg / phase
registerCallable('arg', MathType.Complex, MathType.Number, (arg) => {
  if (!isComplex(arg)) throw new Error('arg expects Complex');
  return createNumber(Math.atan2(arg.imag, arg.real));
});

// real part
registerCallable('real', MathType.Complex, MathType.Number, (arg) => {
  if (!isComplex(arg)) throw new Error('real expects Complex');
  return createNumber(arg.real);
});

// imaginary part
registerCallable('imag', MathType.Complex, MathType.Number, (arg) => {
  if (!isComplex(arg)) throw new Error('imag expects Complex');
  return createNumber(arg.imag);
});

// complex conjugate
registerCallable('conj', MathType.Complex, MathType.Complex, (arg) => {
  if (!isComplex(arg)) throw new Error('conj expects Complex');
  return createComplex(arg.real, -arg.imag);
});

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
