// Function call registry for built-in functions

import { MathType } from '../types';
import { RuntimeValue, createNumber, createBoolean, isList, isNumber, isPoint } from './value';

type CallSignature = `${string}(${MathType})`;

interface CallableDefinition {
  name: string;
  paramType: MathType;
  returnType: MathType;
  execute: (arg: RuntimeValue) => RuntimeValue;
}

const CALLABLES = new Map<CallSignature, CallableDefinition>();

// Register a callable function
export function registerCallable(
  name: string,
  paramType: MathType,
  returnType: MathType,
  execute: (arg: RuntimeValue) => RuntimeValue
): void {
  const sig: CallSignature = `${name}(${paramType})`;
  CALLABLES.set(sig, { name, paramType, returnType, execute });
}

// Lookup a callable
export function getCallable(name: string, paramType: MathType): CallableDefinition | undefined {
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
